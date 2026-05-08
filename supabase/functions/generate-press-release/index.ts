// Oracle v10.0 — Generate Urban Health Warning PDF + Resend transmit
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend/emails";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ticket_id } = await req.json();
    if (!ticket_id) throw new Error("ticket_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: t, error } = await supabase
      .from("tickets")
      .select("id, category, address, ward, neighborhood, social_cost, traffic_density, priority_score, sla_deadline, created_at, press_released_at")
      .eq("id", ticket_id)
      .single();
    if (error || !t) throw new Error(error?.message || "ticket not found");
    if (t.press_released_at) {
      return new Response(JSON.stringify({ already_released: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ward = t.ward || t.neighborhood || "Unknown Ward";
    const hoursOver = t.sla_deadline
      ? Math.max(0, Math.round((Date.now() - new Date(t.sla_deadline).getTime()) / 3_600_000))
      : 0;
    const headline = `[URGENT] Infrastructure Failure in ${ward} Exceeds Safety Threshold`;
    const summary = `A ${t.category} issue reported at ${t.address} has remained unresolved for ${hoursOver} hours.`;
    const trafficLabel =
      (t.traffic_density || 1.5) >= 2.2 ? "Severe Traffic Density" : (t.traffic_density || 1.5) >= 1.5 ? "Moderate Traffic Density" : "Light Traffic Density";

    // Build PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();

    // Banner
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.1, 0.17, 0.43) });
    page.drawText("CIVICEYE ORACLE v10.0", { x: 40, y: height - 35, size: 14, font: bold, color: rgb(0.76, 1, 0) });
    page.drawText("Urban Health Warning — Public Integrity Report", { x: 40, y: height - 60, size: 11, font, color: rgb(1, 1, 1) });

    let y = height - 130;
    const draw = (text: string, opts: { size?: number; bold?: boolean; color?: any; gap?: number } = {}) => {
      const f = opts.bold ? bold : font;
      const size = opts.size ?? 11;
      page.drawText(text, { x: 40, y, size, font: f, color: opts.color || rgb(0, 0, 0), maxWidth: width - 80 });
      y -= (opts.gap ?? size + 8);
    };

    draw(headline, { size: 14, bold: true, color: rgb(0.7, 0.1, 0.1), gap: 28 });
    draw("SUMMARY", { size: 10, bold: true, color: rgb(0.3, 0.3, 0.3) });
    // wrap summary
    const wrap = (s: string, max = 90) => {
      const words = s.split(" ");
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        if ((cur + " " + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
      }
      if (cur) lines.push(cur);
      return lines;
    };
    for (const line of wrap(summary)) draw(line, { size: 11 });
    y -= 8;

    draw("QUANTIFIED IMPACT", { size: 10, bold: true, color: rgb(0.3, 0.3, 0.3) });
    const impact = `The AI Sovereign Engine has calculated a Social Cost of ₹${(t.social_cost || 0).toLocaleString("en-IN")} due to ${trafficLabel} and severity score ${Math.round(t.priority_score)}.`;
    for (const line of wrap(impact)) draw(line, { size: 11 });
    y -= 8;

    draw("DETAILS", { size: 10, bold: true, color: rgb(0.3, 0.3, 0.3) });
    draw(`Ward: ${ward}`, { size: 11 });
    draw(`Category: ${t.category}`, { size: 11 });
    draw(`Location: ${t.address}`, { size: 11 });
    draw(`Reported: ${new Date(t.created_at).toLocaleString("en-IN")}`, { size: 11 });
    draw(`SLA Deadline: ${t.sla_deadline ? new Date(t.sla_deadline).toLocaleString("en-IN") : "—"}`, { size: 11 });
    draw(`Hours Overdue: ${hoursOver}`, { size: 11 });
    y -= 12;

    page.drawRectangle({ x: 30, y: y - 60, width: width - 60, height: 60, borderColor: rgb(0.7, 0.1, 0.1), borderWidth: 1, color: rgb(0.99, 0.95, 0.95) });
    page.drawText("STATUS", { x: 40, y: y - 18, size: 10, font: bold, color: rgb(0.7, 0.1, 0.1) });
    const statusLines = wrap("This is an automated public disclosure triggered by the CivicEye Oracle v10.0 Enforcement Engine.", 80);
    let sy = y - 34;
    for (const line of statusLines) {
      page.drawText(line, { x: 40, y: sy, size: 10, font, color: rgb(0.3, 0.1, 0.1) });
      sy -= 14;
    }

    // Footer
    page.drawText("Geospatial Intelligence Engine | Powered by Team Minions", {
      x: 40, y: 30, size: 9, font, color: rgb(0.4, 0.4, 0.4),
    });

    const pdfBytes = await pdf.save();

    // Upload to storage bucket (create-on-the-fly fails — bucket must exist)
    const fileName = `${ticket_id}-${Date.now()}.pdf`;
    let pdfUrl: string | null = null;
    const upload = await supabase.storage.from("press-releases").upload(fileName, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (!upload.error) {
      const { data: urlData } = supabase.storage.from("press-releases").getPublicUrl(fileName);
      pdfUrl = urlData.publicUrl;
    } else {
      console.warn("storage upload failed", upload.error.message);
    }

    // Send via Resend
    const recipients = (Deno.env.get("PRESS_CONTACTS") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let sentTo: string[] = [];
    if (recipients.length > 0) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (lovableKey && resendKey) {
        const b64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
        const r = await fetch(RESEND_GATEWAY, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "CivicEye Oracle <onboarding@resend.dev>",
            to: recipients,
            subject: headline,
            html: `<h2>${headline}</h2><p>${summary}</p><p><strong>Social Cost:</strong> ₹${(t.social_cost || 0).toLocaleString("en-IN")}</p><p><strong>Ward:</strong> ${ward}<br/><strong>Hours Overdue:</strong> ${hoursOver}</p><p><em>This is an automated public disclosure triggered by the CivicEye Oracle v10.0.</em></p>`,
            attachments: [{ filename: `urban-health-warning-${ticket_id}.pdf`, content: b64 }],
          }),
        });
        if (r.ok) sentTo = recipients;
        else console.warn("resend failed", r.status, await r.text());
      }
    }

    // Log
    await supabase.from("press_releases").insert({
      ticket_id,
      ward,
      social_cost: t.social_cost || 0,
      pdf_url: pdfUrl,
      headline,
      summary,
      sent_to: sentTo,
    });
    await supabase.from("tickets").update({ press_released_at: new Date().toISOString() }).eq("id", ticket_id);
    await supabase.from("enforcement_events").insert({
      ticket_id,
      event_type: "press_released",
      payload: { recipients: sentTo, pdf_url: pdfUrl, social_cost: t.social_cost },
    });

    return new Response(JSON.stringify({ ok: true, pdf_url: pdfUrl, sent_to: sentTo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("press release error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
