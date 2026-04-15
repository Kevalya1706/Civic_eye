import { Shield, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TicketRow } from "@/hooks/useTickets";

export default function VerificationBadge({ ticket }: { ticket: TicketRow }) {
  const gpsAccuracy = ticket.precision_tier === "high" ? 5 : ticket.precision_tier === "standard" ? 15 : 25;
  const aiConfidence = ticket.image_hash ? 98 : 75;
  const isGreen = aiConfidence >= 98 && gpsAccuracy <= 5;
  const isRed = !ticket.photo_url || gpsAccuracy > 50;

  if (isRed) {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
        <ShieldAlert className="h-3 w-3 mr-1" /> Red Flag
      </Badge>
    );
  }

  if (isGreen) {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">
        <Shield className="h-3 w-3 mr-1" /> Verified ✓
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
      <Shield className="h-3 w-3 mr-1" /> Standard
    </Badge>
  );
}
