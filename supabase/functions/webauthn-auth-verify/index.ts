// Verify a WebAuthn authentication assertion against stored public key.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAuthenticationResponse } from "npm:@simplewebauthn/server@10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    console.log("[webauthn-auth-verify] credential lookup", {
      assertionId: assertion.id,
      found: !!cred,
      storedCounter: cred?.counter ?? null,
    });
    if (!cred) {
      return json(
        { error: "No registered passkey found for this device. Please register first." },
        404,
      );
    }

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

    // Dual-shape argument: @simplewebauthn/server v10 destructures `authenticator`
    // ({ credentialID, credentialPublicKey, counter }), while v11+ renamed it to
    // `credential` ({ id, publicKey, counter }). Supplying both keeps the call
    // valid across versions and prevents `undefined.counter` crashes.
    const storedCounter = Number(cred.counter ?? 0);
    const authenticatorShape = {
      credentialID: cred.credential_id,
      credentialPublicKey: publicKeyBytes,
      id: cred.credential_id,
      publicKey: publicKeyBytes,
      counter: storedCounter,
      transports: cred.transports || undefined,
    };

    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: authenticatorShape,
      credential: authenticatorShape,
      requireUserVerification: true,
    } as any);

    console.log("[webauthn-auth-verify] verification result", {
      verified: verification.verified,
      newCounter: verification.authenticationInfo?.newCounter ?? null,
    });

    if (!verification.verified) return json({ error: "Verification failed" }, 401);

    const updatedCounter =
      verification.authenticationInfo?.newCounter ?? storedCounter + 1;

    await admin
      .from("webauthn_credentials")
      .update({
        counter: updatedCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", cred.id);

    await admin.from("webauthn_challenges").delete().eq("id", challengeRow.id);

    return json({ verified: true, userId: cred.user_id });
  } catch (error: any) {
    console.error("Cryptographic / Core Error:", error?.message || error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Internal validation exception occurred" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
