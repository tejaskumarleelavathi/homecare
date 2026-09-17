import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CalendarOff,
  Info,
  Loader2,
  Mail,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import type { Home } from "@/types/home";
import type { InspectionDayView, InspectionItem } from "@/types/inspection";
import type { WorkStatus } from "@/types/work-status";
import {
  ApiError,
  deleteInspectionDay,
  fetchHomes,
  fetchInspectionDay,
  fetchWorkStatuses,
  rescheduleInspection,
  scheduleInspection,
  sendInspectionReportEmailApi,
  updateInspectionItem,
  uploadInspectionPhoto,
} from "@/lib/api";
import { fromDateStr, formatDateStr, toDateStr, todayStr } from "@/lib/date";
import { exportInspectionPdf } from "@/lib/pdf-export";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HomeCombobox } from "@/components/inspections/HomeCombobox";
import { SchedulePopover } from "@/components/inspections/SchedulePopover";
import { PhotoCapture } from "@/components/inspections/PhotoCapture";

export function InspectionsPage() {
  const [homes, setHomes] = useState<Home[]>([]);
  const [homesLoading, setHomesLoading] = useState(true);
  const [homesError, setHomesError] = useState("");

  const [statuses, setStatuses] = useState<WorkStatus[]>([]);

  const [selectedHomeId, setSelectedHomeId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [dayView, setDayView] = useState<InspectionDayView | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState("");

  useEffect(() => {
    fetchHomes()
      .then((data) => {
        setHomes(data);
        if (data.length > 0) setSelectedHomeId(data[0].home_id);
      })
      .catch((err) =>
        setHomesError(err instanceof ApiError ? err.message : "Couldn't load homes."),
      )
      .finally(() => setHomesLoading(false));

    fetchWorkStatuses()
      .then(setStatuses)
      .catch(() => {});
  }, []);

  async function loadDay(homeId: number, dateStr: string) {
    setDayLoading(true);
    setDayError("");
    setActionError("");
    setSaveSuccessMsg("");
    try {
      const view = await fetchInspectionDay(homeId, dateStr);
      setDayView(view);
    } catch (err) {
      setDayError(
        err instanceof ApiError
          ? err.message
          : "Couldn't reach the homecare API. Is the server running on port 4000?",
      );
    } finally {
      setDayLoading(false);
    }
  }

  useEffect(() => {
    if (selectedHomeId !== null) {
      loadDay(selectedHomeId, selectedDate);
    } else {
      setDayView(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHomeId, selectedDate]);

  const statusById = useMemo(() => {
    const map = new Map<number, WorkStatus>();
    for (const s of statuses) map.set(s.work_status_id, s);
    return map;
  }, [statuses]);

  const groupedItems = useMemo(() => {
    if (!dayView) return [];
    const groups = new Map<string, InspectionItem[]>();
    for (const item of dayView.items) {
      const list = groups.get(item.category_name) ?? [];
      list.push(item);
      groups.set(item.category_name, list);
    }
    return Array.from(groups.entries());
  }, [dayView]);

  async function handleSchedule(dateStr: string) {
    if (selectedHomeId === null) return;
    try {
      const view = await scheduleInspection(selectedHomeId, dateStr);
      setSelectedDate(dateStr);
      setDayView(view);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't schedule inspection.");
    }
  }

  async function handleReschedule(newDate: string) {
    if (selectedHomeId === null || !dayView) return;
    try {
      const view = await rescheduleInspection(selectedHomeId, dayView.date, newDate);
      setSelectedDate(newDate);
      setDayView(view);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't reschedule inspection.");
    }
  }

  async function handleSendEmail() {
    if (selectedHomeId === null || !dayView) return;
    setEmailSending(true);
    setActionError("");
    setEmailSuccessMsg("");
    try {
      const res = await sendInspectionReportEmailApi(selectedHomeId, dayView.date);
      setEmailSuccessMsg(
        `Inspection report email dispatched successfully to ${res.recipient}!`
      );
      exportInspectionPdf(selectedHome, dayView, statuses);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't send inspection email."
      );
    } finally {
      setEmailSending(false);
    }
  }

  async function handleDeleteDay() {
    if (selectedHomeId === null || !dayView) return;
    if (!window.confirm(`Delete the entire inspection scheduled for ${formatDateStr(dayView.date)}? This can't be undone.`)) {
      return;
    }
    try {
      await deleteInspectionDay(selectedHomeId, dayView.date);
      await loadDay(selectedHomeId, dayView.date);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't delete inspection.");
    }
  }

  async function handleSaveAll() {
    if (selectedHomeId === null || !dayView || dayView.items.length === 0) return;
    setIsSaving(true);
    setActionError("");
    setSaveSuccessMsg("");
    try {
      await Promise.all(
        dayView.items.map((item) =>
          updateInspectionItem(selectedHomeId, dayView.date, item.work_category_id, {
            work_status_id: item.work_status_id,
            work_photo_pah_1: item.work_photo_pah_1 ?? "",
            work_photo_pah_2: item.work_photo_pah_2 ?? "",
            work_photo_pah_3: item.work_photo_pah_3 ?? "",
            notes: item.notes ?? "",
          }),
        ),
      );
      setSaveSuccessMsg("Inspection saved successfully to database!");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't save inspection.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateLocalItem(workCategoryId: number, patch: Partial<InspectionItem>) {
    setDayView((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.work_category_id === workCategoryId ? { ...i, ...patch } : i,
            ),
          }
        : prev,
    );
  }

  async function commitItemUpdate(item: InspectionItem, patch: Partial<InspectionItem>) {
    if (selectedHomeId === null || !dayView) return;
    const merged = { ...item, ...patch };
    updateLocalItem(item.work_category_id, patch);
    try {
      await updateInspectionItem(selectedHomeId, dayView.date, item.work_category_id, {
        work_status_id: merged.work_status_id,
        work_photo_pah_1: merged.work_photo_pah_1 ?? "",
        work_photo_pah_2: merged.work_photo_pah_2 ?? "",
        work_photo_pah_3: merged.work_photo_pah_3 ?? "",
        notes: merged.notes ?? "",
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't save that change.");
      loadDay(selectedHomeId, dayView.date);
    }
  }

  async function handlePhotoCapture(
    item: InspectionItem,
    slot: 1 | 2 | 3,
    blob: Blob,
  ) {
    if (selectedHomeId === null || !dayView) return;
    const updated = await uploadInspectionPhoto(
      selectedHomeId,
      dayView.date,
      item.work_category_id,
      slot,
      blob,
    );
    updateLocalItem(item.work_category_id, updated);
  }

  async function handlePhotoClear(
    item: InspectionItem,
    field: "work_photo_pah_1" | "work_photo_pah_2" | "work_photo_pah_3",
  ) {
    await commitItemUpdate(item, { [field]: "" });
  }

  const selectedHome = homes.find((h) => h.home_id === selectedHomeId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Inspections</h1>
        {dayView && dayView.items.length > 0 && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => exportInspectionPdf(selectedHome, dayView, statuses)}>
              <Printer className="size-4" />
              Export PDF
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={emailSending}
              onClick={handleSendEmail}
            >
              {emailSending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="size-4" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg shadow-black/[0.08] print:hidden">
        <HomeCombobox
          homes={homes}
          value={selectedHomeId}
          onChange={setSelectedHomeId}
          disabled={homesLoading}
        />

        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={selectedHomeId === null}>
              <CalendarDays className="size-4" />
              {formatDateStr(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDateStr(selectedDate)}
              defaultMonth={fromDateStr(selectedDate)}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(toDateStr(date));
                  setDatePickerOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>

        {selectedDate !== todayStr() && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDate(todayStr())}>
            Jump to today
          </Button>
        )}
      </div>

      {homesError && (
        <p className="text-sm text-destructive">{homesError}</p>
      )}

      {selectedHomeId === null ? (
        <Card className="flex flex-col items-center gap-3 border border-border px-6 py-16 text-center shadow-lg shadow-black/[0.08]">
          <div className="flex size-12 items-center justify-center rounded-full border border-border text-muted-foreground">
            <CalendarDays className="size-5" />
          </div>
          <p className="text-sm font-medium">
            {homesLoading ? "Loading homes…" : "Select a home to view its inspections."}
          </p>
        </Card>
      ) : dayError ? (
        <Card className="flex flex-col items-center gap-3 border border-destructive/40 px-6 py-16 text-center shadow-lg shadow-black/[0.08]">
          <div className="flex size-12 items-center justify-center rounded-full border border-destructive/40 text-destructive">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Couldn't load this inspection</p>
            <p className="text-sm text-muted-foreground">{dayError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadDay(selectedHomeId, selectedDate)}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </Card>
      ) : dayLoading || !dayView ? (
        <Card className="flex flex-col items-center gap-3 border border-border px-6 py-16 text-center text-muted-foreground shadow-lg shadow-black/[0.08]">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-sm">Loading inspection…</p>
        </Card>
      ) : (
        <Card className="py-0 shadow-lg shadow-black/[0.08] print:border-0 print:shadow-none">
          <div className="hidden border-b border-border px-4 py-3 print:block">
            <p className="text-lg font-semibold">
              {selectedHome ? `${selectedHome.street}, ${selectedHome.city}, ${selectedHome.state} ${selectedHome.zip_code}` : "Home"}
            </p>
            <p className="text-sm text-muted-foreground">
              Inspection — {formatDateStr(dayView.date)} (
              {dayView.isToday ? "Today" : dayView.isFuture ? "Scheduled" : "Past"})
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 print:hidden">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{formatDateStr(dayView.date)}</p>
              <Badge variant={dayView.isToday ? "default" : "outline"}>
                {dayView.isToday ? "Today" : dayView.isFuture ? "Scheduled" : "Past"}
              </Badge>
              {dayView.isOriginalProtected && (
                <Badge variant="outline" className="gap-1 text-muted-foreground" title="This home's first scheduled inspection can't be deleted while it's still in the future.">
                  <ShieldCheck className="size-3" />
                  Protected
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {dayView.items.length > 0 && dayView.canEditItems && (
                <Button
                  type="button"
                  variant="default"
                  disabled={isSaving}
                  onClick={handleSaveAll}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      Save
                    </>
                  )}
                </Button>
              )}
              {dayView.canRescheduleDay && (
                <SchedulePopover
                  label="Reschedule"
                  defaultDate={dayView.date}
                  onConfirm={handleReschedule}
                  variant="outline"
                />
              )}
              {dayView.canDeleteDay && (
                <Button type="button" variant="outline" onClick={handleDeleteDay}>
                  <Trash2 className="size-3.5" />
                  Delete inspection
                </Button>
              )}
            </div>
          </div>

          {actionError && (
            <p role="alert" className="mx-4 mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive print:hidden">
              {actionError}
            </p>
          )}

          {saveSuccessMsg && (
            <div className="mx-4 mt-3 flex items-center justify-between rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 print:hidden">
              <span>{saveSuccessMsg}</span>
              <button type="button" onClick={() => setSaveSuccessMsg("")} className="text-xs font-semibold hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {emailSuccessMsg && (
            <div className="mx-4 mt-3 flex items-center justify-between rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 print:hidden">
              <span>{emailSuccessMsg}</span>
              <button type="button" onClick={() => setEmailSuccessMsg("")} className="text-xs font-semibold hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {dayView.items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full border border-border text-muted-foreground">
                <CalendarOff className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No inspection for this date</p>
                <p className="text-sm text-muted-foreground">
                  {dayView.canScheduleNew
                    ? "Pick a future date to schedule one."
                    : dayView.isPast
                      ? "Nothing was scheduled, and past dates can't be scheduled now."
                      : "Nothing scheduled yet."}
                </p>
              </div>
              {dayView.canScheduleNew && (
                <SchedulePopover
                  label="Schedule inspection"
                  defaultDate={dayView.isFuture ? dayView.date : undefined}
                  onConfirm={handleSchedule}
                />
              )}
            </div>
          ) : (
            <>
              {!dayView.canEditItems && (
                <div className="mx-4 mt-3 flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground print:hidden">
                  <Info className="size-3.5 shrink-0" />
                  This inspection is scheduled for a future date — status and photos can be recorded once that day arrives.
                </div>
              )}
              <div className="overflow-x-auto">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/4">Item</TableHead>
                      <TableHead className="w-1/4">Status</TableHead>
                      <TableHead className="w-1/4">Photos</TableHead>
                      <TableHead className="w-1/4">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedItems.map(([categoryName, items]) => (
                      <Fragment key={categoryName}>
                        <TableRow key={`group-${categoryName}`} className="bg-muted/40 hover:bg-muted/40">
                          <TableCell colSpan={4} className="py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {categoryName}
                          </TableCell>
                        </TableRow>
                        {items.map((item) => (
                          <TableRow key={item.work_category_id}>
                            <TableCell>
                              <span className="font-medium" title={item.category_description}>
                                {item.category_item}
                              </span>
                            </TableCell>
                            <TableCell>
                              {dayView.canEditItems ? (
                                <>
                                  <Select
                                    value={item.work_status_id ? String(item.work_status_id) : undefined}
                                    onValueChange={(v) =>
                                      commitItemUpdate(item, { work_status_id: Number(v) })
                                    }
                                  >
                                    <SelectTrigger className="w-full print:hidden">
                                      <SelectValue placeholder="Set status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {statuses.map((s) => (
                                        <SelectItem key={s.work_status_id} value={String(s.work_status_id)}>
                                          {s.status_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <span className="hidden print:inline">
                                    {item.work_status_id
                                      ? (statusById.get(item.work_status_id)?.status_name ?? "—")
                                      : "—"}
                                  </span>
                                </>
                              ) : (
                                <Badge variant="outline">
                                  {item.work_status_id
                                    ? (statusById.get(item.work_status_id)?.status_name ?? "—")
                                    : "—"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2 print:flex-nowrap">
                                {(["work_photo_pah_1", "work_photo_pah_2", "work_photo_pah_3"] as const).map(
                                  (field, idx) => (
                                    <PhotoCapture
                                      key={field}
                                      label={`Photo ${idx + 1}`}
                                      value={item[field]}
                                      editable={dayView.canEditItems}
                                      onCapture={(blob) =>
                                        handlePhotoCapture(item, (idx + 1) as 1 | 2 | 3, blob)
                                      }
                                      onClear={() => handlePhotoClear(item, field)}
                                    />
                                  ),
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {dayView.canEditItems ? (
                                <>
                                  <div className="print:hidden">
                                    <Textarea
                                      value={item.notes ?? ""}
                                      onChange={(e) => updateLocalItem(item.work_category_id, { notes: e.target.value })}
                                      onBlur={(e) => commitItemUpdate(item, { notes: e.target.value })}
                                      placeholder="Add notes..."
                                      className="w-full text-xs min-h-[38px] h-[38px] resize-none"
                                    />
                                  </div>
                                  <div className="hidden print:block text-xs whitespace-pre-wrap text-foreground font-medium">
                                    {item.notes && item.notes.trim() ? item.notes : "—"}
                                  </div>
                                </>
                              ) : (
                                <div className="text-xs text-muted-foreground print:text-foreground print:font-medium whitespace-pre-wrap">
                                  {item.notes && item.notes.trim() ? item.notes : "—"}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
