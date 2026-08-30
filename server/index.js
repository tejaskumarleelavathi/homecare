import path from "node:path";
import fs from "node:fs";
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

import express from "express";
import cors from "cors";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function deleteCloudinaryImage(url) {
  if (url && url.includes("res.cloudinary.com")) {
    const parts = url.split("/");
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx !== -1) {
      let publicIdParts = parts.slice(uploadIdx + 2);
      if (!parts[uploadIdx + 1].startsWith("v") || isNaN(parts[uploadIdx + 1].slice(1))) {
        publicIdParts = parts.slice(uploadIdx + 1);
      }
      const publicId = publicIdParts.join("/").split(".")[0];
      cloudinary.uploader.destroy(publicId).catch((err) => {
        console.error("Failed to delete image from Cloudinary:", err);
      });
    }
  }
}

import {
  pool,
  formatCategoryRow,
  initDb,
  HOME_COLUMNS,
  WORK_STATUS_COLUMNS,
  WORK_CATEGORY_COLUMNS,
  todayStr,
  addDaysStr,
  scheduleInspection,
  backfillMissingSchedules,
} from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Local-disk photo storage (fallback/temp)
const UPLOADS_DIR = path.join(import.meta.dirname, "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

function normalizeHomeInput(body) {
  const street = String(body.street ?? "").trim();
  const city = String(body.city ?? "").trim();
  const state = String(body.state ?? "").trim().toUpperCase();
  const zip_code = String(body.zip_code ?? "").trim();
  const emails = String(body.emails ?? "").trim();
  const notes = String(body.notes ?? "").trim();

  const errors = [];
  if (!street) errors.push("Street is required.");
  if (!city) errors.push("City is required.");
  if (state.length !== 2) errors.push("State must be a 2-letter code.");
  if (!zip_code) errors.push("Zip code is required.");

  return { errors, values: { street, city, state, zip_code, emails, notes } };
}

app.get("/api/homes", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${HOME_COLUMNS.join(", ")} FROM home ORDER BY home_id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ errors: [err.message] });
  }
});

app.post("/api/homes", async (req, res) => {
  const { errors, values } = normalizeHomeInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertResult = await client.query(
      `INSERT INTO home (street, city, state, zip_code, emails, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING home_id`,
      [
        values.street,
        values.city,
        values.state,
        values.zip_code,
        values.emails,
        values.notes,
      ]
    );
    const newHomeId = insertResult.rows[0].home_id;

    // Every home gets its first inspection auto-scheduled for the next day.
    await scheduleInspection(newHomeId, addDaysStr(todayStr(), 1), {
      isOriginal: true,
    });

    await client.query("COMMIT");

    const selectResult = await pool.query(
      `SELECT ${HOME_COLUMNS.join(", ")} FROM home WHERE home_id = $1`,
      [newHomeId]
    );
    res.status(201).json(selectResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ errors: [err.message] });
  } finally {
    client.release();
  }
});

app.put("/api/homes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existingResult = await pool.query("SELECT home_id FROM home WHERE home_id = $1", [id]);
  if (existingResult.rows.length === 0) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  const { errors, values } = normalizeHomeInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    await pool.query(
      `UPDATE home
       SET street = $1, city = $2, state = $3, zip_code = $4, emails = $5, notes = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE home_id = $7`,
      [
        values.street,
        values.city,
        values.state,
        values.zip_code,
        values.emails,
        values.notes,
        id,
      ]
    );

    const selectResult = await pool.query(
      `SELECT ${HOME_COLUMNS.join(", ")} FROM home WHERE home_id = $1`,
      [id]
    );
    res.json(selectResult.rows[0]);
  } catch (err) {
    res.status(400).json({ errors: [err.message] });
  }
});

app.delete("/api/homes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existingResult = await pool.query("SELECT home_id FROM home WHERE home_id = $1", [id]);
  if (existingResult.rows.length === 0) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  await pool.query("DELETE FROM home WHERE home_id = $1", [id]);
  res.status(204).end();
});

