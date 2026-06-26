import {
  Archive,
  Banknote,
  BellRing,
  Bot,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Calculator,
  ChartNoAxesCombined,
  CheckSquare,
  Clock3,
  CarFront,
  Contact,
  FileText,
  HandCoins,
  HelpCircle,
  Images,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  NotebookText,
  PanelsTopLeft,
  ReceiptText,
  Repeat2,
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
  { id: "operations", label: "Operations", icon: Wrench, description: "Customers, quoting, orders, production, and assets" },
  { id: "business-management", label: "Business Management", icon: BriefcaseBusiness, description: "Billing, financials, materials, and reports" },
  { id: "team", label: "Team", icon: Users, description: "Employees, payroll, schedules, messaging, and tracking" },
  { id: "tools", label: "Tools", icon: Sparkles, description: "Assistant, AI suite, and calculators" },
];

export const utilityWorkspaces = [
  { id: "settings", label: "Settings", icon: Settings, description: "Company configuration and permissions" },
  { id: "help", label: "Help", icon: HelpCircle, description: "Documentation, help center, onboarding, and community" },
];

export const addons = [
  { id: "sell-it", label: "Sell It!", icon: Store, workspace: "operations", module: "webstores" },
  { id: "wrap-it", label: "Wrap It!", icon: CarFront, workspace: "operations", module: "wraps" },
];

export const modules = {
  operations: [
    ["customers", "Customers", Contact, "ready"],
    ["quotes", "Quotes", FileText, "ready"],
    ["orders", "Orders", ShoppingBag, "ready"],
    ["production", "Production", PanelsTopLeft, "ready"],
    ["documents", "Documents", FileText, "ready"],
    ["asset-library", "Asset Library", Images, "preview"],
  ],
  "business-management": [
    ["billing", "Billing", WalletCards, "preview"],
    ["financials", "Financials", Banknote, "preview"],
    ["materials", "Materials", Boxes, "planned"],
    ["reports", "Reports", ChartNoAxesCombined, "preview"],
  ],
  team: [
    ["employees", "Employees", Users, "planned"],
    ["payroll", "Payroll", ReceiptText, "planned"],
    ["timeclock", "Timeclock", Clock3, "planned"],
    ["team-schedule", "Team Schedule", CalendarDays, "preview"],
    ["messaging", "Messaging", MessageSquareText, "preview"],
    ["notes", "Notes", NotebookText, "ready"],
    ["kiosk-mode", "Kiosk Mode", LayoutDashboard, "planned"],
    ["production-tracking", "Production Tracking", Workflow, "preview"],
  ],
  tools: [
    ["assistant", "Assistant", Bot, "ready"],
    ["ai-suite", "AI Suite", WandSparkles, "ready"],
    ["calculators", "Calculators", Calculator, "ready"],
  ],
  settings: [
    ["company-settings", "Company", Building2, "ready"],
    ["users-permissions", "Users and Permissions", Users, "preview"],
    ["workflow-settings", "Workflow Settings", Workflow, "preview"],
    ["pricing-foundation", "Pricing Foundation", Calculator, "ready"],
    ["billing-settings", "Billing", ReceiptText, "preview"],
    ["team-payroll-settings", "Team and Payroll", Clock3, "preview"],
    ["integrations", "Integrations", Repeat2, "planned"],
    ["feature-entitlements", "Features and Entitlement", Settings, "preview"],
    ["sell-it-settings", "Sell It! Settings", Store, "preview"],
    ["wrap-it-settings", "Wrap It! Settings", CarFront, "preview"],
  ],
  help: [
    ["documentation", "Documentation", FileText, "ready"],
    ["help-center", "Help Center", HelpCircle, "ready"],
    ["community", "Community", Users, "ready"],
    ["onboarding", "Onboarding", Workflow, "ready"],
  ],
};

export const moduleChildren = {
  "asset-library": [
    { label: "Templates", children: ["Questionnaires", "Documents", "Email/SMS"] },
    { label: "Prompts" },
    { label: "Images" },
  ],
  documents: [
    { label: "All Documents" },
    { label: "Files" },
    { label: "Templates" },
    { label: "Questionnaires" },
    { label: "Approvals" },
    { label: "Signed Records" },
    { label: "Archive" },
  ],
  billing: [
    { label: "Invoices" },
    { label: "Payments" },
  ],
  financials: [
    { label: "Sales" },
    { label: "Expenses" },
    { label: "Taxes" },
  ],
  materials: [
    { label: "Inventory" },
    { label: "Purchasing" },
  ],
  reports: [
    { label: "Overall" },
    { label: "Production" },
    { label: "Financial" },
    { label: "Materials" },
    { label: "Insights" },
    { label: "Custom" },
    { label: "Team and Labor" },
  ],
  timeclock: [
    { label: "Time Sheets" },
  ],
};

