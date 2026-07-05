import React, { useState } from "react";
import {
  Archive, BarChart3, BellRing, Check, ChevronRight, CircleDollarSign, ClipboardCheck, Copy,
  Download, Edit3, Eye, FileCheck2, FileText, Filter, Globe2, ImagePlus, LayoutDashboard,
  Link, LockKeyhole, Mail, MessageSquareText, Package, Palette, Pause, Plus, QrCode,
  ReceiptText, RefreshCw, Rocket, Search, Send, Settings, Shirt, ShoppingCart, Sparkles,
  Store, Users, WalletCards, X,
} from "lucide-react";

const tabs = [
  ["home", "Home", LayoutDashboard], ["stores", "Portals", Store], ["templates", "Templates", Copy],
  ["orders", "Orders", ReceiptText], ["payments", "Payments", WalletCards], ["reports", "Reports", BarChart3],
  ["owner-portal", "Owner Portal", Users], ["settings", "Settings", Settings],
];

const groupedRibbons = {
  home: [
    ["Create", "New Portal|Store", "Portal List|Store"],
    ["Review", "Questionnaires|ClipboardCheck", "Approvals|FileCheck2"],
    ["Work", "Needs Action|BellRing", "Launch Blockers|LockKeyhole"],
    ["Orders", "New Orders|ReceiptText"],
    ["Reports", "Snapshot|BarChart3"],
  ],
  stores: [
    ["Create", "New Portal|Store"],
    ["Review", "Needs Action|BellRing", "Questionnaires|ClipboardCheck", "Approvals|FileCheck2"],
    ["Manage", "All Portals|Store", "Archived|Archive"],
  ],
  storeDetail: [
    ["Setup", "Edit Setup|Edit3", "Send Form|Mail", "Review Answers|ClipboardCheck"],
    ["Products", "Add Product|Shirt", "Add Template|Copy", "Generate Copy|Sparkles"],
    ["Review", "Preview|Eye", "Send Review|Send"],
    ["Launch", "Readiness|FileCheck2", "Launch|Rocket"],
    ["Share", "QR Code|QrCode"],
    ["Status", "Pause / Close|Pause"],
  ],
};

const ribbons = {
  templates: ["New Product|Shirt", "New Bundle|Package", "Duplicate|Copy", "Edit Template|Edit3", "Add Images|ImagePlus", "Archive|Archive", "Categories|Filter", "Default Price|CircleDollarSign", "Default Cost|WalletCards", "Copy To Portal|Store", "Bundle Items|Plus", "Export|Download"],
  orders: ["New Orders|BellRing", "Filter|Filter", "Search|Search", "Processing|RefreshCw", "To Production|Send", "Mark Ready|Check", "Mark Shipped|Package", "Picked Up|Check", "Order Summary|FileText", "Pick List|ClipboardCheck", "Export|Download", "Email Customer|Mail"],
  payments: ["Stripe Status|WalletCards", "Stripe Dashboard|Globe2", "Refresh Health|RefreshCw", "Onboarding Link|Send", "Payments|ReceiptText", "Platform Fees|CircleDollarSign", "Owner Share|Users", "Payout Summary|BarChart3", "Export Payouts|Download", "Failed Transfers|LockKeyhole", "Retry Transfer|RefreshCw", "Payment Records|FileText"],
  reports: ["Sales|BarChart3", "Orders|ReceiptText", "Revenue|CircleDollarSign", "Top Products|Shirt", "Product Detail|Package", "Donations|CircleDollarSign", "Goal Progress|BarChart3", "Owner Share|Users", "Export CSV|Download", "Export PDF|FileText", "Date Range|FileText", "Send Report|Send"],
  "owner-portal": ["Send Invite|Mail", "Magic Link|Link", "Create Access|Plus", "View As Owner|Eye", "Send Review|Send", "Change Requests|MessageSquareText", "Approval Status|FileCheck2", "Terms|FileText", "Approval History|Archive", "Owner QR|QrCode", "Analytics|BarChart3", "Portal Settings|Settings"],
  settings: ["Module Access|LockKeyhole", "Feature Gates|Settings", "Platform Fees|CircleDollarSign", "Default Fees|WalletCards", "Stripe|WalletCards", "Checkout|ShoppingCart", "Email Templates|Mail", "SMS Templates|MessageSquareText", "Terms Templates|FileText", "Approval Rules|FileCheck2", "Branding|Palette", "Audit Settings|Archive"],
};

const iconMap = {
  Archive, BarChart3, BellRing, Check, CircleDollarSign, ClipboardCheck, Copy, Download, Edit3, Eye,
  FileCheck2, FileText, Filter, Globe2, ImagePlus, Link, LockKeyhole, Mail, MessageSquareText, Package,
  Palette, Pause, Plus, QrCode, ReceiptText, RefreshCw, Rocket, Search, Send, Settings, Shirt,
  ShoppingCart, Sparkles, Store, Users, WalletCards,
};

