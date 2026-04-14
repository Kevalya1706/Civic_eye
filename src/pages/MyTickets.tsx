import AppHeader from "@/components/AppHeader";
import TicketCard from "@/components/TicketCard";
import { Badge } from "@/components/ui/badge";
import { mockTickets, mockUsers } from "@/lib/mockData";
import { Trophy, Star, Ticket } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function MyTickets() {
  const { displayName } = useAuth();
  const user = mockUsers[0];
  const userTickets = mockTickets.filter(t => t.userId === user.id);

  // Dynamic stats computed from ticket data
  const totalReported = userTickets.length;
  const totalVerified = userTickets.filter(t => t.status === 'Resolved').length;
  const trustScore = totalReported > 0 ? Math.round((totalVerified / totalReported) * 100) : 0;
  const civicPoints = 100 + (totalVerified * 50); // Base 100 + 50 per verified
  const isTrusted = totalVerified >= 5 && trustScore > 90;
  const badgeLabel = isTrusted ? "Trusted Reporter" : totalVerified >= 1 ? "Active Reporter" : "New Contributor";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container max-w-2xl py-8 space-y-6">
        {/* Profile Card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl gradient-navy flex items-center justify-center text-xl font-bold text-primary-foreground">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
              <Badge variant="outline" className={`text-xs mt-1 ${isTrusted ? 'bg-accent/10 border-accent/20 text-accent-foreground' : 'bg-muted border-border text-muted-foreground'}`}>
                {badgeLabel}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-gradient-navy">{civicPoints}</p>
              <p className="text-xs text-muted-foreground">Civic Points</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border/50">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Ticket className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg font-bold text-foreground">{totalReported}</p>
              <p className="text-xs text-muted-foreground">Reported</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Star className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg font-bold text-foreground">{trustScore}%</p>
              <p className="text-xs text-muted-foreground">Trust Score</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Trophy className="h-3.5 w-3.5" />
              </div>
              <p className="text-lg font-bold text-foreground">{totalVerified}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-foreground">Your Reports</h2>
        <div className="space-y-4">
          {userTickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
          {userTickets.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No tickets reported yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
