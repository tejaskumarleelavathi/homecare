import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { resizeImage } from "@/lib/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface PhotoCaptureProps {
  label: string;
  value: string | null;
  editable: boolean;
  onCapture: (blob: Blob) => Promise<void>;
  onClear?: () => Promise<void>;
}

export function PhotoCapture({ label, value, editable, onCapture, onClear }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsBusy(true);
    setError("");
    try {
      const blob = await resizeImage(file);
      await onCapture(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that photo.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClear(event: React.MouseEvent) {
    event.stopPropagation();
    if (!onClear) return;
    setIsBusy(true);
    setError("");
    try {
      await onClear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that photo.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="print:contents">
      <div className="relative inline-block print:hidden">
        <button
          type="button"
          onClick={() => (value ? setPreviewOpen(true) : editable && inputRef.current?.click())}
          disabled={isBusy}
          className={cn(
            "flex size-16 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors",
            editable && "hover:border-primary hover:text-primary",
            !editable && !value && "cursor-default opacity-50",
          )}
          aria-label={value ? `View ${label}` : `Capture ${label}`}
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : value ? (
            <img src={value} alt={label} className="size-full object-cover" />
          ) : editable ? (
            <Camera className="size-4" />
          ) : (
            <span className="text-[10px]">—</span>
          )}
        </button>

        {editable && value && !isBusy && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-primary"
            aria-label={`Retake ${label}`}
          >
            <Camera className="size-3" />
          </button>
        )}

        {editable && value && onClear && !isBusy && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute -bottom-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-destructive"
            aria-label={`Remove ${label}`}
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {value && (
        <img src={value} alt={label} className="hidden print:block print:h-28 print:w-28 print:object-cover" />
      )}

      {editable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {error && <p className="mt-1 w-16 text-[10px] text-destructive">{error}</p>}

      {value && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogTitle className="sr-only">{label}</DialogTitle>
            <img src={value} alt={label} className="w-full rounded-md" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
