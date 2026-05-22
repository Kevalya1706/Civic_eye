// Verify WebAuthn registration and store credential.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyRegistrationResponse } from "npm:@simplewebauthn/server@10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: cErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (cErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const { attestation, deviceName } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ch } = await admin
      .from("webauthn_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "registration")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ch) return json({ error: "No active challenge" }, 400);

    const url = new URL(req.headers.get("origin") || req.url);
    const rpID = url.hostname;
    const origin = url.origin;

    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return json({ error: "Verification failed" }, 400);
    }

    const { credential } = verification.registrationInfo as any;
    const credentialId: string = credential.id;
    const publicKey: string = btoa(String.fromCharCode(...credential.publicKey));
    const counter: number = credential.counter ?? 0;
    const transports: string[] | undefined = credential.transports;

    await admin.from("webauthn_credentials").insert({
      user_id: userId,
      credential_id: credentialId,
      public_key: publicKey,
      counter,
      transports,
      device_name: deviceName || "Passkey",
    });

    await admin.from("webauthn_challenges").delete().eq("id", ch.id);
    return json({ verified: true });
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
