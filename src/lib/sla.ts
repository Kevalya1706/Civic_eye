// Oracle v10.0 — SLA countdown helper
export type SLAPhase = "active" | "warning" | "overdue" | "critical";

export interface SLAState {
  phase: SLAPhase;
  hoursRemaining: number;
  percentElapsed: number;
  label: string;
  toneClass: string; // tailwind classes via semantic tokens
}

export function computeSLA(deadlineIso: string | null, createdIso?: string | null): SLAState | null {
  if (!deadlineIso) return null;
  const deadline = new Date(deadlineIso).getTime();
  const start = createdIso ? new Date(createdIso).getTime() : deadline - 24 * 3600 * 1000;
  const now = Date.now();
  const totalMs = deadline - start;
  const elapsedMs = now - start;
  const remainingMs = deadline - now;
  const hoursRemaining = remainingMs / 3_600_000;
  const percentElapsed = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));

  let phase: SLAPhase;
  if (hoursRemaining <= -24) phase = "critical";
  else if (hoursRemaining <= 0) phase = "overdue";
  else if (hoursRemaining <= 12) phase = "warning";
  else phase = "active";

  const labels: Record<SLAPhase, string> = {
    active: "Active Phase",
    warning: "Approaching Overdue",
    overdue: "Overdue — HOD Alerted",
    critical: "Executive Failure",
  };

  const tones: Record<SLAPhase, string> = {
    active: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    overdue: "bg-destructive/15 text-destructive border-destructive/30",
    critical: "bg-destructive text-destructive-foreground border-destructive",
  };

  return { phase, hoursRemaining, percentElapsed, label: labels[phase], toneClass: tones[phase] };
}

export function formatCountdown(hoursRemaining: number): string {
  const abs = Math.abs(hoursRemaining);
  const h = Math.floor(abs);
  const m = Math.floor((abs - h) * 60);
  const sign = hoursRemaining < 0 ? "+" : "";
  return `${sign}${h}h ${m}m`;
}
