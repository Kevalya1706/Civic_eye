import { useState } from "react";
import { Shield, Lock, Fingerprint, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
}

const ADMIN_KEY = "MINIONS";

export default function AdminGuard({ children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_KEY) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleBiometricLogin = async () => {
    if (typeof window === "undefined" || !window.PublicKeyCredential || !navigator.credentials) {
      toast("Biometrics skipped. Please enter manual access key.");
      return;
    }
    setScanning(true);
    try {
      // 32-byte random challenge (client-side; in production this comes from the server)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: "required",
          rpId: window.location.hostname,
        },
        // @ts-expect-error — mediation supported in modern browsers
        mediation: "optional",
      } as CredentialRequestOptions);

      if (credential) {
        // Server-side @simplewebauthn/server verification stub — accepts the assertion locally
        toast.success("✓ Biometric verified — entering Command Center");
        setUnlocked(true);
      } else {
        toast("Biometrics skipped. Please enter manual access key.");
      }
    } catch (err: any) {
      toast(err?.name === "NotAllowedError"
        ? "Biometrics skipped. Please enter manual access key."
        : `Biometric unavailable: ${err?.message || "unknown"}. Please enter manual access key.`);
    } finally {
      setScanning(false);
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
        </form>
      </div>
    </div>
  );
}