function normalizeWorkStatusInput(body) {
  const status_name = String(body.status_name ?? "").trim();
  const status_description = String(body.status_description ?? "").trim();

  const errors = [];
  if (!status_name) errors.push("Status name is required.");
  if (!status_description) errors.push("Status description is required.");

  return { errors, values: { status_name, status_description } };
}

function friendlyPostgresError(err) {
  if (err.message && err.message.includes("unique constraint") && err.message.includes("status_name")) {
    return "A status with that name already exists.";
  }
  return err.message;
}

app.get("/api/work-statuses", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${WORK_STATUS_COLUMNS.join(", ")} FROM work_status ORDER BY work_status_id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ errors: [err.message] });
  }
});

app.post("/api/work-statuses", async (req, res) => {
  const { errors, values } = normalizeWorkStatusInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const insertResult = await pool.query(
      `INSERT INTO work_status (status_name, status_description) VALUES ($1, $2) RETURNING work_status_id`,
      [values.status_name, values.status_description]
    );
    const newStatusId = insertResult.rows[0].work_status_id;

    const selectResult = await pool.query(
      `SELECT ${WORK_STATUS_COLUMNS.join(", ")} FROM work_status WHERE work_status_id = $1`,
      [newStatusId]
    );
    res.status(201).json(selectResult.rows[0]);
  } catch (err) {
    res.status(400).json({ errors: [friendlyPostgresError(err)] });
  }
});

app.put("/api/work-statuses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const existingResult = await pool.query(
    "SELECT work_status_id FROM work_status WHERE work_status_id = $1", [id]
  );
  if (existingResult.rows.length === 0) {
    return res.status(404).json({ errors: ["Status not found."] });
  }

  const { errors, values } = normalizeWorkStatusInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    await pool.query(
      `UPDATE work_status
       SET status_name = $1, status_description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE work_status_id = $3`,
      [values.status_name, values.status_description, id]
    );

    const selectResult = await pool.query(
      `SELECT ${WORK_STATUS_COLUMNS.join(", ")} FROM work_status WHERE work_status_id = $1`,
      [id]
    );
    res.json(selectResult.rows[0]);
  } catch (err) {
    res.status(400).json({ errors: [friendlyPostgresError(err)] });
  }
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function homeExists(homeId) {
  const res = await pool.query("SELECT home_id FROM home WHERE home_id = $1", [homeId]);
  return res.rows.length > 0;
}

async function getInspectionRows(homeId, dateStr) {
  const res = await pool.query(
    `SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category
     WHERE home_id = $1 AND date = $2 ORDER BY category_name, category_item`,
    [homeId, dateStr]
  );
  return res.rows.map(formatCategoryRow);
}

function buildInspectionView(dateStr, items) {
  const today = todayStr();
  const isFuture = dateStr > today;
  const isPast = dateStr < today;
  const hasItems = items.length > 0;
  const isOriginalProtected = hasItems && isFuture && items.some((i) => i.is_original_schedule);

  return {
    date: dateStr,
    today,
    items,
    isFuture,
    isPast,
    isToday: !isFuture && !isPast,
    isOriginalProtected,
    canEditItems: hasItems && !isFuture,
    canDeleteDay: hasItems && !(isFuture && isOriginalProtected),
    canRescheduleDay: hasItems && isFuture,
    canScheduleNew: !hasItems && !isPast,
  };
}

app.get("/api/homes/:homeId/inspections", async (req, res) => {
  const homeId = Number(req.params.homeId);
  const exists = await homeExists(homeId);
  if (!exists) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  const dateStr = typeof req.query.date === "string" && DATE_RE.test(req.query.date)
    ? req.query.date
    : todayStr();

  const items = await getInspectionRows(homeId, dateStr);
  res.json(buildInspectionView(dateStr, items));
});

app.post("/api/homes/:homeId/inspections", async (req, res) => {
  const homeId = Number(req.params.homeId);
  const exists = await homeExists(homeId);
  if (!exists) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  const dateStr = req.body?.date;
  if (typeof dateStr !== "string" || !DATE_RE.test(dateStr)) {
    return res.status(400).json({ errors: ["A valid date is required."] });
  }
  if (dateStr <= todayStr()) {
    return res.status(400).json({ errors: ["You can only schedule a future date."] });
  }
  const existingRows = await getInspectionRows(homeId, dateStr);
  if (existingRows.length > 0) {
    return res.status(409).json({ errors: ["This date already has an inspection scheduled."] });
  }

  const items = await scheduleInspection(homeId, dateStr, { isOriginal: false });
  res.status(201).json(buildInspectionView(dateStr, items));
});

