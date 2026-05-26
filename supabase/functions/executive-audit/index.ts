// Executive Audit Engine — runs every 48h via pg_cron.
// 1. Recomputes social_cost for unresolved tickets.
// 2. Sends "Executive Municipal Inaction Briefing" PDF to each department HOD.
// 3. Dispatches URGENT press email for tickets >=48h overdue with social_cost > ₹5,00,000.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const PRESS_CONTACTS_RAW = Deno.env.get("PRESS_CONTACTS") || "";

const PRESS_LIST = [
  "pune.editorial@timesgroup.com",
  "citydesk.pune@expressindia.com",
  "newsdesk@sakalmedia.com",
  "punenews@lokmat.com",
];
// CC list from env (admin test inbox)
const CC_LIST = PRESS_CONTACTS_RAW.split(",").map(s => s.trim()).filter(Boolean);

const GATEWAY = "https://connector-gateway.lovable.dev/resend";

async function sendEmail(payload: Record<string, unknown>) {
  const res = await fetch(`${GATEWAY}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend failed [${res.status}]: ${JSON.stringify(data)}`);
  return data;
}

async function buildPdf(title: string, lines: string[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 750;
  page.drawText(title, { x: 50, y, size: 16, font: bold, color: rgb(0.1, 0.17, 0.43) });
  y -= 24;
  page.drawText(`Generated: ${new Date().toISOString()}`, { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 20;
  for (const line of lines) {
    if (y < 60) { page = pdf.addPage([612, 792]); y = 750; }
    const isHead = line.startsWith("## ");
    const text = isHead ? line.slice(3) : line;
    page.drawText(text.slice(0, 95), { x: 50, y, size: isHead ? 12 : 10, font: isHead ? bold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= isHead ? 18 : 14;
  }
  return await pdf.save();
}

function toB64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function gmaps(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: allow either pg_cron via CRON_SECRET bearer, or a signed-in commissioner/hod user.
  const authHeader = req.headers.get("Authorization") || "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCron) {
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isCommish } = await userClient.rpc("has_role", { _user_id: user.id, _role: "commissioner" });
    const { data: isHod } = await userClient.rpc("has_role", { _user_id: user.id, _role: "hod" });
    if (!isCommish && !isHod) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const summary = { social_cost_updates: 0, briefings_sent: 0, press_dispatched: 0, errors: [] as string[] };

  try {
    // 1. Fetch all unresolved tickets

    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("*")
      .neq("status", "Resolved")
      .order("priority_score", { ascending: false });
    if (error) throw error;

    const now = Date.now();
    const byDept: Record<string, any[]> = {};

    // 2. Recompute social_cost
    for (const t of tickets || []) {
      const deadline = t.sla_deadline ? new Date(t.sla_deadline).getTime() : new Date(t.created_at).getTime();
      const daysOver = Math.max(0, (now - deadline) / 86400000);
      const traffic = Number(t.traffic_density ?? 1.0);
      const cost = Math.round(t.priority_score * daysOver * traffic * 25000);
      if (cost !== Number(t.social_cost ?? 0)) {
        await supabase.from("tickets").update({ social_cost: cost }).eq("id", t.id);
        summary.social_cost_updates++;
      }
      t.social_cost = cost;
      t.days_overdue = daysOver;
      (byDept[t.department] = byDept[t.department] || []).push(t);
    }

    // 3. HOD briefing email per department
    const { data: hodRoles } = await supabase
      .from("user_roles")
      .select("user_id, department")
      .eq("role", "hod");
    const hodIds = (hodRoles || []).map(r => r.user_id);
    const { data: hodProfiles } = await supabase
      .from("profiles")
      .select("user_id, email, display_name")
      .in("user_id", hodIds.length ? hodIds : ["00000000-0000-0000-0000-000000000000"]);
    const hodByDept: Record<string, { email: string; name: string }> = {};
    for (const r of hodRoles || []) {
      const p = (hodProfiles || []).find(p => p.user_id === r.user_id);
      if (p?.email && r.department) hodByDept[r.department] = { email: p.email, name: p.display_name || "HOD" };
    }

    for (const [dept, items] of Object.entries(byDept)) {
      const overdue = items.filter(t => t.days_overdue > 0);
      if (!overdue.length) continue;
      const totalCost = overdue.reduce((s, t) => s + (t.social_cost || 0), 0);
      const inrTotal = `₹${totalCost.toLocaleString("en-IN")}`;
      const lines = [
        `## Department: ${dept}`,
        `Overdue tickets: ${overdue.length}`,
        `Aggregate Social Cost: ${inrTotal}`,
        ``,
        `## Overdue Ticket Breakdown`,
        ...overdue.slice(0, 30).map(t =>
          `[S=${Math.round(t.priority_score)}] ${t.category} @ ${t.ward || ""} ${t.address} — ${t.days_overdue.toFixed(1)}d overdue — ₹${(t.social_cost||0).toLocaleString("en-IN")}`
        ),
      ];
      const pdf = await buildPdf("Executive Municipal Inaction Briefing", lines);

      const hod = hodByDept[dept];
      const recipients = hod ? [hod.email] : CC_LIST;
      if (!recipients.length) continue;

      try {
        await sendEmail({
          from: "CivicEye Audit <onboarding@resend.dev>",
          to: recipients,
          cc: CC_LIST.length && hod ? CC_LIST : undefined,
          subject: `Executive Municipal Inaction Briefing — ${dept} (${inrTotal} accrued)`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:640px">
              <h2 style="color:#1A2B6D">Executive Municipal Inaction Briefing</h2>
              <p>Department: <strong>${dept}</strong></p>
              <p>Overdue tickets: <strong>${overdue.length}</strong></p>
              <p>Aggregate accrued social cost: <strong style="color:#c00">${inrTotal}</strong></p>
              <p style="color:#555">Detailed evidence packet attached.</p>
              <p style="font-size:11px;color:#888">CivicEye Geospatial Intelligence Engine • Team Minions</p>
            </div>`,
          attachments: [
            { filename: `inaction-briefing-${dept.replace(/[^a-z0-9]+/gi, "_")}.pdf`, content: toB64(pdf) },
          ],
        });
        summary.briefings_sent++;
      } catch (e) {
        summary.errors.push(`briefing ${dept}: ${(e as Error).message}`);
      }
    }

    // 4. Press dispatch for critical overdue tickets
    const pressCandidates = (tickets || []).filter((t: any) =>
      t.days_overdue >= 2 && (t.social_cost || 0) > 500000 && !t.press_released_at
    );

    for (const t of pressCandidates) {
      const inr = `₹${(t.social_cost || 0).toLocaleString("en-IN")}`;
      const { data: contractor } = await supabase
        .from("contractors").select("*").eq("id", t.assigned_contractor_id || "").maybeSingle();
      const company = contractor?.company_name || contractor?.name || "Unassigned Contractor";
      const tracking = contractor?.engineer_id || "UNASSIGNED";

      const pdfLines = [
        `## URGENT CIVIC ALERT — Press Advisory`,
        `Ticket: ${t.id}`,
        `Category: ${t.category}`,
        `Location: ${t.full_precise_address || t.address}`,
        `Ward: ${t.ward || "—"}`,
        `GPS: ${t.lat}, ${t.lng}`,
        `Reported: ${new Date(t.created_at).toISOString()}`,
        `SLA Deadline: ${t.sla_deadline}`,
        `Days Overdue: ${t.days_overdue.toFixed(2)}`,
        `S-Score: ${Math.round(t.priority_score)}`,
        `Social Cost: ${inr}`,
        ``,
        `## Assigned Contractor`,
        `Company: ${company}`,
        `Tracking ID: ${tracking}`,
        ``,
        `## Cryptographic Evidence`,
        `Image Hash (SHA-256): ${t.image_hash || "n/a"}`,
        `Photo URL: ${t.photo_url || "n/a"}`,
        `Reported By Trust Score: ${t.user_trust_score}`,
        `Image upvotes / verifications: ${t.upvotes}`,
      ];
      const pdf = await buildPdf("Urban Health Warning — Civic Infrastructure Failure", pdfLines);

      const subject = `[URGENT CIVIC ALERT] Infrastructure Failure Neglected for 48+ Hours at ${t.ward || t.address}`;
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:640px;border-left:4px solid #c00;padding:0 16px">
          <h2 style="color:#c00;margin-bottom:4px">URGENT CIVIC ALERT</h2>
          <p style="color:#555;margin-top:0">Media Advisory — ${new Date().toLocaleString("en-IN")}</p>
          <p>An infrastructure failure has remained unaddressed for <strong>${t.days_overdue.toFixed(1)} days</strong> past its municipal SLA.</p>
          <table style="border-collapse:collapse;width:100%;font-size:13px">
            <tr><td style="padding:6px;border:1px solid #eee"><strong>Category</strong></td><td style="padding:6px;border:1px solid #eee">${t.category}</td></tr>
            <tr><td style="padding:6px;border:1px solid #eee"><strong>Location</strong></td><td style="padding:6px;border:1px solid #eee"><a href="${gmaps(t.lat,t.lng)}">${t.full_precise_address || t.address}</a></td></tr>
            <tr><td style="padding:6px;border:1px solid #eee"><strong>Ward</strong></td><td style="padding:6px;border:1px solid #eee">${t.ward || "—"}</td></tr>
            <tr><td style="padding:6px;border:1px solid #eee"><strong>Assigned Contractor</strong></td><td style="padding:6px;border:1px solid #eee">${company} (ID #${tracking})</td></tr>
            <tr><td style="padding:6px;border:1px solid #eee"><strong>S-Score</strong></td><td style="padding:6px;border:1px solid #eee;color:#c00;font-weight:700">${Math.round(t.priority_score)}</td></tr>
            <tr><td style="padding:6px;border:1px solid #eee"><strong>Social Cost</strong></td><td style="padding:6px;border:1px solid #eee;color:#c00;font-weight:700">${inr}</td></tr>
          </table>
          ${t.photo_url ? `<p><img src="${t.photo_url}" alt="evidence" style="max-width:100%;border-radius:8px;margin-top:12px" /></p>` : ""}
          <p style="font-size:11px;color:#888;margin-top:16px">CivicEye Geospatial Intelligence Engine • Cryptographic evidence packet attached • Team Minions</p>
        </div>`;

      try {
        await sendEmail({
          from: "CivicEye Press Desk <onboarding@resend.dev>",
          to: PRESS_LIST,
          cc: CC_LIST.length ? CC_LIST : undefined,
          subject,
          html,
          attachments: [
            { filename: `civic-alert-${t.id}.pdf`, content: toB64(pdf) },
          ],
        });

        await supabase.from("tickets").update({
          press_released_at: new Date().toISOString(),
          escalation_level: 3,
        }).eq("id", t.id);

        await supabase.from("press_releases").insert({
          ticket_id: t.id,
          ward: t.ward,
          social_cost: t.social_cost,
          headline: subject,
          summary: `Press advisory dispatched to ${PRESS_LIST.length} outlets`,
          sent_to: PRESS_LIST,
        });

        await supabase.from("enforcement_events").insert({
          ticket_id: t.id,
          event_type: "press_dispatched",
          payload: { recipients: PRESS_LIST, social_cost: t.social_cost },
        });

        summary.press_dispatched++;
      } catch (e) {
        summary.errors.push(`press ${t.id}: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message, summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