const legacyStores = [
  { id: "northstar", name: "Northstar Staff Store", type: "Employee", status: "Setup in progress", action: "Review product pricing", due: "Today", owner: "Northstar Manufacturing · Dana Cole", slug: "northstar-staff-store", progress: "72%", products: 12, orders: 0, approval: "Not sent", terms: "Not accepted", stripe: "Ready", readiness: "3 blockers", launchReady: false },
  { id: "city-arts", name: "City Arts Summer Fundraiser", type: "Fundraiser", status: "Owner review pending", action: "Owner terms pending", due: "1 day", owner: "City Arts Council · Maria Evans", slug: "city-arts-summer-fundraiser", progress: "88%", products: 8, orders: 0, approval: "Pending", terms: "Pending", stripe: "Needs onboarding", readiness: "2 blockers", launchReady: false },
  { id: "beacon", name: "Beacon Coffee Merch", type: "General", status: "Questionnaire received", action: "Review new answers", due: "2 days", owner: "Beacon Coffee · Alex Stone", slug: "beacon-coffee-merch", progress: "46%", products: 0, orders: 0, approval: "Not sent", terms: "Not accepted", stripe: "Not started", readiness: "6 blockers", launchReady: false },
];
const stores = [
  { id: "northstar", name: "Northstar Staff Portal", type: "Employee", status: "Setup in progress", action: "Review product pricing", due: "Today", owner: "Northstar Manufacturing - Dana Cole", slug: "northstar-staff-portal", progress: "72%", products: 12, orders: 0, approval: "Not sent", terms: "Not accepted", stripe: "Ready", readiness: "3 blockers", launchReady: false },
  { id: "city-arts", name: "City Arts Fundraiser Portal", type: "Fundraiser", status: "Owner review pending", action: "Owner terms pending", due: "1 day", owner: "City Arts Council - Maria Evans", slug: "city-arts-fundraiser", progress: "88%", products: 8, orders: 0, approval: "Pending", terms: "Pending", stripe: "Needs onboarding", readiness: "2 blockers", launchReady: false },
  { id: "beacon", name: "Beacon Coffee Order Portal", type: "General", status: "Questionnaire received", action: "Review answers", due: "2 days", owner: "Beacon Coffee - Alex Stone", slug: "beacon-coffee-order-portal", progress: "46%", products: 0, orders: 0, approval: "Not sent", terms: "Not accepted", stripe: "Not started", readiness: "6 blockers", launchReady: false },
];
const storeTypes = ["B2B", "Fundraiser", "Event", "Promotional", "Employee", "General"];
const storeTypeInfo = {
  B2B: ["b2b", "For businesses, schools, teams, departments, or organizations that need controlled online ordering.", "Private access, approved product list, repeat ordering, optional manager approval."],
  Fundraiser: ["fundraiser", "For teams, schools, clubs, nonprofits, or groups raising money through product sales and donations.", "Donation prompt, fundraiser goal, deadline, progress bar, fundraiser reporting."],
  Event: ["event", "For merchandise connected to a specific event, date, location, deadline, or pickup plan.", "Event date, location, order deadline, QR code, pickup instructions, optional auto-close."],
  Promotional: ["promotional", "For a person, brand, driver, creator, athlete, band, performer, or public-facing personality.", "Brand story, social links, sponsor logos, featured products, public merch layout."],
  Employee: ["employee", "For businesses that want employees to order approved uniforms, workwear, safety gear, or apparel.", "Private access, department grouping, manager approval, personalization, company pay option."],
  General: ["general", "For simple portals that do not need a special fundraiser, event, employee, B2B, or promotional setup.", "Basic setup, products, checkout, pickup/shipping, owner approval, QR code."],
};
const setupMethods = [
  ["send_questionnaire", "Send Questionnaire", "Email the portal owner a simple questionnaire with the main portal questions and one extra section for this portal type."],
  ["build_manually", "Build Manually", "Create the draft and go straight to setup so staff can add branding, products, pricing, and pickup details."],
  ["draft_only", "Create Draft Only", "Create the draft portal and return to it later."],
  ["use_previous", "Use Previous Portal", "Copy from a prior portal. Full cloning can stay shell-only until the release plan allows it."],
];
const storeDetailTabs = ["Overview", "Setup", "Questionnaire", "Products", "Preview", "Owner Review", "Orders", "Payments", "Reports", "Activity"];

const sectionDescriptions = {
  stores: "Open a portal to manage setup, products, owner review, launch packet, checkout readiness, and activity.",
  templates: "Reusable starting points that become portal-specific products when copied into a portal.",
  orders: "Buyer orders, customer communication, production handoff, and exports.",
  payments: "Stripe Connect health, direct owner payouts, fees, transfers, and payment records.",
  reports: "Sales, orders, revenue, products, donations, goals, owner share, and exports.",
  "owner-portal": "Owner invites, approvals, terms acceptance, and owner-facing analytics.",
  settings: "Feature gates, platform fees, Stripe, checkout, templates, approvals, branding, and audit rules.",
};

const initialWizardData = {
  storeType: "",
  ownerMode: "existing",
  organization: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  approvalName: "",
  approvalEmail: "",
  approvalPhone: "",
  sameApprover: true,
  orderUpdates: true,
  salesSummary: true,
  questionnaireEmail: true,
  approvalEmailCopy: true,
  storeName: "",
  slug: "",
  description: "",
  internalNotes: "",
  targetLaunchDate: "",
  orderingDeadline: "",
  closeAt: "",
  accessType: "public",
  setupMethod: "send_questionnaire",
  logoWanted: false,
  bannerWanted: false,
  colors: "",
  style: "Clean and professional",
  productNotes: "",
  needRecommendations: false,
  useTemplates: true,
  pickupShipping: "Not sure yet",
  ownerShareNeeded: false,
  donationsEnabled: false,
  customerPaysOnline: true,
  pricingKnown: false,
  shopSetsPrices: true,
};

