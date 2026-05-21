import { useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Navigation, MapPin, Route, Clock } from "lucide-react";
import type { TicketRow } from "@/hooks/useTickets";

interface Props {
  ticket: TicketRow | null;
  open: boolean;
  onClose: () => void;
  userLat: number | null;
  userLng: number | null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function NavigationDrawer({ ticket, open, onClose, userLat, userLng }: Props) {
  const distanceKm = useMemo(() => {
    if (!ticket || userLat === null || userLng === null) return null;
    return haversineKm(userLat, userLng, ticket.lat, ticket.lng);
  }, [ticket, userLat, userLng]);

  const etaMins = useMemo(() => {
    if (distanceKm === null) return null;
    // Traffic-aware estimate: 22 km/h average urban speed with congestion
    return Math.max(1, Math.round((distanceKm / 22) * 60));
  }, [distanceKm]);

  const launchNavigation = () => {
    if (!ticket) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${ticket.lat},${ticket.lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  if (!ticket) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="px-4 pb-6">
        <DrawerHeader className="text-left px-0">
          <DrawerTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            {ticket.category} — S-Score {Math.round(ticket.priority_score)}
          </DrawerTitle>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {ticket.full_precise_address || ticket.address}
          </p>
        </DrawerHeader>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="glass-card rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Route className="h-3.5 w-3.5" /> Distance
            </div>
            <p className="text-lg font-bold text-foreground">
              {distanceKm !== null ? `${distanceKm.toFixed(1)} km` : "—"}
            </p>
          </div>
          <div className="glass-card rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" /> ETA
            </div>
            <p className="text-lg font-bold text-foreground">
              {etaMins !== null ? `${etaMins} mins` : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">in active traffic</p>
          </div>
        </div>

        <Button variant="civic" size="lg" className="w-full" onClick={launchNavigation}>
          <Navigation className="h-4 w-4 mr-2" />
          🧭 Start Real-Time Navigation
        </Button>

        <p className="text-[10px] text-center text-muted-foreground mt-2 font-mono">
          {ticket.lat.toFixed(6)}° N, {ticket.lng.toFixed(6)}° E
        </p>
      </DrawerContent>
    </Drawer>
  );
}
