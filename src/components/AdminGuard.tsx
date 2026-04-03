import { useState } from "react";
import { Shield, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
  children: React.ReactNode;
}

const ADMIN_KEY = "MINIONS";

export default function AdminGuard({ children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_KEY) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
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
        </form>
      </div>
    </div>
  );
}
