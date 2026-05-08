// Oracle v10.0 — WebAuthn (FIDO2 Passkey) registration + assertion verifier
// On successful assertion, mints a one-time email-link session for the matching user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "https://esm.sh/@simplewebauthn/server@10.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RP_NAME = "CivicEye Oracle";

function rpFromOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return { rpID: url.hostname, origin };
  } catch {
    return { rpID: "localhost", origin: "http://localhost" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action } = body;
    const origin = body.origin || req.headers.get("origin") || "";
    const { rpID } = rpFromOrigin(origin);

    if (action === "register-options") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("auth required");
      const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userData?.user) throw new Error("unauthorised");
      const userId = userData.user.id;

      const { data: existing } = await supabase
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", userId);

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID,
        userID: new TextEncoder().encode(userId),
        userName: userData.user.email || userId,
        attestationType: "none",
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
        excludeCredentials: (existing || []).map((c: any) => ({
          id: c.credential_id,
          transports: c.transports || undefined,
        })),
      });

      // Stash challenge in a temp table-less way: write to user metadata
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { ...(userData.user.user_metadata || {}), webauthn_challenge: options.challenge },
      });

      return new Response(JSON.stringify(options), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "register-verify") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("auth required");
      const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!userData?.user) throw new Error("unauthorised");
      const userId = userData.user.id;
      const expectedChallenge = userData.user.user_metadata?.webauthn_challenge;
      if (!expectedChallenge) throw new Error("no challenge");

      const verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
      if (!verification.verified || !verification.registrationInfo) throw new Error("verification failed");

      const { credential, credentialDeviceType } = verification.registrationInfo as any;
      const credentialId: string = credential?.id ?? (verification.registrationInfo as any).credentialID;
      const publicKey = credential?.publicKey ?? (verification.registrationInfo as any).credentialPublicKey;
      const counter = credential?.counter ?? (verification.registrationInfo as any).counter ?? 0;

      // store credential
      await supabase.from("webauthn_credentials").insert({
        user_id: userId,
        credential_id: typeof credentialId === "string" ? credentialId : btoa(String.fromCharCode(...new Uint8Array(credentialId))),
        public_key: btoa(String.fromCharCode(...new Uint8Array(publicKey))),
        counter,
        transports: body.response?.response?.transports || null,
        device_name: credentialDeviceType || "Passkey",
      });
      // clear challenge
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { ...(userData.user.user_metadata || {}), webauthn_challenge: null },
      });

      return new Response(JSON.stringify({ verified: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "auth-options") {
      const { email } = body;
      if (!email) throw new Error("email required");
      // find user
      const { data: userList } = await supabase.auth.admin.listUsers();
      const target = userList?.users.find((u) => u.email === email);
      if (!target) throw new Error("user not found");
      const { data: creds } = await supabase
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", target.id);
      if (!creds || creds.length === 0) throw new Error("no passkey enrolled");

      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: creds.map((c: any) => ({ id: c.credential_id, transports: c.transports || undefined })),
        userVerification: "preferred",
      });

      // stash challenge keyed by email in a transient row
      await supabase.auth.admin.updateUserById(target.id, {
        user_metadata: { ...(target.user_metadata || {}), webauthn_challenge: options.challenge },
      });

      return new Response(JSON.stringify({ ...options, _userId: target.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "auth-verify") {
      const { email, response: assertion } = body;
      const { data: userList } = await supabase.auth.admin.listUsers();
      const target = userList?.users.find((u) => u.email === email);
      if (!target) throw new Error("user not found");
      const expectedChallenge = target.user_metadata?.webauthn_challenge;
      if (!expectedChallenge) throw new Error("no challenge");

      const credId = assertion.id;
      const { data: credRow } = await supabase
        .from("webauthn_credentials")
        .select("*")
        .eq("credential_id", credId)
        .eq("user_id", target.id)
        .maybeSingle();
      if (!credRow) throw new Error("credential not found");

      const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credRow.credential_id,
          publicKey: Uint8Array.from(atob(credRow.public_key), (c) => c.charCodeAt(0)),
          counter: Number(credRow.counter),
          transports: credRow.transports || undefined,
        },
      } as any);

      if (!verification.verified) throw new Error("verification failed");

      await supabase
        .from("webauthn_credentials")
        .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
        .eq("id", credRow.id);

      // clear challenge
      await supabase.auth.admin.updateUserById(target.id, {
        user_metadata: { ...(target.user_metadata || {}), webauthn_challenge: null },
      });

      // mint a magic link & extract token hash for client to use with verifyOtp
      const link = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      const props: any = (link as any).data?.properties || (link as any).properties;

      return new Response(
        JSON.stringify({ verified: true, email, token_hash: props?.hashed_token, type: "magiclink" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("unknown action");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("webauthn error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
