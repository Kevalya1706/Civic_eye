import { useState } from "react";
import { Eye, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import AppFooter from "@/components/AppFooter";

export default function Login() {
  const navigate = useNavigate();
  const { login, signup } = useSupabaseAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    const result = isSignup ? await signup(email, password) : await login(email, password);

    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      setLoading(false);
    } else {
      if (isSignup) {
        toast({ title: "Account created! ✓", description: "Please check your email to confirm, or sign in if auto-confirmed." });
      } else {
        toast({ title: "Welcome back!", description: "Login successful." });
      }
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Eye className="h-8 w-8 text-accent-foreground" />
            </div>
            <h1 className="text-3xl font-extrabold text-gradient-navy">CivicEye AI</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isSignup ? "Create your account" : "Sign in to your account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required minLength={6} />
              </div>
            </div>

            <Button variant="civic" size="lg" className="w-full" type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isSignup ? "Create Account" : "Sign In"}
            </Button>

            <div className="text-center">
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground underline" onClick={() => setIsSignup(!isSignup)}>
                {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>

          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/30">
              <Lock className="h-3 w-3 text-warning" />
              <span className="text-xs font-semibold text-warning">Authorised Member only</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Built by Team Minions 🍌 — AI-Powered Urban Governance
            </p>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
