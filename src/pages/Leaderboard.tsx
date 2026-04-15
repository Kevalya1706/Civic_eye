import AppHeader from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";
import { useLeaderboard } from "@/hooks/useProfile";
import AppFooter from "@/components/AppFooter";

const rankIcons = [
  <Trophy className="h-5 w-5 text-warning" />,
  <Medal className="h-5 w-5 text-muted-foreground" />,
  <Award className="h-5 w-5 text-warning/60" />,
];

export default function Leaderboard() {
  const { data: leaders = [], isLoading } = useLeaderboard();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="container max-w-2xl py-8 space-y-6 flex-1">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gradient-navy">Civic Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Top contributors making the city better</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
          </div>
        ) : leaders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No contributors yet. Start reporting to earn points!</p>
        ) : (
          <div className="space-y-3">
            {leaders.map((user, i) => (
              <div
                key={user.id}
                className={`glass-card rounded-xl p-4 flex items-center gap-4 animate-fade-in-up ${i === 0 ? 'ring-2 ring-accent/30 civic-glow' : ''}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold bg-muted">
                  {i < 3 ? rankIcons[i] : <span className="text-muted-foreground">#{i + 1}</span>}
                </div>
                <div className="h-10 w-10 rounded-lg gradient-navy flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{user.display_name}</p>
                  <Badge variant="outline" className="text-[10px] bg-accent/10 border-accent/20 text-accent-foreground">
                    {user.badge}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-gradient-navy">{user.civic_points}</p>
                  <p className="text-[10px] text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  );
}
