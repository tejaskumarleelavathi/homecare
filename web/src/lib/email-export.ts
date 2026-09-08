import type { Home } from "@/types/home";
import type { InspectionDayView } from "@/types/inspection";
import type { WorkStatus } from "@/types/work-status";
import { formatDateStr } from "@/lib/date";
import { exportInspectionPdf } from "@/lib/pdf-export";

export function sendInspectionEmail(
  home: Home | null,
  dayView: InspectionDayView,
  statuses: WorkStatus[],
) {
  const toEmail = home?.emails ? home.emails.trim() : "";
  const addressStr = home
    ? `${home.street}, ${home.city}, ${home.state} ${home.zip_code}`
    : "Home Inspection";
  const dateFormatted = formatDateStr(dayView.date);

  const subject = `HomeCare Inspection Report - ${home ? home.street : "Property"} (${dateFormatted})`;

  const body = `Hello,

Please find the HomeCare Inspection Report details for your property below:

Property: ${addressStr}
Inspection Date: ${dateFormatted}
Inspection Status: ${dayView.isToday ? "Today" : dayView.isFuture ? "Scheduled" : "Completed / Past"}
Total Items Inspected: ${dayView.items.length}

${home?.notes ? `Property Notes:\n${home.notes}\n\n` : ""}Please attach the generated PDF report from the opened window to complete this message.

Best regards,

ABC Constructions Home Care Team
Sender: info@abcconstructions.com
Contact: support@abcconstructions.com
`;

  // First open the PDF report in a new tab so the user has the report ready to save/attach
  exportInspectionPdf(home, dayView, statuses);

  // Then trigger mailto protocol to open default email client (Gmail, Outlook, Apple Mail)
  const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Give a brief 300ms pause so the PDF popup opens cleanly first
  setTimeout(() => {
    window.location.href = mailtoUrl;
  }, 300);
}
