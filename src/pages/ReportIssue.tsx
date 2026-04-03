import { useState } from "react";
import { Camera, MapPin, Upload, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import AppHeader from "@/components/AppHeader";
import { type TicketCategory, getDepartmentForCategory } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES: TicketCategory[] = ['Pothole', 'Pole Fault', 'Water Leak', 'Waste Overflow', 'Drainage Block', 'Road Damage'];

export default function ReportIssue() {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'classify' | 'details' | 'done'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiCategory, setAiCategory] = useState<TicketCategory | null>(null);
  const [description, setDescription] = useState('');
  const [duplicateFound, setDuplicateFound] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      simulateAI();
    };
    reader.readAsDataURL(file);
  };

  const simulateAI = () => {
    setStep('classify');
    setTimeout(() => {
      const randomCat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      setAiCategory(randomCat);
      const hasDuplicate = Math.random() > 0.7;
      setDuplicateFound(hasDuplicate);
      setStep('details');
    }, 2000);
  };

  const handleSubmit = () => {
    if (!aiCategory) return;
    setStep('done');
    toast({
      title: "Issue Reported! 🎉",
      description: `Routed to ${getDepartmentForCategory(aiCategory)}. You earned +10 Civic Points.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container max-w-lg py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gradient-navy">Report an Issue</h1>
          <p className="text-sm text-muted-foreground mt-1">Snap, classify, submit — in 3 seconds</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 justify-center">
          {['Upload', 'AI Scan', 'Details', 'Done'].map((label, i) => {
            const stepIndex = ['upload', 'classify', 'details', 'done'].indexOf(step);
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

        {/* Upload Step */}
        {step === 'upload' && (
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <MapPin className="h-3 w-3" />
              <span>GPS: 18.5204° N, 73.8567° E — FC Road, Pune</span>
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
        {step === 'details' && (
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
                  <MapPin className="h-3 w-3" /> FC Road, Pune
                </span>
              </div>
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
              placeholder="Add additional context about the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] bg-card"
            />

            <Button variant="civic" size="lg" className="w-full" onClick={handleSubmit}>
              Submit Report
            </Button>
          </div>
        )}

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
    </div>
  );
}
