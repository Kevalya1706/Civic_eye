import AppHeader from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { leaderboard } from "@/lib/mockData";
import { Trophy, Medal, Award } from "lucide-react";

const rankIcons = [
  <Trophy className="h-5 w-5 text-warning" />,
  <Medal className="h-5 w-5 text-muted-foreground" />,
  <Award className="h-5 w-5 text-warning/60" />,
];

export default function Leaderboard() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container max-w-2xl py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gradient-navy">Civic Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Top contributors making the city better</p>
        </div>

        <div className="space-y-3">
          {leaderboard.map((user, i) => (
            <div
              key={user.id}
              className={`glass-card rounded-xl p-4 flex items-center gap-4 animate-fade-in-up ${
                i === 0 ? 'ring-2 ring-accent/30 civic-glow' : ''
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="h-10 w-10 rounded-lg flex items-center justify-center text-lg font-bold bg-muted">
                {i < 3 ? rankIcons[i] : <span className="text-muted-foreground">#{i + 1}</span>}
              </div>
              <div className="h-10 w-10 rounded-lg gradient-navy flex items-center justify-center text-sm font-bold text-primary-foreground">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{user.name}</p>
                <Badge variant="outline" className="text-[10px] bg-accent/10 border-accent/20 text-accent-foreground">
                  {user.badge}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-gradient-navy">{user.civicPoints}</p>
                <p className="text-[10px] text-muted-foreground">points</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
