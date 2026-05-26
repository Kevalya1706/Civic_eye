// Verify WebAuthn registration and store credential.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyRegistrationResponse } from "npm:@simplewebauthn/server@10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    // Defensive extraction: support both v10 `credential` shape and legacy `credentialID`/`credentialPublicKey` shape
    const regInfo: any = verification.registrationInfo;
    const credObj = regInfo?.credential ?? {};
    const rawId = credObj?.id ?? regInfo?.credentialID;
    const rawPk = credObj?.publicKey ?? regInfo?.credentialPublicKey;
    const counterVal: number = credObj?.counter ?? regInfo?.counter ?? 0;
    const transportsVal: string[] | undefined =
      credObj?.transports ?? attestation?.response?.transports ?? undefined;

    if (!rawId || !rawPk) {
      console.error("Missing credential fields", { hasCredObj: !!regInfo?.credential, keys: Object.keys(regInfo || {}) });
      return json({ error: "Verification returned no credential data" }, 400);
    }

    const credentialId: string = typeof rawId === "string"
      ? rawId
      : btoa(String.fromCharCode(...new Uint8Array(rawId)));
    const publicKey: string = btoa(String.fromCharCode(...new Uint8Array(rawPk)));

    await admin.from("webauthn_credentials").insert({
      user_id: userId,
      credential_id: credentialId,
      public_key: publicKey,
      counter: counterVal,
      transports: transportsVal,
      device_name: deviceName || "Passkey",
    });

    await admin.from("webauthn_challenges").delete().eq("id", ch.id);
    return json({ verified: true });
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
