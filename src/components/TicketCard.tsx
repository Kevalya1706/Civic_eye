import { ArrowUp, MapPin, Clock, AlertTriangle, CheckCircle, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { Ticket } from "@/lib/mockData";

const statusConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  Open: { icon: <AlertTriangle className="h-3 w-3" />, className: "bg-warning/15 text-warning border-warning/30" },
  'In Progress': { icon: <Loader2 className="h-3 w-3 animate-spin" />, className: "bg-info/15 text-info border-info/30" },
  Resolved: { icon: <CheckCircle className="h-3 w-3" />, className: "bg-success/15 text-success border-success/30" },
  Suspicious: { icon: <ShieldAlert className="h-3 w-3" />, className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const categoryColors: Record<string, string> = {
  Pothole: "bg-primary/10 text-primary border-primary/20",
  'Pole Fault': "bg-warning/10 text-warning border-warning/20",
  'Water Leak': "bg-info/10 text-info border-info/20",
  'Waste Overflow': "bg-success/10 text-success border-success/20",
  'Drainage Block': "bg-muted text-muted-foreground border-border",
  'Road Damage': "bg-destructive/10 text-destructive border-destructive/20",
};

interface Props {
  ticket: Ticket;
  onUpvote?: (id: string) => void;
  compact?: boolean;
}

export default function TicketCard({ ticket, onUpvote, compact }: Props) {
  const status = statusConfig[ticket.status] || statusConfig.Open;
  const ageMs = Date.now() - new Date(ticket.createdAt).getTime();
  const ageHours = Math.floor(ageMs / 3600000);
  const ageLabel = ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageHours / 24)}d ago`;

  return (
    <div className="glass-card rounded-xl p-4 hover:shadow-xl transition-all duration-300 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline" className={categoryColors[ticket.category]}>
              {ticket.category}
            </Badge>
            <Badge variant="outline" className={status.className}>
              <span className="flex items-center gap-1">{status.icon} {ticket.status}</span>
            </Badge>
            {ticket.nearSchoolOrHospital && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                Near School/Hospital
              </Badge>
            )}
          </div>

          {!compact && (
            <p className="text-sm text-foreground/80 line-clamp-2 mb-2">{ticket.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ticket.address}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {ageLabel}</span>
          </div>

          {!compact && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>by <strong className="text-foreground/70">{ticket.userName}</strong></span>
              {ticket.userTrustScore >= 80 && (
                <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent-foreground border-accent/30">
                  Trusted
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold ${
            ticket.priorityScore >= 80 ? 'bg-destructive/15 text-destructive' :
            ticket.priorityScore >= 50 ? 'bg-warning/15 text-warning' :
            'bg-success/15 text-success'
          }`}>
            {ticket.priorityScore}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">S-Score</span>
        </div>
      </div>

      {onUpvote && ticket.status !== 'Resolved' && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <Button
            variant="civic-outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => onUpvote(ticket.id)}
          >
            <ArrowUp className="h-3.5 w-3.5 mr-1" />
            Verify · {ticket.upvotes}
          </Button>
          <span className="text-[10px] text-muted-foreground">{ticket.department}</span>
        </div>
      )}
    </div>
  );
}
