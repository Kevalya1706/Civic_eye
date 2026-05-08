import { useState } from "react";
import { Eye, Mail, Lock, Loader2, Fingerprint, Shield, KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { loginWithPasskey } from "@/lib/passkey";
import SovereigntyTicker from "@/components/SovereigntyTicker";

const OFFICER_KEY = "MINIONS";

export default function Login() {
  const navigate = useNavigate();
  const { login, signup } = useSupabaseAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pkLoading, setPkLoading] = useState(false);

  // Officer state
  const [officerKey, setOfficerKey] = useState("");
  const [officerEmail, setOfficerEmail] = useState("");
  const [officerPwd, setOfficerPwd] = useState("");
  const [officerLoading, setOfficerLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const result = isSignup ? await signup(email, password) : await login(email, password);
    setLoading(false);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      toast({ title: isSignup ? "Account created ✓" : "Welcome back" });
      navigate("/");
    }
  };

  const handlePasskey = async () => {
    if (!email) {
      toast({ title: "Email required", description: "Enter your email to use a passkey.", variant: "destructive" });
      return;
    }
    setPkLoading(true);
    const r = await loginWithPasskey(email);
    setPkLoading(false);
    if (!r.ok) {
      toast({ title: "Passkey sign-in failed", description: r.error, variant: "destructive" });
    } else {
      toast({ title: "Authenticated", description: "Hardware-bound identity verified." });
      navigate("/");
    }
  };

  const handleOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (officerKey !== OFFICER_KEY) {
      toast({ title: "Invalid Officer Key", variant: "destructive" });
      return;
    }
    setOfficerLoading(true);
    const r = await login(officerEmail, officerPwd);
    setOfficerLoading(false);
    if (r.error) {
      toast({ title: "Error", description: r.error, variant: "destructive" });
      return;
    }
    toast({ title: "Officer authenticated", description: "Loading Command Environment…" });
    navigate("/command");
  };

  return (
    <div className="oracle min-h-screen oracle-bg flex flex-col text-[hsl(var(--slate-fg))]">
      <div className="flex-1 flex items-center justify-center p-4 pb-24">
        <div className="w-full max-w-md space-y-6 animate-fade-in-up">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--oracle-cyan))]/15 border border-[hsl(var(--oracle-cyan))]/40 flex items-center justify-center mx-auto mb-4">
              <Eye className="h-8 w-8 text-[hsl(var(--oracle-cyan))]" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">CivicEye Oracle</h1>
            <p className="text-xs uppercase tracking-[0.3em] mt-2 text-[hsl(var(--oracle-cyan))]">Cyber-Sovereign Gateway · v10.0</p>
          </div>

          <div className="oracle-glass rounded-2xl p-6">
            <Tabs defaultValue="citizen" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-[hsl(var(--slate-glass))]/60 border border-[hsl(var(--glass-border))]/20">
                <TabsTrigger value="citizen" className="data-[state=active]:bg-[hsl(var(--oracle-cyan))] data-[state=active]:text-[hsl(220_26%_10%)]">
                  <Fingerprint className="h-3.5 w-3.5 mr-1.5" />Citizen
                </TabsTrigger>
                <TabsTrigger value="officer" className="data-[state=active]:bg-[hsl(var(--oracle-cyan))] data-[state=active]:text-[hsl(220_26%_10%)]">
                  <Shield className="h-3.5 w-3.5 mr-1.5" />Officer
                </TabsTrigger>
              </TabsList>

              <TabsContent value="citizen" className="space-y-4 mt-5">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                    <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-[hsl(var(--slate-glass))]/40 border-[hsl(var(--glass-border))]/30 text-[hsl(var(--slate-fg))] placeholder:text-[hsl(var(--slate-fg))]/40" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-[hsl(var(--slate-glass))]/40 border-[hsl(var(--glass-border))]/30 text-[hsl(var(--slate-fg))] placeholder:text-[hsl(var(--slate-fg))]/40" required minLength={6} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-[hsl(var(--oracle-cyan))] text-[hsl(220_26%_10%)] hover:bg-[hsl(var(--oracle-cyan))]/90">
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {isSignup ? "Create Account" : "Sign In"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[hsl(var(--glass-border))]/20" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-transparent px-2 text-[hsl(var(--slate-fg))]/50">or hardware-bound</span></div>
                </div>

                <Button type="button" variant="outline" onClick={handlePasskey} disabled={pkLoading || !email} className="w-full bg-transparent border-[hsl(var(--oracle-cyan))]/40 text-[hsl(var(--oracle-cyan))] hover:bg-[hsl(var(--oracle-cyan))]/10">
                  {pkLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Fingerprint className="h-4 w-4 mr-2" />}
                  Sign in with Passkey
                </Button>

                <button type="button" onClick={() => setIsSignup(!isSignup)} className="block w-full text-center text-xs text-[hsl(var(--slate-fg))]/60 hover:text-[hsl(var(--slate-fg))] underline">
                  {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
              </TabsContent>

              <TabsContent value="officer" className="space-y-4 mt-5">
                <form onSubmit={handleOfficer} className="space-y-3">
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                    <Input type="password" placeholder="Officer Key" value={officerKey} onChange={(e) => setOfficerKey(e.target.value)} className="pl-10 bg-[hsl(var(--slate-glass))]/40 border-[hsl(var(--glass-border))]/30 text-[hsl(var(--slate-fg))] placeholder:text-[hsl(var(--slate-fg))]/40" required />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                    <Input type="email" placeholder="officer@civic.gov" value={officerEmail} onChange={(e) => setOfficerEmail(e.target.value)} className="pl-10 bg-[hsl(var(--slate-glass))]/40 border-[hsl(var(--glass-border))]/30 text-[hsl(var(--slate-fg))] placeholder:text-[hsl(var(--slate-fg))]/40" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                    <Input type="password" placeholder="Password" value={officerPwd} onChange={(e) => setOfficerPwd(e.target.value)} className="pl-10 bg-[hsl(var(--slate-glass))]/40 border-[hsl(var(--glass-border))]/30 text-[hsl(var(--slate-fg))] placeholder:text-[hsl(var(--slate-fg))]/40" required />
                  </div>
                  <Button type="submit" disabled={officerLoading} className="w-full bg-[hsl(var(--oracle-cyan))] text-[hsl(220_26%_10%)] hover:bg-[hsl(var(--oracle-cyan))]/90">
                    {officerLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Enter Command Environment
                  </Button>
                </form>
                <p className="text-[10px] text-center text-[hsl(var(--slate-fg))]/50 uppercase tracking-widest">Restricted · Authorised Members Only</p>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-[10px] text-center text-[hsl(var(--slate-fg))]/40 uppercase tracking-widest">
            FIDO2 / WebAuthn · Passkey-Bound Identity
          </p>
        </div>
      </div>
      <SovereigntyTicker />
    </div>
  );
}
