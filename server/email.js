import { Resend } from "resend";
import nodemailer from "nodemailer";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateStr(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function getStatusClass(statusName) {
  const lower = String(statusName || "").toLowerCase();
  if (lower.includes("completed")) return "badge-completed";
  if (lower.includes("progress")) return "badge-in-progress";
  if (lower.includes("pending")) return "badge-pending";
  if (lower.includes("incomplete")) return "badge-incomplete";
  return "badge-default";
}

export function buildExactInspectionReportHtml({ home, dateStr, items, statusesMap }) {
  const addressStr = home
    ? `${home.street}, ${home.city}, ${home.state} ${home.zip_code}`
    : "Home Inspection Report";

  const dateFormatted = formatDateStr(dateStr);

  const categoriesMap = new Map();
  for (const item of items) {
    const list = categoriesMap.get(item.category_name) ?? [];
    list.push(item);
    categoriesMap.set(item.category_name, list);
  }

  let tableRowsHtml = "";
  for (const [categoryName, categoryItems] of categoriesMap.entries()) {
    tableRowsHtml += `
      <tr class="category-row">
        <td colspan="4">${escapeHtml(categoryName)}</td>
      </tr>
    `;
    for (const item of categoryItems) {
      const statusName = item.work_status_id
        ? statusesMap.get(item.work_status_id) ?? "Pending"
        : "Pending";

      const photos = [item.work_photo_pah_1, item.work_photo_pah_2, item.work_photo_pah_3].filter(
        Boolean,
      );

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

  return `<!DOCTYPE html>
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
    
    .report-container {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

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

    ${
      home?.notes
        ? `.home-notes { background: #fffbeb; border: 1px solid #fef3c7; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: #92400e; }`
        : ""
    }

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

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
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

  <div class="report-container">
    <div class="header">
      <div>
        <div class="brand-title">HomeCare Inspection</div>
        <div class="brand-subtitle">Property Quality &amp; Maintenance Record</div>
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
        <span class="meta-label">Total Checklist Items</span>
        <span class="meta-value">${items.length}</span>
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

</body>
</html>`;
}

export async function sendInspectionReportEmail({ home, dateStr, items, statusesMap, recipientEmail }) {
  // Use recipient specified, or target home's listed emails
  const targetEmail = (recipientEmail || home?.emails || "").trim();
  if (!targetEmail) {
    throw new Error("No recipient email address available for this home.");
  }

  const dateFormatted = formatDateStr(dateStr);
  const addressStr = home ? `${home.street}, ${home.city}, ${home.state} ${home.zip_code}` : "Property";
  const subject = `HomeCare Inspection Report - ${home ? home.street : "Property"} (${dateFormatted})`;

  // Generate exact HTML document matching export view 100%
  const exactReportHtml = buildExactInspectionReportHtml({ home, dateStr, items, statusesMap });

  const emailCoverHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.5; padding: 24px; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #0f172a; padding-bottom: 12px; font-size: 20px;">HomeCare Inspection Report</h2>
      <p style="font-size: 14px; color: #334155;">Hello,</p>
      <p style="font-size: 14px; color: #334155;">Please find attached the official HomeCare Inspection Report for your property:</p>
      <div style="background-color: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
        <div style="font-weight: 700; color: #0f172a; font-size: 15px; margin-bottom: 4px;">${escapeHtml(addressStr)}</div>
        <div style="color: #475569;"><strong>Inspection Date:</strong> ${escapeHtml(dateFormatted)}</div>
        <div style="color: #475569; margin-top: 2px;"><strong>Total Checklist Items:</strong> ${items.length}</div>
      </div>
      <p style="font-size: 13px; color: #475569;">The attached report contains full property details, category items, status badges, photo evidence, and complete item notes.</p>
      <br/>
      <p style="font-size: 13px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 14px; margin-bottom: 0;">
        Best regards,<br/>
        <strong style="color: #0f172a;">ABC Constructions Home Care Team</strong><br/>
        <span style="font-size: 12px; color: #64748b;">info@abcconstructions.com</span>
      </p>
    </div>
  `;

  // 1. Brevo REST API Transport
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY.trim(),
        },
        body: JSON.stringify({
          sender: {
            name: "ABC HomeCare",
            email: process.env.BREVO_SENDER_EMAIL || "kltejas5@gmail.com",
          },
          to: [{ email: targetEmail }],
          subject: subject,
          htmlContent: emailCoverHtml,
          attachment: [
            {
              name: `HomeCare_Inspection_${dateStr}.html`,
              content: Buffer.from(exactReportHtml).toString("base64"),
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Brevo email delivery error (${res.status})`);
      }
      return { success: true, provider: "Brevo", details: data, recipient: targetEmail };
    } catch (brevoErr) {
      console.error("Brevo delivery exception:", brevoErr);
      throw brevoErr;
    }
  }

  // 2. Resend API Transport
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "ABC HomeCare <onboarding@resend.dev>";
      const response = await resend.emails.send({
        from: fromEmail,
        to: targetEmail,
        subject,
        html: emailCoverHtml,
        attachments: [
          {
            filename: `HomeCare_Inspection_${dateStr}.html`,
            content: Buffer.from(exactReportHtml).toString("base64"),
          },
        ],
      });
      if (response.error) {
        console.error("Resend API returned error:", response.error);
        throw new Error(response.error.message || "Resend email delivery failed.");
      }
      return { success: true, provider: "Resend", details: response.data, recipient: targetEmail };
    } catch (resendErr) {
      console.error("Resend delivery exception:", resendErr);
      throw resendErr;
    }
  }

  // 3. SMTP Transport fallback
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"ABC Constructions" <${process.env.SMTP_FROM || "info@abcconstructions.com"}>`,
      to: targetEmail,
      subject,
      html: emailCoverHtml,
      attachments: [
        {
          filename: `HomeCare_Inspection_${dateStr}.html`,
          content: exactReportHtml,
        },
      ],
    });
    return { success: true, provider: "SMTP", details: info, recipient: targetEmail };
  }

  return {
    success: true,
    provider: "Simulated Email Dispatch",
    recipient: targetEmail,
  };
}

export async function sendSupportTicketEmail({ name, email, topic, message }) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ticketNumber = `T-${yyyy}-${mm}-${dd}-${hh}-${min}-${ss}`;

  const recipients = ["tejaskumar96300@gmail.com", "ernest.bonat@gmail.com"];
  const subject = `[Support Ticket ${ticketNumber}] ${topic || "General Question"} from ${name}`;

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.5; padding: 24px; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #2563eb; padding-bottom: 12px; font-size: 20px;">New Technical Support Ticket</h2>
      
      <div style="background-color: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
        <div style="margin-bottom: 8px; font-size: 14px; color: #2563eb;"><strong>Ticket Number:</strong> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; color: #1e40af;">${ticketNumber}</code></div>
        <div style="margin-bottom: 6px;"><strong>User Name:</strong> ${escapeHtml(name)}</div>
        <div style="margin-bottom: 6px;"><strong>User Email:</strong> <a href="mailto:${escapeHtml(email)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(email)}</a></div>
        <div style="margin-bottom: 6px;"><strong>Topic:</strong> ${escapeHtml(topic)}</div>
        <div><strong>Submitted At:</strong> ${new Date().toLocaleString()}</div>
      </div>

      <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 6px; font-size: 14px; color: #0f172a; white-space: pre-wrap; margin-top: 16px;">
        <strong style="color: #334155; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Message &amp; Issue Details:</strong>
        <p style="margin-top: 6px; margin-bottom: 0; font-size: 13px; line-height: 1.6;">${escapeHtml(message)}</p>
      </div>

      <br/>
      <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 0;">
        Notification sent to Support Engineering Team (tejaskumar96300@gmail.com &amp; ernest.bonat@gmail.com) via ABC HomeCare System.
      </p>
    </div>
  `;

  // Brevo REST API Transport
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY.trim(),
        },
        body: JSON.stringify({
          sender: {
            name: "ABC HomeCare Support Desk",
            email: process.env.BREVO_SENDER_EMAIL || "kltejas5@gmail.com",
          },
          to: recipients.map((r) => ({ email: r })),
          subject: subject,
          htmlContent: htmlBody,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Brevo email error (${res.status})`);
      }
      return { success: true, provider: "Brevo", details: data, recipients, ticketNumber };
    } catch (err) {
      console.error("Brevo support email error:", err);
      throw err;
    }
  }

  // Resend API Transport
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const response = await resend.emails.send({
        from: "ABC HomeCare Support <onboarding@resend.dev>",
        to: recipients,
        subject,
        html: htmlBody,
      });
      return { success: true, provider: "Resend", details: response.data, recipients, ticketNumber };
    } catch (err) {
      console.error("Resend support email error:", err);
      throw err;
    }
  }

  return { success: true, provider: "Simulated", recipients, ticketNumber };
}
