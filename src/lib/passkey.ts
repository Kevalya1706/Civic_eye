import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";

const FN = "webauthn";

export async function registerPasskey(): Promise<{ ok: boolean; error?: string }> {
  try {
    const origin = window.location.origin;
    const optsRes = await supabase.functions.invoke(FN, { body: { action: "register-options", origin } });
    if (optsRes.error || optsRes.data?.error) throw new Error(optsRes.data?.error || optsRes.error?.message);
    const att = await startRegistration({ optionsJSON: optsRes.data });
    const verify = await supabase.functions.invoke(FN, {
      body: { action: "register-verify", origin, response: att },
    });
    if (verify.error || verify.data?.error) throw new Error(verify.data?.error || verify.error?.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Passkey registration failed" };
  }
}

export async function loginWithPasskey(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const origin = window.location.origin;
    const optsRes = await supabase.functions.invoke(FN, { body: { action: "auth-options", email, origin } });
    if (optsRes.error || optsRes.data?.error) throw new Error(optsRes.data?.error || optsRes.error?.message);
    const assertion = await startAuthentication({ optionsJSON: optsRes.data });
    const verify = await supabase.functions.invoke(FN, {
      body: { action: "auth-verify", email, origin, response: assertion },
    });
    if (verify.error || verify.data?.error) throw new Error(verify.data?.error || verify.error?.message);
    const { token_hash, type } = verify.data;
    if (!token_hash) throw new Error("no session token returned");
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) throw error;
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Passkey sign-in failed" };
  }
}