const workspaceData = {
  templates: {
    metrics: [["Product templates", "24", "18 active"], ["Bundle templates", "6", "4 active"], ["Used by portals", "11", "Across 3 portals"], ["Needs review", "3", "Missing cost or image"]],
    primary: "Reusable templates", columns: ["Template", "Category", "Usage", "Status"],
    rows: [["Classic Tee", "Apparel", "8 portals", "Ready"], ["Staff Uniform Pack", "Employee", "2 portals", "Ready"], ["Fundraiser Starter Pack", "Fundraiser", "1 portal", "Review"], ["Event Sponsor Bundle", "Event", "0 portals", "Draft"]],
    side: "Template rules", sideRows: [["Universal starting points", "Templates remain reusable"], ["Copied products", "Become portal-specific"], ["Portal pricing", "Can change after copy"]],
  },
  orders: {
    metrics: [["New", "0", "No orders waiting"], ["Processing", "0", "Nothing in production"], ["Ready", "0", "Nothing awaiting pickup"], ["This month", "$0.00", "No sales recorded"]],
    primary: "Buyer order queue", columns: ["Order", "Portal", "Status", "Total"],
    rows: [["No buyer orders", "Orders appear after checkout launches", "Waiting", "$0.00"]],
    side: "Order workflow", sideRows: [["Received", "Review payment and items"], ["Production", "Send approved items"], ["Fulfillment", "Pickup, delivery, or shipping"]],
  },
  payments: {
    metrics: [["Stripe accounts", "3", "1 needs onboarding"], ["Ready portals", "1", "Checkout capable"], ["Pending payouts", "$0.00", "No transfers pending"], ["Failed transfers", "0", "No action required"]],
    primary: "Stripe Connect readiness", columns: ["Portal", "Account", "Capabilities", "Status"],
    rows: [["Northstar Staff Portal", "Connected", "Charges and payouts", "Ready"], ["City Arts Fundraiser Portal", "Started", "Payouts incomplete", "Action needed"], ["Beacon Coffee Order Portal", "Not started", "None", "Not ready"]],
    side: "Payment controls", sideRows: [["Checkout", "Blocked until portal is ready"], ["Owner payouts", "Route through Connect"], ["Platform fees", "Configured in Settings"]],
  },
  reports: {
    metrics: [["Gross sales", "$0.00", "Current period"], ["Orders", "0", "Current period"], ["Owner share", "$0.00", "Current period"], ["Donations", "$0.00", "Current period"]],
    primary: "Portal performance", columns: ["Portal", "Orders", "Revenue", "Status"],
    rows: [["Northstar Staff Portal", "0", "$0.00", "Not live"], ["City Arts Fundraiser Portal", "0", "$0.00", "Not live"], ["Beacon Coffee Order Portal", "0", "$0.00", "Not live"]],
    side: "Report shortcuts", sideRows: [["Sales overview", "Revenue and order trends"], ["Product detail", "Units and product mix"], ["Owner share", "Payout and fundraiser detail"]],
  },
  "owner-portal": {
    metrics: [["Invites pending", "1", "Needs owner access"], ["Reviews pending", "2", "Waiting for owners"], ["Changes requested", "0", "No revisions requested"], ["Terms accepted", "0", "No completed approvals"]],
    primary: "Owner review queue", columns: ["Portal", "Owner", "Review status", "Next step"],
    rows: [["City Arts Fundraiser Portal", "Maria Evans", "Pending", "Terms acceptance"], ["Northstar Staff Portal", "Dana Cole", "Not sent", "Complete setup"], ["Beacon Coffee Order Portal", "Alex Stone", "Not ready", "Review questionnaire"]],
    side: "Portal access", sideRows: [["Magic links", "Secure owner access"], ["Approval record", "Identity and timestamp"], ["Visible data", "Only the owner's portal"]],
  },
  settings: {
    metrics: [["Module access", "Enabled", "Standalone workspace"], ["Publishing", "Gated", "Entitlement required"], ["Checkout", "Gated", "Stripe and readiness"], ["Audit logging", "Enabled", "Changes recorded"]],
    primary: "Order Portal configuration", columns: ["Setting", "Current value", "Owner", "Status"],
    rows: [["Default branding", "Order Portal Manager", "Admin", "Configured"], ["Platform fee", "5% eligible amount", "Admin", "Configured"], ["Owner approval", "Required", "Admin", "Enabled"], ["Checkout activation", "Readiness gated", "System", "Enabled"]],
    side: "Protected controls", sideRows: [["Publishing", "Cannot bypass readiness"], ["Internal costs", "Never shown to owners"], ["Terms snapshots", "Stored with approval"]],
  },
};

