import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SLAClock from "@/components/SLAClock";
import AppFooter from "@/components/AppFooter";
import { Loader2, MapPin, ArrowLeft, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContractorTicket {
  id: string;
  category: string;
  address: string;
  ward: string | null;
  status: string;
  sla_deadline: string | null;
  created_at: string;
  assigned_at: string | null;
  priority_score: number;
  photo_url: string | null;
}

interface Contractor {
  id: string;
  name: string;
  department: string;
  ward: string;
  email: string | null;
}

export default function ContractorView() {
  const { contractorId } = useParams();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [tickets, setTickets] = useState<ContractorTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractorId) return;
    let active = true;

    const load = async () => {
      const [{ data: c }, { data: t }] = await Promise.all([
        supabase.from("contractors").select("*").eq("id", contractorId).maybeSingle(),
        supabase
          .from("tickets")
          .select("id, category, address, ward, status, sla_deadline, created_at, assigned_at, priority_score, photo_url")
          .eq("assigned_contractor_id", contractorId)
          .neq("status", "Resolved")
          .order("sla_deadline", { ascending: true }),
      ]);
      if (!active) return;
      setContractor(c as any);
      setTickets((t as any) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`contractor-${contractorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `assigned_contractor_id=eq.${contractorId}` }, load)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [contractorId]);

  const markResolved = async (id: string) => {
    await supabase.from("tickets").update({ status: "Resolved", resolved_at: new Date().toISOString() }).eq("id", id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 text-center max-w-sm">
          <h2 className="text-lg font-bold text-foreground">Contractor not found</h2>
          <Link to="/" className="text-sm text-accent underline mt-4 inline-block">Return home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold text-foreground">{contractor.name}</h1>
            <p className="text-xs text-muted-foreground">{contractor.department} · Ward: {contractor.ward}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-primary">{tickets.length}</p>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-4 space-y-3">
        {tickets.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active assignments. The Oracle is quiet.</p>
          </div>
        ) : (
          tickets.map((t) => (
            <div key={t.id} className="glass-card rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">{t.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">S {Math.round(t.priority_score)}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-1 flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-1 flex-shrink-0" />
                    <span>{t.address}</span>
                  </p>
                </div>
                {t.photo_url && (
                  <img src={t.photo_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <SLAClock deadline={t.sla_deadline} createdAt={t.assigned_at || t.created_at} />
                <Button size="sm" variant="civic" onClick={() => markResolved(t.id)}>Mark Resolved</Button>
              </div>
            </div>
          ))
        )}
      </main>
      <AppFooter />
    </div>
  );
}
