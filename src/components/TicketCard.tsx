import { useState } from "react";
import { ArrowUp, MapPin, Clock, AlertTriangle, CheckCircle, Loader2, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import TicketTimeline from "./TicketTimeline";
import type { TicketRow } from "@/hooks/useTickets";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

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
  ticket: TicketRow;
  onUpvote?: (id: string) => void;
  onNudge?: (id: string) => void;
  compact?: boolean;
}

export default function TicketCard({ ticket, onUpvote, onNudge, compact }: Props) {
  const { userId } = useSupabaseAuth();
  const [showTimeline, setShowTimeline] = useState(false);
  const status = statusConfig[ticket.status] || statusConfig.Open;
  const ageMs = Date.now() - new Date(ticket.created_at).getTime();
  const ageHours = Math.floor(ageMs / 3600000);
  const ageLabel = ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageHours / 24)}d ago`;

  const isOwner = userId === ticket.user_id;
  const displayAddress = ticket.full_precise_address || ticket.address;

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
            {ticket.near_school_or_hospital && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                Near School/Hospital
              </Badge>
            )}
          </div>

          {!compact && (
            <p className="text-sm text-foreground/80 line-clamp-2 mb-2">{ticket.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {displayAddress}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {ageLabel}</span>
          </div>

          {!compact && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>by <strong className="text-foreground/70">{isOwner ? "You" : ticket.user_name}</strong></span>
              {ticket.user_trust_score >= 80 && (
                <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent-foreground border-accent/30">
                  Trusted
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-sm font-bold ${
            ticket.priority_score >= 80 ? 'bg-destructive/15 text-destructive' :
            ticket.priority_score >= 50 ? 'bg-warning/15 text-warning' :
            'bg-success/15 text-success'
          }`}>
            {Math.round(ticket.priority_score)}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">S-Score</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onUpvote && ticket.status !== 'Resolved' && (
            <Button variant="civic-outline" size="sm" className="text-xs h-8" onClick={() => onUpvote(ticket.id)}>
              <ArrowUp className="h-3.5 w-3.5 mr-1" /> Verify · {ticket.upvotes}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setShowTimeline(!showTimeline)}>
            {showTimeline ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
            Track Progress
          </Button>
        </div>
        <span className="text-[10px] text-muted-foreground">{ticket.department}</span>
      </div>

      {/* Timeline */}
      {showTimeline && (
        <div className="mt-3 pt-3 border-t border-border/30 animate-fade-in-up">
          <TicketTimeline ticket={ticket} onNudge={onNudge} />
        </div>
      )}
    </div>
  );
}
