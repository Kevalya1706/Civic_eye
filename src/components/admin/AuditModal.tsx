import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TicketRow } from "@/hooks/useTickets";
import { MapPin, Calendar, User, ShieldCheck, ShieldAlert, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  ticket: TicketRow | null;
  open: boolean;
  onClose: () => void;
}

export default function AuditModal({ ticket, open, onClose }: Props) {
  if (!ticket) return null;

  const status = ticket.ai_audit_status || "PENDING";
  const score = ticket.ai_integrity_score ?? null;
  const critique =
    (ticket.ai_analysis_notes as any)?.engineering_critique ||
    (ticket.ai_analysis_notes as any)?.error ||
    null;

  const citizenImg = ticket.image_url || ticket.photo_url;
  const repairImg = ticket.resolution_image_url || ticket.fixed_photo_url;

  const fraud = status === "FAILED_FRAUD";
  const verified = status === "VERIFIED_SUCCESS";
  const processing = status === "PROCESSING";
  const awaitingRepair = ticket.status === "In Progress" && !repairImg;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl ${fraud ? "ring-2 ring-destructive" : ""}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Audit Trail — {ticket.category}
            {fraud && (
              <span className="ml-auto text-xs font-semibold text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Fraud Alert
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ticket.full_precise_address || ticket.address}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(ticket.created_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {ticket.user_name}</span>
          </div>

          {fraud && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              ⚠️ Fraud Alert: Resolution Rejected By AI — Ticket reverted to In Progress.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* CITIZEN REPORT */}
            <div className={`rounded-xl bg-muted/50 border p-4 text-center space-y-2 ${fraud ? "border-destructive/40" : "border-border"}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Citizen Report</p>
              {citizenImg ? (
                <img src={citizenImg} alt="Issue" className="rounded-lg w-full h-40 object-cover" />
              ) : (
                <div className="h-40 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                  Fetching Original Evidence...
                </div>
              )}
              <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
            </div>

            {/* MUNICIPAL SOLUTION */}
            <div className={`relative rounded-xl bg-muted/50 border p-4 text-center space-y-2 ${
              fraud ? "border-destructive/40" : verified ? "border-success/40 shadow-[0_0_18px_-4px_hsl(var(--success)/0.55)]" : "border-border"
            }`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Municipal Solution</p>
              {repairImg ? (
                <img src={repairImg} alt="Fixed" className="rounded-lg w-full h-40 object-cover" />
              ) : awaitingRepair ? (
                <div className="h-40 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                  Awaiting Contractor Upload
                </div>
              ) : (
                <div className="h-40 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                  No resolution photo
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {ticket.resolved_at ? `Resolved ${new Date(ticket.resolved_at).toLocaleDateString()}` : "Pending resolution"}
              </p>

              {verified && score !== null && (
                <div className="absolute top-2 right-2 rounded-full bg-success text-success-foreground px-2 py-0.5 text-[10px] font-bold shadow-md flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> AI Integrity Verified ({score}%)
                </div>
              )}
              {processing && (
                <div className="absolute top-2 right-2 rounded-full bg-info/90 text-info-foreground px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> AI Auditing…
                </div>
              )}
            </div>
          </div>

          {/* AI critique */}
          {critique && (fraud || verified) && (
            <div className={`rounded-lg p-3 text-xs ${fraud ? "bg-destructive/5 border border-destructive/30 text-destructive" : "bg-success/5 border border-success/30 text-foreground"}`}>
              <p className="font-semibold mb-1">Forensic Engineering Critique</p>
              <p className="leading-relaxed">{critique}</p>
            </div>
          )}

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
              <p className={`text-lg font-bold ${fraud ? "text-destructive" : verified ? "text-success" : "text-foreground"}`}>
                {score !== null ? `${score}%` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">AI Integrity</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
