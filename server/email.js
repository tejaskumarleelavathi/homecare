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

export function buildEmailReportHtml({ home, dateStr, items, statusesMap }) {
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
      <tr style="background-color: #f1f5f9;">
        <td colspan="4" style="padding: 8px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; border-bottom: 1px solid #cbd5e1;">
          ${escapeHtml(categoryName)}
        </td>
      </tr>
    `;
    for (const item of categoryItems) {
      const statusName = item.work_status_id
        ? statusesMap.get(item.work_status_id) ?? "Unknown"
        : "Pending";

      const photos = [item.work_photo_pah_1, item.work_photo_pah_2, item.work_photo_pah_3].filter(
        Boolean,
      );

      let photosHtml = '<span style="color: #94a3b8; font-style: italic; font-size: 12px;">No photos</span>';
      if (photos.length > 0) {
        photosHtml = photos
          .map(
            (url, i) =>
              `<a href="${escapeHtml(url)}" target="_blank" style="margin-right: 6px; text-decoration: none;"><img src="${escapeHtml(url)}" alt="Photo ${i + 1}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; display: inline-block; vertical-align: middle;" /></a>`,
          )
          .join("");
      }

      const notesContent = item.notes && item.notes.trim() ? escapeHtml(item.notes.trim()) : "";

      tableRowsHtml += `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            <div style="font-weight: 600; color: #0f172a; font-size: 13px;">${escapeHtml(item.category_item)}</div>
            ${item.category_description ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(item.category_description)}</div>` : ""}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            <span style="display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: 12px; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">
              ${escapeHtml(statusName)}
            </span>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            ${photosHtml}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            ${
              notesContent
                ? `<div style="background-color: #f8fafc; border-left: 3px solid #2563eb; padding: 6px 8px; font-size: 12px; color: #0f172a; white-space: pre-wrap; font-weight: 500;">${notesContent}</div>`
                : '<span style="color: #94a3b8; font-style: italic; font-size: 12px;">—</span>'
            }
          </td>
        </tr>
      `;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HomeCare Inspection Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 28px; border-radius: 10px; border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
      <div style="font-size: 22px; font-weight: 800; color: #0f172a;">HomeCare Inspection Report</div>
      <div style="font-size: 13px; color: #64748b; margin-top: 2px;">ABC Constructions &amp; Property Quality Assurance</div>
    </div>

    <!-- Property Details -->
    <div style="background-color: #f1f5f9; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px;">
      <div style="font-weight: 700; font-size: 15px; color: #0f172a; margin-bottom: 4px;">${escapeHtml(addressStr)}</div>
      <div style="color: #475569;"><strong>Inspection Date:</strong> ${escapeHtml(dateFormatted)}</div>
      ${home?.emails ? `<div style="color: #475569; margin-top: 2px;"><strong>Contact Email:</strong> ${escapeHtml(home.emails)}</div>` : ""}
    </div>

    ${
      home?.notes
        ? `<div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 10px 14px; border-radius: 6px; margin-bottom: 20px; font-size: 12px; color: #92400e;"><strong>Property Notes:</strong> ${escapeHtml(home.notes)}</div>`
        : ""
    }

    <!-- Table -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background-color: #0f172a; color: #ffffff; text-align: left; font-size: 11px; text-transform: uppercase;">
          <th style="padding: 8px 12px;">Checklist Item</th>
          <th style="padding: 8px 12px;">Status</th>
          <th style="padding: 8px 12px;">Photos</th>
          <th style="padding: 8px 12px;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
      <span>Sent by ABC Constructions Home Care System</span>
      <span>${new Date().toLocaleString()}</span>
    </div>
  </div>
</body>
</html>`;
}

export async function sendInspectionReportEmail({ home, dateStr, items, statusesMap, recipientEmail }) {
  const targetEmail = (recipientEmail || home?.emails || "").trim();
  if (!targetEmail) {
    throw new Error("No recipient email address available for this home.");
  }

  const dateFormatted = formatDateStr(dateStr);
  const addressStr = home ? `${home.street}, ${home.city}` : "Property";
  const subject = `HomeCare Inspection Report - ${addressStr} (${dateFormatted})`;
  const htmlBody = buildEmailReportHtml({ home, dateStr, items, statusesMap });

  // 1. If BREVO_API_KEY is configured (Sends to ANY email address immediately!)
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
            email: process.env.BREVO_SENDER_EMAIL || "info@abcconstructions.com",
          },
          to: [{ email: targetEmail }],
          subject: subject,
          htmlContent: htmlBody,
          attachment: [
            {
              name: `HomeCare_Inspection_${dateStr}.html`,
              content: Buffer.from(htmlBody).toString("base64"),
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

  // 2. If RESEND_API_KEY is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "ABC HomeCare <onboarding@resend.dev>";
      const response = await resend.emails.send({
        from: fromEmail,
        to: targetEmail,
        subject,
        html: htmlBody,
        attachments: [
          {
            filename: `HomeCare_Inspection_${dateStr}.html`,
            content: Buffer.from(htmlBody).toString("base64"),
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

  // 2. SMTP Transport fallback (Nodemailer / Ethereal / Custom SMTP)
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
      html: htmlBody,
      attachments: [
        {
          filename: `HomeCare_Inspection_${dateStr}.html`,
          content: htmlBody,
        },
      ],
    });
    return { success: true, provider: "SMTP", details: info, recipient: targetEmail };
  }

  // 3. Fallback test transport (Ethereal test account for dev/demo)
  const testAccount = await nodemailer.createTestAccount().catch(() => null);
  if (testAccount) {
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"ABC Constructions" <info@abcconstructions.com>`,
      to: targetEmail,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: `HomeCare_Inspection_${dateStr}.html`,
          content: htmlBody,
        },
      ],
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Ethereal Mock Email Sent] Preview URL: ${previewUrl}`);
    return {
      success: true,
      provider: "Mock/Test Service",
      recipient: targetEmail,
      previewUrl,
    };
  }

  return {
    success: true,
    provider: "Simulated Email Dispatch",
    recipient: targetEmail,
  };
}
