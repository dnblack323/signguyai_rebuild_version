import React, { useState } from "react";
import {
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Eye,
  FileCheck2,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  Package,
  Plus,
  QrCode,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";

const tabs = [
  ["overview", "Overview", LayoutDashboard],
  ["stores", "Stores", Store],
  ["products", "Products", Package],
  ["orders", "Orders", ShoppingCart],
  ["owners", "Owner Portal", Users],
  ["reports", "Reports", BarChart3],
  ["settings", "Settings", Settings],
];

const stores = [
  { name: "Northstar Staff Store", type: "B2B", status: "Setup", products: 18, orders: 0, gate: "Publishing locked" },
  { name: "City Arts Summer Fundraiser", type: "Fundraiser", status: "Draft", products: 12, orders: 0, gate: "Publishing locked" },
  { name: "Beacon Coffee Merch", type: "General", status: "Design review", products: 9, orders: 0, gate: "Publishing locked" },
];

export const webstoreEntitlements = {
  manage: true,
  publish: false,
  cartCheckout: false,
};

export function WebstoresWorkspace({ standalone = false, onToast }) {
  const [tab, setTab] = useState("overview");

  const notify = (message) => onToast?.(message);

  return (
    <div className={standalone ? "webstores-workspace standalone-workspace" : "webstores-workspace"}>
      <section className="webstore-heading">
        <div>
          <span className="eyebrow">{standalone ? "Webstores standalone" : "Webstores module"}</span>
          <h1>Webstore Command Center</h1>
          <p>Create, configure, review, and manage every store before enabling commerce features.</p>
        </div>
        <div className="webstore-heading-actions">
          {!standalone && <a className="secondary-button" href="/?mode=webstores"><Eye size={15} />Standalone preview</a>}
          <button className="primary-button" onClick={() => notify("New Webstore setup started")}><Plus size={16} />New Webstore</button>
        </div>
      </section>

      <section className="webstore-entitlement-bar">
        <Entitlement icon={Store} label="Store management" detail="Included" enabled />
        <Entitlement icon={Globe2} label="Publish storefronts" detail="Feature gated" />
        <Entitlement icon={ShoppingCart} label="Cart & checkout" detail="Feature gated" />
      </section>

      <nav className="webstore-tabs" aria-label="Webstore sections">
        {tabs.map(([id, label, Icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}
      </nav>

      {tab === "overview" ? <Overview notify={notify} standalone={standalone} /> : <SectionPreview tab={tab} notify={notify} />}
    </div>
  );
}

function Entitlement({ icon: Icon, label, detail, enabled = false }) {
  return <div className={enabled ? "entitlement enabled" : "entitlement gated"}><span><Icon size={16} /></span><div><strong>{label}</strong><small>{detail}</small></div>{enabled ? <Check size={15} /> : <LockKeyhole size={14} />}</div>;
}

function Overview({ notify, standalone }) {
  return (
    <>
      <section className="webstore-kpis">
        <Kpi label="Stores in setup" value="3" detail="Management always available" icon={Store} />
        <Kpi label="Products configured" value="39" detail="Across all draft stores" icon={Package} />
        <Kpi label="Owner approvals" value="2" detail="Waiting for review" icon={FileCheck2} />
        <Kpi label="Commerce revenue" value="Locked" detail="Activates with checkout" icon={CircleDollarSign} gated />
      </section>

      <div className="webstore-grid">
        <section className="panel webstore-list">
          <WebstorePanelTitle title="Your Webstores" action="Manage all" />
          {stores.map((store) => (
            <button className="webstore-row" key={store.name} onClick={() => notify(`${store.name} opened`)}>
              <span className="store-mark"><Store size={17} /></span>
              <span><strong>{store.name}</strong><small>{store.type} · {store.products} products</small></span>
              <span className="store-status">{store.status}</span>
              <span className="store-gate"><LockKeyhole size={12} />{store.gate}</span>
              <ChevronRight size={15} />
            </button>
          ))}
        </section>

        <section className="panel setup-card">
          <WebstorePanelTitle title="Setup progress" />
          <div className="setup-score"><strong>68%</strong><span>Platform setup</span></div>
          {["Brand and store defaults", "Owner portal template", "Product catalog defaults", "Payment connection"].map((item, index) => <p key={item} className={index < 3 ? "done" : ""}>{index < 3 ? <Check size={14} /> : <LockKeyhole size={14} />}{item}</p>)}
          <button onClick={() => notify("Webstore setup opened")}>Continue setup<ChevronRight size={14} /></button>
        </section>

        <GateCard icon={Globe2} title="Publishing is feature gated" description="Build and review stores freely. Enable publishing when the tenant is ready to launch public storefronts." action="Review publishing plans" notify={notify} />
        <GateCard icon={ShoppingCart} title="Cart and checkout are feature gated" description="Product catalogs and owner approvals remain available. Cart, checkout, payment processing, and order bridging activate together." action="Review commerce plans" notify={notify} />

        <section className="panel standalone-card">
          <div className="standalone-icon"><Store size={20} /></div>
          <div><span className="eyebrow">Separate product shell</span><h2>Webstores Standalone</h2><p>For customers who only need Webstores, use the same store-management engine in a focused shell without exposing the full SignGuyAI operating system.</p></div>
          {!standalone && <a href="/?mode=webstores">Open standalone preview<ChevronRight size={14} /></a>}
        </section>
      </div>
    </>
  );
}

function Kpi({ label, value, detail, icon: Icon, gated = false }) {
  return <div className={gated ? "webstore-kpi gated" : "webstore-kpi"}><Icon size={17} /><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span>{gated && <LockKeyhole size={13} />}</div>;
}

function GateCard({ icon: Icon, title, description, action, notify }) {
  return <section className="panel gate-card"><span><Icon size={20} /></span><div><h2>{title}</h2><p>{description}</p></div><button onClick={() => notify(action)}>{action}<ChevronRight size={14} /></button></section>;
}

function WebstorePanelTitle({ title, action }) {
  return <div className="panel-title"><div><h2>{title}</h2></div>{action && <button>{action}<ChevronRight size={14} /></button>}</div>;
}

function SectionPreview({ tab, notify }) {
  const current = tabs.find(([id]) => id === tab);
  const [, label, Icon] = current;
  return <section className="webstore-section-preview"><Icon size={28} /><h2>{label}</h2><p>This management area is available regardless of publishing or cart entitlement. Commerce-only actions remain visibly gated.</p><button className="primary-button" onClick={() => notify(`${label} action selected`)}>Explore {label}<ChevronRight size={15} /></button></section>;
}

export function StandaloneWebstoresShell({ onToast }) {
  return (
    <div className="standalone-shell">
      <header className="standalone-topbar">
        <a className="standalone-brand" href="/"><span>SG</span><strong>Webstores</strong></a>
        <nav><button>Dashboard</button><button>Stores</button><button>Products</button><button>Owners</button><button>Reports</button></nav>
        <div><a href="/">Full SignGuyAI</a><span className="user-avatar small">BN</span></div>
      </header>
      <main><WebstoresWorkspace standalone onToast={onToast} /></main>
    </div>
  );
}
