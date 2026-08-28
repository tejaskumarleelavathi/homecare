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
  db,
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

// Local-disk photo storage. Swap this out for cloud object storage later —
// nothing outside this block needs to change since the DB just stores a URL.
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

app.get("/api/homes", (_req, res) => {
  const rows = db
    .prepare(`SELECT ${HOME_COLUMNS.join(", ")} FROM home ORDER BY home_id`)
    .all();
  res.json(rows);
});

app.post("/api/homes", (req, res) => {
  const { errors, values } = normalizeHomeInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    db.exec("BEGIN");

    const result = db
      .prepare(
        `INSERT INTO home (street, city, state, zip_code, emails, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        values.street,
        values.city,
        values.state,
        values.zip_code,
        values.emails,
        values.notes,
      );

    // Every home gets its first inspection auto-scheduled for the next day.
    scheduleInspection(result.lastInsertRowid, addDaysStr(todayStr(), 1), {
      isOriginal: true,
    });

    db.exec("COMMIT");

    const row = db
      .prepare(`SELECT ${HOME_COLUMNS.join(", ")} FROM home WHERE home_id = ?`)
      .get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    db.exec("ROLLBACK");
    res.status(400).json({ errors: [err.message] });
  }
});

app.put("/api/homes/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT home_id FROM home WHERE home_id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  const { errors, values } = normalizeHomeInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    db.prepare(
      `UPDATE home
       SET street = ?, city = ?, state = ?, zip_code = ?, emails = ?, notes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE home_id = ?`,
    ).run(
      values.street,
      values.city,
      values.state,
      values.zip_code,
      values.emails,
      values.notes,
      id,
    );

    const row = db
      .prepare(`SELECT ${HOME_COLUMNS.join(", ")} FROM home WHERE home_id = ?`)
      .get(id);
    res.json(row);
  } catch (err) {
    res.status(400).json({ errors: [err.message] });
  }
});

app.delete("/api/homes/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT home_id FROM home WHERE home_id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  db.prepare("DELETE FROM home WHERE home_id = ?").run(id);
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

function friendlySqliteError(err) {
  if (err.message.includes("UNIQUE constraint failed: work_status.status_name")) {
    return "A status with that name already exists.";
  }
  return err.message;
}

app.get("/api/work-statuses", (_req, res) => {
  const rows = db
    .prepare(`SELECT ${WORK_STATUS_COLUMNS.join(", ")} FROM work_status ORDER BY work_status_id`)
    .all();
  res.json(rows);
});

app.post("/api/work-statuses", (req, res) => {
  const { errors, values } = normalizeWorkStatusInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const result = db
      .prepare(`INSERT INTO work_status (status_name, status_description) VALUES (?, ?)`)
      .run(values.status_name, values.status_description);

    const row = db
      .prepare(`SELECT ${WORK_STATUS_COLUMNS.join(", ")} FROM work_status WHERE work_status_id = ?`)
      .get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ errors: [friendlySqliteError(err)] });
  }
});

app.put("/api/work-statuses/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db
    .prepare("SELECT work_status_id FROM work_status WHERE work_status_id = ?")
    .get(id);
  if (!existing) {
    return res.status(404).json({ errors: ["Status not found."] });
  }

  const { errors, values } = normalizeWorkStatusInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    db.prepare(
      `UPDATE work_status
       SET status_name = ?, status_description = ?, updated_at = CURRENT_TIMESTAMP
       WHERE work_status_id = ?`,
    ).run(values.status_name, values.status_description, id);

    const row = db
      .prepare(`SELECT ${WORK_STATUS_COLUMNS.join(", ")} FROM work_status WHERE work_status_id = ?`)
      .get(id);
    res.json(row);
  } catch (err) {
    res.status(400).json({ errors: [friendlySqliteError(err)] });
  }
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function homeExists(homeId) {
  return Boolean(db.prepare("SELECT home_id FROM home WHERE home_id = ?").get(homeId));
}

function getInspectionRows(homeId, dateStr) {
  return db
    .prepare(
      `SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category
       WHERE home_id = ? AND date = ? ORDER BY category_name, category_item`,
    )
    .all(homeId, dateStr);
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
    // Allowed for today (pick any future date) and future empty dates
    // (pre-fill that date) — never for a past date with nothing scheduled.
    canScheduleNew: !hasItems && !isPast,
  };
}

app.get("/api/homes/:homeId/inspections", (req, res) => {
  const homeId = Number(req.params.homeId);
  if (!homeExists(homeId)) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  const dateStr = typeof req.query.date === "string" && DATE_RE.test(req.query.date)
    ? req.query.date
    : todayStr();

  const items = getInspectionRows(homeId, dateStr);
  res.json(buildInspectionView(dateStr, items));
});

app.post("/api/homes/:homeId/inspections", (req, res) => {
  const homeId = Number(req.params.homeId);
  if (!homeExists(homeId)) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  const dateStr = req.body?.date;
  if (typeof dateStr !== "string" || !DATE_RE.test(dateStr)) {
    return res.status(400).json({ errors: ["A valid date is required."] });
  }
  if (dateStr <= todayStr()) {
    return res.status(400).json({ errors: ["You can only schedule a future date."] });
  }
  if (getInspectionRows(homeId, dateStr).length > 0) {
    return res.status(409).json({ errors: ["This date already has an inspection scheduled."] });
  }

  const items = scheduleInspection(homeId, dateStr, { isOriginal: false });
  res.status(201).json(buildInspectionView(dateStr, items));
});

app.put("/api/homes/:homeId/inspections/:date/reschedule", (req, res) => {
  const homeId = Number(req.params.homeId);
  const dateStr = req.params.date;
  if (!homeExists(homeId)) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  const existingItems = getInspectionRows(homeId, dateStr);
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
  if (getInspectionRows(homeId, newDateStr).length > 0) {
    return res.status(409).json({ errors: ["That date already has an inspection scheduled."] });
  }

  db.prepare(
    `UPDATE work_category SET date = ?, updated_at = CURRENT_TIMESTAMP
     WHERE home_id = ? AND date = ?`,
  ).run(newDateStr, homeId, dateStr);

  const items = getInspectionRows(homeId, newDateStr);
  res.json(buildInspectionView(newDateStr, items));
});

app.delete("/api/homes/:homeId/inspections/:date", (req, res) => {
  const homeId = Number(req.params.homeId);
  const dateStr = req.params.date;
  if (!homeExists(homeId)) {
    return res.status(404).json({ errors: ["Home not found."] });
  }

  const items = getInspectionRows(homeId, dateStr);
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

  db.prepare("DELETE FROM work_category WHERE home_id = ? AND date = ?").run(homeId, dateStr);
  res.status(204).end();
});

app.put("/api/homes/:homeId/inspections/:date/items/:workCategoryId", (req, res) => {
  const homeId = Number(req.params.homeId);
  const dateStr = req.params.date;
  const workCategoryId = Number(req.params.workCategoryId);

  const item = db
    .prepare(
      `SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category
       WHERE work_category_id = ? AND home_id = ? AND date = ?`,
    )
    .get(workCategoryId, homeId, dateStr);
  if (!item) {
    return res.status(404).json({ errors: ["Inspection item not found."] });
  }
  if (dateStr > todayStr()) {
    return res.status(403).json({ errors: ["Future inspections can't be edited yet."] });
  }

  const work_status_id = req.body?.work_status_id ?? null;
  if (work_status_id !== null) {
    const statusExists = db
      .prepare("SELECT work_status_id FROM work_status WHERE work_status_id = ?")
      .get(work_status_id);
    if (!statusExists) {
      return res.status(400).json({ errors: ["Unknown status."] });
    }
  }

  const work_photo_pah_1 = req.body?.work_photo_pah_1 ?? item.work_photo_pah_1 ?? "";
  const work_photo_pah_2 = req.body?.work_photo_pah_2 ?? item.work_photo_pah_2 ?? "";
  const work_photo_pah_3 = req.body?.work_photo_pah_3 ?? item.work_photo_pah_3 ?? "";

  db.prepare(
    `UPDATE work_category
     SET work_status_id = ?, work_photo_pah_1 = ?, work_photo_pah_2 = ?, work_photo_pah_3 = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE work_category_id = ?`,
  ).run(work_status_id, work_photo_pah_1, work_photo_pah_2, work_photo_pah_3, workCategoryId);

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

  const updated = db
    .prepare(`SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category WHERE work_category_id = ?`)
    .get(workCategoryId);
  res.json(updated);
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

    const item = db
      .prepare(
        `SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category
         WHERE work_category_id = ? AND home_id = ? AND date = ?`,
      )
      .get(workCategoryId, homeId, dateStr);
    if (!item) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ errors: ["Inspection item not found."] });
    }
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

      db.prepare(
        `UPDATE work_category SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE work_category_id = ?`,
      ).run(url, workCategoryId);

      // Clean up local temp upload file
      fs.unlink(req.file.path, () => {});

      if (previous) {
        if (previous.startsWith("/uploads/")) {
          fs.unlink(path.join(UPLOADS_DIR, path.basename(previous)), () => {});
        } else if (previous.includes("res.cloudinary.com")) {
          deleteCloudinaryImage(previous);
        }
      }

      const updated = db
        .prepare(`SELECT ${WORK_CATEGORY_COLUMNS.join(", ")} FROM work_category WHERE work_category_id = ?`)
        .get(workCategoryId);
      res.json(updated);
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

const backfilledCount = backfillMissingSchedules();
if (backfilledCount > 0) {
  console.log(`Backfilled next-day inspection schedules for ${backfilledCount} home(s).`);
}

app.listen(PORT, () => {
  console.log(`homecare-server listening on http://localhost:${PORT}`);
});
