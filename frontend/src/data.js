import {
  Archive,
  Banknote,
  BellRing,
  Bot,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  Calculator,
  ChartNoAxesCombined,
  CheckSquare,
  ClipboardCheck,
  Clock3,
  Contact,
  FileText,
  GalleryHorizontalEnd,
  HandCoins,
  HardHat,
  HelpCircle,
  Images,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessageSquareText,
  NotebookText,
  PackageCheck,
  Palette,
  PanelsTopLeft,
  ReceiptText,
  Repeat2,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  WalletCards,
  WandSparkles,
  Workflow,
  Wrench,
} from "lucide-react";

export const workspaces = [
  { id: "operations", label: "Operations", icon: Wrench, description: "Customer work and production" },
  { id: "business", label: "Business", icon: BriefcaseBusiness, description: "Money, people, and materials" },
  { id: "productivity", label: "Productivity", icon: CheckSquare, description: "Team coordination" },
  { id: "ai-hub", label: "AI Hub", icon: Sparkles, description: "Assistance, learning, and support" },
  { id: "settings", label: "Settings", icon: Settings, description: "Shop configuration and permissions" },
];

export const modules = {
  operations: [
    ["customers", "Customers", Contact, "ready"],
    ["quotes", "Quotes", FileText, "ready"],
    ["orders", "Orders", ShoppingBag, "ready"],
    ["order-items", "Order Items", ListChecks, "ready"],
    ["work-orders", "Work Order Summaries", ClipboardCheck, "ready"],
    ["production", "Production Board", PanelsTopLeft, "ready"],
    ["schedule", "Schedule", CalendarDays, "preview"],
    ["approvals", "Proofs & Approvals", PackageCheck, "preview"],
    ["artwork", "Documents & Artwork", Images, "preview"],
    ["wraps", "Wrap Command Center", GalleryHorizontalEnd, "planned"],
    ["webstores", "Webstores", Store, "preview"],
    ["customer-portal", "Customer Portal", Users, "planned"],
    ["field-work", "Mobile / Field Work", HardHat, "planned"],
  ],
  business: [
    ["pricing-calculator", "Pricing Calculator", Calculator, "ready"],
    ["billing", "Billing", WalletCards, "preview"],
    ["invoices", "Invoices", ReceiptText, "ready"],
    ["payments", "Payments", HandCoins, "preview"],
    ["daily-sales", "Daily Sales", ChartNoAxesCombined, "preview"],
    ["finance", "Finance Dashboard", Banknote, "preview"],
    ["expenses", "Expenses", Archive, "planned"],
    ["inventory", "Inventory", Boxes, "planned"],
    ["purchasing", "Purchasing", Repeat2, "planned"],
    ["payroll", "Payroll", Users, "planned"],
    ["reports", "Reports", ChartNoAxesCombined, "preview"],
  ],
  productivity: [
    ["tasks", "Tasks", CheckSquare, "ready"],
    ["kanban", "Kanban", PanelsTopLeft, "preview"],
    ["messages", "Team Messages", MessageSquareText, "preview"],
    ["notes", "Notes", NotebookText, "ready"],
    ["checklists", "Checklists", ListChecks, "preview"],
    ["reminders", "Reminders", BellRing, "preview"],
    ["announcements", "Announcements", Megaphone, "preview"],
    ["calendar", "Unified Calendar", CalendarDays, "preview"],
  ],
  "ai-hub": [
    ["assistant", "Business Assistant", Bot, "planned"],
    ["ai-tools", "AI Tools", WandSparkles, "planned"],
    ["prompt-library", "Prompt Library", NotebookText, "preview"],
    ["onboarding", "Onboarding", Workflow, "ready"],
    ["documentation", "Documentation", FileText, "ready"],
    ["help", "Help Center", HelpCircle, "ready"],
    ["bug-reports", "Bug Reports", Wrench, "ready"],
    ["feature-requests", "Feature Requests", Sparkles, "ready"],
    ["community", "Community", Users, "planned"],
    ["roadmap", "Roadmap", LayoutDashboard, "ready"],
    ["release-notes", "Release Notes", Megaphone, "ready"],
  ],
  settings: [
    ["company-settings", "Company", BriefcaseBusiness, "ready"],
    ["permissions", "Permissions", Users, "preview"],
    ["pricing-foundation", "Pricing Foundation", Calculator, "ready"],
    ["production-stages", "Production Stages", Workflow, "preview"],
    ["team-settings", "Team & Payroll", Clock3, "preview"],
    ["billing-terms", "Billing Terms", ReceiptText, "preview"],
    ["integrations", "Integrations", Repeat2, "planned"],
    ["webstore-settings", "Webstore Settings", Store, "preview"],
    ["feature-flags", "Features & Entitlements", Settings, "preview"],
  ],
};

export const statusLabels = {
  ready: "Available",
  preview: "Preview",
  planned: "Coming soon",
};

