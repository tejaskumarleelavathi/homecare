import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const primaryUrl = process.env.DATABASE_URL;
const localUrl = "postgresql://postgres:postgres@localhost:5432/homecare";

function createPgPool(url) {
  const isSupabase = url && (url.includes("supabase.co") || url.includes("supabase.com"));
  return new pg.Pool({
    connectionString: url,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });
}

let activePool = createPgPool(primaryUrl || localUrl);

// Proxy pool to allow transparent fallback if primary connection fails
export const pool = new Proxy({}, {
  get(_target, prop) {
    const val = activePool[prop];
    if (typeof val === "function") {
      return val.bind(activePool);
    }
    return val;
  },
});

export const USER_COLUMNS = [
  "user_id",
  "username",
  "company_name",
  "email",
  "password",
  "expire_date",
  "created_at",
  "updated_at",
];

export const HOME_COLUMNS = [
  "home_id",
  "user_id",
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

// Ensure PostgreSQL DATE type (OID 1082) is returned as raw 'YYYY-MM-DD' string without timezone conversion
pg.types.setTypeParser(1082, (val) => val);

export function getTodayStr(req) {
  const clientToday = req?.headers?.["x-client-today"];
  if (typeof clientToday === "string" && /^\d{4}-\d{2}-\d{2}$/.test(clientToday)) {
    return clientToday;
  }

  const clientTz = req?.headers?.["x-client-timezone"];
  if (typeof clientTz === "string" && clientTz.trim()) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: clientTz.trim(),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const y = parts.find((p) => p.type === "year")?.value;
      const m = parts.find((p) => p.type === "month")?.value;
      const d = parts.find((p) => p.type === "day")?.value;
      if (y && m && d) return `${y}-${m}-${d}`;
    } catch {
      // Ignore invalid timezone string
    }
  }

  return new Date().toISOString().slice(0, 10);
}

export function todayStr(req) {
  return getTodayStr(req);
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
  let dateStr = null;
  if (row.date) {
    if (typeof row.date === "string") {
      dateStr = row.date.slice(0, 10);
    } else if (row.date instanceof Date) {
      const y = row.date.getUTCFullYear();
      const m = String(row.date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(row.date.getUTCDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${d}`;
    } else {
      dateStr = String(row.date).slice(0, 10);
    }
  }
  return {
    ...row,
    date: dateStr,
  };
}

export async function scheduleInspection(homeId, dateStr, { isOriginal = false, client = pool } = {}) {
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

  await client.query(`
    INSERT INTO work_category
      (home_id, category_name, category_item, category_description, date, work_status_id, is_original_schedule)
    VALUES ${valuePlaceholders.join(", ")}
  `, values);

  const res = await client.query(`
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

export function formatUserRow(row) {
  if (!row) return row;
  let expireDateStr = null;
  if (row.expire_date) {
    if (typeof row.expire_date === "string") {
      expireDateStr = row.expire_date.slice(0, 10);
    } else if (row.expire_date instanceof Date) {
      const y = row.expire_date.getUTCFullYear();
      const m = String(row.expire_date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(row.expire_date.getUTCDate()).padStart(2, "0");
      expireDateStr = `${y}-${m}-${d}`;
    } else {
      expireDateStr = String(row.expire_date).slice(0, 10);
    }
  }
  return {
    ...row,
    expire_date: expireDateStr,
  };
}

export async function initDb() {
  try {
    await activePool.query("SELECT 1");
  } catch (err) {
    if (primaryUrl && primaryUrl !== localUrl) {
      console.warn("Primary database connection failed (e.g. Supabase paused), falling back to local PostgreSQL:", err.message);
      activePool = createPgPool(localUrl);
      await activePool.query("SELECT 1");
      console.log("Connected to local PostgreSQL fallback successfully.");
    } else {
      throw err;
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      company_name TEXT NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      expire_date DATE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS home (
      home_id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
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

  // Migration: Add user_id column if home table already existed without it
  await pool.query(`
    ALTER TABLE home ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE;
  `);

  // Migration: Add notes column if table already existed without it
  await pool.query(`
    ALTER TABLE work_category ADD COLUMN IF NOT EXISTS notes TEXT;
  `);

  // Seed default user 1 (BioGenAI Solutions)
  const userCheck = await pool.query("SELECT user_id FROM users WHERE user_id = 1");
  if (userCheck.rows.length === 0) {
    await pool.query(`
      INSERT INTO users (user_id, username, company_name, email, password, expire_date)
      VALUES (1, 'ernest', 'BioGenAI Solutions', 'ernest.bonat@gmail.com', 'Password1', '2027-12-31')
      ON CONFLICT (user_id) DO NOTHING;
    `);
    await pool.query(`
      SELECT setval(pg_get_serial_sequence('users', 'user_id'), COALESCE((SELECT MAX(user_id) FROM users), 1));
    `);
    console.log("Seeded default user ID 1: BioGenAI Solutions (ernest / ernest.bonat@gmail.com, exp: 2027-12-31).");
  }

  // Update present home records to point to user_id = 1
  await pool.query(`
    UPDATE home SET user_id = 1 WHERE user_id IS NULL OR user_id = 0;
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

  // Seed initial 2 homes for user_id = 1 if table home is completely empty
  const homeCheck = await pool.query("SELECT COUNT(*) FROM home");
  if (parseInt(homeCheck.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO home (home_id, user_id, street, city, state, zip_code, emails, notes) VALUES
      (1, 1, '2349 North Chamberlain Blvd', 'North Port', 'FL', '34286', 'ernest.bonat@gmail.com', ''),
      (2, 1, '482 Maple Bridge', 'Phoenix', 'AZ', '28281', 'hello@gmail.com', 'House in Maple Bridge')
      ON CONFLICT (home_id) DO NOTHING;
    `);
    await pool.query(`
      SELECT setval(pg_get_serial_sequence('home', 'home_id'), COALESCE((SELECT MAX(home_id) FROM home), 2));
    `);
    console.log("Seeded initial 2 home records pointed to user ID 1.");
  }
}
