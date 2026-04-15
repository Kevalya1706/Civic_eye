import { useState, useEffect, useCallback } from "react";
import { Camera, MapPin, Upload, Loader2, CheckCircle, AlertTriangle, LocateFixed, Hash, ShieldAlert, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { getDepartmentForCategory, calculatePriorityScore } from "@/lib/mockData";
import {
  classifyIssue,
  validateScene,
  hashImage,
  checkExifTrust,
  CONFIDENCE_THRESHOLD,
  type ClassificationResult,
  type ExifTrust,
} from "@/lib/civicGuard";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useCreateTicket } from "@/hooks/useTickets";
import { useNavigate } from "react-router-dom";
import SceneRejection from "@/components/report/SceneRejection";
import ClassificationCard from "@/components/report/ClassificationCard";
import LowConfidenceWarning from "@/components/report/LowConfidenceWarning";

type Step = 'upload' | 'validating' | 'classify' | 'details' | 'confirm' | 'done';

export default function ReportIssue() {
  const { toast } = useToast();
  const geo = useGeolocation();
  const { userId, displayName } = useSupabaseAuth();
  const createTicket = useCreateTicket();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [duplicateFound, setDuplicateFound] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Rejection states
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [aiBlocked, setAiBlocked] = useState(false);

  // Classification pipeline results
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [exifTrust, setExifTrust] = useState<ExifTrust | null>(null);

  useEffect(() => { geo.requestLocation(); }, []);

  const resetFlow = useCallback(() => {
    setStep('upload');
    setImagePreview(null);
    setImageHash(null);
    setDescription('');
    setClassification(null);
    setExifTrust(null);
    setSceneError(null);
    setAiBlocked(false);
    setDuplicateFound(false);
  }, []);

  // ─── File Upload Handler ────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setSceneError(null);
      setAiBlocked(false);

      // Step 0: Synthetic media check (5% simulated block rate)
      if (Math.random() < 0.05) {
        setAiBlocked(true);
        return;
      }

      // SHA-256 hash for duplicate detection
      setStep('validating');
      const hash = await hashImage(dataUrl);
      setImageHash(hash);

      // EXIF trust check
      const trust = checkExifTrust(geo.lat, geo.lng);
      setExifTrust(trust);

      // Proceed to AI classification
      runClassification();
    };
    reader.readAsDataURL(file);
  };

  // ─── Classification Pipeline ────────────────────────────────────────────
  const runClassification = useCallback(() => {
    setStep('classify');
    setTimeout(() => {
      const result = classifyIssue(description);
      setClassification(result);
      setDuplicateFound(Math.random() > 0.7);
      setStep('details');
    }, 2200);
  }, [description]);

  // Re-classify when description changes on details step
  useEffect(() => {
    if (step === 'details' && description.length > 3) {
      // Scene validation first
      const scene = validateScene(description);
      if (!scene.valid) {
        setSceneError(scene.reason || 'Invalid scene');
        return;
      }
      setSceneError(null);
      const result = classifyIssue(description);
      setClassification(result);
    }
  }, [description, step]);

  // ─── Manual Location ────────────────────────────────────────────────────
  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      geo.setManualLocation(lat, lng);
      toast({ title: "Location set manually", description: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
    }
  };

  // ─── Submit ─────────────────────────────────────────────────────────────
  const handleSubmitClick = () => {
    if (!classification?.category) return;
    if (!classification.accepted) {
      toast({ title: "Low Confidence", description: "Please retake the photo for better classification.", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    setConfirmOpen(false);
    setStep('done');
    // Metadata tagging: precision_tier for Supabase entry
    const precisionTier = geo.precisionTier;
    console.log('[CivicEye] Ticket metadata:', { precision_tier: precisionTier, accuracy: geo.accuracy });
    toast({
      title: "Issue Reported! 🎉",
      description: `Routed to ${classification?.department}. Precision: ${precisionTier}. You earned +10 Civic Points.`,
    });
  };

  const stepIndex = ['upload', 'validating', 'classify', 'details', 'done'].indexOf(
    step === 'confirm' ? 'details' : step === 'validating' ? 'classify' : step
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="container max-w-lg py-8 space-y-6 flex-1">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gradient-navy">Report an Issue</h1>
          <p className="text-sm text-muted-foreground mt-1">Snap, classify, submit — powered by CivicGuard AI</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 justify-center">
          {['Upload', 'AI Scan', 'Details', 'Done'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i <= stepIndex ? 'gradient-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i < stepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              {i < 3 && <div className={`w-8 h-0.5 ${i < stepIndex ? 'bg-accent' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* AI-Generated Image Block */}
        {aiBlocked && (
          <SceneRejection
            message="Image detected as AI-Generated. Please provide a real-time, authentic photo of the issue."
            onRetry={resetFlow}
          />
        )}

        {/* Scene Rejection (non-civic object) */}
        {sceneError && !aiBlocked && (
          <SceneRejection message={sceneError} onRetry={resetFlow} />
        )}

        {/* ── Upload Step ──────────────────────────────────────────────── */}
        {step === 'upload' && !aiBlocked && !sceneError && (
          <div className="glass-card rounded-2xl p-8 text-center space-y-4 animate-fade-in-up">
            <div className="h-20 w-20 rounded-2xl gradient-accent flex items-center justify-center mx-auto">
              <Camera className="h-10 w-10 text-accent-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Take a photo or upload an image of the issue</p>

            {/* GPS Lock Status — Traffic Light */}
            <div className="space-y-2">
            {geo.loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Loader2 className="h-3 w-3 animate-spin" /> Acquiring satellite signal...
                </div>
              ) : geo.lat && geo.lng ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs justify-center">
                    <Satellite className="h-3 w-3" />
                    {geo.precisionTier === "high" && (
                      <span className="text-[hsl(var(--accent))] font-semibold">🟢 High Precision Lock — Accuracy: {geo.accuracy}m</span>
                    )}
                    {geo.precisionTier === "standard" && (
                      <span className="font-semibold" style={{ color: '#FFD700' }}>
                        🟡 Standard Precision — Accuracy: {geo.accuracy}m
                        {!geo.locked && ` (stable ${geo.stableSeconds}s/5s)`}
                        {geo.locked && ' ✓ Stable'}
                      </span>
                    )}
                    {geo.precisionTier === "low" && (
                      <span className="text-muted-foreground">⚪ Waiting for Signal ({geo.accuracy}m &gt;20m)...</span>
                    )}
                  </div>

                  {/* Live Address Badge — progressively narrows as GPS stabilizes */}
                  <div className="glass-card rounded-lg p-2.5 text-left space-y-1 border border-border/50">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        {geo.parsedAddress.fullPrecise || geo.address}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {geo.parsedAddress.premise && (
                        <Badge variant="outline" className="text-[10px] h-4 bg-accent/10 border-accent/20">
                          🏠 {geo.parsedAddress.premise}
                        </Badge>
                      )}
                      {geo.parsedAddress.sublocality2 && (
                        <Badge variant="outline" className="text-[10px] h-4 bg-primary/10 border-primary/20">
                          📍 {geo.parsedAddress.sublocality2}
                        </Badge>
                      )}
                      {geo.parsedAddress.neighborhood && (
                        <Badge variant="outline" className="text-[10px] h-4 bg-info/10 border-info/20">
                          🏘️ {geo.parsedAddress.neighborhood}
                        </Badge>
                      )}
                      {geo.parsedAddress.city && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          🌆 {geo.parsedAddress.city}
                        </Badge>
                      )}
                    </div>
                    {geo.parsedAddress.plusCode && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <span>📌 Plus Code:</span>
                        <span className="font-semibold text-foreground">{geo.parsedAddress.plusCode}</span>
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      GPS: {geo.lat}° N, {geo.lng}° E
                    </div>
                  </div>

                  {geo.precisionTier === "standard" && !geo.locked && (
                    <div className="w-full max-w-[200px] mx-auto h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, (geo.stableSeconds / 5) * 100)}%`, backgroundColor: '#FFD700' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-destructive">{geo.error || "GPS unavailable"}</p>
                  <p className="text-xs text-muted-foreground">Enter coordinates manually:</p>
                  <div className="flex gap-2">
                    <Input placeholder="Latitude" value={manualLat} onChange={e => setManualLat(e.target.value)} className="text-xs h-8" />
                    <Input placeholder="Longitude" value={manualLng} onChange={e => setManualLng(e.target.value)} className="text-xs h-8" />
                    <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={handleManualLocation}>
                      <LocateFixed className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {!geo.loading && geo.lat && !geo.locked && (
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={geo.requestLocation}>
                  <LocateFixed className="h-3 w-3 mr-1" /> Retry for better signal
                </Button>
              )}
              {!geo.loading && geo.lat && geo.locked && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={geo.requestLocation}>
                  <LocateFixed className="h-3 w-3 mr-1" /> Re-fetch GPS
                </Button>
              )}
            </div>

            {/* Upload — Traffic Light Button */}
            {(() => {
              const canUpload = geo.locked;
              const tier = geo.precisionTier;
              const btnStyle = tier === "high"
                ? { backgroundColor: '#C1FF00', color: '#1A2B6D' }
                : tier === "standard" && canUpload
                  ? { backgroundColor: '#FFD700', color: '#1A2B6D' }
                  : {};
              const label = tier === "high"
                ? "High Precision Lock"
                : tier === "standard" && canUpload
                  ? "Standard Precision"
                  : "Waiting for Signal (>20m)...";
              return (
                <label className={`cursor-pointer ${!canUpload ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} disabled={!canUpload} />
                  <Button size="lg" className="w-full font-semibold shadow-lg" style={canUpload ? btnStyle : {}} asChild disabled={!canUpload}>
                    <span><Upload className="h-5 w-5 mr-2" /> {canUpload ? 'Capture / Upload Photo' : label}</span>
                  </Button>
                </label>
              );
            })()}
            {!geo.locked && geo.lat && (
              <p className="text-xs text-muted-foreground">📡 Stabilizing GPS signal before enabling upload...</p>
            )}
          </div>
        )}

        {/* ── Validating / Classifying ─────────────────────────────────── */}
        {(step === 'validating' || step === 'classify') && (
          <div className="glass-card rounded-2xl p-8 text-center space-y-4 animate-fade-in-up">
            {imagePreview && (
              <img src={imagePreview} alt="Uploaded" className="w-full h-48 object-cover rounded-xl" />
            )}
            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
            <p className="text-sm font-medium text-foreground">
              {step === 'validating' ? 'Running CivicGuard Pre-Processor...' : 'Triple-Pass Classification Engine...'}
            </p>
            <p className="text-xs text-muted-foreground">
              {step === 'validating'
                ? 'SHA-256 hashing • EXIF metadata extraction • Scene validation'
                : 'Tier 1: Detection → Tier 2: Taxonomy → Tier 3: Confidence threshold'}
            </p>
            {imageHash && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground justify-center font-mono">
                <Hash className="h-3 w-3" /> {imageHash.substring(0, 16)}…
              </div>
            )}
          </div>
        )}

        {/* ── Details Step ─────────────────────────────────────────────── */}
        {(step === 'details' || step === 'confirm') && !sceneError && (
          <div className="space-y-4 animate-fade-in-up">
            {imagePreview && (
              <img src={imagePreview} alt="Uploaded" className="w-full h-48 object-cover rounded-xl" />
            )}

            {classification && (
              <ClassificationCard
                result={classification}
                exifTrust={exifTrust}
                address={geo.address}
                lat={geo.lat}
                lng={geo.lng}
                plusCode={geo.parsedAddress.plusCode}
                parsedAddress={geo.parsedAddress}
              />
            )}

            {/* Image hash */}
            {imageHash && (
              <div className="glass-card rounded-xl p-3 flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">SHA-256:</span>
                <span className="text-xs font-mono text-foreground truncate">{imageHash}</span>
              </div>
            )}

            {/* Low confidence warning */}
            {classification && !classification.accepted && (
              <LowConfidenceWarning confidence={classification.confidence} onRetake={resetFlow} />
            )}

            {/* Duplicate warning */}
            {duplicateFound && (
              <div className="glass-card rounded-2xl p-4 border-warning/30 bg-warning/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Similar ticket found nearby!</p>
                    <p className="text-xs text-muted-foreground mt-1">A report within 10m already exists. Consider upvoting it instead.</p>
                    <Button variant="civic-outline" size="sm" className="mt-2 text-xs h-7">
                      View & Upvote Existing
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Textarea
              placeholder="Describe the issue (e.g., pothole on main road, water leak near pipe, pole tilting with sparks)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] bg-card"
            />

            <Button
              variant="civic"
              size="lg"
              className="w-full"
              onClick={handleSubmitClick}
              disabled={!classification?.accepted}
            >
              {classification?.accepted ? 'Submit Report' : 'Confidence Too Low — Retake Photo'}
            </Button>
          </div>
        )}

        {/* ── Confirmation Dialog ──────────────────────────────────────── */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Verify the detected classification before submitting:</p>
              <div className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-semibold text-foreground">{classification?.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-semibold text-foreground">{classification?.department}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <Badge variant="outline" className="bg-success/10 border-success/30 text-success text-xs">
                    {Math.round((classification?.confidence || 0) * 100)}%
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <span className="text-foreground">{geo.address || 'Unknown'}</span>
                </div>
                {imageHash && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Image Hash</span>
                    <span className="text-xs font-mono text-foreground">{imageHash.substring(0, 12)}…</span>
                  </div>
                )}
                {exifTrust && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">EXIF Trust</span>
                    <Badge variant="outline" className={`text-xs ${
                      exifTrust.trustLevel === 'high' ? 'text-success' : exifTrust.trustLevel === 'medium' ? 'text-warning' : 'text-destructive'
                    }`}>
                      {exifTrust.trustLevel === 'fraudulent' ? '🚨 FRAUDULENT' : exifTrust.trustLevel.toUpperCase()}
                    </Badge>
                  </div>
                )}
                {exifTrust && exifTrust.trustLevel === 'fraudulent' && (
                  <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-destructive font-medium flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> {exifTrust.reason}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">GPS offset: {exifTrust.gpsOffsetMeters}m from live location</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="civic" onClick={handleConfirmSubmit}>Confirm & Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Done ─────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="glass-card rounded-2xl p-8 text-center space-y-4 animate-fade-in-up">
            <div className="h-16 w-16 rounded-full gradient-accent flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-accent-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Report Submitted!</h2>
            <p className="text-sm text-muted-foreground">
              Classified as <strong>{classification?.category}</strong> and routed to <strong>{classification?.department}</strong>.
            </p>
            {imageHash && (
              <p className="text-xs font-mono text-muted-foreground">
                Hash: {imageHash.substring(0, 24)}…
              </p>
            )}
            <p className="text-xs text-accent-foreground font-medium bg-accent/10 inline-block px-3 py-1 rounded-full">
              +10 Civic Points Earned 🎉
            </p>
            <Button variant="navy" className="w-full" onClick={resetFlow}>
              Report Another Issue
            </Button>
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  );
}
