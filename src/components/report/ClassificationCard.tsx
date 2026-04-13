import { MapPin, ShieldCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ClassificationResult, ExifTrust } from "@/lib/civicGuard";

interface ClassificationCardProps {
  result: ClassificationResult;
  exifTrust: ExifTrust | null;
  address: string;
  lat: number | null;
  lng: number | null;
}

export default function ClassificationCard({ result, exifTrust, address, lat, lng }: ClassificationCardProps) {
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      {/* Tier 1: Detection */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Tier 1 — Detection</span>
        <Badge variant="outline" className="text-xs font-mono">
          {result.tier1Object.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Tier 2: Classification */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Tier 2 — Classification</span>
        <Badge variant="outline" className="bg-accent/10 border-accent/30 text-accent-foreground font-semibold">
          {result.category || 'Unknown'}
        </Badge>
      </div>

      {/* Tier 3: Confidence */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Tier 3 — Confidence</span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${confidencePct >= 92 ? 'bg-success' : confidencePct >= 70 ? 'bg-warning' : 'bg-destructive'}`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
          <span className={`text-xs font-bold ${confidencePct >= 92 ? 'text-success' : 'text-warning'}`}>
            {confidencePct}%
          </span>
        </div>
      </div>

      {/* Department */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Department</span>
        <span className="text-sm font-semibold text-foreground">{result.department || '—'}</span>
      </div>

      {/* Location */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Location</span>
        <span className="text-sm text-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {address || "Unknown"}
        </span>
      </div>
      {lat && lng && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Coordinates</span>
          <span className="text-xs font-mono text-foreground">{lat}, {lng}</span>
        </div>
      )}

      {/* EXIF Trust */}
      {exifTrust && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">EXIF Trust</span>
          <Badge
            variant="outline"
            className={`text-xs ${
              exifTrust.trustLevel === 'high'
                ? 'bg-success/10 border-success/30 text-success'
                : exifTrust.trustLevel === 'medium'
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            {exifTrust.trustLevel === 'high' ? (
              <><ShieldCheck className="h-3 w-3 mr-1" /> Authentic</>
            ) : (
              <><AlertTriangle className="h-3 w-3 mr-1" /> {exifTrust.trustLevel === 'low' ? 'Low Trust' : 'Medium Trust'}</>
            )}
          </Badge>
        </div>
      )}
      {exifTrust && exifTrust.trustLevel !== 'high' && (
        <p className="text-xs text-warning italic">{exifTrust.reason}</p>
      )}
    </div>
  );
}
