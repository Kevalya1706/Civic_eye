import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LowConfidenceWarningProps {
  confidence: number;
  onRetake: () => void;
}

export default function LowConfidenceWarning({ confidence, onRetake }: LowConfidenceWarningProps) {
  return (
    <div className="glass-card rounded-2xl p-4 border-warning/30 bg-warning/5 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <Camera className="h-5 w-5 text-warning mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Detection Uncertain ({Math.round(confidence * 100)}%)</p>
          <p className="text-xs text-muted-foreground mt-1">
            AI confidence is below 92%. Please take a clearer photo from a different angle for accurate classification.
          </p>
          <Button variant="civic-outline" size="sm" className="mt-2 text-xs h-7" onClick={onRetake}>
            <Camera className="h-3 w-3 mr-1" /> Retake Photo
          </Button>
        </div>
      </div>
    </div>
  );
}
