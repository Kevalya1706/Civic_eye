import { useState, useMemo, useEffect } from "react";
import {
  Filter, CheckCircle, Eye, BarChart3, AlertTriangle, Loader2,
  Map, Layers, DollarSign, Clock,
  FileText, Zap
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import TicketCard from "@/components/TicketCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTMENTS, type Department } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { toast as sonner } from "sonner";
import AdminGuard from "@/components/AdminGuard";
import AppFooter from "@/components/AppFooter";
import { useAllTickets, useUpdateTicket, useUpvoteTicket, useNudgeTicket, type TicketRow } from "@/hooks/useTickets";
import AdminMap from "@/components/admin/AdminMap";
import VerificationBadge from "@/components/admin/VerificationBadge";
import AuditModal from "@/components/admin/AuditModal";
import EvidenceClosureModal from "@/components/admin/EvidenceClosureModal";
import NavigationDrawer from "@/components/admin/NavigationDrawer";
import { getTotalRepairedValue, formatCurrency, getTicketCost } from "@/components/admin/CostTracker";


function StatCard({ label, value, icon: Icon, color, suffix }: { label: string; value: string | number; icon: React.ElementType; color: string; suffix?: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-extrabold text-foreground">{value}{suffix}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AssignResolvePanel({ ticket, onAssign, onOpenResolve }: {
  ticket: TicketRow;
  onAssign: (id: string, dept: string) => void;
  onOpenResolve: (t: TicketRow) => void;
}) {
  const [dept, setDept] = useState(ticket.department);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ticket.status === "Open" && (
        <div className="flex items-center gap-1">
          <Select value={dept} onValueChange={(v) => setDept(v)}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map(d => (
                <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="navy" size="sm" className="text-xs h-8" onClick={() => onAssign(ticket.id, dept)}>
            Assign
          </Button>
        </div>
      )}
      {ticket.status === "In Progress" && (
        <Button variant="civic" size="sm" className="text-xs h-8" onClick={() => onOpenResolve(ticket)}>
          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve
        </Button>
      )}
    </div>
  );
}


function AdminDashboardInner() {
  const { toast } = useToast();
  const { data: tickets = [], isLoading } = useAllTickets();
  const updateTicket = useUpdateTicket();
  const upvoteTicket = useUpvoteTicket();
  const nudgeTicket = useNudgeTicket();
  const [deptFilter, setDeptFilter] = useState<Department | "All">("All");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [auditTicket, setAuditTicket] = useState<TicketRow | null>(null);
  const [resolveTicket, setResolveTicket] = useState<TicketRow | null>(null);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number | null; lng: number | null; error: string | null }>({
    lat: null, lng: null, error: null,
  });

  // Real-time geolocation watch
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLoc(p => ({ ...p, error: "Geolocation unsupported" }));
      return;
    }
    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null }),
      (err) => setUserLoc(p => ({ ...p, error: err.message })),
      opts,
    );
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null }),
      (err) => setUserLoc(p => ({ ...p, error: err.message })),
      opts,
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Open nav drawer when a ticket pin is selected
  const handleTicketSelect = (id: string) => {
    setSelectedTicketId(id);
    setNavDrawerOpen(true);
  };

  const selectedTicket = useMemo(
    () => tickets.find(t => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );


  const filtered = useMemo(() => {
    const base = deptFilter === "All" ? tickets : tickets.filter(t => t.department === deptFilter);
    return [...base].sort((a, b) => b.priority_score - a.priority_score);
  }, [tickets, deptFilter]);

  const open = useMemo(() => tickets.filter(t => t.status === "Open").length, [tickets]);
  const inProgress = useMemo(() => tickets.filter(t => t.status === "In Progress").length, [tickets]);
  const resolved = useMemo(() => tickets.filter(t => t.status === "Resolved").length, [tickets]);
  const critical = useMemo(() => tickets.filter(t => t.priority_score >= 80).length, [tickets]);
  const totalRepaired = useMemo(() => getTotalRepairedValue(tickets), [tickets]);

  // MTTR calculation
  const mttrHours = useMemo(() => {
    const resolvedTickets = tickets.filter(t => t.status === "Resolved" && t.resolved_at);
    if (resolvedTickets.length === 0) return 0;
    const totalMs = resolvedTickets.reduce((sum, t) => {
      return sum + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime());
    }, 0);
    return Math.round(totalMs / resolvedTickets.length / 3600000);
  }, [tickets]);

  // Nudge alerts
  const deptNudges = useMemo(() => {
    const map: Record<string, number> = {};
    tickets.filter(t => t.status !== "Resolved").forEach(t => {
      map[t.department] = (map[t.department] || 0) + t.nudge_count;
    });
    return map;
  }, [tickets]);

  const surgeTickets = useMemo(() => tickets.filter(t => t.nudge_count >= 10 && t.status !== "Resolved"), [tickets]);

  const handleAssign = (id: string, dept: string) => {
    updateTicket.mutate(
      { id, department: dept, status: "In Progress", admin_reviewed_at: new Date().toISOString() },
      { onSuccess: () => toast({ title: "Ticket Assigned ✓", description: `Routed to ${dept}.` }) }
    );
  };




  // Dept-specific stats
  const deptStats = useMemo(() => {
    const f = deptFilter === "All" ? tickets : tickets.filter(t => t.department === deptFilter);
    return {
      open: f.filter(t => t.status === "Open").length,
      inProgress: f.filter(t => t.status === "In Progress").length,
      resolved: f.filter(t => t.status === "Resolved").length,
      critical: f.filter(t => t.priority_score >= 80).length,
      cost: getTotalRepairedValue(f),
    };
  }, [tickets, deptFilter]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="container py-6 space-y-5 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient-navy">Command Center</h1>
            <p className="text-sm text-muted-foreground">Strategic Hub — Priority Queue | S-Score Sorted</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-accent/10 border-accent/20 text-accent-foreground">
              <BarChart3 className="h-3 w-3 mr-1" /> Live
            </Badge>
          </div>
        </div>

        {/* Surge Alerts */}
        {surgeTickets.length > 0 && (
          <div className="glass-card rounded-xl p-3 border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <Zap className="h-4 w-4" /> SURGE ALERT — {surgeTickets.length} ticket(s) with 10+ nudges
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {surgeTickets.map(t => `${t.category} at ${t.address}`).join(" • ")}
            </p>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard label="Open" value={deptStats.open} icon={AlertTriangle} color="bg-warning/15 text-warning" />
          <StatCard label="In Progress" value={deptStats.inProgress} icon={Eye} color="bg-info/15 text-info" />
          <StatCard label="Resolved" value={deptStats.resolved} icon={CheckCircle} color="bg-success/15 text-success" />
          <StatCard label="Critical (S≥80)" value={deptStats.critical} icon={AlertTriangle} color="bg-destructive/15 text-destructive" />
          <StatCard label="Repaired Value" value={formatCurrency(deptStats.cost)} icon={DollarSign} color="bg-accent/15 text-accent-foreground" />
          <StatCard label="Avg MTTR" value={mttrHours} icon={Clock} color="bg-primary/15 text-primary" suffix="h" />
        </div>

        {/* Department Nudge Alerts */}
        {Object.entries(deptNudges).filter(([, n]) => n >= 5).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(deptNudges).filter(([, n]) => n >= 5).map(([dept, count]) => (
              <Badge key={dept} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" /> {dept}: {count} nudges — OVERDUE
              </Badge>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground">Satellite Verification Map</h3>
              <p className="text-xs text-muted-foreground">Live ticket pins • 10m accuracy radius • S-Score color coding</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={showHeatmap ? "ghost" : "secondary"}
                size="sm"
                className="text-xs"
                onClick={() => setShowHeatmap(false)}
              >
                <Map className="h-3.5 w-3.5 mr-1" /> Pins
              </Button>
              <Button
                variant={showHeatmap ? "secondary" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => setShowHeatmap(true)}
              >
                <Layers className="h-3.5 w-3.5 mr-1" /> Heatmap
              </Button>
            </div>
          </div>
          <div className="h-72 rounded-xl overflow-hidden border border-border">
            <AdminMap
              tickets={filtered}
              onTicketSelect={handleTicketSelect}
              selectedTicketId={selectedTicketId}
              showHeatmap={showHeatmap}
            />
          </div>
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive inline-block" /> S≥80 Critical</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-warning inline-block" /> S 50-80</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-success inline-block" /> S&lt;50</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-dashed border-muted-foreground inline-block" /> 10m radius</span>
          </div>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Button variant={deptFilter === "All" ? "secondary" : "ghost"} size="sm" className="text-xs" onClick={() => setDeptFilter("All")}>
            All Departments
          </Button>
          {DEPARTMENTS.map(d => (
            <Button
              key={d}
              variant={deptFilter === d ? "secondary" : "ghost"}
              size="sm"
              className={`text-xs whitespace-nowrap ${deptNudges[d] >= 5 ? "text-destructive" : ""}`}
              onClick={() => setDeptFilter(d)}
            >
              {d}
              {deptNudges[d] >= 5 && <AlertTriangle className="h-3 w-3 ml-1 text-destructive" />}
            </Button>
          ))}
        </div>

        {/* Ticket Queue */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(ticket => (
              <div
                key={ticket.id}
                className={`relative ${selectedTicketId === ticket.id ? "ring-2 ring-accent/50 rounded-xl" : ""}`}
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <TicketCard
                  ticket={ticket}
                  onUpvote={(id) => upvoteTicket.mutate(id)}
                  onNudge={(id) => nudgeTicket.mutate(id)}
                />
                {/* Admin controls overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <VerificationBadge ticket={ticket} />
                  {ticket.status === "Resolved" ? (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setAuditTicket(ticket); }}>
                      <FileText className="h-3 w-3 mr-1" /> Audit
                    </Button>
                  ) : (
                    <>
                      {(ticket.resolution_image_url || ticket.ai_audit_status === "FAILED_FRAUD") && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setAuditTicket(ticket); }}>
                          <FileText className="h-3 w-3 mr-1" /> Audit
                        </Button>
                      )}
                      <AssignResolvePanel
                        ticket={ticket}
                        onAssign={handleAssign}
                        onOpenResolve={(t) => setResolveTicket(t)}
                      />

                    </>
                  )}
                </div>
                {/* Estimated cost */}
                <div className="absolute bottom-14 right-4 text-[10px] text-muted-foreground">
                  Est. ₹{getTicketCost(ticket.category).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No tickets in queue.</p>
            )}
          </div>
        )}
      </div>

      {/* Modals & drawers */}
      <AuditModal ticket={auditTicket} open={!!auditTicket} onClose={() => setAuditTicket(null)} />
      <EvidenceClosureModal
        ticket={resolveTicket}
        open={!!resolveTicket}
        onClose={() => setResolveTicket(null)}
      />
      <NavigationDrawer
        ticket={selectedTicket}
        open={navDrawerOpen && !!selectedTicket}
        onClose={() => setNavDrawerOpen(false)}
        userLat={userLoc.lat}
        userLng={userLoc.lng}
      />
      {userLoc.error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-warning/90 text-warning-foreground text-xs px-3 py-1 shadow-md">
          ⚠ Live tracking unavailable: {userLoc.error}
        </div>
      )}

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
