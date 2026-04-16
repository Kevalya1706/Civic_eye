import { MapPin, ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ClassificationResult, ExifTrust } from "@/lib/civicGuard";

interface ClassificationCardProps {
  result: ClassificationResult;
  exifTrust: ExifTrust | null;
  address: string;
  lat: number | null;
  lng: number | null;
  plusCode?: string;
  parsedAddress?: { premise: string; sublocality2: string; neighborhood: string; city: string; fullPrecise: string };
}

export default function ClassificationCard({ result, exifTrust, address, lat, lng, plusCode, parsedAddress }: ClassificationCardProps) {
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

      {/* Tier 3: Confidence (v8.0 threshold ≥75%) */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Tier 3 — Confidence</span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${confidencePct >= 75 ? 'bg-success' : confidencePct >= 60 ? 'bg-warning' : 'bg-destructive'}`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
          <span className={`text-xs font-bold ${confidencePct >= 75 ? 'text-success' : 'text-warning'}`}>
            {confidencePct}%
          </span>
        </div>
      </div>

      {/* Contextual Pass indicator */}
      {result.isContextualPass && (
        <div className="text-xs p-2 rounded-md bg-info/10 border border-info/20 text-foreground">
          🧠 <strong>General Infrastructure Issue</strong> — civic context detected, specific fault unclassified.
        </div>
      )}

      {/* CoT Reasoning */}
      {result.cot && (
        <div className="text-[11px] text-muted-foreground italic font-mono pt-1 border-t border-border/30">
          CoT: {result.cot.reasoning}
        </div>
      )}

      {/* Department */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Department</span>
        <span className="text-sm font-semibold text-foreground">{result.department || '—'}</span>
      </div>

      {/* Location — Civic Descriptor */}
      <div className="space-y-1.5 pt-1 border-t border-border/30">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-muted-foreground">Civic Address</span>
          <span className="text-sm text-foreground text-right max-w-[60%] flex items-start gap-1">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{parsedAddress?.fullPrecise || address || "Unknown"}</span>
          </span>
        </div>
        {parsedAddress?.premise && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Premise/Gut No.</span>
            <span className="text-xs font-semibold text-foreground">{parsedAddress.premise}</span>
          </div>
        )}
        {parsedAddress?.sublocality2 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Lane/Road</span>
            <span className="text-xs text-foreground">{parsedAddress.sublocality2}</span>
          </div>
        )}
        {parsedAddress?.neighborhood && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Neighborhood</span>
            <span className="text-xs text-foreground">{parsedAddress.neighborhood}</span>
          </div>
        )}
        {plusCode && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Plus Code</span>
            <span className="text-xs font-mono font-semibold text-accent-foreground bg-accent/10 px-1.5 py-0.5 rounded">{plusCode}</span>
          </div>
        )}
        {lat && lng && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Coordinates</span>
            <span className="text-xs font-mono text-foreground">{lat}, {lng}</span>
          </div>
        )}
      </div>

      {/* EXIF Trust */}
      {exifTrust && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">EXIF Trust</span>
          <Badge
            variant="outline"
            className={`text-xs ${
              exifTrust.trustLevel === 'high'
                ? 'bg-success/10 border-success/30 text-success'
                : exifTrust.trustLevel === 'fraudulent'
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : exifTrust.trustLevel === 'medium'
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            {exifTrust.trustLevel === 'high' ? (
              <><ShieldCheck className="h-3 w-3 mr-1" /> Authentic</>
            ) : exifTrust.trustLevel === 'fraudulent' ? (
              <><ShieldAlert className="h-3 w-3 mr-1" /> Fraudulent/Spoofed</>
            ) : (
              <><AlertTriangle className="h-3 w-3 mr-1" /> {exifTrust.trustLevel === 'low' ? 'Low Trust' : 'Medium Trust'}</>
            )}
          </Badge>
        </div>
      )}
      {exifTrust && exifTrust.trustLevel === 'fraudulent' && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
          <p className="text-xs text-destructive font-semibold flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" /> GPS Spoofing Detected
          </p>
          <p className="text-xs text-destructive/80">{exifTrust.reason}</p>
          <p className="text-xs text-muted-foreground">EXIF ↔ Live GPS offset: {exifTrust.gpsOffsetMeters}m (threshold: 50m)</p>
        </div>
      )}
      {exifTrust && exifTrust.trustLevel !== 'high' && exifTrust.trustLevel !== 'fraudulent' && (
        <p className="text-xs text-warning italic">{exifTrust.reason}</p>
      )}
    </div>
  );
}
