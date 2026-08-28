import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const DB_PATH = path.join(import.meta.dirname, "..", "home_care 2.db3");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");

export const HOME_COLUMNS = [
  "home_id",
  "street",
  "city",
  "state",
  "zip_code",
  "emails",
  "notes",
  "created_at",
  "updated_at",
];

export const WORK_STATUS_COLUMNS = [
  "work_status_id",
  "status_name",
  "status_description",
  "created_at",
  "updated_at",
];

export const WORK_CATEGORY_COLUMNS = [
  "work_category_id",
  "home_id",
  "category_name",
  "category_item",
  "category_description",
  "date",
  "work_status_id",
  "work_photo_pah_1",
  "work_photo_pah_2",
  "work_photo_pah_3",
  "is_original_schedule",
  "created_at",
  "updated_at",
];

// One-time additive migration: work_category didn't originally track which
// inspection was the auto-created "first schedule" for a new home (the one
// that can only be rescheduled, never deleted, while still in the future).
const existingColumns = db.prepare("PRAGMA table_info(work_category)").all();
if (!existingColumns.some((col) => col.name === "is_original_schedule")) {
  db.exec(
    "ALTER TABLE work_category ADD COLUMN is_original_schedule INTEGER NOT NULL DEFAULT 0;",
  );
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysStr(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getTemplateItems() {
  return db
    .prepare(
      `SELECT category_name, category_item, MIN(category_description) AS category_description
       FROM work_category
       GROUP BY category_name, category_item
       ORDER BY category_name, category_item`,
    )
    .all();
}

export function getPendingStatusId() {
  const row = db
    .prepare("SELECT work_status_id FROM work_status WHERE status_name = 'Pending' COLLATE NOCASE")
    .get();
  return row ? row.work_status_id : null;
}

/**
 * Bulk-inserts the full fixed checklist for a home on a given date.
 * Used both for manual scheduling and the automatic "next day" schedule
 * created when a home is added.
 */
export function scheduleInspection(homeId, dateStr, { isOriginal = false } = {}) {
  const template = getTemplateItems();
  const pendingStatusId = getPendingStatusId();

  const insert = db.prepare(
    `INSERT INTO work_category
       (home_id, category_name, category_item, category_description, date, work_status_id, is_original_schedule)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const item of template) {
    insert.run(
      homeId,
      item.category_name,
      item.category_item,
      item.category_description,
      dateStr,
      pendingStatusId,
      isOriginal ? 1 : 0,
    );
  }

  return db
    .prepare(
      `SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category
       WHERE home_id = ? AND date = ? ORDER BY work_category_id`,
    )
    .all(homeId, dateStr);
}

/**
 * Guarantees every home has at least one inspection record. Runs at
 * startup so homes created before this feature existed (or any future
 * edge case) get backfilled with a next-day schedule.
 */
export function backfillMissingSchedules() {
  const tomorrow = addDaysStr(todayStr(), 1);
  const homesWithoutInspections = db
    .prepare(
      `SELECT home_id FROM home
       WHERE home_id NOT IN (SELECT DISTINCT home_id FROM work_category)`,
    )
    .all();

  for (const { home_id } of homesWithoutInspections) {
    scheduleInspection(home_id, tomorrow, { isOriginal: true });
  }

  return homesWithoutInspections.length;
}