app.put("/api/homes/:homeId/inspections/:date/reschedule", async (req, res) => {
  const homeId = Number(req.params.homeId);
  const dateStr = req.params.date;
  const exists = await homeExists(homeId);
  if (!exists) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  const existingItems = await getInspectionRows(homeId, dateStr);
  if (existingItems.length === 0) {
    return res.status(404).json({ errors: ["No inspection scheduled for that date."] });
  }
  if (dateStr <= todayStr()) {
    return res.status(400).json({ errors: ["Only future inspections can be rescheduled."] });
  }

  const newDateStr = req.body?.date;
  if (typeof newDateStr !== "string" || !DATE_RE.test(newDateStr)) {
    return res.status(400).json({ errors: ["A valid new date is required."] });
  }
  if (newDateStr <= todayStr()) {
    return res.status(400).json({ errors: ["The new date must be in the future."] });
  }
  const newDateExistingRows = await getInspectionRows(homeId, newDateStr);
  if (newDateExistingRows.length > 0) {
    return res.status(409).json({ errors: ["That date already has an inspection scheduled."] });
  }

  await pool.query(
    `UPDATE work_category SET date = $1, updated_at = CURRENT_TIMESTAMP
     WHERE home_id = $2 AND date = $3`,
    [newDateStr, homeId, dateStr]
  );

  const items = await getInspectionRows(homeId, newDateStr);
  res.json(buildInspectionView(newDateStr, items));
});

app.delete("/api/homes/:homeId/inspections/:date", async (req, res) => {
  const homeId = Number(req.params.homeId);
  const dateStr = req.params.date;
  const exists = await homeExists(homeId);
  if (!exists) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  const items = await getInspectionRows(homeId, dateStr);
  if (items.length === 0) {
    return res.status(404).json({ errors: ["No inspection scheduled for that date."] });
  }

  const view = buildInspectionView(dateStr, items);
  if (!view.canDeleteDay) {
    return res.status(403).json({
      errors: [
        "This home's first scheduled inspection can't be deleted while it's still in the future — reschedule it instead.",
      ],
    });
  }

  await pool.query("DELETE FROM work_category WHERE home_id = $1 AND date = $2", [homeId, dateStr]);
  res.status(204).end();
});

app.put("/api/homes/:homeId/inspections/:date/items/:workCategoryId", async (req, res) => {
  const homeId = Number(req.params.homeId);
  const dateStr = req.params.date;
  const workCategoryId = Number(req.params.workCategoryId);

  const itemResult = await pool.query(
    `SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category
     WHERE work_category_id = $1 AND home_id = $2 AND date = $3`,
    [workCategoryId, homeId, dateStr]
  );
  if (itemResult.rows.length === 0) {
    return res.status(404).json({ errors: ["Inspection item not found."] });
  }
  const item = formatCategoryRow(itemResult.rows[0]);

  if (dateStr > todayStr()) {
    return res.status(403).json({ errors: ["Future inspections can't be edited yet."] });
  }

  const work_status_id = req.body?.work_status_id ?? null;
  if (work_status_id !== null) {
    const statusExistsResult = await pool.query(
      "SELECT work_status_id FROM work_status WHERE work_status_id = $1",
      [work_status_id]
    );
    if (statusExistsResult.rows.length === 0) {
      return res.status(400).json({ errors: ["Unknown status."] });
    }
  }

  const work_photo_pah_1 = req.body?.work_photo_pah_1 ?? item.work_photo_pah_1 ?? "";
  const work_photo_pah_2 = req.body?.work_photo_pah_2 ?? item.work_photo_pah_2 ?? "";
  const work_photo_pah_3 = req.body?.work_photo_pah_3 ?? item.work_photo_pah_3 ?? "";

  await pool.query(
    `UPDATE work_category
     SET work_status_id = $1, work_photo_pah_1 = $2, work_photo_pah_2 = $3, work_photo_pah_3 = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE work_category_id = $5`,
    [work_status_id, work_photo_pah_1, work_photo_pah_2, work_photo_pah_3, workCategoryId]
  );

  // A photo field that changed away from a locally-stored file or cloud storage —
  // remove the now-orphaned upload.
  for (const [oldValue, newValue] of [
    [item.work_photo_pah_1, work_photo_pah_1],
    [item.work_photo_pah_2, work_photo_pah_2],
    [item.work_photo_pah_3, work_photo_pah_3],
  ]) {
    if (oldValue && oldValue !== newValue) {
      if (oldValue.startsWith("/uploads/")) {
        fs.unlink(path.join(UPLOADS_DIR, path.basename(oldValue)), () => {});
      } else if (oldValue.includes("res.cloudinary.com")) {
        deleteCloudinaryImage(oldValue);
      }
    }
  }

  const selectResult = await pool.query(
    `SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category WHERE work_category_id = $1`,
    [workCategoryId]
  );
  res.json(formatCategoryRow(selectResult.rows[0]));
});

