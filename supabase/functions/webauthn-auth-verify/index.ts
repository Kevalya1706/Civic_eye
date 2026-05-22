// Verify a WebAuthn authentication assertion against stored public key.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAuthenticationResponse } from "npm:@simplewebauthn/server@10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { assertion } = await req.json();
    if (!assertion?.id) return json({ error: "Missing assertion" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cred } = await admin
      .from("webauthn_credentials")
      .select("*")
      .eq("credential_id", assertion.id)
      .maybeSingle();
    if (!cred) return json({ error: "Unknown credential" }, 404);

    // Look up the most recent unexpired challenge for this user
    const { data: ch } = await admin
      .from("webauthn_challenges")
      .select("*")
      .eq("type", "authentication")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    const challengeRow = (ch || []).find(
      (c: any) => !c.user_id || c.user_id === cred.user_id,
    );
    if (!challengeRow) return json({ error: "No active challenge" }, 400);

    const url = new URL(req.headers.get("origin") || req.url);
    const rpID = url.hostname;
    const origin = url.origin;

    const publicKeyBytes = Uint8Array.from(atob(cred.public_key), (c) => c.charCodeAt(0));

    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.credential_id,
        publicKey: publicKeyBytes,
        counter: Number(cred.counter || 0),
        transports: cred.transports || undefined,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) return json({ error: "Verification failed" }, 401);

    await admin
      .from("webauthn_credentials")
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", cred.id);

    await admin.from("webauthn_challenges").delete().eq("id", challengeRow.id);

    return json({ verified: true, userId: cred.user_id });
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
