// Oracle v10.0 — Escalation Ladder + Social Cost
// Triggered by pg_cron every 5 minutes.
// 24h overdue -> HOD alert. 48h critical -> compute Social Cost via Google Routes traffic.
// If Social Cost > ₹5L, invoke generate-press-release.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRESS_THRESHOLD = 500_000;

async function trafficDensity(lat: number, lng: number, key: string): Promise<number> {
  // Google Routes API computeRoutes — TRAFFIC_AWARE. Compare duration vs staticDuration.
  const origin = { location: { latLng: { latitude: lat, longitude: lng } } };
  const destLat = lat + 0.005; // ~500m offset
  const destLng = lng + 0.005;
  const destination = { location: { latLng: { latitude: destLat, longitude: destLng } } };
  try {
    const res = await fetch(
      `https://routes.googleapis.com/directions/v2:computeRoutes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "routes.duration,routes.staticDuration",
        },
        body: JSON.stringify({
          origin,
          destination,
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      }
    );
    if (!res.ok) return 1.5;
    const data = await res.json();
    const r = data.routes?.[0];
    if (!r) return 1.5;
    const dur = parseFloat(String(r.duration || "0s"));
    const stat = parseFloat(String(r.staticDuration || "0s"));
    if (!stat) return 1.5;
    const ratio = dur / stat;
    return Math.max(1.0, Math.min(3.0, isFinite(ratio) ? ratio : 1.5));
  } catch {
    return 1.5;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY") || "";

  const now = new Date();
  const nowIso = now.toISOString();

  // Pull active tickets with deadlines reached
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("id, sla_deadline, escalation_level, priority_score, social_cost, lat, lng, ward, neighborhood, category, address, department, press_released_at, status")
    .neq("status", "Resolved")
    .lte("sla_deadline", nowIso)
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];

  for (const t of tickets || []) {
    const deadline = new Date(t.sla_deadline!).getTime();
    const hoursOver = (now.getTime() - deadline) / 3_600_000;
    let level = t.escalation_level || 0;
    const updates: any = {};
    const events: any[] = [];

    // 24h overdue (i.e. now > sla_deadline)
    if (hoursOver >= 0 && level < 2) {
      level = 2;
      updates.escalation_level = 2;
      events.push({
        ticket_id: t.id,
        event_type: "hod_alert",
        payload: { hours_over: hoursOver, ward: t.ward || t.neighborhood, department: t.department },
      });
    }

    // 48h critical
    if (hoursOver >= 24 && level < 3) {
      const dTraffic = await trafficDensity(t.lat, t.lng, mapsKey);
      const daysOver = hoursOver / 24;
      const social = Math.round(t.priority_score * daysOver * dTraffic * 1000);
      level = 3;
      updates.escalation_level = 3;
      updates.social_cost = social;
      updates.traffic_density = dTraffic;
      events.push({
        ticket_id: t.id,
        event_type: "critical",
        payload: { social_cost: social, traffic_density: dTraffic, days_over: daysOver },
      });

      if (social > PRESS_THRESHOLD && !t.press_released_at) {
        // Fire-and-forget — generate-press-release will stamp press_released_at
        supabase.functions
          .invoke("generate-press-release", { body: { ticket_id: t.id } })
          .catch(() => {});
      }
    } else if (level === 3 && hoursOver >= 24) {
      // Already critical — keep social_cost growing each tick
      const dTraffic = t.priority_score > 0 ? (await trafficDensity(t.lat, t.lng, mapsKey)) : 1.5;
      const daysOver = hoursOver / 24;
      const social = Math.round(t.priority_score * daysOver * dTraffic * 1000);
      updates.social_cost = social;
      updates.traffic_density = dTraffic;
      if (social > PRESS_THRESHOLD && !t.press_released_at) {
        supabase.functions
          .invoke("generate-press-release", { body: { ticket_id: t.id } })
          .catch(() => {});
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("tickets").update(updates).eq("id", t.id);
    }
    if (events.length > 0) {
      await supabase.from("enforcement_events").insert(events);
    }
    results.push({ id: t.id, level, hoursOver, social_cost: updates.social_cost });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
