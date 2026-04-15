import AppHeader from "@/components/AppHeader";
import TicketCard from "@/components/TicketCard";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Ticket, Loader2 } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyTickets, useNudgeTicket } from "@/hooks/useTickets";
import AppFooter from "@/components/AppFooter";
import { useToast } from "@/hooks/use-toast";

export default function MyTickets() {
  const { displayName } = useSupabaseAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: tickets = [], isLoading: ticketsLoading } = useMyTickets();
  const nudgeMutation = useNudgeTicket();
  const { toast } = useToast();

  const isLoading = profileLoading || ticketsLoading;

  const totalReported = profile?.total_reported ?? 0;
  const totalVerified = profile?.total_verified ?? 0;
  const trustScore = profile?.trust_score ?? 0;
  const civicPoints = profile?.civic_points ?? 100;
  const badge = profile?.badge ?? "New Reporter";
  const isTrusted = badge === "Trusted Reporter";

  const handleNudge = (id: string) => {
    nudgeMutation.mutate(id, {
      onSuccess: () => toast({ title: "Department Nudged 📢", description: "A high-priority alert has been sent. -5% efficiency penalty applied." }),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container max-w-2xl py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
          <p className="text-sm text-muted-foreground mt-4">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="container max-w-2xl py-8 space-y-6 flex-1">
        {/* Profile Card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl gradient-navy flex items-center justify-center text-xl font-bold text-primary-foreground">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
              <Badge variant="outline" className={`text-xs mt-1 ${isTrusted ? 'bg-accent/10 border-accent/20 text-accent-foreground' : 'bg-muted border-border text-muted-foreground'}`}>
                {badge}
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
              <p className="text-lg font-bold text-foreground">{Math.round(trustScore)}%</p>
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
          {tickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} onNudge={handleNudge} />
          ))}
          {tickets.length === 0 && (
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-muted-foreground">No active reports. Your community contributions will appear here.</p>
            </div>
          )}
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
