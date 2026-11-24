import PDFDocument from "pdfkit";

function formatDateStr(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function getStatusBadgeColors(statusName) {
  const lower = String(statusName || "").toLowerCase();
  if (lower.includes("completed")) {
    return { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
  }
  if (lower.includes("progress")) {
    return { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" };
  }
  if (lower.includes("incomplete")) {
    return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" };
  }
  return { bg: "#fef3c7", text: "#b45309", border: "#fde68a" };
}

// Fetch image buffer with short timeout for embedding into PDF
async function fetchImageBuffer(url) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    // Ensure Cloudinary delivers jpg for PDFKit compatibility
    let fetchUrl = url;
    if (fetchUrl.includes("/image/upload/")) {
      fetchUrl = fetchUrl.replace("/image/upload/", "/image/upload/f_jpg,w_300,c_limit/");
    }
    const res = await fetch(fetchUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function generateInspectionPdfBuffer({
  home,
  dateStr,
  items = [],
  statusesMap = new Map(),
  companyName = "BioGenAI Solutions",
  companyEmail = "ernest.bonat@gmail.com",
}) {
  const dateFormatted = formatDateStr(dateStr);
  const addressStr = home
    ? `${home.street}, ${home.city}, ${home.state} ${home.zip_code}`
    : "Home Inspection Report";

  // Pre-fetch all photos in parallel
  const photoUrls = [];
  for (const item of items) {
    if (item.work_photo_pah_1) photoUrls.push(item.work_photo_pah_1);
    if (item.work_photo_pah_2) photoUrls.push(item.work_photo_pah_2);
    if (item.work_photo_pah_3) photoUrls.push(item.work_photo_pah_3);
  }

  const photoBuffersMap = new Map();
  if (photoUrls.length > 0) {
    const uniqueUrls = [...new Set(photoUrls)];
    await Promise.all(
      uniqueUrls.map(async (url) => {
        const buf = await fetchImageBuffer(url);
        if (buf) photoBuffersMap.set(url, buf);
      })
    );
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: "LETTER",
      bufferPages: true,
    });

    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - 80;

    // Helper for checking page overflow
    function checkPageBreak(requiredHeight = 60) {
      if (doc.y + requiredHeight > pageHeight - 50) {
        doc.addPage();
      }
    }

    // --- Header Section ---
    doc.fontSize(22).font("Helvetica-Bold").fillColor("#0f172a").text(companyName, 40, 40);
    doc.fontSize(11).font("Helvetica").fillColor("#64748b").text("Property Quality & Maintenance Inspection Report");
    if (companyEmail) {
      doc.fontSize(9).font("Helvetica").fillColor("#94a3b8").text(`Contact: ${companyEmail}`);
    }
    doc.moveDown(0.4);

    // Decorative divider line
    doc.strokeColor("#0f172a").lineWidth(1.5).moveTo(40, doc.y).lineTo(pageWidth - 40, doc.y).stroke();
    doc.moveDown(0.8);

    // --- Property Info Card ---
    const boxY = doc.y;
    const boxPadding = 10;
    const boxHeight = home?.notes ? 65 : 52;
    doc.rect(40, boxY, contentWidth, boxHeight).fillAndStroke("#f8fafc", "#e2e8f0");

    doc.fillColor("#0f172a").fontSize(12).font("Helvetica-Bold").text(addressStr, 50, boxY + boxPadding);
    doc.fontSize(9).font("Helvetica").fillColor("#475569").text(
      `Inspection Date: ${dateFormatted}    |    Total Items: ${items.length}    |    Contact: ${home?.emails || "—"}`,
      50,
      boxY + boxPadding + 16
    );

    if (home?.notes) {
      doc.fontSize(9).font("Helvetica-Oblique").fillColor("#b45309").text(
        `Property Notes: ${home.notes}`,
        50,
        boxY + boxPadding + 32,
        { width: contentWidth - 20, ellipsis: true }
      );
    }

    doc.y = boxY + boxHeight + 16;

    // --- Items grouped by Category ---
    const categoriesMap = new Map();
    for (const item of items) {
      const list = categoriesMap.get(item.category_name) || [];
      list.push(item);
      categoriesMap.set(item.category_name, list);
    }

    for (const [categoryName, categoryItems] of categoriesMap.entries()) {
      checkPageBreak(50);

      // Category Header Bar
      const catY = doc.y;
      doc.rect(40, catY, contentWidth, 20).fillAndStroke("#0f172a", "#0f172a");
      doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text(
        categoryName.toUpperCase(),
        48,
        catY + 5
      );
      doc.y = catY + 26;

      for (const item of categoryItems) {
        const title = item.category_item || "Inspection Item";
        const desc = item.category_description ? item.category_description.trim() : "";
        const statusName = item.work_status_id
          ? statusesMap.get(item.work_status_id) || "Pending"
          : "Pending";
        const badgeColors = getStatusBadgeColors(statusName);

        const itemPhotos = [
          item.work_photo_pah_1,
          item.work_photo_pah_2,
          item.work_photo_pah_3,
        ].filter(Boolean);

        // Pre-measure title & description heights to prevent any text clipping or overlap
        doc.fontSize(10).font("Helvetica-Bold");
        const titleHeight = doc.heightOfString(title, { width: 400 });

        let descHeight = 0;
        if (desc) {
          doc.fontSize(8.5).font("Helvetica");
          descHeight = doc.heightOfString(desc, { width: 400 });
        }

        const textBlockHeight = titleHeight + (desc ? 2 + descHeight : 0);
        const headerBlockHeight = Math.max(textBlockHeight, 18);

        // Calculate total space needed for page break check
        let requiredItemHeight = headerBlockHeight + 14;
        if (itemPhotos.length > 0) requiredItemHeight += 52;
        if (item.notes && item.notes.trim()) {
          doc.fontSize(8.5).font("Helvetica");
          requiredItemHeight += doc.heightOfString(item.notes.trim(), { width: contentWidth - 24 }) + 14;
        }

        checkPageBreak(requiredItemHeight);

        const itemStartY = doc.y;

        // 1. Draw status badge pill on right first so its cursor advance does not clobber left text
        const badgeX = pageWidth - 145;
        const badgeY = itemStartY;
        doc.roundedRect(badgeX, badgeY, 95, 16, 4).fillAndStroke(badgeColors.bg, badgeColors.border);
        doc.fillColor(badgeColors.text).fontSize(8.5).font("Helvetica-Bold").text(
          statusName.toUpperCase(),
          badgeX,
          badgeY + 4,
          { width: 95, align: "center", lineBreak: false }
        );

        // 2. Draw Item title on left
        doc.fillColor("#0f172a").fontSize(10).font("Helvetica-Bold").text(
          title,
          44,
          itemStartY,
          { width: 400 }
        );

        // 3. Draw Item description directly below title
        if (desc) {
          doc.fillColor("#64748b").fontSize(8.5).font("Helvetica").text(
            desc,
            44,
            doc.y + 2,
            { width: 400 }
          );
        }

        // 4. Cursor position below both the left text block and right badge with a clean 6pt buffer
        doc.y = Math.max(doc.y, badgeY + 18) + 6;

        // 5. Photos row if photos exist
        if (itemPhotos.length > 0) {
          let photoX = 44;
          const photoY = doc.y;
          let hasRenderedPhoto = false;

          for (const pUrl of itemPhotos) {
            const imgBuffer = photoBuffersMap.get(pUrl);
            if (imgBuffer) {
              try {
                doc.image(imgBuffer, photoX, photoY, { width: 44, height: 44, fit: [44, 44] });
                doc.rect(photoX, photoY, 44, 44).strokeColor("#cbd5e1").lineWidth(1).stroke();
                photoX += 50;
                hasRenderedPhoto = true;
              } catch {
                // Ignore rendering error for malformed image
              }
            }
          }

          if (hasRenderedPhoto) {
            doc.y = photoY + 50;
          }
        }

        // 6. Notes box if present
        if (item.notes && item.notes.trim()) {
          const noteY = doc.y;
          const noteText = item.notes.trim();
          doc.fontSize(8.5).font("Helvetica");
          const noteTextHeight = doc.heightOfString(noteText, { width: contentWidth - 24 });
          const boxHeight = noteTextHeight + 8;

          doc.rect(44, noteY, contentWidth - 8, boxHeight).fillAndStroke("#f1f5f9", "#e2e8f0");
          // Blue left accent line
          doc.rect(44, noteY, 3, boxHeight).fill("#2563eb");

          doc.fillColor("#0f172a").fontSize(8.5).font("Helvetica").text(
            noteText,
            52,
            noteY + 4,
            { width: contentWidth - 24 }
          );
          doc.y = noteY + boxHeight + 6;
        }

        // 7. Item subtle divider
        doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, doc.y).lineTo(pageWidth - 40, doc.y).stroke();
        doc.y += 6;
      }

      doc.y += 8;
    }

    // --- Footer with Page Numbers on all pages ---
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const oldBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // Prevent auto page-break overflow

      doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, pageHeight - 32).lineTo(pageWidth - 40, pageHeight - 32).stroke();
      doc.fillColor("#94a3b8").fontSize(8).font("Helvetica").text(
        `Generated by Home Care App  •  ${new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}`,
        40,
        pageHeight - 24,
        { lineBreak: false }
      );
      doc.fillColor("#94a3b8").fontSize(8).font("Helvetica").text(
        `Page ${i + 1} of ${totalPages}`,
        pageWidth - 140,
        pageHeight - 24,
        { width: 100, align: "right", lineBreak: false }
      );

      doc.page.margins.bottom = oldBottom;
    }

    doc.end();
  });
}
