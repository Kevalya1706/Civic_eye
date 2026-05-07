// Oracle v10.0 — Autonomous Dispatcher
// Looks up a contractor by (department, ward) and assigns the ticket inline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ticket_id } = await req.json();
    if (!ticket_id) {
      return new Response(JSON.stringify({ error: "ticket_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: ticket, error: tErr } = await supabase
      .from("tickets")
      .select("id, department, neighborhood, ward, assigned_contractor_id")
      .eq("id", ticket_id)
      .single();
    if (tErr || !ticket) throw new Error(tErr?.message || "ticket not found");
    if (ticket.assigned_contractor_id) {
      return new Response(JSON.stringify({ already_assigned: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ward = ticket.ward || ticket.neighborhood || "Default";

    // Try ward-specific match first, fall back to Default
    let { data: contractor } = await supabase
      .from("contractors")
      .select("id, name, email, ward")
      .eq("department", ticket.department)
      .eq("active", true)
      .eq("ward", ward)
      .limit(1)
      .maybeSingle();

    if (!contractor) {
      const fallback = await supabase
        .from("contractors")
        .select("id, name, email, ward")
        .eq("department", ticket.department)
        .eq("active", true)
        .eq("ward", "Default")
        .limit(1)
        .maybeSingle();
      contractor = fallback.data;
    }

    if (!contractor) {
      await supabase.from("enforcement_events").insert({
        ticket_id,
        event_type: "dispatch_failed",
        payload: { reason: "no contractor", department: ticket.department, ward },
      });
      return new Response(JSON.stringify({ assigned: false, reason: "no contractor" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    await supabase
      .from("tickets")
      .update({
        assigned_contractor_id: contractor.id,
        assigned_at: now,
        ward,
        status: "In Progress",
      })
      .eq("id", ticket_id);

    await supabase.from("enforcement_events").insert({
      ticket_id,
      event_type: "assigned",
      payload: { contractor_id: contractor.id, contractor_name: contractor.name, ward },
    });

    return new Response(
      JSON.stringify({ assigned: true, contractor_id: contractor.id, contractor_name: contractor.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