export const statusLabels = {
  ready: "Available",
  preview: "Preview",
  planned: "Coming soon",
};

export const searchRecords = [
  { type: "Customer", title: "Acme Property Group", detail: "3 open orders - $12,840 lifetime", module: "customers", workspace: "operations" },
  { type: "Customer", title: "Northstar Dental", detail: "Proof waiting for approval", module: "customers", workspace: "operations" },
  { type: "Order", title: "ORD-1048 - Transit van wrap", detail: "Acme Property Group - Due Friday", module: "orders", workspace: "operations" },
  { type: "Order", title: "ORD-1051 - Lobby dimensional letters", detail: "Northstar Dental - In production", module: "orders", workspace: "operations" },
  { type: "Quote", title: "Q-2088 - Event banner package", detail: "City Arts Council - $2,460", module: "quotes", workspace: "operations" },
  { type: "Invoice", title: "INV-9031 - $4,220 outstanding", detail: "Acme Property Group - Due today", module: "billing", workspace: "business-management" },
  { type: "Document", title: "northstar-lobby-proof-v3.pdf", detail: "Proof - uploaded 38 minutes ago", module: "asset-library", workspace: "operations" },
];

export const actionItems = [
  { tone: "danger", title: "2 orders are past due", detail: "ORD-1038 and ORD-1041 need updated dates", action: "Review orders" },
  { tone: "warning", title: "3 proofs need staff review", detail: "Oldest waiting 18 hours", action: "Open asset library" },
  { tone: "info", title: "Invoice INV-9031 is due today", detail: "Acme Property Group - $4,220", action: "View billing" },
];

export const schedule = [
  { time: "8:30", period: "AM", title: "Production stand-up", detail: "Shop floor - All production staff", tone: "teal" },
  { time: "10:00", period: "AM", title: "Northstar site survey", detail: "1420 Market Street - Mike", tone: "blue" },
  { time: "1:30", period: "PM", title: "Van wrap installation", detail: "Bay 2 - Jordan + Luis", tone: "amber" },
  { time: "4:00", period: "PM", title: "Acme pickup", detail: "Front desk - ORD-1045", tone: "slate" },
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
  ["New Invoice", "business-management", "billing", ReceiptText],
  ["Upload Asset", "operations", "asset-library", Images],
  ["Create Document", "operations", "documents", FileText],
  ["Open Team Schedule", "team", "team-schedule", CalendarDays],
  ["Create Sell It! Portal", "operations", "webstores", Store],
  ["Ask Assistant", "tools", "assistant", Bot],
];

export const notifications = [
  { title: "Proof approved", detail: "Northstar Dental approved proof v3", time: "12 min" },
  { title: "Task assigned", detail: "Jordan assigned you a production review", time: "34 min" },
  { title: "Invoice viewed", detail: "Acme Property Group viewed INV-9031", time: "1 hr" },
];

