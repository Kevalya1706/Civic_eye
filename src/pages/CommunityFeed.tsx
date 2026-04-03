import { useState } from "react";
import { MapPin, Filter } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import TicketCard from "@/components/TicketCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockTickets, DEPARTMENTS, type Department } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

export default function CommunityFeed() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState(mockTickets);
  const [filter, setFilter] = useState<Department | 'All'>('All');

  const filtered = filter === 'All' ? tickets : tickets.filter(t => t.department === filter);
  const openTickets = filtered.filter(t => t.status !== 'Resolved');

  const handleUpvote = (id: string) => {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, upvotes: t.upvotes + 1 } : t
    ));
    toast({ title: "Vote recorded ✓", description: "Thanks for verifying this issue!" });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container max-w-2xl py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gradient-navy">Community Feed</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5" /> Issues within 500m of your location
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Button variant={filter === 'All' ? 'secondary' : 'ghost'} size="sm" className="text-xs" onClick={() => setFilter('All')}>
            All
          </Button>
          {DEPARTMENTS.map(d => (
            <Button key={d} variant={filter === d ? 'secondary' : 'ghost'} size="sm" className="text-xs whitespace-nowrap" onClick={() => setFilter(d)}>
              {d}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-accent/10 border-accent/20 text-accent-foreground">
            {openTickets.length} open
          </Badge>
          <Badge variant="outline" className="bg-success/10 border-success/20 text-success">
            {filtered.length - openTickets.length} resolved
          </Badge>
        </div>

        <div className="space-y-4">
          {filtered.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} onUpvote={handleUpvote} />
          ))}
        </div>
      </div>
    </div>
  );
}
