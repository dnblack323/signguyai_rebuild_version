import React from "react";
import {
  AlertTriangle,
  Bot,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  MessageSquareText,
  PackageSearch,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { actionItems, orders } from "../../data";

const kpis = [
  ["Revenue MTD", "$48,620", "+14% vs last month", TrendingUp, "teal"],
  ["Active Orders", "31", "6 due this week", ShoppingBag, "blue"],
  ["Pending Quotes", "12", "$18,900 pipeline", FileCheck2, "purple"],
  ["Outstanding AR", "$18.4k", "$4.2k due today", CircleDollarSign, "amber"],
  ["Unread", "7", "3 customer messages", MessageSquareText, "red"],
];

export function Dashboard({ onNavigate }) {
  return (
    <div className="dashboard-page">
      <section className="page-heading compact-heading">
        <div>
          <h1>Good morning, Bill</h1>
          <p>Thursday, June 11 · Here is what needs attention across the shop.</p>
        </div>
      </section>

      <section className="dashboard-kpi-strip">
        {kpis.map(([label, value, detail, Icon, tone]) => (
          <button className={`dashboard-kpi ${tone}`} key={label}>
            <span className="kpi-accent" />
            <Icon size={18} />
            <span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span>
          </button>
        ))}
      </section>

      <div className="specified-dashboard-grid">
        <section className="panel action-required-card span-two">
          <PanelTitle title="Action required" count="6" action="Review all" />
          <div className="action-list">
            {actionItems.map((item) => (
              <button className={`action-row ${item.tone}`} key={item.title}>
                <span className="action-icon"><AlertTriangle size={17} /></span>
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                <span className="priority-label">{item.tone === "danger" ? "High" : item.tone === "warning" ? "Medium" : "Review"}</span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </section>

        <section className="panel production-snapshot">
          <PanelTitle title="Production snapshot" action="Open board" />
          <SnapshotRow label="Prepress" value="5" tone="blue" />
          <SnapshotRow label="Printing" value="7" tone="purple" />
          <SnapshotRow label="Finishing" value="4" tone="amber" />
          <SnapshotRow label="Ready" value="3" tone="green" />
          <button className="snapshot-alert" onClick={() => onNavigate("operations", "production")}><AlertTriangle size={14} />2 work orders blocked<ChevronRight size={14} /></button>
        </section>

        <section className="panel billing-snapshot">
          <PanelTitle title="Billing snapshot" action="Invoices" />
          <div className="billing-total"><span>Outstanding</span><strong>$18,460.75</strong><small>Across 14 invoices</small></div>
          <SnapshotRow label="Due today" value="$4,220" tone="amber" />
          <SnapshotRow label="Overdue" value="$3,180" tone="red" />
          <SnapshotRow label="Paid this month" value="$48,620" tone="green" />
        </section>

        <section className="panel shop-health">
          <PanelTitle title="Shop health" action="Reports" />
          <HealthRow label="On-time delivery" value="92%" status="Healthy" tone="green" />
          <HealthRow label="Average margin" value="44%" status="On target" tone="teal" />
          <HealthRow label="Low stock" value="—" status="Coming soon" tone="gray" onClick={() => onNavigate("business", "inventory")} />
          <HealthRow label="Unread messages" value="7" status="Needs review" tone="amber" />
        </section>

        <section className="panel onboarding-snapshot">
          <PanelTitle title="Onboarding" action="Continue" />
          <div className="onboarding-progress"><span><strong>4 of 7</strong><small>setup steps complete</small></span><b>57%</b></div>
          <div className="progress-track"><span /></div>
          {["Company profile", "Pricing Foundation", "Production stages"].map((item) => <p key={item}><CheckCircle2 size={14} />{item}</p>)}
          <button onClick={() => onNavigate("ai-hub", "onboarding")}>Continue setup<ChevronRight size={14} /></button>
        </section>

        <section className="panel recent-orders span-two">
          <PanelTitle title="Recent open orders" count="31" action="All orders" />
          <div className="table-head"><span>Order</span><span>Stage</span><span>Due</span></div>
          {orders.slice(0, 3).map((order) => (
            <button className="order-row" key={order.id} onClick={() => onNavigate("operations", "orders")}>
              <span><strong>{order.id}</strong><small>{order.customer} · {order.item}</small></span>
              <span className={`tag ${order.tone}`}>{order.stage}</span>
              <span className={order.due === "Today" ? "due-today" : ""}>{order.due}</span>
            </button>
          ))}
        </section>

        <section className="panel future-signals">
          <PanelTitle title="Future signals" />
          <FutureRow icon={Boxes} title="Inventory alerts" detail="Activates with Inventory" onClick={() => onNavigate("business", "inventory")} />
          <FutureRow icon={Bot} title="AI suggestions" detail="Activates with AI Assistant" onClick={() => onNavigate("ai-hub", "assistant")} />
          <FutureRow icon={ClipboardCheck} title="Material shortages" detail="Activates with work order materials" onClick={() => onNavigate("business", "purchasing")} />
        </section>
      </div>
    </div>
  );
}

function PanelTitle({ title, count, action }) {
  return <div className="panel-title"><div><h2>{title}</h2>{count && <span>{count}</span>}</div>{action && <button>{action}<ChevronRight size={14} /></button>}</div>;
}

function SnapshotRow({ label, value, tone }) {
  return <div className="snapshot-row"><span className={`snapshot-dot ${tone}`} /><strong>{label}</strong><b>{value}</b></div>;
}

function HealthRow({ label, value, status, tone, onClick }) {
  return <button className="health-row" onClick={onClick}><span><strong>{label}</strong><small>{status}</small></span><b className={tone}>{value}</b></button>;
}

function FutureRow({ icon: Icon, title, detail, onClick }) {
  return <button className="future-row" onClick={onClick}><Icon size={17} /><span><strong>{title}</strong><small>{detail}</small></span><em>Coming soon</em><ChevronRight size={14} /></button>;
}
