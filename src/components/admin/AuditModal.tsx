import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TicketRow } from "@/hooks/useTickets";
import { MapPin, Calendar, User } from "lucide-react";

interface Props {
  ticket: TicketRow | null;
  open: boolean;
  onClose: () => void;
}

export default function AuditModal({ ticket, open, onClose }: Props) {
  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Trail — {ticket.category}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ticket.full_precise_address || ticket.address}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(ticket.created_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {ticket.user_name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-muted/50 border border-border p-4 text-center space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Citizen Report</p>
              {ticket.photo_url ? (
                <img src={ticket.photo_url} alt="Issue" className="rounded-lg w-full h-40 object-cover" />
              ) : (
                <div className="h-40 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">No photo uploaded</div>
              )}
              <p className="text-xs text-muted-foreground">{ticket.description}</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-4 text-center space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Municipal Solution</p>
              {ticket.fixed_photo_url ? (
                <img src={ticket.fixed_photo_url} alt="Fixed" className="rounded-lg w-full h-40 object-cover" />
              ) : (
                <div className="h-40 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">Awaiting fix photo</div>
              )}
              <p className="text-xs text-muted-foreground">
                {ticket.resolved_at ? `Resolved ${new Date(ticket.resolved_at).toLocaleDateString()}` : "Pending resolution"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="glass-card rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">{Math.round(ticket.priority_score)}</p>
              <p className="text-[10px] text-muted-foreground">S-Score</p>
            </div>
            <div className="glass-card rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">{ticket.upvotes}</p>
              <p className="text-[10px] text-muted-foreground">Upvotes</p>
            </div>
            <div className="glass-card rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">{ticket.nudge_count}</p>
              <p className="text-[10px] text-muted-foreground">Nudges</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
