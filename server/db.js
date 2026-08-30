import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const connectionString = process.env.DATABASE_URL;
const isSupabase = connectionString && connectionString.includes("supabase.co");

export const pool = new pg.Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

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
  "notes",
  "is_original_schedule",
  "created_at",
  "updated_at",
];

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysStr(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const TEMPLATE_PATH = path.join(import.meta.dirname, "checklist_template.json");
export function getTemplateItems() {
  if (fs.existsSync(TEMPLATE_PATH)) {
    return JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf8"));
  }
  return [];
}

export async function getPendingStatusId() {
  const res = await pool.query(
    "SELECT work_status_id FROM work_status WHERE LOWER(status_name) = 'pending'"
  );
  return res.rows.length > 0 ? res.rows[0].work_status_id : null;
}

export function formatCategoryRow(row) {
  if (!row) return row;
  return {
    ...row,
    date: row.date ? (row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10)) : null
  };
}

export async function scheduleInspection(homeId, dateStr, { isOriginal = false } = {}) {
  const template = getTemplateItems();
  const pendingStatusId = await getPendingStatusId();

  if (template.length === 0) {
    return [];
  }

  const values = [];
  const valuePlaceholders = [];
  let paramIndex = 1;
  for (const item of template) {
    values.push(
      homeId,
      item.category_name,
      item.category_item,
      item.category_description,
      dateStr,
      pendingStatusId,
      isOriginal ? 1 : 0
    );
    valuePlaceholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6})`);
    paramIndex += 7;
  }

  await pool.query(`
    INSERT INTO work_category
      (home_id, category_name, category_item, category_description, date, work_status_id, is_original_schedule)
    VALUES ${valuePlaceholders.join(", ")}
  `, values);

  const res = await pool.query(`
    SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category
    WHERE home_id = $1 AND date = $2 ORDER BY work_category_id
  `, [homeId, dateStr]);

  return res.rows.map(formatCategoryRow);
}

export async function backfillMissingSchedules() {
  const tomorrow = addDaysStr(todayStr(), 1);
  const res = await pool.query(`
    SELECT home_id FROM home
    WHERE home_id NOT IN (SELECT DISTINCT home_id FROM work_category)
  `);

  for (const row of res.rows) {
    await scheduleInspection(row.home_id, tomorrow, { isOriginal: true });
  }

  return res.rows.length;
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS home (
      home_id SERIAL PRIMARY KEY,
      street TEXT NOT NULL,
      city TEXT NOT NULL,
      state VARCHAR(2) NOT NULL CHECK (length(state) = 2),
      zip_code TEXT NOT NULL,
      emails TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS work_status (
      work_status_id SERIAL PRIMARY KEY,
      status_name VARCHAR(255) NOT NULL UNIQUE,
      status_description TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS work_category (
      work_category_id SERIAL PRIMARY KEY,
      home_id INTEGER NOT NULL REFERENCES home (home_id) ON DELETE CASCADE ON UPDATE CASCADE,
      category_name TEXT NOT NULL,
      category_item TEXT NOT NULL,
      category_description TEXT NOT NULL,
      date DATE,
      work_status_id INTEGER REFERENCES work_status (work_status_id) ON DELETE RESTRICT ON UPDATE CASCADE,
      work_photo_pah_1 TEXT,
      work_photo_pah_2 TEXT,
      work_photo_pah_3 TEXT,
      notes TEXT,
      is_original_schedule INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add notes column if table already existed without it
  await pool.query(`
    ALTER TABLE work_category ADD COLUMN IF NOT EXISTS notes TEXT;
  `);

  // Seed statuses
  const statusCheck = await pool.query("SELECT COUNT(*) FROM work_status");
  if (parseInt(statusCheck.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO work_status (status_name, status_description) VALUES
      ('Completed', 'Work has been completed'),
      ('Incomplete', 'Work has not been completed'),
      ('In Progress', 'Work is currently in progress'),
      ('Pending', 'Work has not started')
    `);
    console.log("Seeded default work statuses in PostgreSQL.");
  }
}
