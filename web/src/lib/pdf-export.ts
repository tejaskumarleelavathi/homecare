import type { Home } from "@/types/home";
import type { InspectionDayView, InspectionItem } from "@/types/inspection";
import type { WorkStatus } from "@/types/work-status";
import { formatDateStr } from "@/lib/date";

export function exportInspectionPdf(
  home: Home | null,
  dayView: InspectionDayView,
  statuses: WorkStatus[],
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups for this site to export the PDF.");
    return;
  }

  const statusMap = new Map<number, string>();
  for (const s of statuses) {
    statusMap.set(s.work_status_id, s.status_name);
  }

  const addressStr = home
    ? `${home.street}, ${home.city}, ${home.state} ${home.zip_code}`
    : "Home Inspection Report";

  const dateFormatted = formatDateStr(dayView.date);

  // Group items by category
  const categoriesMap = new Map<string, InspectionItem[]>();
  for (const item of dayView.items) {
    const list = categoriesMap.get(item.category_name) ?? [];
    list.push(item);
    categoriesMap.set(item.category_name, list);
  }

  let tableRowsHtml = "";
  for (const [categoryName, items] of categoriesMap.entries()) {
    tableRowsHtml += `
      <tr class="category-row">
        <td colspan="4">${escapeHtml(categoryName)}</td>
      </tr>
    `;
    for (const item of items) {
      const statusName = item.work_status_id
        ? statusMap.get(item.work_status_id) ?? "Unknown"
        : "Pending";

      const photos = ([
        item.work_photo_pah_1,
        item.work_photo_pah_2,
        item.work_photo_pah_3,
      ] as (string | null)[]).filter((p): p is string => Boolean(p));

      let photosHtml = "";
      if (photos.length > 0) {
        photosHtml = `<div class="photo-grid">` +
          photos
            .map(
              (url, i) =>
                `<a href="${escapeHtml(url)}" target="_blank" title="Photo ${i + 1}"><img src="${escapeHtml(url)}" alt="Photo ${i + 1}" /></a>`,
            )
            .join("") +
          `</div>`;
      } else {
        photosHtml = `<span class="empty-text">No photos</span>`;
      }

      const statusClass = getStatusClass(statusName);
      const notesContent = item.notes && item.notes.trim() ? escapeHtml(item.notes.trim()) : "";

      tableRowsHtml += `
        <tr class="item-row">
          <td class="item-cell">
            <div class="item-name">${escapeHtml(item.category_item)}</div>
            ${item.category_description ? `<div class="item-desc">${escapeHtml(item.category_description)}</div>` : ""}
          </td>
          <td class="status-cell">
            <span class="badge ${statusClass}">${escapeHtml(statusName)}</span>
          </td>
          <td class="photos-cell">
            ${photosHtml}
          </td>
          <td class="notes-cell">
            ${
              notesContent
                ? `<div class="notes-box">${notesContent}</div>`
                : `<span class="empty-text">—</span>`
            }
          </td>
        </tr>
      `;
    }
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Inspection Report - ${escapeHtml(home ? home.street : "Home")} - ${escapeHtml(dateFormatted)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      padding: 24px;
      line-height: 1.5;
    }
    
    /* Top action toolbar (Screen only) */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 960px;
      margin: 0 auto 20px auto;
      padding: 12px 20px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .toolbar h2 {
      font-size: 15px;
      font-weight: 600;
      color: #334155;
    }
    .toolbar-actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }

    /* Container */
    .report-container {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    /* Header */
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .brand-subtitle {
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
    }
    .property-box {
      text-align: right;
    }
    .property-address {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
    }
    .property-sub {
      font-size: 13px;
      color: #64748b;
      margin-top: 2px;
    }
    .report-meta {
      display: flex;
      gap: 20px;
      background: #f1f5f9;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 600;
    }
    .meta-value {
      font-weight: 600;
      color: #0f172a;
      margin-top: 2px;
    }

    /* Property Notes Box if present */
    ${
      home?.notes
        ? `.home-notes { background: #fffbeb; border: 1px solid #fef3c7; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: #92400e; }`
        : ""
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      padding: 10px 12px;
    }
    th:first-child { border-top-left-radius: 6px; }
    th:last-child { border-top-right-radius: 6px; }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 13px;
    }

    .category-row td {
      background: #f1f5f9;
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #334155;
      padding: 8px 12px;
      border-bottom: 1px solid #cbd5e1;
    }

    .item-cell { width: 20%; }
    .item-name { font-weight: 600; color: #0f172a; }
    .item-desc { font-size: 12px; color: #64748b; margin-top: 2px; }

    .status-cell { width: 15%; }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-completed { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-in-progress { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-incomplete { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-default { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

    .photos-cell { width: 22%; }
    .photo-grid { display: flex; gap: 8px; flex-wrap: wrap; }
    .photo-grid img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }

    .notes-cell { width: 43%; }
    .notes-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #2563eb;
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 12px;
      color: #0f172a;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.4;
      font-weight: 500;
    }
    .empty-text { color: #94a3b8; font-style: italic; font-size: 12px; }

    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }

    @page {
      size: letter;
      margin: 18mm 15mm 15mm 15mm;
      @top-center {
        content: "Page " counter(page);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 10px;
        font-weight: 600;
        color: #64748b;
        letter-spacing: 0.5px;
      }
    }

    /* Print styles */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .toolbar {
        display: none !important;
      }
      .report-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .photo-grid img {
        width: 72px !important;
        height: 72px !important;
      }
      .notes-box {
        background: #fafafa !important;
        border-color: #cbd5e1 !important;
        border-left-color: #2563eb !important;
        color: #000000 !important;
      }
      @page {
        size: letter;
        margin: 18mm 15mm 15mm 15mm;
        @top-center {
          content: "Page " counter(page);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.5px;
        }
      }
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <h2>Inspection Report Preview</h2>
    <div class="toolbar-actions">
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save PDF
      </button>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="report-container">
    <div class="header">
      <div>
        <div class="brand-title">HomeCare Inspection</div>
        <div class="brand-subtitle">Property Quality & Maintenance Record</div>
      </div>
      <div class="property-box">
        <div class="property-address">${escapeHtml(addressStr)}</div>
        ${home?.emails ? `<div class="property-sub">Contact: ${escapeHtml(home.emails)}</div>` : ""}
      </div>
    </div>

    <div class="report-meta">
      <div class="meta-item">
        <span class="meta-label">Inspection Date</span>
        <span class="meta-value">${escapeHtml(dateFormatted)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Status</span>
        <span class="meta-value">${dayView.isToday ? "Today" : dayView.isFuture ? "Scheduled" : "Completed / Past"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Total Checklist Items</span>
        <span class="meta-value">${dayView.items.length}</span>
      </div>
    </div>

    ${
      home?.notes
        ? `<div class="home-notes"><strong>Property Notes:</strong> ${escapeHtml(home.notes)}</div>`
        : ""
    }

    <table>
      <thead>
        <tr>
          <th>Checklist Item</th>
          <th>Status</th>
          <th>Photos</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <div class="footer">
      <span>Generated by HomeCare App</span>
      <span>${new Date().toLocaleString()}</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      const imgs = Array.from(document.querySelectorAll('img'));
      if (imgs.length === 0) {
        setTimeout(function() { window.print(); }, 300);
        return;
      }
      Promise.all(imgs.map(function(img) {
        if (img.complete) return Promise.resolve();
        return new Promise(function(resolve) {
          img.onload = img.onerror = resolve;
        });
      })).then(function() {
        setTimeout(function() { window.print(); }, 400);
      });
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

function getStatusClass(statusName: string): string {
  const lower = statusName.toLowerCase();
  if (lower.includes("completed")) return "badge-completed";
  if (lower.includes("progress")) return "badge-in-progress";
  if (lower.includes("pending")) return "badge-pending";
  if (lower.includes("incomplete")) return "badge-incomplete";
  return "badge-default";
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
