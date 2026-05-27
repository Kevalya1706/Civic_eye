import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Eye, Loader2, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TicketRow } from "@/hooks/useTickets";
import { useUpdateTicket } from "@/hooks/useTickets";

interface Props {
  ticket: TicketRow | null;
  open: boolean;
  onClose: () => void;
}

type ImgState = "loading" | "success" | "error";

function resolveTicketImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) return s;
  const cleaned = s.replace(/^\/+/, "").replace(/^ticket-photos\//, "");
  const { data } = supabase.storage.from("ticket-photos").getPublicUrl(cleaned);
  return data?.publicUrl || null;
}

type Phase = "idle" | "uploading" | "processing" | "verified" | "fraud";

export default function EvidenceClosureModal({ ticket, open, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState<number | null>(null);
  const [critique, setCritique] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [beforeImgState, setBeforeImgState] = useState<ImgState>("loading");
  const updateTicket = useUpdateTicket();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when modal closes or ticket changes
  useEffect(() => {
    if (!open) {
      setFile(null);
      setPhase("idle");
      setScore(null);
      setCritique(null);
      setPreviewUrl(null);
    }
  }, [open, ticket?.id]);

  // Hydrate phase from ticket audit state when reopening
  useEffect(() => {
    if (!ticket) return;
    if (ticket.ai_audit_status === "VERIFIED_SUCCESS") {
      setPhase("verified");
      setScore(ticket.ai_integrity_score ?? null);
    } else if (ticket.ai_audit_status === "FAILED_FRAUD") {
      setPhase("fraud");
      setCritique((ticket.ai_analysis_notes as any)?.engineering_critique || null);
    }
  }, [ticket]);

  if (!ticket) return null;

  const beforeImg = ticket.image_url || ticket.photo_url;
  const repairImg = previewUrl || ticket.resolution_image_url || ticket.fixed_photo_url;
  const frozen = phase === "uploading" || phase === "processing";

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file || !ticket) return;
    setPhase("uploading");
    try {
      const ts = Date.now();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `resolutions/${ticket.id}_${ts}.${ext === "jpeg" ? "jpg" : ext}`;
      const { error: upErr } = await supabase.storage
        .from("ticket-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("ticket-photos").getPublicUrl(path);
      const resolution_image_url = pub.publicUrl;

      await new Promise<void>((resolve, reject) =>
        updateTicket.mutate(
          {
            id: ticket.id,
            resolution_image_url,
            fixed_photo_url: resolution_image_url,
            ai_audit_status: "PROCESSING",
          },
          { onSuccess: () => resolve(), onError: (e) => reject(e) }
        )
      );

      setPhase("processing");

      const { data, error } = await supabase.functions.invoke("verify-resolution", {
        body: { ticket_id: ticket.id },
      });
      if (error) throw error;

      if (data?.status === "VERIFIED_SUCCESS") {
        setScore(data.score ?? null);
        setPhase("verified");
        await new Promise<void>((resolve) =>
          updateTicket.mutate(
            {
              id: ticket.id,
              status: "Resolved",
              resolved_at: new Date().toISOString(),
            },
            { onSuccess: () => resolve(), onError: () => resolve() }
          )
        );
        toast.success(`✓ AI Integrity Verified (${data.score ?? 0}%)`);
      } else {
        const eng = data?.result?.engineering_critique || "Repair could not be verified.";
        setCritique(eng);
        setPhase("fraud");
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await new Promise<void>((resolve) =>
          updateTicket.mutate(
            {
              id: ticket.id,
              status: "In Progress",
              ai_audit_status: "FAILED_FRAUD",
              resolved_at: null,
            },
            { onSuccess: () => resolve(), onError: () => resolve() }
          )
        );
        toast.error("⚠️ Fraud Alert: Resolution Rejected By AI");
      }
    } catch (e: any) {
      setPhase("idle");
      toast.error(e.message || "Upload failed");
    }
  };

  const isFraud = phase === "fraud";
  const isVerified = phase === "verified";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !frozen && onClose()}>
      <DialogContent
        className={`max-w-2xl transition-colors ${
          isFraud ? "ring-2 ring-destructive border-destructive/60" : ""
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">
            Evidence-Based Closure — {ticket.category}
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {ticket.lat.toFixed(6)}° N, {ticket.lng.toFixed(6)}° E
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            {/* BEFORE */}
            <div className={`rounded-xl border p-3 space-y-2 ${isFraud ? "border-destructive/40" : "border-border"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before Photo</p>
              <div className="h-40 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                {beforeImg ? (
                  <img src={beforeImg} alt="Before" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground animate-pulse">Fetching Original Evidence...</span>
                )}
              </div>
            </div>

            {/* AFTER / UPLOAD */}
            <div
              className={`relative rounded-xl border p-3 space-y-2 ${
                isFraud
                  ? "border-destructive/50 bg-destructive/5"
                  : isVerified
                  ? "border-success/50 shadow-[0_0_18px_-4px_hsl(var(--success)/0.55)]"
                  : "border-border"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upload "Fixed" Photo</p>
              <label className="block h-40 rounded-lg bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={frozen || isVerified}
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
                {repairImg ? (
                  <img src={repairImg} alt="Fixed" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Drop or click to upload</span>
                  </div>
                )}
              </label>

              {isVerified && score !== null && (
                <div className="absolute top-2 right-2 rounded-full bg-success text-success-foreground px-2 py-0.5 text-[10px] font-bold shadow-md flex items-center gap-1 animate-fade-in">
                  <ShieldCheck className="h-3 w-3" /> AI Integrity Verified ({score}%)
                </div>
              )}
              {phase === "processing" && (
                <div className="absolute top-2 right-2 rounded-full bg-primary/90 text-primary-foreground px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> AI Auditing…
                </div>
              )}
            </div>
          </div>

          {/* AI Verification banner */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs text-foreground">
              <span className="font-semibold">AI Verification:</span> Before &amp; after photos will be compared to validate the fix.
            </p>
          </div>

          {/* Fraud critique */}
          {isFraud && critique && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                Engineering Critique
              </div>
              <p className="leading-relaxed">{critique}</p>
            </div>
          )}

          <Button
            variant="civic"
            className="w-full"
            disabled={!file || frozen || isVerified}
            onClick={handleSubmit}
          >
            {phase === "uploading" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 🤖 Uploading & Launching AI Audit Pipeline...</>}
            {phase === "processing" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 🤖 AI Auditing Repair Quality... Please hold</>}
            {phase === "verified" && <>✓ Resolved</>}
            {(phase === "idle" || phase === "fraud") && "Upload Fix Photo to Resolve"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
