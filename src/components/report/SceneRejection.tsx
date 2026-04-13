import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SceneRejectionProps {
  message: string;
  onRetry: () => void;
}

export default function SceneRejection({ message, onRetry }: SceneRejectionProps) {
  return (
    <div className="glass-card rounded-2xl p-6 text-center space-y-3 border-destructive/30 bg-destructive/5 animate-fade-in-up">
      <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
      <h3 className="text-base font-bold text-destructive">Submission Blocked</h3>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry}>Try Again</Button>
    </div>
  );
}
