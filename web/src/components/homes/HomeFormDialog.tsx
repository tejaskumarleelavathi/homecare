import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import type { Home, HomeInput } from "@/types/home";
import { US_STATES } from "@/lib/us-states";
import { createHome, updateHome, ApiError } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_FORM: HomeInput = {
  street: "",
  city: "",
  state: "",
  zip_code: "",
  emails: "",
  notes: "",
};

interface HomeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  home: Home | null;
  onSaved: (home: Home) => void;
}

export function HomeFormDialog({ open, onOpenChange, home, onSaved }: HomeFormDialogProps) {
  const [form, setForm] = useState<HomeInput>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(home);

  useEffect(() => {
    if (open) {
      setForm(
        home
          ? {
              street: home.street,
              city: home.city,
              state: home.state,
              zip_code: home.zip_code,
              emails: home.emails ?? "",
              notes: home.notes ?? "",
            }
          : EMPTY_FORM,
      );
      setError("");
      setIsSubmitting(false);
    }
  }, [open, home]);

  function updateField<K extends keyof HomeInput>(key: K, value: HomeInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: HomeInput = {
      street: form.street.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip_code: form.zip_code.trim(),
      emails: form.emails.trim(),
      notes: form.notes.trim(),
    };

    if (!payload.street || !payload.city || !payload.state || !payload.zip_code) {
      setError("Street, city, state, and zip code are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const saved = isEditing
        ? await updateHome(home!.home_id, payload)
        : await createHome(payload);
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
            <DialogTitle>{isEditing ? `Edit ${home?.home_id ? `HM-${home.home_id}` : "home"}` : "Add a home"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="home-street">Street</Label>
              <Input
                id="home-street"
                placeholder="482 Maple Ridge Ln"
                value={form.street}
                onChange={(e) => updateField("street", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="home-city">City</Label>
                <Input
                  id="home-city"
                  placeholder="Charlotte"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="home-state">State</Label>
                <Select value={form.state} onValueChange={(v) => updateField("state", v)}>
                  <SelectTrigger id="home-state" className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="home-zip">Zip code</Label>
              <Input
                id="home-zip"
                placeholder="28202"
                inputMode="numeric"
                maxLength={10}
                value={form.zip_code}
                onChange={(e) => updateField("zip_code", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="home-emails">Emails</Label>
              <Input
                id="home-emails"
                placeholder="owner@homecare.com;second@homecare.com"
                value={form.emails}
                onChange={(e) => updateField("emails", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate multiple emails with a semicolon.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="home-notes">Notes</Label>
              <Textarea
                id="home-notes"
                placeholder="Optional notes about this home…"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
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
              {isEditing ? "Save changes" : "Add home"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
