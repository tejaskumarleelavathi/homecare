import { useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Cpu,
  Database,
  FileCheck,
  Globe2,
  HelpCircle,
  Home as HomeIcon,
  Info,
  LifeBuoy,
  Mail,
  MessageSquare,
  Phone,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Send,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SubTab = "manual" | "support" | "about";

interface ManualGuide {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  category: string;
  summary: string;
  steps: string[];
  tips?: string;
}

const MANUAL_GUIDES: ManualGuide[] = [
  {
    id: "home-management",
    icon: HomeIcon,
    category: "Property Management",
    title: "Adding & Managing Homes",
    summary: "How to create, edit, filter, and maintain home addresses, email contacts, and property notes.",
    steps: [
      "Navigate to the 'Home' tab from the top navigation bar.",
      "Click 'Add new home' in the top right to register a new property.",
      "Fill in required details: Street address, City, 2-letter State code, Zip code, and contact Emails.",
      "When a home is saved, an initial inspection is automatically scheduled for the next day.",
      "Use the search bar or state filter dropdown to locate specific properties instantly.",
    ],
    tips: "You can update property details or notes anytime by clicking the Edit (pencil) button on any home card or table row.",
  },
  {
    id: "inspections-schedule",
    icon: CalendarDays,
    category: "Inspection Workflow",
    title: "Scheduling & Rescheduling Inspections",
    summary: "Auto-generated schedules, picking inspection dates, rescheduling future days, and deletion protection.",
    steps: [
      "Select a home from the combobox dropdown on the 'Inspections' tab.",
      "Use the date picker button to view any past, current, or scheduled inspection day.",
      "Click 'Schedule inspection' on unassigned future dates to generate a complete quality checklist.",
      "To change an upcoming date, click 'Reschedule' and select a new target date.",
      "Future inspections have deletion protection for the initial inspection to ensure records are preserved.",
    ],
    tips: "Click 'Jump to today' anytime to immediately focus on today's active inspections.",
  },
  {
    id: "conducting-inspections",
    icon: FileCheck,
    category: "Quality Control",
    title: "Recording Statuses & Notes",
    summary: "Updating work category items, changing status states, and entering item notes.",
    steps: [
      "On the current inspection day, review items grouped by categories (e.g. Electrical, Plumbing, HVAC, Exterior).",
      "Click the 'Status' dropdown on any item to set its condition: Completed, In Progress, Incomplete, or Pending.",
      "Type item-specific notes or findings directly into the Notes field for each category item.",
      "Notes are automatically saved on blur or when navigating between fields.",
      "Future inspection items remain read-only until their scheduled date arrives.",
    ],
    tips: "Completed statuses turn green, In Progress turns blue, and Pending turns amber for instant visual auditing.",
  },
  {
    id: "photo-management",
    icon: Sparkles,
    category: "Media & Evidence",
    title: "Capturing & Managing Inspection Photos",
    summary: "Attaching photos across 3 slots per item, uploading to Cloudinary, and replacing images.",
    steps: [
      "Each inspection item supports up to 3 photo slots (Photo 1, Photo 2, Photo 3).",
      "Click 'Photo 1/2/3' to capture or select an image file from your mobile device or computer.",
      "Photos are automatically uploaded and optimized via Cloudinary secure cloud storage.",
      "Click any thumbnail preview to expand the full-size image in a lightbox view.",
      "Use the clear/trash icon on a thumbnail to remove or replace an outdated photo.",
    ],
    tips: "On mobile devices, clicking a photo slot can directly launch your camera to take a photo on site.",
  },
  {
    id: "pdf-export",
    icon: Printer,
    category: "Reporting & Export",
    title: "Exporting PDF Inspection Reports",
    summary: "Generating clean printable reports in dedicated tabs with full property details, photos, and notes.",
    steps: [
      "Select the home and date you wish to report on.",
      "Click the 'Export PDF' button located at the top right of the inspection view.",
      "A dedicated printable report opens in a new browser tab with property info, metadata, photos, and full item notes.",
      "The browser's print dialog launches automatically, allowing you to Save as PDF or print directly.",
      "You can also click 'Print / Save PDF' or 'Close' from the top bar in the report preview window.",
    ],
    tips: "The PDF view is formatted for clean page breaks and high-contrast text to look crisp on printouts.",
  },
  {
    id: "timezone-support",
    icon: Globe2,
    category: "System Capabilities",
    title: "Multi-Timezone Support",
    summary: "How the application ensures consistent inspection dates worldwide across all time zones.",
    steps: [
      "The app automatically detects your browser's local timezone (e.g., Eastern Time, Pacific Time, UTC).",
      "When querying or scheduling inspections, the server aligns 'today' to your exact local calendar date.",
      "Users in Florida, London, Tokyo, or California see their own local date accurately reflecting 'Today'.",
      "Inspection calendar dates are stored in standard ISO YYYY-MM-DD format to prevent off-by-one shifts.",
    ],
    tips: "No manual timezone setup is required—your device's system time automatically governs your active date.",
  },
];

const FAQS = [
  {
    q: "Why can't I edit items on future inspection dates?",
    a: "Future inspections are locked to preserve data integrity until the scheduled date arrives. Once the local date reaches the inspection day, status dropdowns, notes, and photo upload fields automatically unlock.",
  },
  {
    q: "How does the Export PDF feature work?",
    a: "Clicking 'Export PDF' opens a dedicated, high-resolution document preview in a new browser tab. It formats all property information, checklist items, status badges, photo thumbnails, and full notes, automatically triggering your browser's 'Save to PDF' dialog.",
  },
  {
    q: "What happens if I reschedule an inspection?",
    a: "When you reschedule a future inspection, all category checklist items, statuses, notes, and photos move intact to the new target date. The system checks to ensure no inspection already exists on the selected date.",
  },
  {
    q: "How are photos stored and optimized?",
    a: "Photos uploaded to inspection items are securely transferred to Cloudinary cloud media storage. Old or replaced photos are automatically removed from Cloudinary to maintain storage efficiency.",
  },
  {
    q: "Does the application work on mobile devices and tablets?",
    a: "Yes! HomeCare is built with a responsive design. On smartphones and tablets, camera inputs let inspectors take photos live on site, update statuses, and view checklists seamlessly.",
  },
];

export function HelpAboutPage() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("manual");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [expandedGuide, setExpandedGuide] = useState<string | null>("home-management");

  // Support form state
  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportTopic, setSupportTopic] = useState("general");
  const [supportMessage, setSupportMessage] = useState("");
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const filteredGuides = MANUAL_GUIDES.filter((guide) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      guide.title.toLowerCase().includes(q) ||
      guide.summary.toLowerCase().includes(q) ||
      guide.category.toLowerCase().includes(q) ||
      guide.steps.some((s) => s.toLowerCase().includes(q))
    );
  });

  function handleSupportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supportName || !supportEmail || !supportMessage) return;
    setTicketSubmitted(true);
    setTimeout(() => {
      setSupportName("");
      setSupportEmail("");
      setSupportMessage("");
    }, 500);
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/40 p-6 sm:p-8 shadow-xl shadow-black/[0.04]">
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 px-3 py-1 font-semibold text-primary border-primary/30 bg-primary/5">
                <Sparkles className="size-3.5" />
                Resource Hub
              </Badge>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                v1.2.0 Stable
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              Help & Information Center
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Complete user guides, technical support assistance, and system documentation for ABC Home Care.
            </p>
          </div>

          {/* Sub-tab Navigation Segmented Controls */}
          <div className="flex w-full flex-wrap items-center gap-1.5 rounded-xl border border-border bg-muted/60 p-1.5 sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab("manual")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all sm:flex-initial",
                activeSubTab === "manual"
                  ? "bg-background text-foreground shadow-sm shadow-black/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              <BookOpen className="size-4 text-emerald-500" />
              User Manual
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("support")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all sm:flex-initial",
                activeSubTab === "support"
                  ? "bg-background text-foreground shadow-sm shadow-black/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              <LifeBuoy className="size-4 text-blue-500" />
              Tech Support
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("about")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all sm:flex-initial",
                activeSubTab === "about"
                  ? "bg-background text-foreground shadow-sm shadow-black/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              <Info className="size-4 text-purple-500" />
              About Us
            </button>
          </div>
        </div>
      </div>

      {/* ================= SUB-TAB 1: USER MANUAL ================= */}
      {activeSubTab === "manual" && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search user manual (e.g., reschedule, PDF, photo, timezone)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-card shadow-sm"
            />
          </div>

          {filteredGuides.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <HelpCircle className="mx-auto size-8 mb-2 opacity-50" />
              <p className="font-medium text-base">No guides found matching "{searchQuery}"</p>
              <p className="text-sm mt-1">Try searching for keywords like 'home', 'inspection', 'photo', or 'PDF'.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredGuides.map((guide) => {
                const GuideIcon = guide.icon;
                const isExpanded = expandedGuide === guide.id;

                return (
                  <Card
                    key={guide.id}
                    className="overflow-hidden border border-border bg-card shadow-md transition-all hover:border-primary/40"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedGuide(isExpanded ? null : guide.id)}
                      className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                          <GuideIcon className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                              {guide.category}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold tracking-tight text-foreground mt-0.5">
                            {guide.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {guide.summary}
                          </p>
                        </div>
                      </div>

                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform">
                        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-5 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Step-by-Step Guide
                        </h4>
                        <ol className="space-y-2.5">
                          {guide.steps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-foreground">
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                {idx + 1}
                              </span>
                              <span className="pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>

                        {guide.tips && (
                          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                            <Sparkles className="size-4 shrink-0 text-amber-500 mt-0.5" />
                            <div>
                              <strong className="font-semibold">Pro Tip: </strong>
                              {guide.tips}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= SUB-TAB 2: TECH SUPPORT ================= */}
      {activeSubTab === "support" && (
        <div className="space-y-8">
          {/* Quick contact cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex flex-col items-center p-6 text-center space-y-3 border border-border shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                <Mail className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Email Support</h3>
                <p className="text-xs text-muted-foreground mt-1">24/7 Response Desk</p>
              </div>
              <a
                href="mailto:support@biogenai.com"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                support@biogenai.com
              </a>
            </Card>

            <Card className="flex flex-col items-center p-6 text-center space-y-3 border border-border shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <Phone className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Phone Hotline</h3>
                <p className="text-xs text-muted-foreground mt-1">Toll-Free Support Line</p>
              </div>
              <span className="text-xs font-bold text-foreground">1-800-555-HOME (4663)</span>
            </Card>

            <Card className="flex flex-col items-center p-6 text-center space-y-3 border border-border shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                <Clock className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Support Hours</h3>
                <p className="text-xs text-muted-foreground mt-1">Mon – Fri: 8:00 AM – 6:00 PM EST</p>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40">
                Systems Operational
              </Badge>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Ticket Submission Form */}
            <Card className="p-6 space-y-5 border border-border shadow-md">
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <MessageSquare className="size-5 text-primary" />
                <div>
                  <h2 className="text-lg font-bold text-foreground">Submit a Technical Support Ticket</h2>
                  <p className="text-xs text-muted-foreground">Our engineering team will review and respond promptly.</p>
                </div>
              </div>

              {ticketSubmitted ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="size-7" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Ticket Received!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Thank you! Your technical support inquiry has been logged. A support representative will reach out to your email shortly.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setTicketSubmitted(false)}>
                    Submit Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Your Name *</label>
                    <Input
                      required
                      placeholder="e.g. John Doe"
                      value={supportName}
                      onChange={(e) => setSupportName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Email Address *</label>
                    <Input
                      required
                      type="email"
                      placeholder="john@example.com"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Topic *</label>
                    <select
                      value={supportTopic}
                      onChange={(e) => setSupportTopic(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="general">General Help & Question</option>
                      <option value="inspection">Inspection Checklist Issue</option>
                      <option value="photo">Photo Upload / Cloud Storage</option>
                      <option value="pdf">PDF Export Problem</option>
                      <option value="timezone">Timezone or Date Discrepancy</option>
                      <option value="bug">Report a System Bug</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Message / Issue Details *</label>
                    <Textarea
                      required
                      rows={4}
                      placeholder="Please describe what you need assistance with..."
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2">
                    <Send className="size-4" />
                    Submit Technical Ticket
                  </Button>
                </form>
              )}
            </Card>

            {/* FAQs */}
            <Card className="p-6 space-y-5 border border-border shadow-md">
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <HelpCircle className="size-5 text-primary" />
                <div>
                  <h2 className="text-lg font-bold text-foreground">Frequently Asked Questions</h2>
                  <p className="text-xs text-muted-foreground">Quick answers to common inspection & system questions.</p>
                </div>
              </div>

              <div className="space-y-3">
                {FAQS.map((faq, idx) => {
                  const isOpen = expandedFaq === idx;
                  return (
                    <div key={idx} className="rounded-lg border border-border bg-card overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(isOpen ? null : idx)}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold text-sm text-foreground hover:bg-muted/30"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown className={cn("size-4 shrink-0 transition-transform text-muted-foreground", isOpen && "rotate-180")} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-border bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ================= SUB-TAB 3: ABOUT US ================= */}
      {activeSubTab === "about" && (
        <div className="space-y-8">
          {/* Company Banner */}
          <Card className="relative overflow-hidden p-8 border border-border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Building2 className="size-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">ABC Constructions</h2>
                    <p className="text-sm text-slate-300">Home Care & Property Quality Assurance System</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                  ABC Constructions delivers premier residential craftsmanship and rigorous property inspection management. Our Home Care platform ensures that every home inspection is tracked, verified with photographic evidence, and documented seamlessly.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 space-y-2 text-right shrink-0">
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Engineering Partner</div>
                <div className="text-base font-bold text-white">BioGenAI Solutions LLC</div>
                <div className="text-xs text-emerald-400 font-medium">Enterprise AI & Web Applications</div>
              </div>
            </div>
          </Card>

          {/* System Specs & Tech Stack */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5 space-y-2 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-primary">
                <Code2 className="size-5" />
                <span className="font-bold text-sm text-foreground">Frontend Architecture</span>
              </div>
              <p className="text-xs text-muted-foreground">React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons</p>
            </Card>

            <Card className="p-5 space-y-2 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-emerald-500">
                <Cpu className="size-5" />
                <span className="font-bold text-sm text-foreground">Backend Service</span>
              </div>
              <p className="text-xs text-muted-foreground">Node.js Express REST API, Multi-Timezone Header Engine</p>
            </Card>

            <Card className="p-5 space-y-2 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-blue-500">
                <Database className="size-5" />
                <span className="font-bold text-sm text-foreground">Database Engine</span>
              </div>
              <p className="text-xs text-muted-foreground">PostgreSQL Relational DB with exact ISO date typing</p>
            </Card>

            <Card className="p-5 space-y-2 border border-border shadow-sm">
              <div className="flex items-center gap-2 text-purple-500">
                <Sparkles className="size-5" />
                <span className="font-bold text-sm text-foreground">Media & Cloud</span>
              </div>
              <p className="text-xs text-muted-foreground">Cloudinary CDN Storage for HD inspection photo evidence</p>
            </Card>
          </div>

          {/* Key Feature Highlights */}
          <Card className="p-6 space-y-4 border border-border shadow-md">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Key Platform Highlights
            </h3>

            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="space-y-1.5 rounded-lg border border-border p-4 bg-muted/20">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  Automated Inspection Templates
                </div>
                <p className="text-xs text-muted-foreground">
                  New home registrations instantly schedule comprehensive quality inspection checklists across all major home systems.
                </p>
              </div>

              <div className="space-y-1.5 rounded-lg border border-border p-4 bg-muted/20">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-blue-500" />
                  Standalone PDF Export
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate clean, high-resolution inspection PDF documents in dedicated new tabs with property details, photo grids, and full notes.
                </p>
              </div>

              <div className="space-y-1.5 rounded-lg border border-border p-4 bg-muted/20">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-purple-500" />
                  Worldwide Timezone Alignment
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatic client header synchronization ensures dates and schedules match local client dates regardless of server hosting region.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
