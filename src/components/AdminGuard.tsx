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

export default function AdminGuard({ children }: Props) {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
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

  const handleBiometricLogin = async () => {
    setScanning(true);
    try {
      // PHASE 1 — fetch challenge from backend
      const { data: optsData, error: optsErr } = await supabase.functions.invoke(
        "webauthn-auth-options",
        { body: {} },
      );
      if (optsErr) throw new Error(optsErr.message);
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
      if (verifyErr) throw new Error(verifyErr.message);
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
    setEnrolling(true);
    try {
      const { data: optsData, error: optsErr } = await supabase.functions.invoke(
        "webauthn-register-options",
        { body: {} },
      );
      if (optsErr || !optsData) throw new Error(optsErr?.message || "Sign in first");

      const attestation = await startRegistration({ optionsJSON: optsData });
      const { data: vData, error: vErr } = await supabase.functions.invoke(
        "webauthn-register-verify",
        { body: { attestation, deviceName: navigator.userAgent.slice(0, 60) } },
      );
      if (vErr || !vData?.verified) throw new Error(vErr?.message || "Verification failed");
      toast.success("Passkey enrolled — try biometric sign-in.");
    } catch (err: any) {
      toast(`Enrollment cancelled: ${err?.message || err?.name || "unknown"}`);
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