export const moduleDetails = {
  customers: { title: "Customers", description: "Manage customer records, contacts, notes, files, history, and activity.", metric: "248 active customers", action: "New customer" },
  quotes: { title: "Quotes", description: "Build accurate quotes and convert approved work into orders.", metric: "12 open quotes", action: "New quote" },
  orders: { title: "Orders", description: "Track customer work, manage Order Items, and create or download a Work Order when production needs it.", metric: "31 active orders", action: "New order" },
  production: { title: "Production", description: "Manage the Production Board, Work Orders, production tasks, and Shop Schedule.", metric: "18 work orders in production", action: "Open production" },
  documents: { title: "DocuLink", description: "Shared documents, files, templates, approvals, signed records, and linked business records.", metric: "Shared document foundation", action: "Open DocuLink" },
  "asset-library": { title: "Asset Library", description: "Manage templates, questionnaires, documents, email/SMS templates, prompts, and images.", metric: "Templates, prompts, images", action: "Open asset library" },
  webstores: { title: "Sell It!", description: "Create and operate order portals using the shared Order Portal Manager core.", metric: "Order portal add-on", action: "Open Sell It!" },
  wraps: { title: "Wrap It!", description: "Run Wrap Lab projects, design, customer portal approvals, inspections, production, install, and packets.", metric: "Wrap project add-on", action: "Open Wrap It!" },
  billing: { title: "Billing", description: "Manage invoices and payments.", metric: "$18,460 outstanding", action: "Open billing" },
  financials: { title: "Financials", description: "Track sales, expenses, and taxes.", metric: "Sales, expenses, taxes", action: "Open financials" },
  materials: { title: "Materials", description: "Manage inventory and purchasing.", metric: "Inventory and purchasing", action: "Open materials" },
  reports: { title: "Reports", description: "Review overall, production, financial, materials, insights, custom, and team/labor reports.", metric: "7 report categories", action: "Open reports" },
  employees: { title: "Employees", description: "Manage employees, roles, contact information, and staff records.", metric: "Team directory", action: "Open employees" },
  payroll: { title: "Payroll", description: "Manage payroll runs and payroll review.", metric: "Payroll planned", action: "Open payroll" },
  timeclock: { title: "Timeclock", description: "Manage clock-in/out and time sheets.", metric: "Time sheets", action: "Open timeclock" },
  "team-schedule": { title: "Team Schedule", description: "Schedule staff, installs, production coverage, and time off.", metric: "Team calendar", action: "Open schedule" },
  messaging: { title: "Messaging", description: "Team and shop communication.", metric: "Team messages", action: "Open messaging" },
  notes: { title: "Notes", description: "Shared shop notes, customer/order notes, and inherited order context.", metric: "Shared notes system", action: "New note" },
  "kiosk-mode": { title: "Kiosk Mode", description: "Shop floor mode for production, timeclock, and quick status entry.", metric: "Kiosk planned", action: "Open kiosk mode" },
  "production-tracking": { title: "Production Tracking", description: "Track team labor and production progress.", metric: "Production tracking", action: "Open tracking" },
  assistant: { title: "Assistant", description: "Business assistant for shop questions, summaries, and guidance.", metric: "Assistant preview", action: "Ask assistant" },
  "ai-suite": { title: "AI Suite", description: "AI tools for content, design, estimates, communication, pricing, wraps, and workflow support.", metric: "AI tools catalog", action: "Open AI suite" },
  calculators: { title: "Calculators", description: "Pricing, material, labor, square footage, and production calculators.", metric: "Calculator set", action: "Open calculators" },
  documentation: { title: "Documentation", description: "Contextual product guidance and workflow documentation.", metric: "Starter guides", action: "Browse guides" },
  "help-center": { title: "Help Center", description: "Support, help articles, and contact paths.", metric: "Help center", action: "Open help" },
  community: { title: "Community", description: "Community message area for bug reports, feature requests, questions, feedback, replies, upvotes, and official answers.", metric: "Community hub", action: "Open community" },
  onboarding: { title: "Onboarding", description: "Configure the shop using a guided setup checklist.", metric: "4 of 7 steps complete", action: "Continue setup" },
  "company-settings": { title: "Company", description: "Company profile, shop information, branding, and defaults.", metric: "Company setup", action: "Review company" },
  "users-permissions": { title: "Users and Permissions", description: "Manage users, roles, permissions, and access.", metric: "Access control", action: "Open users" },
  "workflow-settings": { title: "Workflow Settings", description: "Configure workflow stages, statuses, gates, and defaults.", metric: "Workflow setup", action: "Review workflow" },
  "pricing-foundation": { title: "Pricing Foundation", description: "Configure deterministic material, labor, markup, waste, rush, tax, and category pricing defaults.", metric: "Protected base behavior", action: "Review pricing setup" },
  "billing-settings": { title: "Billing", description: "Configure billing terms, invoice defaults, payment terms, and finance settings.", metric: "Billing settings", action: "Review billing" },
  "team-payroll-settings": { title: "Team and Payroll", description: "Configure team defaults, payroll settings, and labor rules.", metric: "Team settings", action: "Review team settings" },
  integrations: { title: "Integrations", description: "Manage connected tools and external systems.", metric: "Integrations planned", action: "Open integrations" },
  "feature-entitlements": { title: "Features and Entitlement", description: "Manage feature flags, entitlements, and add-on access.", metric: "Feature control", action: "Open entitlements" },
  "sell-it-settings": { title: "Sell It! Settings", description: "Configure Sell It! order portal settings.", metric: "Add-on settings", action: "Open Sell It! settings" },
  "wrap-it-settings": { title: "Wrap It! Settings", description: "Configure Wrap It! workflow defaults and add-on settings.", metric: "Add-on settings", action: "Open Wrap It! settings" },
};
