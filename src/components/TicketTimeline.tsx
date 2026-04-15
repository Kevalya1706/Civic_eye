import { Clock, Eye, Truck, CheckCircle, Bell } from "lucide-react";
import { Button } from "./ui/button";
import type { TicketRow } from "@/hooks/useTickets";

interface Props {
  ticket: TicketRow;
  onNudge?: (id: string) => void;
}

function TimelineStep({ icon: Icon, label, timestamp, active, color }: {
  icon: React.ElementType;
  label: string;
  timestamp: string | null;
  active: boolean;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${active ? color : 'bg-muted text-muted-foreground'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="w-0.5 h-6 bg-border" />
      </div>
      <div className="pt-1">
        <p className={`text-sm font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
        {timestamp ? (
          <p className="text-xs text-muted-foreground">{new Date(timestamp).toLocaleString()}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">Pending</p>
        )}
      </div>
    </div>
  );
}

export default function TicketTimeline({ ticket, onNudge }: Props) {
  const submittedAt = ticket.created_at;
  const reviewedAt = ticket.admin_reviewed_at;
  const dispatchedAt = ticket.crew_dispatched_at;
  const resolvedAt = ticket.resolved_at;

  // Nudge is active if ticket has been in Open/submitted for >48 hours
  const ageMs = Date.now() - new Date(submittedAt).getTime();
  const canNudge = ticket.status === 'Open' && ageMs > 48 * 60 * 60 * 1000;

  return (
    <div className="space-y-1 py-2">
      <TimelineStep icon={Clock} label="Submitted" timestamp={submittedAt} active={true} color="bg-accent/20 text-accent-foreground" />
      <TimelineStep icon={Eye} label="Admin Reviewed" timestamp={reviewedAt} active={!!reviewedAt} color="bg-info/20 text-info" />
      <TimelineStep icon={Truck} label="Crew Dispatched" timestamp={dispatchedAt} active={!!dispatchedAt} color="bg-warning/20 text-warning" />
      <TimelineStep icon={CheckCircle} label="Resolved" timestamp={resolvedAt} active={!!resolvedAt} color="bg-success/20 text-success" />

      {canNudge && onNudge && (
        <div className="pt-2">
          <Button
            variant="destructive"
            size="sm"
            className="text-xs h-8 w-full"
            onClick={() => onNudge(ticket.id)}
          >
            <Bell className="h-3.5 w-3.5 mr-1" />
            Nudge {ticket.department} (-5% Efficiency)
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            This ticket has been pending for {Math.floor(ageMs / 3600000)}h — nudging alerts the department.
          </p>
        </div>
      )}
    </div>
  );
}