export function WebstoresWorkspace({ standalone = false, onToast }) {
  const [tab, setTab] = useState("home");
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeDetailTab, setStoreDetailTab] = useState("Overview");
  const [newStoreOpen, setNewStoreOpen] = useState(false);
  const notify = (message) => onToast?.(message);
  const openTab = (nextTab) => { setSelectedStore(null); setTab(nextTab); };
  const openStore = (store) => { setSelectedStore(store); setStoreDetailTab("Overview"); setTab("stores"); };
  const action = (label) => {
    if (label === "New Portal") return setNewStoreOpen(true);
    if (label === "Portal List" || label === "All Portals") return openTab("stores");
    if (label === "New Orders") return openTab("orders");
    if (label === "Snapshot") return openTab("reports");
    if (label === "Launch" && !selectedStore?.launchReady) return notify("Launch blocked until all readiness checks pass");
    notify(`${label}${selectedStore ? ` for ${selectedStore.name}` : " queue"} opened`);
  };
  const heading = selectedStore ? selectedStore.name : tab === "home" ? "Order Portal Command Center" : tabs.find(([id]) => id === tab)[1];
  const portalDescription = selectedStore ? `${selectedStore.type} portal - ${selectedStore.status}` : tab === "home" ? "Overview, triage, launch blockers, owner approvals, buyer orders, and reporting shortcuts." : sectionDescriptions[tab];
  const description = selectedStore ? `${selectedStore.type} store · ${selectedStore.status}` : tab === "home" ? "Overview, triage, queues, and shortcuts." : sectionDescriptions[tab];

  return <div className="webstores-workspace">
    <section className="webstore-heading">
      <div><span className="eyebrow">{selectedStore ? "Portal Detail" : standalone ? "Standalone Order Portal Manager" : "Order Portal add-on"}</span><h1>{heading}</h1><p>{portalDescription}</p></div>
      <button className="primary-button" onClick={() => setNewStoreOpen(true)}><Plus size={16}/>New Portal</button>
    </section>
    <nav className="webstore-tabs" aria-label="Order Portal top navigation">
      {tabs.map(([id, label, Icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => openTab(id)}><Icon size={15}/>{label}</button>)}
    </nav>
    {selectedStore ? <GroupedRibbon groups={groupedRibbons.storeDetail} action={action} label="store detail actions"/> : groupedRibbons[tab] ? <GroupedRibbon groups={groupedRibbons[tab]} action={action} label={`${tab} actions`}/> : <ContextRibbon tab={tab} action={action}/>}
    {selectedStore ? <StoreDetail store={selectedStore} activeTab={storeDetailTab} setActiveTab={setStoreDetailTab} back={() => openTab("stores")} notify={notify}/> : tab === "home" ? <OrderPortalHomeDashboard action={action} openStore={openStore}/> : tab === "stores" ? <StoresPage openStore={openStore}/> : <WorkspacePage tab={tab} notify={notify}/>}
    {newStoreOpen && <NewStoreDialog close={() => setNewStoreOpen(false)} notify={notify}/>}
  </div>;
}

function GroupedRibbon({ groups, action, label }) {
  const className = label === "store detail actions" ? "webstore-ribbon store-detail-ribbon" : "webstore-ribbon";
  return <section className={className} aria-label={label}>{groups.map(([name, ...items]) => <div className="webstore-ribbon-group" key={name}><div>{items.map(item => { const [text, key] = item.split("|"); const Icon = iconMap[key]; return <button key={text} onClick={() => action(text)}><Icon size={18}/><span>{text}</span></button>; })}</div><small>{name}</small></div>)}</section>;
}

function ContextRibbon({ tab, action }) {
  const groups = [["Primary", 0, 3], ["Manage", 3, 6], ["Review", 6, 9], ["Complete", 9, 12]];
  return <section className="webstore-ribbon" aria-label={`${tab} actions`}>{groups.map(([name, start, end]) => <div className="webstore-ribbon-group" key={name}><div>{ribbons[tab].slice(start, end).map(item => { const [label, key] = item.split("|"); const Icon = iconMap[key]; return <button key={label} onClick={() => action(label)}><Icon size={18}/><span>{label}</span></button>; })}</div><small>{name}</small></div>)}</section>;
}

function OrderPortalHomeDashboard({ action, openStore }) {
  const activity = [
    ["Questionnaire submitted", "Beacon Coffee Order Portal - 24 min ago"],
    ["Owner review sent", "City Arts Fundraiser Portal - 3 hr ago"],
    ["Products updated", "Northstar Staff Portal - Yesterday"],
  ];
  return <>
    <section className="webstore-home-hero">
      <div><span className="eyebrow">Order Portal Manager</span><h2>Keep every portal moving toward launch</h2><p>Review questionnaires, AI-assisted setup, owner approvals, launch blockers, buyer orders, and revenue from one command center.</p></div>
      <div className="hero-action-summary"><span><strong>3</strong><small>Need action</small></span><span><strong>2</strong><small>Owner reviews</small></span><button onClick={() => action("Needs Action")}>Review priorities<ChevronRight size={15}/></button></div>
    </section>
    <section className="webstore-kpis">
      <Kpi label="Portals in setup" value="3" detail="2 need action" icon={Store}/>
      <Kpi label="Questionnaires waiting" value="1" detail="New answers received" icon={ClipboardCheck}/>
      <Kpi label="Owner approvals pending" value="2" detail="Oldest waiting 1 day" icon={FileCheck2}/>
      <Kpi label="Launch blockers" value="5" detail="Needs review" icon={LockKeyhole}/>
      <Kpi label="Live portals" value="0" detail="No portals live" icon={Globe2}/>
      <Kpi label="New buyer orders" value="0" detail="No new orders" icon={ReceiptText}/>
    </section>
    <div className="webstore-home-grid">
      <section className="panel webstore-list span-two"><PanelTitle title="Portals needing action" action="View portals" onAction={() => action("Portal List")}/>{stores.map(store => <PortalRow key={store.id} store={store} openStore={openStore}/>)}</section>
      <section className="panel"><PanelTitle title="Revenue snapshot" action="Reports" onAction={() => action("Snapshot")}/><div className="revenue-snapshot"><strong>$0.00</strong><span>No sales recorded yet</span><p><BarChart3 size={14}/>Open Reports for portal, order, and ledger detail</p></div></section>
      <section className="panel"><PanelTitle title="New buyer orders" action="Open" onAction={() => action("New Orders")}/><div className="compact-empty"><ReceiptText size={23}/><strong>No new buyer orders</strong><small>Buyer orders appear here after checkout launches.</small></div></section>
      <section className="panel span-two"><PanelTitle title="Recent activity" action="Audit log" onAction={() => action("Recent Activity")}/><div className="activity-list">{activity.map(([a, b]) => <p key={a}><span/><strong>{a}</strong><small>{b}</small></p>)}</div></section>
      <section className="panel"><PanelTitle title="Queue shortcuts"/><div className="queue-shortcuts">{["Questionnaires", "Approvals", "Launch Blockers", "New Orders"].map(x => <button key={x} onClick={() => action(x)}>{x}<ChevronRight size={14}/></button>)}</div></section>
    </div>
  </>;
}

