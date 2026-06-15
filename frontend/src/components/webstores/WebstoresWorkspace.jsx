import React, { useState } from "react";
import {
  Archive, BarChart3, BellRing, Check, ChevronRight, CircleDollarSign, ClipboardCheck, Copy,
  Download, Edit3, Eye, FileCheck2, FileText, Filter, Globe2, ImagePlus, LayoutDashboard,
  Link, LockKeyhole, Mail, MessageSquareText, Package, Palette, Pause, Plus, QrCode,
  ReceiptText, RefreshCw, Rocket, Search, Send, Settings, Shirt, ShoppingCart, Sparkles,
  Store, Users, WalletCards, X,
} from "lucide-react";

const tabs = [
  ["home", "Home", LayoutDashboard], ["stores", "Stores", Store], ["templates", "Templates", Copy],
  ["orders", "Orders", ReceiptText], ["payments", "Payments", WalletCards], ["reports", "Reports", BarChart3],
  ["owner-portal", "Owner Portal", Users], ["settings", "Settings", Settings],
];

const groupedRibbons = {
  home: [
    ["Create", "New Store|Store", "Store List|Store"],
    ["Review", "Questionnaires|ClipboardCheck", "Approvals|FileCheck2"],
    ["Work", "Needs Action|BellRing", "Launch Blockers|LockKeyhole"],
    ["Orders", "New Orders|ReceiptText"],
    ["Reports", "Snapshot|BarChart3"],
  ],
  stores: [
    ["Create", "New Store|Store"],
    ["Review", "Needs Action|BellRing", "Questionnaires|ClipboardCheck", "Approvals|FileCheck2"],
    ["Manage", "All Stores|Store", "Archived|Archive"],
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
  templates: ["New Product|Shirt", "New Bundle|Package", "Duplicate|Copy", "Edit Template|Edit3", "Add Images|ImagePlus", "Archive|Archive", "Categories|Filter", "Default Price|CircleDollarSign", "Default Cost|WalletCards", "Copy To Store|Store", "Bundle Items|Plus", "Export|Download"],
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

const stores = [
  { id: "northstar", name: "Northstar Staff Store", type: "Employee", status: "Setup in progress", action: "Review product pricing", due: "Today", owner: "Northstar Manufacturing · Dana Cole", slug: "northstar-staff-store", progress: "72%", products: 12, orders: 0, approval: "Not sent", terms: "Not accepted", stripe: "Ready", readiness: "3 blockers", launchReady: false },
  { id: "city-arts", name: "City Arts Summer Fundraiser", type: "Fundraiser", status: "Owner review pending", action: "Owner terms pending", due: "1 day", owner: "City Arts Council · Maria Evans", slug: "city-arts-summer-fundraiser", progress: "88%", products: 8, orders: 0, approval: "Pending", terms: "Pending", stripe: "Needs onboarding", readiness: "2 blockers", launchReady: false },
  { id: "beacon", name: "Beacon Coffee Merch", type: "General", status: "Questionnaire received", action: "Review new answers", due: "2 days", owner: "Beacon Coffee · Alex Stone", slug: "beacon-coffee-merch", progress: "46%", products: 0, orders: 0, approval: "Not sent", terms: "Not accepted", stripe: "Not started", readiness: "6 blockers", launchReady: false },
];
const storeTypes = ["B2B", "Fundraiser", "Event", "Promotional", "Employee", "General"];
const storeDetailTabs = ["Overview", "Setup", "Questionnaire", "Products", "Preview", "Owner Review", "Orders", "Payments", "Reports", "Activity"];

const sectionDescriptions = {
  stores: "Open a store to manage its setup, products, review, launch, and activity.",
  templates: "Reusable starting points that become store-specific products when copied into a store.",
  orders: "Webstore orders, customer communication, production handoff, and exports.",
  payments: "Stripe Connect health, direct owner payouts, fees, transfers, and payment records.",
  reports: "Sales, orders, revenue, products, donations, goals, owner share, and exports.",
  "owner-portal": "Owner invites, approvals, terms acceptance, and owner-facing analytics.",
  settings: "Feature gates, platform fees, Stripe, checkout, templates, approvals, branding, and audit rules.",
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
    if (label === "New Store") return setNewStoreOpen(true);
    if (label === "Store List" || label === "All Stores") return openTab("stores");
    if (label === "New Orders") return openTab("orders");
    if (label === "Snapshot") return openTab("reports");
    if (label === "Launch" && !selectedStore?.launchReady) return notify("Launch blocked until all readiness checks pass");
    notify(`${label}${selectedStore ? ` for ${selectedStore.name}` : " queue"} opened`);
  };
  const heading = selectedStore ? selectedStore.name : tab === "home" ? "Webstore Command Center" : tabs.find(([id]) => id === tab)[1];
  const description = selectedStore ? `${selectedStore.type} store · ${selectedStore.status}` : tab === "home" ? "Overview, triage, queues, and shortcuts." : sectionDescriptions[tab];

  return <div className="webstores-workspace">
    <section className="webstore-heading">
      <div><span className="eyebrow">{selectedStore ? "Store Detail" : standalone ? "Standalone Webstores" : "Webstores module"}</span><h1>{heading}</h1><p>{description}</p></div>
      <button className="primary-button" onClick={() => setNewStoreOpen(true)}><Plus size={16}/>New Store</button>
    </section>
    <nav className="webstore-tabs" aria-label="Webstore top navigation">
      {tabs.map(([id, label, Icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => openTab(id)}><Icon size={15}/>{label}</button>)}
    </nav>
    {selectedStore ? <GroupedRibbon groups={groupedRibbons.storeDetail} action={action} label="store detail actions"/> : groupedRibbons[tab] ? <GroupedRibbon groups={groupedRibbons[tab]} action={action} label={`${tab} actions`}/> : <ContextRibbon tab={tab} action={action}/>}
    {selectedStore ? <StoreDetail store={selectedStore} activeTab={storeDetailTab} setActiveTab={setStoreDetailTab} back={() => openTab("stores")} notify={notify}/> : tab === "home" ? <HomeDashboard action={action} openStore={openStore}/> : tab === "stores" ? <StoresPage openStore={openStore}/> : <ContextPage tab={tab} notify={notify}/>}
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

function HomeDashboard({ action, openStore }) {
  return <>
    <section className="webstore-home-hero">
      <div><span className="eyebrow">Monday, June 15</span><h2>Keep every store moving toward launch</h2><p>Review setup work, owner approvals, launch blockers, and incoming activity from one place.</p></div>
      <div className="hero-action-summary"><span><strong>3</strong><small>Need action</small></span><span><strong>2</strong><small>Owner reviews</small></span><button onClick={() => action("Needs Action")}>Review priorities<ChevronRight size={15}/></button></div>
    </section>
    <section className="webstore-kpis">
      <Kpi label="Stores in setup" value="3" detail="2 need action" icon={Store}/>
      <Kpi label="Questionnaires waiting" value="1" detail="New answers received" icon={ClipboardCheck}/>
      <Kpi label="Owner approvals pending" value="2" detail="Oldest waiting 1 day" icon={FileCheck2}/>
      <Kpi label="Launch blockers" value="5" detail="Needs review" icon={LockKeyhole}/>
      <Kpi label="Live stores" value="0" detail="No stores live" icon={Globe2}/>
      <Kpi label="New orders" value="0" detail="No new orders" icon={ReceiptText}/>
    </section>
    <div className="webstore-home-grid">
      <section className="panel webstore-list span-two"><PanelTitle title="Stores needing action" action="View stores" onAction={() => action("Store List")}/>{stores.map(store => <StoreRow key={store.id} store={store} openStore={openStore}/>)}</section>
      <section className="panel"><PanelTitle title="Revenue snapshot" action="Reports" onAction={() => action("Snapshot")}/><div className="revenue-snapshot"><strong>$0.00</strong><span>No sales recorded yet</span><p><BarChart3 size={14}/>Open Reports for store and sales detail</p></div></section>
      <section className="panel"><PanelTitle title="New orders" action="Open" onAction={() => action("New Orders")}/><div className="compact-empty"><ReceiptText size={23}/><strong>No new orders</strong><small>Orders appear here after stores launch.</small></div></section>
      <section className="panel span-two"><PanelTitle title="Recent activity" action="Audit log" onAction={() => action("Recent Activity")}/><div className="activity-list">{[["Questionnaire submitted", "Beacon Coffee Merch · 24 min ago"], ["Owner review sent", "City Arts Summer Fundraiser · 3 hr ago"], ["Products updated", "Northstar Staff Store · Yesterday"]].map(([a, b]) => <p key={a}><span/><strong>{a}</strong><small>{b}</small></p>)}</div></section>
      <section className="panel"><PanelTitle title="Queue shortcuts"/><div className="queue-shortcuts">{["Questionnaires", "Approvals", "Launch Blockers", "New Orders"].map(x => <button key={x} onClick={() => action(x)}>{x}<ChevronRight size={14}/></button>)}</div></section>
    </div>
  </>;
}

function StoresPage({ openStore }) {
  return <section className="panel stores-page"><PanelTitle title="All stores"/><p className="stores-page-intro">Select a store to open its detail workbench.</p>{stores.map(store => <StoreRow key={store.id} store={store} openStore={openStore}/>)}</section>;
}

function StoreRow({ store, openStore }) {
  return <button className="webstore-row" onClick={() => openStore(store)}><span className="store-mark"><Store size={17}/></span><span><strong>{store.name}</strong><small>{store.type} · {store.status}</small></span><span className="store-action">{store.action}</span><span className="store-due">{store.due}</span><ChevronRight size={15}/></button>;
}

function StoreDetail({ store, activeTab, setActiveTab, back, notify }) {
  const facts = [
    ["Owner / contact", store.owner], ["Store URL", `/s/${store.slug}`], ["Setup progress", store.progress],
    ["Products", store.products], ["Orders", store.orders], ["Owner approval", store.approval], ["Terms acceptance", store.terms],
    ["Stripe readiness", store.stripe], ["Launch readiness", store.readiness],
  ];
  return <section className="store-detail-workbench">
    <div className="store-detail-summary">
      <button className="text-button" onClick={back}>Back to Stores</button>
      <div><span className="status-pill">{store.status}</span><strong>{store.type}</strong><span>/s/{store.slug}</span></div>
    </div>
    <nav className="store-detail-tabs" aria-label="Store detail navigation">{storeDetailTabs.map(item => <button key={item} className={activeTab === item ? "active" : ""} onClick={() => setActiveTab(item)}>{item}</button>)}</nav>
    {activeTab === "Overview" ? <div className="store-detail-grid">{facts.map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}</div> : <section className="store-detail-section"><span className="eyebrow">{store.name}</span><h2>{activeTab}</h2><p>Manage this store's {activeTab.toLowerCase()} without leaving the selected-store workbench.</p><button className="primary-button" onClick={() => notify(`${activeTab} for ${store.name} opened`)}>Open {activeTab}<ChevronRight size={15}/></button></section>}
    <div className="launch-readiness-note"><LockKeyhole size={17}/><div><strong>Launch remains blocked</strong><span>Entitlement, Stripe, owner approval, accepted terms, active priced products, and readiness checks must all pass.</span></div></div>
  </section>;
}

function ContextPage({ tab, notify }) {
  const [, label, Icon] = tabs.find(([id]) => id === tab);
  return <section className="webstore-context-page"><div className="context-page-icon"><Icon size={25}/></div><div><span className="eyebrow">{label}</span><h2>{label} workspace</h2><p>{sectionDescriptions[tab]}</p></div><button className="primary-button" onClick={() => notify(`${label} primary action selected`)}>Open {label}<ChevronRight size={15}/></button></section>;
}

function NewStoreDialog({ close, notify }) {
  return <div className="modal-backdrop" onMouseDown={close}><div className="new-store-dialog" onMouseDown={e => e.stopPropagation()}><div className="modal-heading"><div><h2>Create New Store</h2><p>Select the store type. Type selection only appears during creation.</p></div><button onClick={close}><X size={18}/></button></div><div className="new-store-types">{storeTypes.map(type => <button key={type} onClick={() => { notify(`${type} store draft created`); close(); }}><Store size={19}/><strong>{type}</strong><small>Create draft and begin setup</small><ChevronRight size={14}/></button>)}</div></div></div>;
}

function Kpi({ label, value, detail, icon: Icon }) { return <div className="webstore-kpi"><Icon size={17}/><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></div>; }
function PanelTitle({ title, action, onAction }) { return <div className="panel-title"><div><h2>{title}</h2></div>{action && <button onClick={onAction}>{action}<ChevronRight size={14}/></button>}</div>; }

export function StandaloneWebstoresShell({ onToast, backendStatus }) {
  return <div className="standalone-shell"><header className="standalone-topbar"><a className="standalone-brand" href="/?mode=webstores"><span className="standalone-logo-slot" title="Uploaded company logo appears here"><small>LOGO</small></span><strong>Webstores</strong></a><div className="standalone-product-label"><strong>Standalone</strong><span>Build, approve, launch, and operate branded Webstores</span></div><div><span className={`backend-status ${backendStatus}`}><i/>{backendStatus === "connected" ? "Functional" : backendStatus === "offline" ? "Visual only" : "Checking"}</span><span className="user-avatar small">BN</span></div></header><main><WebstoresWorkspace standalone onToast={onToast}/></main></div>;
}