export const searchRecords = [
  { type: "Customer", title: "Acme Property Group", detail: "3 open orders · $12,840 lifetime", module: "customers", workspace: "operations" },
  { type: "Customer", title: "Northstar Dental", detail: "Proof waiting for approval", module: "customers", workspace: "operations" },
  { type: "Order", title: "ORD-1048 · Transit van wrap", detail: "Acme Property Group · Due Friday", module: "orders", workspace: "operations" },
  { type: "Order", title: "ORD-1051 · Lobby dimensional letters", detail: "Northstar Dental · In production", module: "orders", workspace: "operations" },
  { type: "Quote", title: "Q-2088 · Event banner package", detail: "City Arts Council · $2,460", module: "quotes", workspace: "operations" },
  { type: "Invoice", title: "INV-9031 · $4,220 outstanding", detail: "Acme Property Group · Due today", module: "invoices", workspace: "business" },
  { type: "Document", title: "northstar-lobby-proof-v3.pdf", detail: "Proof · uploaded 38 minutes ago", module: "artwork", workspace: "operations" },
];

export const actionItems = [
  { tone: "danger", title: "2 orders are past due", detail: "ORD-1038 and ORD-1041 need updated dates", action: "Review orders" },
  { tone: "warning", title: "3 proofs need staff review", detail: "Oldest waiting 18 hours", action: "Open approvals" },
  { tone: "info", title: "Invoice INV-9031 is due today", detail: "Acme Property Group · $4,220", action: "View invoice" },
];

export const schedule = [
  { time: "8:30", period: "AM", title: "Production stand-up", detail: "Shop floor · All production staff", tone: "teal" },
  { time: "10:00", period: "AM", title: "Northstar site survey", detail: "1420 Market Street · Mike", tone: "blue" },
  { time: "1:30", period: "PM", title: "Van wrap installation", detail: "Bay 2 · Jordan + Luis", tone: "amber" },
  { time: "4:00", period: "PM", title: "Acme pickup", detail: "Front desk · ORD-1045", tone: "slate" },
];

export const orders = [
  { id: "ORD-1051", customer: "Northstar Dental", item: "Lobby dimensional letters", stage: "Production", due: "Today", tone: "warning" },
  { id: "ORD-1048", customer: "Acme Property Group", item: "Transit van wrap", stage: "Install scheduled", due: "Fri", tone: "info" },
  { id: "ORD-1054", customer: "City Arts Council", item: "Event banner package", stage: "Proof", due: "Jun 17", tone: "neutral" },
  { id: "ORD-1045", customer: "Beacon Coffee", item: "Window graphics", stage: "Ready for pickup", due: "Today", tone: "success" },
];

export const quickCreate = [
  ["New Customer", "operations", "customers", Contact],
  ["New Quote", "operations", "quotes", FileText],
  ["New Order", "operations", "orders", ShoppingBag],
  ["New Task", "productivity", "tasks", CheckSquare],
  ["New Invoice", "business", "invoices", ReceiptText],
  ["Upload File", "operations", "artwork", Images],
  ["Schedule Appointment", "operations", "schedule", CalendarDays],
  ["Create Webstore", "operations", "webstores", Store],
  ["Ask AI", "ai-hub", "assistant", Bot],
];

export const notifications = [
  { title: "Proof approved", detail: "Northstar Dental approved proof v3", time: "12 min" },
  { title: "Task assigned", detail: "Jordan assigned you a production review", time: "34 min" },
  { title: "Invoice viewed", detail: "Acme Property Group viewed INV-9031", time: "1 hr" },
];

export const moduleDetails = {
  customers: { title: "Customers", description: "Manage customer records, contacts, notes, files, history, and activity.", metric: "248 active customers", action: "New customer" },
  quotes: { title: "Quotes", description: "Build accurate quotes and convert approved work into orders.", metric: "12 open quotes", action: "New quote" },
  orders: { title: "Orders", description: "Track customer work from approved sale through completion.", metric: "31 active orders", action: "New order" },
  production: { title: "Production Board", description: "Keep every Work Order Summary visible and moving through tenant-configurable production stages.", metric: "18 work orders in production", action: "View board" },
  "work-orders": { title: "Work Order Summaries", description: "Review production-facing order summaries, required Order Items, tasks, materials, proofs, and due dates.", metric: "18 active work orders", action: "View work orders" },
  webstores: { title: "Webstores", description: "Create and operate B2B, Fundraiser, Event, Promotional, and General stores using the shared platform core.", metric: "First expansion track", action: "Open webstores" },
  "pricing-foundation": { title: "Pricing Foundation", description: "Configure deterministic material, labor, markup, waste, rush, tax, and category pricing defaults.", metric: "Protected base behavior", action: "Review pricing setup" },
  tasks: { title: "Tasks", description: "One canonical task system for personal, production, and team work.", metric: "9 tasks due this week", action: "New task" },
  invoices: { title: "Invoices", description: "Create invoices, record payments, and monitor outstanding balances.", metric: "$18,460 outstanding", action: "New invoice" },
  documentation: { title: "Documentation", description: "Contextual product guidance and workflow documentation.", metric: "12 starter guides", action: "Browse guides" },
  onboarding: { title: "Onboarding", description: "Configure the shop using a guided setup checklist.", metric: "4 of 7 steps complete", action: "Continue setup" },
  "bug-reports": { title: "Bug Reports", description: "Submit and track issues discovered while rebuilding and testing.", metric: "No open reports", action: "Report a bug" },
  "feature-requests": { title: "Feature Requests", description: "Capture ideas and track them through review and planning.", metric: "3 requests under review", action: "Submit request" },
};
