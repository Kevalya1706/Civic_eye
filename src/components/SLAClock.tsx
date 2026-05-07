import { useEffect, useState } from "react";
import { computeSLA, formatCountdown } from "@/lib/sla";
import { Clock } from "lucide-react";

interface Props {
  deadline: string | null;
  createdAt?: string | null;
  compact?: boolean;
}

export default function SLAClock({ deadline, createdAt, compact }: Props) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const sla = computeSLA(deadline, createdAt);
  if (!sla) return null;

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${sla.toneClass}`}>
      <Clock className="h-3 w-3" />
      {compact ? formatCountdown(sla.hoursRemaining) : `${sla.label} · ${formatCountdown(sla.hoursRemaining)}`}
    </div>
  );
}