function HomeDashboard({ action, openStore }) {
  return <>
    <section className="webstore-home-hero">
      <div><span className="eyebrow">Order Portal Manager</span><h2>Keep every portal moving toward launch</h2><p>Review questionnaires, AI-assisted setup, owner approvals, launch blockers, buyer orders, and revenue from one command center.</p></div>
      <div className="hero-action-summary"><span><strong>3</strong><small>Need action</small></span><span><strong>2</strong><small>Owner reviews</small></span><button onClick={() => action("Needs Action")}>Review priorities<ChevronRight size={15}/></button></div>
    </section>
    <section className="webstore-kpis">
      <Kpi label="Portals in setup" value="3" detail="2 need action" icon={Store}/>
      <Kpi label="Questionnaires waiting" value="1" detail="New answers received" icon={ClipboardCheck}/>
      <Kpi label="Owner approvals pending" value="2" detail="Oldest waiting 1 day" icon={FileCheck2}/>
      <Kpi label="Launch blockers" value="5" detail="Needs review" icon={LockKeyhole}/>
      <Kpi label="Live portals" value="0" detail="No portals live" icon={Globe2}/>
      <Kpi label="New orders" value="0" detail="No new orders" icon={ReceiptText}/>
    </section>
    <div className="webstore-home-grid">
      <section className="panel webstore-list span-two"><PanelTitle title="Portals needing action" action="View portals" onAction={() => action("Portal List")}/>{stores.map(store => <StoreRow key={store.id} store={store} openStore={openStore}/>)}</section>
      <section className="panel"><PanelTitle title="Revenue snapshot" action="Reports" onAction={() => action("Snapshot")}/><div className="revenue-snapshot"><strong>$0.00</strong><span>No sales recorded yet</span><p><BarChart3 size={14}/>Open Reports for portal, order, and ledger detail</p></div></section>
      <section className="panel"><PanelTitle title="New buyer orders" action="Open" onAction={() => action("New Orders")}/><div className="compact-empty"><ReceiptText size={23}/><strong>No new buyer orders</strong><small>Buyer orders appear here after checkout launches.</small></div></section>
      <section className="panel span-two"><PanelTitle title="Recent activity" action="Audit log" onAction={() => action("Recent Activity")}/><div className="activity-list">{[["Questionnaire submitted", "Beacon Coffee Merch · 24 min ago"], ["Owner review sent", "City Arts Summer Fundraiser · 3 hr ago"], ["Products updated", "Northstar Staff Store · Yesterday"]].map(([a, b]) => <p key={a}><span/><strong>{a}</strong><small>{b}</small></p>)}</div></section>
      <section className="panel"><PanelTitle title="Queue shortcuts"/><div className="queue-shortcuts">{["Questionnaires", "Approvals", "Launch Blockers", "New Orders"].map(x => <button key={x} onClick={() => action(x)}>{x}<ChevronRight size={14}/></button>)}</div></section>
    </div>
  </>;
}

function StoresPage({ openStore }) {
  return <section className="panel stores-page"><PanelTitle title="All portals"/><p className="stores-page-intro">Select a portal to open its detail workbench.</p>{stores.map(store => <PortalRow key={store.id} store={store} openStore={openStore}/>)}</section>;
}

function PortalRow({ store, openStore }) {
  return <button className="webstore-row" onClick={() => openStore(store)}><span className="store-mark"><Store size={17}/></span><span><strong>{store.name}</strong><small>{store.type} portal - {store.status}</small></span><span className="store-action">{store.action}</span><span className="store-due">{store.due}</span><ChevronRight size={15}/></button>;
}

function StoreRow({ store, openStore }) {
  return <button className="webstore-row" onClick={() => openStore(store)}><span className="store-mark"><Store size={17}/></span><span><strong>{store.name}</strong><small>{store.type} · {store.status}</small></span><span className="store-action">{store.action}</span><span className="store-due">{store.due}</span><ChevronRight size={15}/></button>;
}

