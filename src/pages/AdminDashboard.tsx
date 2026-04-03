import { useState } from "react";
import { Filter, CheckCircle, Upload, Eye, BarChart3, AlertTriangle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import TicketCard from "@/components/TicketCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockTickets, DEPARTMENTS, type Department, type Ticket } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import AdminGuard from "@/components/AdminGuard";
import AppFooter from "@/components/AppFooter";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function VerifyDialog({ ticket, onVerify }: { ticket: Ticket; onVerify: (id: string) => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="civic" size="sm" className="text-xs h-8">
          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify & Resolve — {ticket.category}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">{ticket.address}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-muted h-32 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Before Photo</span>
            </div>
            <label className="rounded-xl bg-muted h-32 flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
              <input type="file" accept="image/*" className="hidden" />
              <div className="text-center">
                <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Upload "Fixed" Photo</span>
              </div>
            </label>
          </div>
          <div className="glass-card rounded-lg p-3 bg-accent/5 border-accent/20">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-accent" />
              <span className="font-medium text-foreground">AI Verification</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI will compare before & after photos to validate the fix. Upload a photo to run verification.
            </p>
          </div>
          <Button variant="civic" className="w-full" onClick={() => onVerify(ticket.id)}>
            Mark as Resolved
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminDashboardInner() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState(mockTickets);
  const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');

  const filtered = (deptFilter === 'All' ? tickets : tickets.filter(t => t.department === deptFilter))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const open = tickets.filter(t => t.status === 'Open').length;
  const inProgress = tickets.filter(t => t.status === 'In Progress').length;
  const resolved = tickets.filter(t => t.status === 'Resolved').length;
  const critical = tickets.filter(t => t.priorityScore >= 80).length;

  const handleResolve = (id: string) => {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'Resolved' as const, resolvedAt: new Date().toISOString() } : t
    ));
    toast({ title: "Ticket Resolved ✓", description: "Citizen has been notified." });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient-navy">Command Center</h1>
            <p className="text-sm text-muted-foreground">Authority Dashboard — Priority Queue</p>
          </div>
          <Badge variant="outline" className="bg-accent/10 border-accent/20 text-accent-foreground">
            <BarChart3 className="h-3 w-3 mr-1" /> Live
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Open" value={open} icon={AlertTriangle} color="bg-warning/15 text-warning" />
          <StatCard label="In Progress" value={inProgress} icon={Eye} color="bg-info/15 text-info" />
          <StatCard label="Resolved" value={resolved} icon={CheckCircle} color="bg-success/15 text-success" />
          <StatCard label="Critical (S≥80)" value={critical} icon={AlertTriangle} color="bg-destructive/15 text-destructive" />
        </div>

        {/* Heatmap placeholder */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-3">City Health Heatmap</h3>
          <div className="h-48 rounded-xl bg-gradient-to-br from-success/10 via-warning/10 to-destructive/10 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-4 gap-1 p-2">
              {Array.from({ length: 32 }).map((_, i) => {
                const intensity = Math.random();
                return (
                  <div
                    key={i}
                    className="rounded-md transition-colors"
                    style={{
                      backgroundColor: intensity > 0.7
                        ? 'hsl(0 84% 60% / 0.4)'
                        : intensity > 0.4
                        ? 'hsl(38 92% 50% / 0.3)'
                        : 'hsl(72 100% 50% / 0.2)',
                    }}
                  />
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground z-10 bg-card/80 px-3 py-1 rounded-full">
              Interactive map requires Mapbox/Leaflet integration
            </span>
          </div>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Button variant={deptFilter === 'All' ? 'secondary' : 'ghost'} size="sm" className="text-xs" onClick={() => setDeptFilter('All')}>
            All Departments
          </Button>
          {DEPARTMENTS.map(d => (
            <Button key={d} variant={deptFilter === d ? 'secondary' : 'ghost'} size="sm" className="text-xs whitespace-nowrap" onClick={() => setDeptFilter(d)}>
              {d}
            </Button>
          ))}
        </div>

        {/* Ticket Queue */}
        <div className="space-y-4">
          {filtered.map(ticket => (
            <div key={ticket.id} className="relative">
              <TicketCard ticket={ticket} />
              {ticket.status !== 'Resolved' && (
                <div className="absolute top-4 right-20">
                  <VerifyDialog ticket={ticket} onVerify={handleResolve} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <AppFooter />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <AdminDashboardInner />
    </AdminGuard>
  );
}
