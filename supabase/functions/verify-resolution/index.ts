// AI Forensic Resolution Verification
// Compares citizen report image with contractor resolution image using Gemini Vision.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `You are a Senior Forensic Civil Engineering Auditor. Compare these two images. Image A is the reported defect, Image B is the alleged repair.
1. Verify if the backgrounds, architectural landmarks, and utility infrastructure perfectly match to confirm identical geographic context.
2. Analyze if the structural issue (e.g., the pothole, crack, or leak) shown in Image A has been properly filled, patched, or repaired in Image B.
3. Output a strict JSON structure containing: { "integrity_score": number (0-100), "status": "VERIFIED_SUCCESS" | "FAILED_FRAUD", "engineering_critique": string, "context_match": string, "structural_matching_points": string[], "landmark_validation": string }`;

async function callGemini(imageA: string, imageB: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            { type: "text", text: "Image A — citizen report (reported defect):" },
            { type: "image_url", image_url: { url: imageA } },
            { type: "text", text: "Image B — alleged repair:" },
            { type: "image_url", image_url: { url: imageB } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { integrity_score: 0, status: "FAILED_FRAUD", engineering_critique: "Unparseable AI response." };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { ticket_id } = await req.json();
    if (!ticket_id) throw new Error("ticket_id required");

    const { data: ticket, error } = await supabase.from("tickets").select("*").eq("id", ticket_id).single();
    if (error || !ticket) throw new Error("Ticket not found");

    const imageA = ticket.image_url || ticket.photo_url;
    const imageB = ticket.resolution_image_url || ticket.fixed_photo_url;
    if (!imageA || !imageB) throw new Error("Both citizen image and resolution image are required");

    await supabase.from("tickets").update({ ai_audit_status: "PROCESSING" }).eq("id", ticket_id);

    const result = await callGemini(imageA, imageB);
    const score = Math.max(0, Math.min(100, Number(result.integrity_score) || 0));
    const status = result.status === "VERIFIED_SUCCESS" ? "VERIFIED_SUCCESS" : "FAILED_FRAUD";

    const update: Record<string, unknown> = {
      ai_integrity_score: score,
      ai_audit_status: status,
      ai_analysis_notes: result,
    };

    // Fraud detected — revert to In Progress
    if (status === "FAILED_FRAUD") {
      update.status = "In Progress";
      update.resolved_at = null;
    }

    await supabase.from("tickets").update(update).eq("id", ticket_id);

    return new Response(JSON.stringify({ ok: true, score, status, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("verify-resolution error:", msg);
    try {
      const body = await req.clone().json();
      if (body?.ticket_id) {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
        await supabase.from("tickets").update({
          ai_audit_status: "ERROR",
          ai_analysis_notes: { error: msg },
        }).eq("id", body.ticket_id);
      }
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
