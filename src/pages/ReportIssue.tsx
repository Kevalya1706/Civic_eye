import { useState, useEffect } from "react";
import { Camera, MapPin, Upload, Loader2, CheckCircle, AlertTriangle, LocateFixed, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { type TicketCategory, getDepartmentForCategory } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";

const KEYWORD_MAP: { keywords: string[]; category: TicketCategory }[] = [
  { keywords: ['pothole', 'road', 'crack', 'pavement'], category: 'Road Damage' },
  { keywords: ['pole', 'light', 'streetlight', 'lamp'], category: 'Pole Fault' },
  { keywords: ['leak', 'drainage', 'sewage', 'pipe', 'water leak'], category: 'Water Leak' },
  { keywords: ['overflow', 'waste', 'garbage', 'trash', 'dump'], category: 'Waste Overflow' },
  { keywords: ['drain', 'block', 'clog', 'flood'], category: 'Drainage Block' },
];

function classifyFromDescription(text: string): TicketCategory {
  const lower = text.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return entry.category;
    }
  }
  // Fallback: random from common
  const fallbacks: TicketCategory[] = ['Pothole', 'Road Damage', 'Water Leak'];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export default function ReportIssue() {
  const { toast } = useToast();
  const geo = useGeolocation();
  const [step, setStep] = useState<'upload' | 'classify' | 'details' | 'confirm' | 'done'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiCategory, setAiCategory] = useState<TicketCategory | null>(null);
  const [description, setDescription] = useState('');
  const [duplicateFound, setDuplicateFound] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [aiBlocked, setAiBlocked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    geo.requestLocation();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      // Simulate AI-generated image check (5% chance flagged)
      if (Math.random() < 0.05) {
        setAiBlocked(true);
        return;
      }
      setAiBlocked(false);
      simulateAI();
    };
    reader.readAsDataURL(file);
  };

  const simulateAI = () => {
    setStep('classify');
    setTimeout(() => {
      const cat = classifyFromDescription(description);
      setAiCategory(cat);
      setDuplicateFound(Math.random() > 0.7);
      setStep('details');
    }, 2000);
  };

  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      geo.setManualLocation(lat, lng);
      toast({ title: "Location set manually", description: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
    }
  };

  const handleSubmitClick = () => {
    if (!aiCategory) return;
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    setConfirmOpen(false);
    setStep('done');
    toast({
      title: "Issue Reported! 🎉",
      description: `Routed to ${getDepartmentForCategory(aiCategory!)}. You earned +10 Civic Points.`,
    });
  };

  // Re-classify when description changes and we're on details step
  useEffect(() => {
    if (step === 'details' && description.length > 3) {
      const newCat = classifyFromDescription(description);
      setAiCategory(newCat);
    }
  }, [description]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="container max-w-lg py-8 space-y-6 flex-1">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gradient-navy">Report an Issue</h1>
          <p className="text-sm text-muted-foreground mt-1">Snap, classify, submit — in 3 seconds</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 justify-center">
          {['Upload', 'AI Scan', 'Details', 'Done'].map((label, i) => {
            const stepIndex = ['upload', 'classify', 'details', 'done'].indexOf(step === 'confirm' ? 'details' : step);
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i <= stepIndex ? 'gradient-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {i < stepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                {i < 3 && <div className={`w-8 h-0.5 ${i < stepIndex ? 'bg-accent' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>

        {/* AI Blocked */}
        {aiBlocked && (
          <div className="glass-card rounded-2xl p-6 text-center space-y-3 border-destructive/30 bg-destructive/5 animate-fade-in-up">
            <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="text-base font-bold text-destructive">Invalid Submission</h3>
            <p className="text-sm text-muted-foreground">
              Image detected as AI-Generated. Please provide a real-time, authentic photo of the issue.
            </p>
            <Button variant="outline" onClick={() => { setAiBlocked(false); setImagePreview(null); setStep('upload'); }}>
              Try Again
            </Button>
          </div>
        )}

        {/* Upload Step */}
        {step === 'upload' && !aiBlocked && (
          <div className="glass-card rounded-2xl p-8 text-center space-y-4 animate-fade-in-up">
            <div className="h-20 w-20 rounded-2xl gradient-accent flex items-center justify-center mx-auto">
              <Camera className="h-10 w-10 text-accent-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Take a photo or upload an image of the issue</p>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              <Button variant="civic" size="lg" className="w-full" asChild>
                <span><Upload className="h-5 w-5 mr-2" /> Capture / Upload Photo</span>
              </Button>
            </label>

            {/* GPS Info */}
            <div className="space-y-2">
              {geo.loading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Acquiring high-precision GPS...</span>
                </div>
              ) : geo.lat && geo.lng ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <MapPin className="h-3 w-3" />
                  <span>GPS: {geo.lat}° N, {geo.lng}° E — {geo.address}</span>
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
              {!geo.loading && geo.lat && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={geo.requestLocation}>
                  <LocateFixed className="h-3 w-3 mr-1" /> Re-fetch GPS
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Classifying */}
        {step === 'classify' && (
          <div className="glass-card rounded-2xl p-8 text-center space-y-4 animate-fade-in-up">
            {imagePreview && (
              <img src={imagePreview} alt="Uploaded" className="w-full h-48 object-cover rounded-xl" />
            )}
            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
            <p className="text-sm font-medium text-foreground">AI is analyzing your photo...</p>
            <p className="text-xs text-muted-foreground">Running YOLOv8 classification & EXIF metadata check</p>
          </div>
        )}

        {/* Details Step */}
        {(step === 'details' || step === 'confirm') && (
          <div className="space-y-4 animate-fade-in-up">
            {imagePreview && (
              <img src={imagePreview} alt="Uploaded" className="w-full h-48 object-cover rounded-xl" />
            )}

            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">AI Classification</span>
                <Badge variant="outline" className="bg-accent/10 border-accent/30 text-accent-foreground font-semibold">
                  {aiCategory}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Department</span>
                <span className="text-sm font-semibold text-foreground">{aiCategory ? getDepartmentForCategory(aiCategory) : ''}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Location</span>
                <span className="text-sm text-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {geo.address || "Unknown"}
                </span>
              </div>
              {geo.lat && geo.lng && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Coordinates</span>
                  <span className="text-xs font-mono text-foreground">{geo.lat}, {geo.lng}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">EXIF Check</span>
                <Badge variant="outline" className="bg-success/10 border-success/30 text-success text-xs">
                  ✓ Authentic
                </Badge>
              </div>
            </div>

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
              placeholder="Add additional context (e.g., pothole, water leak, pole fault)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] bg-card"
            />

            <Button variant="civic" size="lg" className="w-full" onClick={handleSubmitClick}>
              Submit Report
            </Button>
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Please verify the detected classification before submitting:</p>
              <div className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-semibold text-foreground">{aiCategory}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-semibold text-foreground">{aiCategory ? getDepartmentForCategory(aiCategory) : ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <span className="text-foreground">{geo.address || 'Unknown'}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="civic" onClick={handleConfirmSubmit}>Confirm & Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Done */}
        {step === 'done' && (
          <div className="glass-card rounded-2xl p-8 text-center space-y-4 animate-fade-in-up">
            <div className="h-16 w-16 rounded-full gradient-accent flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-accent-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Report Submitted!</h2>
            <p className="text-sm text-muted-foreground">
              Your report has been classified as <strong>{aiCategory}</strong> and routed to <strong>{aiCategory ? getDepartmentForCategory(aiCategory) : ''}</strong>.
            </p>
            <p className="text-xs text-accent-foreground font-medium bg-accent/10 inline-block px-3 py-1 rounded-full">
              +10 Civic Points Earned 🎉
            </p>
            <Button variant="navy" className="w-full" onClick={() => { setStep('upload'); setImagePreview(null); setAiCategory(null); setDescription(''); }}>
              Report Another Issue
            </Button>
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  );
}