const PHOTO_SLOT_COLUMNS = {
  "1": "work_photo_pah_1",
  "2": "work_photo_pah_2",
  "3": "work_photo_pah_3",
};

app.post(
  "/api/homes/:homeId/inspections/:date/items/:workCategoryId/photo",
  upload.single("photo"),
  async (req, res) => {
    const homeId = Number(req.params.homeId);
    const dateStr = req.params.date;
    const workCategoryId = Number(req.params.workCategoryId);
    const column = PHOTO_SLOT_COLUMNS[req.body?.slot];

    if (!req.file) {
      return res.status(400).json({ errors: ["No image was uploaded."] });
    }
    if (!column) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ errors: ["Invalid photo slot."] });
    }

    const itemResult = await pool.query(
      `SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category
       WHERE work_category_id = $1 AND home_id = $2 AND date = $3`,
      [workCategoryId, homeId, dateStr]
    );
    if (itemResult.rows.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ errors: ["Inspection item not found."] });
    }
    const item = formatCategoryRow(itemResult.rows[0]);

    if (dateStr > todayStr()) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ errors: ["Future inspections can't be edited yet."] });
    }

    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "homecare_inspections",
      });
      const url = result.secure_url;
      const previous = item[column];

      await pool.query(
        `UPDATE work_category SET ${column} = $1, updated_at = CURRENT_TIMESTAMP WHERE work_category_id = $2`,
        [url, workCategoryId]
      );

      // Clean up local temp upload file
      fs.unlink(req.file.path, () => {});

      if (previous) {
        if (previous.startsWith("/uploads/")) {
          fs.unlink(path.join(UPLOADS_DIR, path.basename(previous)), () => {});
        } else if (previous.includes("res.cloudinary.com")) {
          deleteCloudinaryImage(previous);
        }
      }

      const selectResult = await pool.query(
        `SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category WHERE work_category_id = $1`,
        [workCategoryId]
      );
      res.json(formatCategoryRow(selectResult.rows[0]));
    } catch (uploadError) {
      fs.unlink(req.file.path, () => {});
      console.error("Cloudinary upload error:", uploadError);
      return res.status(500).json({ errors: [uploadError.message || "Failed to upload photo to Cloudinary."] });
    }
  },
);

const CLIENT_DIST_DIR = path.join(import.meta.dirname, "../web/dist");
if (fs.existsSync(CLIENT_DIST_DIR)) {
  app.use(express.static(CLIENT_DIST_DIR));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(CLIENT_DIST_DIR, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  res.status(400).json({ errors: [err.message] });
});

// Initialize database tables and seed values asynchronously, then start server
await initDb();
const backfilledCount = await backfillMissingSchedules();
if (backfilledCount > 0) {
  console.log(`Backfilled next-day inspection schedules for ${backfilledCount} home(s).`);
}

app.listen(PORT, () => {
  console.log(`homecare-server listening on http://localhost:${PORT}`);
});
