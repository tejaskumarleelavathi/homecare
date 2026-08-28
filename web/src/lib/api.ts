import type { Home, HomeInput } from "@/types/home";
import type { WorkStatus, WorkStatusInput } from "@/types/work-status";
import type { InspectionDayView, InspectionItem, InspectionItemUpdate } from "@/types/inspection";

export class ApiError extends Error {}

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
  return fetch("/api/homes").then((res) => parseResponse<Home[]>(res));
}

export function createHome(input: HomeInput): Promise<Home> {
  return fetch("/api/homes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => parseResponse<Home>(res));
}

export function updateHome(homeId: number, input: HomeInput): Promise<Home> {
  return fetch(`/api/homes/${homeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => parseResponse<Home>(res));
}

export function deleteHome(homeId: number): Promise<void> {
  return fetch(`/api/homes/${homeId}`, { method: "DELETE" }).then((res) =>
    parseResponse<void>(res),
  );
}

export function fetchWorkStatuses(): Promise<WorkStatus[]> {
  return fetch("/api/work-statuses").then((res) => parseResponse<WorkStatus[]>(res));
}

export function createWorkStatus(input: WorkStatusInput): Promise<WorkStatus> {
  return fetch("/api/work-statuses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => parseResponse<WorkStatus>(res));
}

export function updateWorkStatus(workStatusId: number, input: WorkStatusInput): Promise<WorkStatus> {
  return fetch(`/api/work-statuses/${workStatusId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => parseResponse<WorkStatus>(res));
}

export function fetchInspectionDay(homeId: number, date: string): Promise<InspectionDayView> {
  return fetch(`/api/homes/${homeId}/inspections?date=${date}`).then((res) =>
    parseResponse<InspectionDayView>(res),
  );
}

export function scheduleInspection(homeId: number, date: string): Promise<InspectionDayView> {
  return fetch(`/api/homes/${homeId}/inspections`, {
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
  return fetch(`/api/homes/${homeId}/inspections/${date}/reschedule`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: newDate }),
  }).then((res) => parseResponse<InspectionDayView>(res));
}

export function deleteInspectionDay(homeId: number, date: string): Promise<void> {
  return fetch(`/api/homes/${homeId}/inspections/${date}`, { method: "DELETE" }).then((res) =>
    parseResponse<void>(res),
  );
}

export function updateInspectionItem(
  homeId: number,
  date: string,
  workCategoryId: number,
  input: InspectionItemUpdate,
) {
  return fetch(`/api/homes/${homeId}/inspections/${date}/items/${workCategoryId}`, {
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
  return fetch(`/api/homes/${homeId}/inspections/${date}/items/${workCategoryId}/photo`, {
    method: "POST",
    body: formData,
  }).then((res) => parseResponse<InspectionItem>(res));
}
