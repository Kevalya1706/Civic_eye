import { Shield, Lock, Cpu } from "lucide-react";

export default function SovereigntyTicker() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 oracle-glass border-t border-[hsl(var(--glass-border)/0.2)]">
      <div className="container flex items-center justify-center gap-6 py-2 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--slate-fg))] font-semibold overflow-x-auto whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5"><Shield className="h-3 w-3 text-[hsl(var(--oracle-cyan))]" /> System Security Status: Validated</span>
        <span className="opacity-30">|</span>
        <span className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3 text-[hsl(var(--oracle-cyan))]" /> Identity Sovereignty Active</span>
        <span className="opacity-30">|</span>
        <span className="inline-flex items-center gap-1.5"><Cpu className="h-3 w-3 text-[hsl(var(--oracle-cyan))]" /> Team Minions</span>
      </div>
    </div>
  );
}
