// Generate WebAuthn registration options for the signed-in user.
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateRegistrationOptions } from "npm:@simplewebauthn/server@10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;
    const email = (claimsData.claims.email as string) || "admin@civiceye";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await admin
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", userId);

    const url = new URL(req.headers.get("origin") || req.url);
    const rpID = url.hostname;
    const rpName = "CivicEye Command Center";

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(userId),
      userName: email,
      attestationType: "none",
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "preferred",
      },
      excludeCredentials: (existing || []).map((c: any) => ({
        id: c.credential_id,
        transports: c.transports || undefined,
      })),
    });

    await admin.from("webauthn_challenges").insert({
      user_id: userId,
      email,
      challenge: options.challenge,
      type: "registration",
    });

    return json(options);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
