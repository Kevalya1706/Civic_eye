import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import SovereigntyTicker from "@/components/SovereigntyTicker";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, ShieldCheck, LogOut, Loader2, Newspaper, Activity } from "lucide-react";
import SLAClock from "@/components/SLAClock";

interface DeptScore { department: string; efficiency_score: number; resolved_tickets: number; total_tickets: number; }
interface OracleTicket { id: string; category: string; address: string; ward: string | null; social_cost: number; escalation_level: number; sla_deadline: string | null; created_at: string; status: string; department: string; press_released_at: string | null; }

export default function CommandDashboard() {
  const { logout, displayName, isLoggedIn, loading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [scores, setScores] = useState<DeptScore[]>([]);
  const [tickets, setTickets] = useState<OracleTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) navigate("/login");
  }, [authLoading, isLoggedIn]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [{ data: s }, { data: t }] = await Promise.all([
        supabase.from("department_scores").select("*"),
        supabase
          .from("tickets")
          .select("id, category, address, ward, social_cost, escalation_level, sla_deadline, created_at, status, department, press_released_at")
          .neq("status", "Resolved")
          .order("social_cost", { ascending: false })
          .limit(20),
      ]);
      if (!active) return;
      setScores((s as any) || []);
      setTickets((t as any) || []);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("command")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "department_scores" }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  const totalLiability = tickets.reduce((sum, t) => sum + Number(t.social_cost || 0), 0);
  const avgEfficiency = scores.length > 0 ? scores.reduce((s, d) => s + Number(d.efficiency_score || 0), 0) / scores.length : 0;
  const criticalCount = tickets.filter((t) => t.escalation_level >= 3).length;
  const releasedCount = tickets.filter((t) => t.press_released_at).length;

  if (loading) {
    return (
      <div className="oracle min-h-screen oracle-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--oracle-cyan))]" />
      </div>
    );
  }

  return (
    <div className="oracle min-h-screen oracle-bg flex flex-col text-[hsl(var(--slate-fg))] pb-16">
      <header className="border-b border-[hsl(var(--glass-border))]/20 oracle-glass sticky top-0 z-30">
        <div className="container py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--oracle-cyan))]">Command Environment</p>
            <h1 className="text-xl font-extrabold">Officer · {displayName || "Operator"}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate("/login"); }} className="text-[hsl(var(--slate-fg))]">
            <LogOut className="h-4 w-4 mr-1.5" /> Exit
          </Button>
        </div>
      </header>

      <main className="container flex-1 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Activity className="h-4 w-4" />} label="Live Efficiency Rating" value={`${avgEfficiency.toFixed(0)}%`} accent />
          <StatCard icon={<TrendingDown className="h-4 w-4" />} label="Unresolved Liability" value={`₹${(totalLiability / 1000).toFixed(1)}K`} danger={totalLiability > 500_000} />
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Executive Failures" value={String(criticalCount)} danger={criticalCount > 0} />
          <StatCard icon={<Newspaper className="h-4 w-4" />} label="Press Releases" value={String(releasedCount)} />
        </div>

        <section className="oracle-glass rounded-2xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[hsl(var(--oracle-cyan))] mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Departmental Efficiency
          </h2>
          <div className="space-y-2">
            {scores.length === 0 && <p className="text-sm opacity-60">No department metrics yet.</p>}
            {scores.map((s) => (
              <div key={s.department} className="flex items-center justify-between text-sm border-b border-[hsl(var(--glass-border))]/10 py-2 last:border-0">
                <span className="font-medium">{s.department}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs opacity-60">{s.resolved_tickets}/{s.total_tickets} resolved</span>
                  <span className={`font-bold ${s.efficiency_score < 60 ? "text-destructive" : s.efficiency_score < 85 ? "text-warning" : "text-[hsl(var(--oracle-cyan))]"}`}>
                    {Number(s.efficiency_score).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="oracle-glass rounded-2xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[hsl(var(--oracle-cyan))] mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Active Liability Queue
          </h2>
          <div className="space-y-3">
            {tickets.length === 0 && <p className="text-sm opacity-60">All clear. No active liabilities.</p>}
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-[hsl(var(--glass-border))]/15 bg-[hsl(var(--slate-glass))]/30 p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase">{t.category}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--oracle-cyan))]/15 text-[hsl(var(--oracle-cyan))] uppercase">{t.department}</span>
                    {t.escalation_level >= 3 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/30 text-destructive-foreground uppercase">Critical</span>}
                    {t.press_released_at && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning uppercase">Press Released</span>}
                  </div>
                  <p className="text-xs opacity-80 mt-1 truncate">{t.address}</p>
                  <div className="mt-2"><SLAClock deadline={t.sla_deadline} createdAt={t.created_at} compact /></div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase opacity-60">Social Cost</p>
                  <p className={`text-base font-extrabold ${Number(t.social_cost) > 500_000 ? "text-destructive" : "text-[hsl(var(--oracle-cyan))]"}`}>
                    ₹{Number(t.social_cost || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SovereigntyTicker />
    </div>
  );
}

function StatCard({ icon, label, value, accent, danger }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className={`oracle-glass rounded-2xl p-4 ${danger ? "border-destructive/40" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] opacity-70 mb-2">{icon} {label}</div>
      <p className={`text-2xl font-extrabold ${danger ? "text-destructive" : accent ? "text-[hsl(var(--oracle-cyan))]" : ""}`}>{value}</p>
    </div>
  );
}
