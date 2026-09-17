import type { Home, HomeInput } from "@/types/home";
import type { WorkStatus, WorkStatusInput } from "@/types/work-status";
import type { InspectionDayView, InspectionItem, InspectionItemUpdate } from "@/types/inspection";
import { todayStr } from "@/lib/date";

export class ApiError extends Error {}

function getClientHeaders(extra?: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {
    "X-Client-Today": todayStr(),
  };
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) result["X-Client-Timezone"] = tz;
  } catch {
    // Ignore if timezone cannot be retrieved
  }

  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((value, key) => {
        result[key] = value;
      });
    } else if (Array.isArray(extra)) {
      for (const [key, value] of extra) {
        result[key] = value;
      }
    } else {
      Object.assign(result, extra);
    }
  }
  return result;
}

function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: getClientHeaders(init?.headers),
  });
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.errors?.join(" ") ?? `Request failed (${res.status})`;
    throw new ApiError(message);
  }
  return body as T;
}

export function fetchHomes(): Promise<Home[]> {
  return apiFetch("/api/homes").then((res) => parseResponse<Home[]>(res));
}

export function createHome(input: HomeInput): Promise<Home> {
  return apiFetch("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => parseResponse<Home>(res));
}

export function updateHome(homeId: number, input: HomeInput): Promise<Home> {
  return apiFetch(`/api/homes/${homeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => parseResponse<Home>(res));
}

export function deleteHome(homeId: number): Promise<void> {
  return apiFetch(`/api/homes/${homeId}`, { method: "DELETE" }).then((res) =>
    parseResponse<void>(res),
  );
}

export function fetchWorkStatuses(): Promise<WorkStatus[]> {
  return apiFetch("/api/work-statuses").then((res) => parseResponse<WorkStatus[]>(res));
}

export function createWorkStatus(input: WorkStatusInput): Promise<WorkStatus> {
  return apiFetch("/api/work-statuses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => parseResponse<WorkStatus>(res));
}

export function updateWorkStatus(workStatusId: number, input: WorkStatusInput): Promise<WorkStatus> {
  return apiFetch(`/api/work-statuses/${workStatusId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => parseResponse<WorkStatus>(res));
}

export function fetchInspectionDay(homeId: number, date: string): Promise<InspectionDayView> {
  return apiFetch(`/api/homes/${homeId}/inspections?date=${date}`).then((res) =>
    parseResponse<InspectionDayView>(res),
  );
}

export function scheduleInspection(homeId: number, date: string): Promise<InspectionDayView> {
  return apiFetch(`/api/homes/${homeId}/inspections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  }).then((res) => parseResponse<InspectionDayView>(res));
}

export function rescheduleInspection(
  homeId: number,
  date: string,
  newDate: string,
): Promise<InspectionDayView> {
  return apiFetch(`/api/homes/${homeId}/inspections/${date}/reschedule`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: newDate }),
  }).then((res) => parseResponse<InspectionDayView>(res));
}

export function deleteInspectionDay(homeId: number, date: string): Promise<void> {
  return apiFetch(`/api/homes/${homeId}/inspections/${date}`, { method: "DELETE" }).then((res) =>
    parseResponse<void>(res),
  );
}

export function updateInspectionItem(
  homeId: number,
  date: string,
  workCategoryId: number,
  input: InspectionItemUpdate,
) {
  return apiFetch(`/api/homes/${homeId}/inspections/${date}/items/${workCategoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => parseResponse(res));
}

export function uploadInspectionPhoto(
  homeId: number,
  date: string,
  workCategoryId: number,
  slot: 1 | 2 | 3,
  photo: Blob,
): Promise<InspectionItem> {
  const formData = new FormData();
  formData.append("slot", String(slot));
  formData.append("photo", photo, "photo.jpg");
  return apiFetch(`/api/homes/${homeId}/inspections/${date}/items/${workCategoryId}/photo`, {
    method: "POST",
    body: formData,
  }).then((res) => parseResponse<InspectionItem>(res));
}

export function sendInspectionReportEmailApi(
  homeId: number,
  date: string,
  recipientEmail?: string,
): Promise<{ success: boolean; provider?: string; recipient?: string; previewUrl?: string }> {
  return apiFetch(`/api/homes/${homeId}/inspections/${date}/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipientEmail }),
  }).then((res) => parseResponse(res));
}

export function submitSupportTicketApi(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<{ success: boolean; provider?: string; recipients?: string[]; ticketNumber?: string }> {
  return apiFetch("/api/support/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => parseResponse(res));
}
