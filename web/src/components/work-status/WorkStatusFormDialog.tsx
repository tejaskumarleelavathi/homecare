import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import type { WorkStatus, WorkStatusInput } from "@/types/work-status";
import { createWorkStatus, updateWorkStatus, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMPTY_FORM: WorkStatusInput = {
  status_name: "",
  status_description: "",
};

interface WorkStatusFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workStatus: WorkStatus | null;
  onSaved: (workStatus: WorkStatus) => void;
}

export function WorkStatusFormDialog({
  open,
  onOpenChange,
  workStatus,
  onSaved,
}: WorkStatusFormDialogProps) {
  const [form, setForm] = useState<WorkStatusInput>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(workStatus);

  useEffect(() => {
    if (open) {
      setForm(
        workStatus
          ? {
              status_name: workStatus.status_name,
              status_description: workStatus.status_description,
            }
          : EMPTY_FORM,
      );
      setError("");
      setIsSubmitting(false);
    }
  }, [open, workStatus]);

  function updateField<K extends keyof WorkStatusInput>(key: K, value: WorkStatusInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: WorkStatusInput = {
      status_name: form.status_name.trim(),
      status_description: form.status_description.trim(),
    };

    if (!payload.status_name || !payload.status_description) {
      setError("Status name and description are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const saved = isEditing
        ? await updateWorkStatus(workStatus!.work_status_id, payload)
        : await createWorkStatus(payload);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="text-center">
            <DialogTitle>{isEditing ? "Edit status" : "Add a status"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status-name">Status name</Label>
              <Input
                id="status-name"
                placeholder="On Hold"
                value={form.status_name}
                onChange={(e) => updateField("status_name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-description">Description</Label>
              <Textarea
                id="status-description"
                placeholder="What this status means…"
                value={form.status_description}
                onChange={(e) => updateField("status_description", e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? "Save changes" : "Add status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