function StoreDetail({ store, activeTab, setActiveTab, back, notify }) {
  const facts = [
    ["Portal owner / contact", store.owner], ["Portal URL", `/s/${store.slug}`], ["Setup progress", store.progress],
    ["Portal products", store.products], ["Buyer orders", store.orders], ["Owner approval", store.approval], ["Terms acceptance", store.terms],
    ["Stripe readiness", store.stripe], ["Launch readiness", store.readiness],
  ];
  return <section className="store-detail-workbench">
    <div className="store-detail-summary">
      <button className="text-button" onClick={back}>Back to Portals</button>
      <div><span className="status-pill">{store.status}</span><strong>{store.type}</strong><span>/s/{store.slug}</span></div>
    </div>
    <nav className="store-detail-tabs" aria-label="Portal detail navigation">{storeDetailTabs.map(item => <button key={item} className={activeTab === item ? "active" : ""} onClick={() => setActiveTab(item)}>{item}</button>)}</nav>
    {activeTab === "Overview" ? <div className="store-detail-grid">{facts.map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}</div> : <section className="store-detail-section"><span className="eyebrow">{store.name}</span><h2>{activeTab}</h2><p>Manage this portal's {activeTab.toLowerCase()} without leaving the selected-portal workbench.</p><button className="primary-button" onClick={() => notify(`${activeTab} for ${store.name} opened`)}>Open {activeTab}<ChevronRight size={15}/></button></section>}
    <div className="launch-readiness-note"><LockKeyhole size={17}/><div><strong>Launch remains blocked</strong><span>Entitlement, Stripe, owner approval, accepted terms, active priced products, and readiness checks must all pass.</span></div></div>
  </section>;
}

function WorkspacePage({ tab, notify }) {
  const data = workspaceData[tab];
  const [, label, Icon] = tabs.find(([id]) => id === tab);
  return <section className="workspace-page">
    <div className="workspace-metrics">{data.metrics.map(([name, value, detail]) => <article key={name}><Icon size={17}/><small>{name}</small><strong>{value}</strong><span>{detail}</span></article>)}</div>
    <div className="workspace-page-grid">
      <section className="panel workspace-table-panel">
        <PanelTitle title={data.primary} action={`Open ${label}`} onAction={() => notify(`${label} workspace opened`)}/>
        <div className="workspace-table-head">{data.columns.map(column => <span key={column}>{column}</span>)}</div>
        {data.rows.map((row, index) => <button key={`${row[0]}-${index}`} className="workspace-table-row" onClick={() => notify(`${row[0]} opened`)}>{row.map((cell, cellIndex) => <span key={`${cell}-${cellIndex}`} className={cellIndex === row.length - 1 ? "workspace-status" : ""}>{cell}</span>)}<ChevronRight size={14}/></button>)}
      </section>
      <section className="panel workspace-side-panel">
        <PanelTitle title={data.side}/>
        {data.sideRows.map(([title, detail]) => <button key={title} onClick={() => notify(`${title} opened`)}><span><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={14}/></button>)}
      </section>
    </div>
  </section>;
}

function NewStoreDialog({ close, notify }) {
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState(false);
  const [data, setData] = useState(initialWizardData);
  const steps = ["Type", "Owner", "Portal Info", "Setup Method", "Starting Details", "Review"];
  const selectedType = data.storeType ? storeTypeInfo[data.storeType] : null;
  const selectedMethod = setupMethods.find(([id]) => id === data.setupMethod);
  const slugAvailable = data.slug && !["northstar-staff-store", "city-arts-summer-fundraiser", "beacon-coffee-merch"].includes(data.slug);
  const update = (key, value) => setData(current => ({ ...current, [key]: value }));
  const updateStoreName = (value) => setData(current => ({ ...current, storeName: value, slug: current.slug && current.storeName ? current.slug : slugify(value) }));
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.ownerEmail);
  const canNext = [
    !!data.storeType,
    !!data.ownerName && validEmail,
    !!data.storeName && !!data.slug && slugAvailable,
    !!data.setupMethod && data.setupMethod !== "use_previous",
    true,
    !!data.storeType && !!data.ownerName && validEmail && !!data.storeName && !!data.slug && slugAvailable,
  ][step];
  const createStore = () => {
    const status = data.setupMethod === "send_questionnaire" ? "questionnaire_sent" : data.setupMethod === "build_manually" ? "setup_in_progress" : "draft";
    setCreated({ status });
    notify(data.setupMethod === "send_questionnaire" ? `Questionnaire sent to ${data.ownerEmail}` : `${data.storeName} draft created`);
  };

  return <div className="modal-backdrop wizard-backdrop" onMouseDown={close}>
    <div className="new-store-dialog wizard-dialog" onMouseDown={event => event.stopPropagation()}>
      <div className="modal-heading wizard-heading"><div><h2>{created ? "Portal Created" : "New Portal Wizard"}</h2><p>{created ? "Draft portal created. Choose the next workflow." : "Create a draft order portal quickly. Publishing and checkout are handled by launch readiness."}</p></div><button onClick={close}><X size={18}/></button></div>
      {!created && <div className="wizard-stepper">{steps.map((label, index) => <button key={label} className={index === step ? "active" : index < step ? "done" : ""} onClick={() => index <= step && setStep(index)}><span>{index + 1}</span>{label}</button>)}</div>}
      {created ? <WizardSuccess data={data} status={created.status} close={close} notify={notify}/> : <div className="wizard-body">
        {step === 0 && <WizardStep title="Choose Portal Type" help="Select the type of order portal you are setting up. This controls the questionnaire, setup checklist, and suggested portal fields.">
          <div className="wizard-type-grid">{storeTypes.map(type => <button key={type} className={data.storeType === type ? "active" : ""} onClick={() => update("storeType", type)}><Store size={18}/><span><strong>{type} Portal</strong><small>{storeTypeInfo[type][1]}</small><em>{storeTypeInfo[type][2]}</em></span></button>)}</div>
        </WizardStep>}
        {step === 1 && <WizardStep title="Portal Owner / Contact Info" help="Connect this portal to the person or organization responsible for approving the launch packet and receiving updates.">
          <div className="wizard-form-grid">
            <WizardField label="Organization or business name"><input value={data.organization} onChange={e => update("organization", e.target.value)} placeholder="Optional for individual owners"/></WizardField>
            <WizardField label="Primary contact name" required><input value={data.ownerName} onChange={e => { update("ownerName", e.target.value); if (data.sameApprover) update("approvalName", e.target.value); }} placeholder="Jane Smith"/></WizardField>
            <WizardField label="Primary contact email" required error={data.ownerEmail && !validEmail ? "Enter a valid email." : ""}><input value={data.ownerEmail} onChange={e => { update("ownerEmail", e.target.value); if (data.sameApprover) update("approvalEmail", e.target.value); }} placeholder="jane@example.com"/></WizardField>
            <WizardField label="Primary contact phone"><input value={data.ownerPhone} onChange={e => update("ownerPhone", e.target.value)} placeholder="724-555-1234"/></WizardField>
            <label className="wizard-check span-two"><input type="checkbox" checked={data.sameApprover} onChange={e => update("sameApprover", e.target.checked)}/> Approval contact same as primary contact</label>
            {!data.sameApprover && <><WizardField label="Approver name"><input value={data.approvalName} onChange={e => update("approvalName", e.target.value)}/></WizardField><WizardField label="Approver email"><input value={data.approvalEmail} onChange={e => update("approvalEmail", e.target.value)}/></WizardField></>}
            <div className="wizard-check-grid span-two">{["orderUpdates|Receives order updates", "salesSummary|Receives sales summary", "questionnaireEmail|Receives questionnaire email", "approvalEmailCopy|Receives approval email"].map(item => { const [key, label] = item.split("|"); return <label key={key}><input type="checkbox" checked={data[key]} onChange={e => update(key, e.target.checked)}/>{label}</label>; })}</div>
          </div>
        </WizardStep>}
        {step === 2 && <WizardStep title="Basic Portal Info" help="Add the basic public and internal details for this portal. You can edit these later except the URL slug.">
          <div className="wizard-form-grid">
            <WizardField label="Portal name" required><input value={data.storeName} onChange={e => updateStoreName(e.target.value)} placeholder="Connellsville Football Spirit Portal"/></WizardField>
            <WizardField label="Portal URL slug" required error={data.slug && !slugAvailable ? "Slug already exists." : ""}><input value={data.slug} onChange={e => update("slug", slugify(e.target.value))}/><small className={slugAvailable ? "slug-ok" : "slug-note"}>{slugAvailable ? "Slug available." : "Use lowercase letters, numbers, and hyphens."}</small></WizardField>
            <WizardField label="Portal description"><textarea value={data.description} onChange={e => update("description", e.target.value)} placeholder="Short public description for the portal."/></WizardField>
            <WizardField label="Internal notes"><textarea value={data.internalNotes} onChange={e => update("internalNotes", e.target.value)} placeholder="Not shown to owners or buyers."/></WizardField>
            <WizardField label="Target launch date"><input type="date" value={data.targetLaunchDate} onChange={e => update("targetLaunchDate", e.target.value)}/></WizardField>
            <WizardField label="Ordering deadline"><input type="date" value={data.orderingDeadline} onChange={e => update("orderingDeadline", e.target.value)}/></WizardField>
            <WizardField label="Portal close date"><input type="date" value={data.closeAt} onChange={e => update("closeAt", e.target.value)}/></WizardField>
            <WizardField label="Public or private"><select value={data.accessType} onChange={e => update("accessType", e.target.value)}><option value="public">Public</option><option value="private">Private/password protected</option><option value="invite">Invite-only</option><option value="unsure">Not sure yet</option></select></WizardField>
          </div>
          {selectedType && <p className="wizard-helper">{selectedType[2]}</p>}
        </WizardStep>}
        {step === 3 && <WizardStep title="How Do You Want To Set This Portal Up?" help="Choose whether to collect details from the owner first or start building manually.">
          <div className="wizard-option-list">{setupMethods.map(([id, title, detail]) => <button key={id} className={data.setupMethod === id ? "active" : ""} onClick={() => update("setupMethod", id)}><strong>{title}</strong><small>{detail}</small>{id === "use_previous" && <em>Store cloning is coming later. Create a draft or use templates for now.</em>}</button>)}</div>
          {data.setupMethod === "send_questionnaire" && <div className="wizard-preview"><strong>Email preview</strong><span>Questionnaire template: {data.storeType || "Selected type"} Starter</span><span>Recipient: {data.ownerName || "Owner"} {data.ownerEmail && `<${data.ownerEmail}>`}</span><span>Includes extra section: {data.storeType || "Portal type"}</span></div>}
        </WizardStep>}
        {step === 4 && <WizardStep title="Starting Details" help="Add anything you already know. Skip anything you do not have yet.">
          <div className="wizard-form-grid">
            <label className="wizard-check"><input type="checkbox" checked={data.logoWanted} onChange={e => update("logoWanted", e.target.checked)}/> Logo upload needed</label>
            <label className="wizard-check"><input type="checkbox" checked={data.bannerWanted} onChange={e => update("bannerWanted", e.target.checked)}/> Banner upload needed</label>
            <WizardField label="Preferred colors"><input value={data.colors} onChange={e => update("colors", e.target.value)} placeholder="Navy, gold, white"/></WizardField>
            <WizardField label="Portal style"><select value={data.style} onChange={e => update("style", e.target.value)}>{["Clean and professional", "Bold and sporty", "Fun and colorful", "Patriotic", "Racing/motorsports", "School spirit", "Simple", "Other"].map(x => <option key={x}>{x}</option>)}</select></WizardField>
            <WizardField label="Product notes"><textarea value={data.productNotes} onChange={e => update("productNotes", e.target.value)} placeholder="T-shirts, hoodies, decals"/></WizardField>
            <WizardField label="Pickup / shipping preference"><select value={data.pickupShipping} onChange={e => update("pickupShipping", e.target.value)}>{["Pickup at shop", "Pickup at owner location", "Pickup at event", "Local delivery", "Shipping", "Not sure yet"].map(x => <option key={x}>{x}</option>)}</select></WizardField>
            <div className="wizard-check-grid span-two">{["needRecommendations|Need product recommendations", "useTemplates|Use product templates after creation", "ownerShareNeeded|Owner/fundraiser share needed", "donationsEnabled|Donation prompt wanted", "customerPaysOnline|Customer pays online", "pricingKnown|Prices already known", "shopSetsPrices|Shop sets prices"].map(item => { const [key, label] = item.split("|"); return <label key={key}><input type="checkbox" checked={data[key]} onChange={e => update(key, e.target.checked)}/>{label}</label>; })}</div>
          </div>
        </WizardStep>}
        {step === 5 && <WizardStep title="Review Draft Portal" help="Review before creating. You can edit everything later except the portal URL slug.">
          <div className="wizard-review-grid">
            <ReviewBlock title="Portal Type" rows={[[data.storeType || "Missing", selectedType?.[1] || "Select a type"]]}/>
            <ReviewBlock title="Owner / Contact" rows={[[data.ownerName || "Missing", data.ownerEmail || "Missing email"], ["Approver", data.sameApprover ? "Same as primary" : data.approvalEmail || "Not set"]]}/>
            <ReviewBlock title="Portal Info" rows={[[data.storeName || "Missing", `/s/${data.slug || "missing-slug"}`], ["Access", data.accessType], ["Target launch", data.targetLaunchDate || "Not set"]]}/>
            <ReviewBlock title="Setup Method" rows={[[selectedMethod?.[1], selectedMethod?.[2]]]}/>
            <ReviewBlock title="Starting Details" rows={[["Products", data.productNotes || "No product details yet"], ["Branding", data.logoWanted || data.bannerWanted ? "Upload needed" : "Can be added later"], ["Pickup / shipping", data.pickupShipping]]}/>
            <div className="wizard-warning"><LockKeyhole size={16}/><span>Stripe is not required to create this draft, but the portal cannot launch or accept checkout until readiness checks pass.</span></div>
          </div>
        </WizardStep>}
      </div>}
      {!created && <div className="wizard-footer"><button className="secondary-button" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>{step === 4 && <button className="secondary-button" onClick={() => setStep(5)}>Skip</button>}<button className="primary-button" disabled={!canNext} onClick={() => step === 5 ? createStore() : setStep(step + 1)}>{step === 5 ? data.setupMethod === "send_questionnaire" ? "Create and Send Questionnaire" : data.setupMethod === "build_manually" ? "Create and Continue Setup" : "Create Portal" : "Next"}</button></div>}
    </div>
  </div>;
}

