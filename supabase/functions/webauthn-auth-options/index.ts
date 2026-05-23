// Generate WebAuthn authentication options (challenge).
import { createClient } from "npm:@supabase/supabase-js@2";
import { generateAuthenticationOptions } from "npm:@simplewebauthn/server@10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email } = await req.json().catch(() => ({}));
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = null;
    let allowCreds: { id: string; transports?: string[] }[] = [];

    // If caller is authenticated, scope to their credentials
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (data?.claims?.sub) userId = data.claims.sub as string;
    }

    if (userId) {
      const { data } = await admin
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", userId);
      allowCreds = (data || []).map((c: any) => ({
        id: c.credential_id,
        transports: c.transports || undefined,
      }));
    }

    const url = new URL(req.headers.get("origin") || req.url);
    const rpID = url.hostname;

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: allowCreds,
      timeout: 60000,
    });

    await admin.from("webauthn_challenges").insert({
      user_id: userId,
      email: email || null,
      challenge: options.challenge,
      type: "authentication",
    });

    return json({ options, hasCredentials: allowCreds.length > 0 });
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
