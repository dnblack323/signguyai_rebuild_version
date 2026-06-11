import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Command,
  FileCheck2,
  HelpCircle,
  LayoutDashboard,
  Menu,
  PackageSearch,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import {
  actionItems,
  moduleDetails,
  modules,
  notifications,
  orders,
  quickCreate,
  schedule,
  searchRecords,
  statusLabels,
  workspaces,
} from "./data";

const statusTone = { ready: "green", preview: "blue", planned: "gray" };

function App() {
  const [workspace, setWorkspace] = useState("operations");
  const [module, setModule] = useState("dashboard");
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  const workspaceInfo = workspaces.find((item) => item.id === workspace);
  const activeModule = modules[workspace].find((item) => item[0] === module);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setCreateOpen(false);
        setNotificationsOpen(false);
        setMobileNav(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = (nextWorkspace, nextModule) => {
    setWorkspace(nextWorkspace);
    setModule(nextModule);
    setSearchOpen(false);
    setCreateOpen(false);
    setMobileNav(false);
  };

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  return (
    <div className="app-shell">
      <WorkspaceRail workspace={workspace} onSelect={(id) => navigate(id, "dashboard")} />
      <div className="app-frame">
        <TopBar
          onSearch={() => setSearchOpen(true)}
          onCreate={() => setCreateOpen(true)}
          onNotifications={() => setNotificationsOpen((value) => !value)}
          onMenu={() => setMobileNav(true)}
          notificationOpen={notificationsOpen}
        />
        <div className="workspace-header">
          <div>
            <span className="workspace-kicker">{workspaceInfo.label}</span>
            <strong>{module === "dashboard" ? "Command Center" : activeModule?.[1]}</strong>
          </div>
          <Ribbon module={module} onAction={showToast} />
        </div>
        <div className="content-shell">
          <ModuleNav workspace={workspace} module={module} onSelect={(id) => setModule(id)} />
          <main className="main-content">
            {module === "dashboard" ? (
              <Dashboard onNavigate={navigate} />
            ) : (
              <ModulePage item={activeModule} onAction={showToast} />
            )}
          </main>
        </div>
      </div>

      {searchOpen && <SearchPalette query={query} setQuery={setQuery} onClose={() => setSearchOpen(false)} onNavigate={navigate} />}
      {createOpen && <CreatePalette onClose={() => setCreateOpen(false)} onNavigate={navigate} onToast={showToast} />}
      {notificationsOpen && <NotificationsPanel onClose={() => setNotificationsOpen(false)} />}
      {mobileNav && <MobileNavigation workspace={workspace} module={module} onClose={() => setMobileNav(false)} onNavigate={navigate} />}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  );
}

function WorkspaceRail({ workspace, onSelect }) {
  return (
    <aside className="workspace-rail">
      <button className="brand" onClick={() => onSelect("operations")} aria-label="SignGuyAI home">
        <span>SG</span>
        <strong>SignGuy<span>AI</span></strong>
      </button>
      <nav aria-label="Workspaces">
        {workspaces.map(({ id, label, icon: Icon }) => (
          <button key={id} className={workspace === id ? "active" : ""} onClick={() => onSelect(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="rail-bottom">
        <button><Settings size={19} /><span>Settings</span></button>
        <div className="user-avatar">BN</div>
      </div>
    </aside>
  );
}

function TopBar({ onSearch, onCreate, onNotifications, onMenu, notificationOpen }) {
  return (
    <header className="top-bar">
      <button className="mobile-menu" onClick={onMenu}><Menu size={20} /></button>
      <button className="search-trigger" onClick={onSearch}>
        <Search size={17} />
        <span>Search customers, orders, invoices...</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="top-actions">
        <button className="create-button" onClick={onCreate}><Plus size={17} />Create<ChevronDown size={15} /></button>
        <button className={notificationOpen ? "icon-button active" : "icon-button"} onClick={onNotifications} aria-label="Notifications">
          <Bell size={19} /><span className="notification-dot" />
        </button>
        <button className="icon-button" aria-label="Help"><HelpCircle size={19} /></button>
        <button className="profile-button"><span className="user-avatar small">BN</span><span>Bill Nelson</span><ChevronDown size={14} /></button>
      </div>
    </header>
  );
}

function Ribbon({ module, onAction }) {
  const actions = module === "dashboard"
    ? [["Refresh", Clock3], ["Open schedule", CalendarDays], ["View reports", CircleDollarSign]]
    : [["New record", Plus], ["Search this module", Search], ["Module help", HelpCircle]];
  return (
    <div className="ribbon">
      {actions.map(([label, Icon]) => <button key={label} onClick={() => onAction(`${label} selected`)}><Icon size={15} />{label}</button>)}
    </div>
  );
}

function ModuleNav({ workspace, module, onSelect }) {
  return (
    <aside className="module-nav">
      <button className={module === "dashboard" ? "active" : ""} onClick={() => onSelect("dashboard")}><LayoutDashboard size={17} />Overview</button>
      <p>Workspace</p>
      {modules[workspace].map(([id, label, Icon, status]) => (
        <button key={id} className={module === id ? "active" : ""} onClick={() => onSelect(id)}>
          <Icon size={17} /><span>{label}</span>{status === "planned" && <span className="nav-dot" />}
        </button>
      ))}
    </aside>
  );
}

function Dashboard({ onNavigate }) {
  return (
    <div className="dashboard-page">
      <section className="page-heading">
        <div><h1>Good morning, Bill</h1><p>Thursday, June 11 · Here is what needs attention across the shop.</p></div>
        <button className="secondary-button" onClick={() => onNavigate("operations", "schedule")}><CalendarDays size={16} />Open shop schedule</button>
      </section>

      <section className="metric-strip">
        <Metric label="Open orders" value="31" detail="6 due this week" icon={PackageSearch} />
        <Metric label="Pending approvals" value="3" detail="Oldest: 18 hours" icon={FileCheck2} />
        <Metric label="Unpaid invoices" value="$18.4k" detail="$4.2k due today" icon={CircleDollarSign} />
        <Metric label="Daily sales" value="$6,840" detail="+12% vs. last Thu" icon={Sparkles} />
      </section>

      <div className="dashboard-grid">
        <section className="panel action-panel">
          <PanelTitle title="Action required" count="6" action="View all" />
          <div className="action-list">
            {actionItems.map((item) => (
              <button key={item.title} className={`action-row ${item.tone}`}>
                <span className="action-icon"><AlertTriangle size={17} /></span>
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                <span className="row-action">{item.action}<ChevronRight size={15} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel schedule-panel">
          <PanelTitle title="Today's schedule" action="Full calendar" />
          <div className="schedule-list">
            {schedule.map((item) => (
              <div className="schedule-row" key={item.time + item.title}>
                <span className="schedule-time"><strong>{item.time}</strong><small>{item.period}</small></span>
                <span className={`schedule-mark ${item.tone}`} />
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel orders-panel">
          <PanelTitle title="Open orders" count="31" action="All orders" />
          <div className="table-head"><span>Order</span><span>Stage</span><span>Due</span></div>
          {orders.map((order) => (
            <button className="order-row" key={order.id} onClick={() => onNavigate("operations", "orders")}>
              <span><strong>{order.id}</strong><small>{order.customer} · {order.item}</small></span>
              <span className={`tag ${order.tone}`}>{order.stage}</span>
              <span className={order.due === "Today" ? "due-today" : ""}>{order.due}</span>
            </button>
          ))}
        </section>

        <section className="panel shop-pulse">
          <PanelTitle title="Shop pulse" action="Reports" />
          <PulseRow label="Tasks due" value="9" detail="3 assigned to you" tone="teal" onClick={() => onNavigate("productivity", "tasks")} />
          <PulseRow label="Production alerts" value="4" detail="2 jobs waiting on material" tone="amber" onClick={() => onNavigate("operations", "production")} />
          <PulseRow label="Low inventory" value="—" detail="Available when Inventory launches" tone="gray" status="Coming soon" onClick={() => onNavigate("business", "inventory")} />
          <PulseRow label="AI suggestions" value="—" detail="Available when AI Assistant launches" tone="purple" status="Coming soon" onClick={() => onNavigate("ai-hub", "assistant")} />
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, detail, icon: Icon }) {
  return <div className="metric"><Icon size={18} /><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></div>;
}

function PanelTitle({ title, count, action }) {
  return <div className="panel-title"><div><h2>{title}</h2>{count && <span>{count}</span>}</div><button>{action}<ChevronRight size={14} /></button></div>;
}

function PulseRow({ label, value, detail, tone, status, onClick }) {
  return <button className="pulse-row" onClick={onClick}><span className={`pulse-dot ${tone}`} /><span><strong>{label}</strong><small>{detail}</small></span>{status ? <span className="coming">{status}</span> : <b>{value}</b>}<ChevronRight size={15} /></button>;
}

function ModulePage({ item, onAction }) {
  if (!item) return null;
  const [id, label, Icon, status] = item;
  const detail = moduleDetails[id] || {
    title: label,
    description: `${label} is part of the final SignGuyAI application surface. Its full workflow will be activated in a later release.`,
    metric: status === "planned" ? "Planned capability" : "Preview module",
    action: status === "planned" ? "View target scope" : `Explore ${label}`,
  };

  return (
    <div className="module-page">
      <section className="module-hero">
        <div className="module-icon"><Icon size={26} /></div>
        <div><div className={`status ${statusTone[status]}`}>{statusLabels[status]}</div><h1>{detail.title}</h1><p>{detail.description}</p></div>
        <button className="primary-button" onClick={() => onAction(`${detail.action} selected`)}>{detail.action}<ChevronRight size={16} /></button>
      </section>
      <section className="module-summary">
        <div><span>Current state</span><strong>{detail.metric}</strong><p>{status === "planned" ? "This module shell establishes navigation, permissions, route ownership, and target behavior before implementation." : "This preview demonstrates the intended module location and interaction pattern."}</p></div>
        <div className="scope-list"><h2>Target capability</h2>{["Stable workspace location", "Permission-filtered actions", "Shared notes and activity", "Global search registration", "Contextual documentation"].map((text) => <p key={text}><Check size={15} />{text}</p>)}</div>
      </section>
      <section className="empty-workspace">
        <Icon size={28} />
        <h2>{status === "planned" ? `${label} is coming in a later release` : `${label} preview workspace`}</h2>
        <p>The surface is present now so future functionality can be added without changing the app's navigation or architecture.</p>
      </section>
    </div>
  );
}

function SearchPalette({ query, setQuery, onClose, onNavigate }) {
  const results = useMemo(() => searchRecords.filter((record) => `${record.type} ${record.title} ${record.detail}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <ModalShell onClose={onClose}>
      <div className="command-palette">
        <div className="command-input"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers, orders, quotes, invoices, documents..." /><kbd>ESC</kbd></div>
        <div className="command-results">
          <p>{query ? `${results.length} results` : "Recent and suggested"}</p>
          {results.map((record) => <button key={record.title} onClick={() => onNavigate(record.workspace, record.module)}><span className="result-type">{record.type}</span><span><strong>{record.title}</strong><small>{record.detail}</small></span><ChevronRight size={16} /></button>)}
        </div>
      </div>
    </ModalShell>
  );
}

function CreatePalette({ onClose, onNavigate, onToast }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="create-palette"><div className="modal-heading"><div><h2>Create</h2><p>Start common work from anywhere.</p></div><button onClick={onClose}><X size={18} /></button></div><div className="create-grid">{quickCreate.map(([label, workspace, module, Icon], index) => <button key={label} onClick={() => { index < 6 ? onNavigate(workspace, module) : onToast(`${label} will activate in a later release`); onClose(); }}><Icon size={20} /><span><strong>{label}</strong><small>{index < 6 ? "Available in preview" : "Coming soon"}</small></span><ChevronRight size={15} /></button>)}</div></div>
    </ModalShell>
  );
}

function NotificationsPanel({ onClose }) {
  return <aside className="notifications-panel"><div className="modal-heading"><div><h2>Notifications</h2><p>Recent activity across the shop</p></div><button onClick={onClose}><X size={18} /></button></div>{notifications.map((item) => <button key={item.title}><span className="unread-dot" /><span><strong>{item.title}</strong><small>{item.detail}</small><em>{item.time} ago</em></span></button>)}<button className="notification-footer">View notification center<ChevronRight size={15} /></button></aside>;
}

function MobileNavigation({ workspace, module, onClose, onNavigate }) {
  return <div className="mobile-nav"><div className="modal-heading"><strong>SignGuyAI</strong><button onClick={onClose}><X size={19} /></button></div>{workspaces.map(({ id, label, icon: Icon }) => <div key={id}><button className={workspace === id ? "workspace-mobile active" : "workspace-mobile"} onClick={() => onNavigate(id, "dashboard")}><Icon size={18} />{label}</button>{workspace === id && modules[id].map(([moduleId, moduleLabel]) => <button className={module === moduleId ? "module-mobile active" : "module-mobile"} key={moduleId} onClick={() => onNavigate(id, moduleId)}>{moduleLabel}</button>)}</div>)}</div>;
}

function ModalShell({ children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div onMouseDown={(event) => event.stopPropagation()}>{children}</div></div>;
}

export default App;