function WizardStep({ title, help, children }) { return <section className="wizard-step"><h3>{title}</h3><p>{help}</p>{children}</section>; }
function WizardField({ label, required, error, children }) { return <label className="wizard-field"><span>{label}{required && <b>*</b>}</span>{children}{error && <em>{error}</em>}</label>; }
function ReviewBlock({ title, rows }) { return <article className="wizard-review-block"><h4>{title}</h4>{rows.map(([a, b]) => <p key={`${a}-${b}`}><strong>{a}</strong><small>{b}</small></p>)}</article>; }
function WizardSuccess({ data, status, close, notify }) {
  const typeValue = data.storeType ? storeTypeInfo[data.storeType][0] : "general";
  const questionnaireSent = status === "questionnaire_sent";
  const actions = questionnaireSent ? ["Review Portal Detail", "Open Questionnaire Status", "Back to Portals"] : ["Send Questionnaire", "Continue Setup", "Add Products", "Preview Draft Portal", "Open Portal Detail", "Back to Portals"];
  return <div className="wizard-success"><div className="wizard-success-card"><Check size={24}/><div><h3>{data.storeName}</h3><p>{questionnaireSent ? `Questionnaire sent to ${data.ownerEmail}.` : "Draft portal created. Continue setup when ready."}</p></div></div><div className="wizard-review-grid"><ReviewBlock title="Created Draft" rows={[["Portal type", typeValue], ["Status", status], ["Owner", data.ownerName], ["Slug", `/s/${data.slug}`]]}/><ReviewBlock title="Generated Records" rows={[["Setup checklist", "Created"], ["QR code", "Placeholder created"], ["Activity log", "portal_created"], ["Products", "Portal-specific catalog ready"]]}/></div><div className="wizard-success-actions">{actions.map(label => <button key={label} className={label.includes("Continue") || label.includes("Open Portal") || label.includes("Review") ? "primary-button" : "secondary-button"} onClick={() => { notify(`${label} selected for ${data.storeName}`); close(); }}>{label}</button>)}</div></div>;
}
function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }

function Kpi({ label, value, detail, icon: Icon }) { return <div className="webstore-kpi"><Icon size={17}/><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></div>; }
function PanelTitle({ title, action, onAction }) { return <div className="panel-title"><div><h2>{title}</h2></div>{action && <button onClick={onAction}>{action}<ChevronRight size={14}/></button>}</div>; }

export function StandaloneWebstoresShell({ onToast, backendStatus }) {
  return <div className="standalone-shell"><header className="standalone-topbar"><a className="standalone-brand" href="/?mode=webstores"><span className="standalone-logo-slot" title="Uploaded company logo appears here"><small>LOGO</small></span><strong>Order Portal Manager</strong></a><div className="standalone-product-label"><strong>Standalone</strong><span>Create, approve, launch, and operate branded order portals</span></div><div><span className={`backend-status ${backendStatus}`}><i/>{backendStatus === "connected" ? "Functional" : backendStatus === "offline" ? "Visual only" : "Checking"}</span><span className="user-avatar small">BN</span></div></header><main><WebstoresWorkspace standalone onToast={onToast}/></main></div>;
}
