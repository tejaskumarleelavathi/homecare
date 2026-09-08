import { useEffect, useState } from "react";
import { AlertCircle, ClipboardList, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";

import type { WorkStatus } from "@/types/work-status";
import { fetchWorkStatuses, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WorkStatusFormDialog } from "@/components/work-status/WorkStatusFormDialog";

function formatTimestamp(value: string) {
  if (!value) return "";
  const isoLike = value.includes("T")
    ? value
    : value.includes(" ")
    ? value.replace(" ", "T")
    : value;
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function WorkStatusPage() {
  const [statuses, setStatuses] = useState<WorkStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<WorkStatus | null>(null);

  async function loadStatuses() {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchWorkStatuses();
      setStatuses(data);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Couldn't reach the homecare API. Is the server running on port 4000?",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStatuses();
  }, []);

  function openAddDialog() {
    setEditingStatus(null);
    setDialogOpen(true);
  }

  function openEditDialog(status: WorkStatus) {
    setEditingStatus(status);
    setDialogOpen(true);
  }

  function handleSaved(status: WorkStatus) {
    setStatuses((prev) => {
      const exists = prev.some((s) => s.work_status_id === status.work_status_id);
      return exists
        ? prev.map((s) => (s.work_status_id === status.work_status_id ? status : s))
        : [...prev, status];
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Work Status</h1>
        <Button onClick={openAddDialog} disabled={isLoading || Boolean(loadError)}>
          <Plus className="size-4" />
          Add status
        </Button>
      </div>

      {loadError ? (
        <Card className="flex flex-col items-center gap-3 border border-destructive/40 px-6 py-16 text-center shadow-lg shadow-black/[0.08]">
          <div className="flex size-12 items-center justify-center rounded-full border border-destructive/40 text-destructive">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Couldn't load statuses</p>
            <p className="text-sm text-muted-foreground">{loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadStatuses}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </Card>
      ) : (
        <Card className="py-0 shadow-lg shadow-black/[0.08]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading statuses…" : `${statuses.length} status${statuses.length === 1 ? "" : "es"}`}
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <p className="text-sm">Fetching statuses from the database…</p>
            </div>
          ) : statuses.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full border border-border text-muted-foreground">
                <ClipboardList className="size-5" />
              </div>
              <p className="text-sm font-medium">No statuses yet</p>
              <Button variant="outline" size="sm" onClick={openAddDialog}>
                <Plus className="size-3.5" />
                Add status
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statuses.map((status, index) => (
                    <TableRow
                      key={status.work_status_id}
                      className={cn(index % 2 === 1 && "bg-muted/40")}
                    >
                      <TableCell className="font-medium">{status.work_status_id}</TableCell>
                      <TableCell className="font-medium">{status.status_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {status.status_description}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatTimestamp(status.created_at)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatTimestamp(status.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit status ${status.status_name}`}
                          onClick={() => openEditDialog(status)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      <WorkStatusFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workStatus={editingStatus}
        onSaved={handleSaved}
      />
    </div>
  );
}
