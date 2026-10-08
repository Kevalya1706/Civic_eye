import { useEffect, useState } from "react";
import { Shield, Lock, Fingerprint, Loader2, KeyRound } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: React.ReactNode;
}

const ADMIN_KEY = "MINIONS";

const UNLOCK_KEY = "civiceye_admin_unlocked";

export default function AdminGuard({ children }: Props) {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(UNLOCK_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (
          typeof window !== "undefined" &&
          window.PublicKeyCredential &&
          typeof window.PublicKeyCredential
            .isUserVerifyingPlatformAuthenticatorAvailable === "function"
        ) {
          const ok = await window.PublicKeyCredential
            .isUserVerifyingPlatformAuthenticatorAvailable();
          setBioSupported(!!ok);
        }
      } catch {
        setBioSupported(false);
      }
    })();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_KEY) {
      setUnlocked(true);
      setError(false);
      navigate("/command", { replace: true });
    } else {
      setError(true);
    }
  };

  const extractFnError = async (err: any): Promise<string | null> => {
    try {
      const ctx = err?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) return String(body.error);
      }
      if (ctx && typeof ctx.text === "function") {
        const t = await ctx.text();
        if (t) return t;
      }
    } catch { /* ignore */ }
    return null;
  };

  const handleBiometricLogin = async () => {
    setScanning(true);
    try {
      // PHASE 1 — fetch challenge from backend
      const { data: optsData, error: optsErr } = await supabase.functions.invoke(
        "webauthn-auth-options",
        { body: {} },
      );
      if (optsErr) {
        const msg = (await extractFnError(optsErr)) || optsErr.message;
        toast.error(`Authentication aborted: ${msg}`);
        setScanning(false);
        return;
      }
      if (!optsData?.hasCredentials) {
        toast("No passkey enrolled yet. Use the access key, then enroll a passkey from here.");
        setScanning(false);
        return;
      }

      // PHASE 2 — engage native authenticator (userVerification: "required" enforced by server)
      const assertion = await startAuthentication({ optionsJSON: optsData.options });

      // PHASE 3 — verify on backend
      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
        "webauthn-auth-verify",
        { body: { assertion } },
      );
      if (verifyErr) {
        const msg = (await extractFnError(verifyErr)) || verifyErr.message;
        toast.error(`Biometric bypass aborted: ${msg}`);
        setScanning(false);
        return;
      }
      if (!verifyData?.verified) throw new Error("Signature mismatch");

      toast.success("✓ Biometric verified — entering Command Center");
      setUnlocked(true);
      navigate("/command", { replace: true });
    } catch (err: any) {
      const name = err?.name || "";
      const msg = name === "NotAllowedError" || name === "AbortError"
        ? "Biometric validation bypassed. Please use manual access key."
        : `Biometric validation bypassed (${err?.message || "unavailable"}). Please use manual access key.`;
      toast(msg);
    } finally {
      setScanning(false);
    }
  };

  const handleEnrollPasskey = async () => {
    // PHASE 0 — Access Key gate (replay-attack shield)
    if (password !== ADMIN_KEY) {
      setError(true);
      toast.error("Enter the valid Access Key before enrolling a passkey.");
      return;
    }
    setEnrolling(true);
    try {
      if (typeof window === "undefined" || !window.PublicKeyCredential) {
        throw new Error("Biometric authentication protocols are disabled or unsupported by this device browser context.");
      }

      // PHASE 1 — fetch cryptographically secure challenge from Edge Function
      const { data: optsData, error: optsErr } = await supabase.functions.invoke(
        "webauthn-register-options",
        { body: {} },
      );
      if (optsErr || !optsData) {
        const msg = optsErr ? (await extractFnError(optsErr)) || optsErr.message : "Sign in first";
        throw new Error(msg);
      }

      // PHASE 2 — hardware capture (SimpleWebAuthn handles base64url encoding safely)
      const attestation = await startRegistration({ optionsJSON: optsData });

      // PHASE 3 — server-side attestation verification before mutating credentials
      const { data: vData, error: vErr } = await supabase.functions.invoke(
        "webauthn-register-verify",
        { body: { attestation, deviceName: navigator.userAgent.slice(0, 60) } },
      );
      if (vErr || !vData?.verified) {
        const msg = vErr ? (await extractFnError(vErr)) || vErr.message : "Verification failed";
        throw new Error(msg);
      }
      toast.success("✓ Biometric Passkey Enrolled! You can now log in using only your fingerprint.");
    } catch (err: any) {
      console.error("WebAuthn Failure Context:", err);
      const name = err?.name || "";
      const msg = String(err?.message || "");
      if (
        name === "SecurityError" ||
        msg.includes("enabled") ||
        msg.includes("document") ||
        msg.includes("sandbox") ||
        msg.includes("not allowed")
      ) {
        toast.error(
          "🔒 Sandbox Block: Click the 'Open in New Tab' arrow icon in the top-right of the preview to unlock device fingerprint sensors.",
        );
      } else if (name === "NotAllowedError" || name === "AbortError") {
        toast(`Enrollment cancelled.`);
      } else {
        toast.error(msg || "Biometric authentication setup failed.");
      }
    } finally {
      setEnrolling(false);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl p-8 max-w-sm w-full text-center space-y-6 animate-fade-in-up">
        <div className="h-16 w-16 rounded-2xl gradient-navy flex items-center justify-center mx-auto">
          <Shield className="h-8 w-8 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Admin Access</h2>
          <p className="text-sm text-muted-foreground mt-1">Enter the access key to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Access Key"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              className={`pl-10 ${error ? 'border-destructive' : ''}`}
              autoFocus
            />
          </div>
          {error && (
            <p className="text-xs text-destructive">Invalid access key. Try again.</p>
          )}
          <Button variant="navy" type="submit" className="w-full">
            Authenticate
          </Button>

          {bioSupported && (
            <>
              <div className="relative flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full relative overflow-visible"
                onClick={handleBiometricLogin}
                disabled={scanning}
              >
                <span className="relative inline-flex items-center justify-center mr-2">
                  {scanning && (
                    <>
                      <span className="absolute inset-0 -m-1 rounded-full bg-accent/40 animate-ping" />
                      <span className="absolute inset-0 -m-2 rounded-full bg-accent/20 animate-ping [animation-delay:200ms]" />
                    </>
                  )}
                  {scanning ? (
                    <Loader2 className="h-4 w-4 animate-spin relative" />
                  ) : (
                    <Fingerprint className="h-4 w-4 relative" />
                  )}
                </span>
                {scanning ? "Scanning..." : "Sign in with Biometrics / Passkey"}
              </Button>

              <button
                type="button"
                onClick={handleEnrollPasskey}
                disabled={enrolling}
                className="w-full text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 pt-1"
              >
                <KeyRound className="h-3 w-3" />
                {enrolling ? "Enrolling passkey..." : "Enroll this device as a passkey"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
