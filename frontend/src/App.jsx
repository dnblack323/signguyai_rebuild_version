import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Home,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import {
  addons,
  moduleChildren,
  moduleDetails,
  modules,
  notifications,
  quickCreate,
  searchRecords,
  statusLabels,
  utilityWorkspaces,
  workspaces,
} from "./data";
import { AppRibbon } from "./components/ribbon/AppRibbon";
import { CustomersWorkspace } from "./components/customers/CustomersWorkspace";
import { Dashboard } from "./components/dashboard/Dashboard";
import { AISuiteWorkspace } from "./components/shared/AISuiteWorkspace";
import { CommunityWorkspace } from "./components/shared/CommunityWorkspace";
import { NotesWorkspace } from "./components/shared/NotesWorkspace";
import { PricingFoundationWorkspace } from "./components/settings/PricingFoundationWorkspace";
import { DocuLinkWorkspace } from "./components/doculink/DocuLinkWorkspace";
import { OrdersWorkspace } from "./components/orders/OrdersWorkspace";
import { StandaloneWebstoresShell, WebstoresWorkspace } from "./components/webstores/WebstoresWorkspace";
import { api } from "./lib/api";

const statusTone = { ready: "green", preview: "blue", planned: "gray" };
const WrapLabApp = lazy(() => import("./components/wrap-lab/WrapLabApp"));

function App() {
  const standaloneWebstores = new URLSearchParams(window.location.search).get("mode") === "webstores";
  const initialMode = new URLSearchParams(window.location.search).get("mode");
  const [workspace, setWorkspace] = useState(initialMode === "wrap-lab" ? "operations" : "home");
  const [module, setModule] = useState(initialMode === "wrap-lab" ? "wraps" : "dashboard");
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [wrapRibbonCommand, setWrapRibbonCommand] = useState(null);

  const allWorkspaces = [...workspaces, ...utilityWorkspaces];
  const workspaceInfo = workspace === "home" ? { label: "Home" } : allWorkspaces.find((item) => item.id === workspace);
  const activeAddon = addons.find((item) => item.workspace === workspace && item.module === module);
  const activeModule = workspace === "home"
    ? null
    : modules[workspace].find((item) => item[0] === module) || (activeAddon ? [activeAddon.module, activeAddon.label, activeAddon.icon, "preview"] : null);

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
        setHelpOpen(false);
        setMobileNav(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let active = true;
    api("/health")
      .then(() => active && setBackendStatus("connected"))
      .catch(() => active && setBackendStatus("offline"));
    return () => { active = false; };
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

  const handleRibbonAction = (message) => {
    if (module === "wraps") {
      setWrapRibbonCommand({ command: message, id: Date.now() });
      return;
    }
    showToast(message);
  };

  if (standaloneWebstores) {
    return <><StandaloneWebstoresShell onToast={showToast} backendStatus={backendStatus} />{toast && <div className="toast"><Check size={17} />{toast}</div>}</>;
  }

  return (
    <div className="app-shell">
      <WorkspaceRail workspace={workspace} module={module} onSelect={(id) => navigate(id, "dashboard")} onNavigate={navigate} />
      <div className="app-frame">
        <TopBar
          onSearch={() => setSearchOpen(true)}
          onCreate={() => setCreateOpen(true)}
          onNotifications={() => setNotificationsOpen((value) => !value)}
          onHelp={() => setHelpOpen((value) => !value)}
          onMenu={() => setMobileNav(true)}
          notificationOpen={notificationsOpen}
          helpOpen={helpOpen}
          backendStatus={backendStatus}
        />
        <SectionBanner workspace={workspaceInfo} module={module} activeModule={activeModule} />
        {workspace !== "home" && <ModuleNav workspace={workspace} module={module} onSelect={(id) => setModule(id)} />}
        <AppRibbon isDashboard={workspace === "home" && module === "dashboard"} module={module} onNavigate={navigate} onAction={handleRibbonAction} />
        <div className="content-shell">
          <main className="main-content">
            {workspace === "home" && module === "dashboard" ? (
              <Dashboard onNavigate={navigate} />
            ) : module === "dashboard" ? (
              <WorkspaceDashboard workspace={workspaceInfo} />
            ) : module === "webstores" ? (
              <WebstoresWorkspace onToast={showToast} />
            ) : module === "customers" ? (
              <CustomersWorkspace onToast={showToast} onNavigate={navigate} />
            ) : module === "orders" ? (
              <OrdersWorkspace onToast={showToast} onNavigate={navigate} />
            ) : module === "documents" ? (
              <DocuLinkWorkspace onToast={showToast} />
            ) : module === "community" ? (
              <CommunityWorkspace onToast={showToast} />
            ) : module === "notes" ? (
              <NotesWorkspace onToast={showToast} />
            ) : module === "assistant" ? (
              <AISuiteWorkspace assistantOnly onToast={showToast} />
            ) : module === "ai-suite" ? (
              <AISuiteWorkspace onToast={showToast} />
            ) : module === "pricing-foundation" ? (
              <PricingFoundationWorkspace onToast={showToast} />
            ) : module === "wraps" ? (
              <Suspense fallback={<div className="app-loading">Loading Wrap Lab...</div>}>
                <WrapLabApp embedded ribbonCommand={wrapRibbonCommand} onOpenCustomers={() => navigate("operations", "customers")} />
              </Suspense>
            ) : (
              <ModulePage item={activeModule} onAction={showToast} />
            )}
          </main>
        </div>
      </div>

      {searchOpen && <SearchPalette query={query} setQuery={setQuery} onClose={() => setSearchOpen(false)} onNavigate={navigate} />}
      {createOpen && <CreatePalette onClose={() => setCreateOpen(false)} onNavigate={navigate} onToast={showToast} />}
      {notificationsOpen && <NotificationsPanel onClose={() => setNotificationsOpen(false)} />}
      {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} onNavigate={navigate} />}
      {mobileNav && <MobileNavigation workspace={workspace} module={module} onClose={() => setMobileNav(false)} onNavigate={navigate} />}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  );
}

function SectionBanner({ workspace, module, activeModule }) {
  const detail = activeModule ? moduleDetails[activeModule[0]] : null;
  const title = module === "dashboard" ? (workspace.label === "Home" ? "Command Center" : `${workspace.label} Overview`) : activeModule?.[1];
  const description = module === "dashboard"
    ? workspace.label === "Home"
      ? "What needs attention across the shop."
      : `Current priorities and activity for ${workspace.label.toLowerCase()}.`
    : detail?.description || `${title} workspace`;

  return <section className="section-banner"><strong>{title}</strong><span>{description}</span></section>;
}

function WorkspaceRail({ workspace, module, onSelect, onNavigate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={expanded ? "workspace-rail expanded" : "workspace-rail"}
      onPointerEnter={() => setExpanded(true)}
      onPointerLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
      }}
    >
      <div className="brand" aria-label="SignGuyAI">
        <span>SG</span>
        <strong>SignGuy<span>AI</span></strong>
      </div>
      <nav aria-label="Workspaces">
        <button className={workspace === "home" ? "active home-button" : "home-button"} onClick={() => onSelect("home")} aria-label="Home / Command Center" title="Home / Command Center">
          <Home size={20} />
          <span>Home</span>
        </button>
        {workspaces.map(({ id, label, icon: Icon }) => (
          <button key={id} className={workspace === id ? "active" : ""} onClick={() => onSelect(id)} aria-label={label} title={label}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="rail-addons">
        <span>Add-ons</span>
        {addons.map(({ id, label, icon: Icon, workspace: addonWorkspace, module: addonModule }) => (
          <button key={id} className={workspace === addonWorkspace && module === addonModule ? "active" : ""} onClick={() => onNavigate(addonWorkspace, addonModule)} aria-label={label} data-tooltip={label}>
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="rail-addons rail-utilities">
        {utilityWorkspaces.map(({ id, label, icon: Icon }) => (
          <button key={id} className={workspace === id ? "active" : ""} onClick={() => onNavigate(id, "dashboard")} aria-label={label} data-tooltip={label}>
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="rail-bottom">
        <div className="user-avatar">BN</div>
      </div>
    </aside>
  );
}

function TopBar({ onSearch, onCreate, onNotifications, onHelp, onMenu, notificationOpen, helpOpen, backendStatus }) {
  return (
    <header className="top-bar">
      <button className="mobile-menu" onClick={onMenu}><Menu size={20} /></button>
      <button className="search-trigger" onClick={onSearch}>
        <Search size={17} />
        <span>Search customers, orders, invoices...</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="top-actions">
        <span className={`backend-status ${backendStatus}`} title="Local review backend status"><i />{backendStatus === "connected" ? "Functional" : backendStatus === "offline" ? "Visual only" : "Checking"}</span>
        <button className="create-button" onClick={onCreate}><Plus size={17} />Create<ChevronDown size={15} /></button>
        <button className={notificationOpen ? "icon-button active" : "icon-button"} onClick={onNotifications} aria-label="Notifications">
          <Bell size={19} /><span className="notification-dot" />
        </button>
        <button className={helpOpen ? "icon-button active" : "icon-button"} onClick={onHelp} aria-label="Help menu" title="Help"><HelpCircle size={19} /></button>
        <button className="profile-button"><span className="user-avatar small">BN</span><span>Bill Nelson</span><ChevronDown size={14} /></button>
      </div>
    </header>
  );
}

function WorkspaceDashboard({ workspace }) {
  const workspaceModules = modules[workspace.id] || [];
  return (
    <div className="module-page">
      <section className="workspace-overview-grid">
        {workspaceModules.map(([id, label, Icon, status]) => {
          const detail = moduleDetails[id];
          return (
            <article className="workspace-overview-card" key={id}>
              <div className="module-icon small"><Icon size={20} /></div>
              <span className={`status ${statusTone[status]}`}>{statusLabels[status]}</span>
              <h2>{label}</h2>
              <p>{detail?.description || `${label} workspace`}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function ModuleNav({ workspace, module, onSelect }) {
  return (
    <nav className="module-nav" aria-label={`${workspace} modules`}>
      <button className={module === "dashboard" ? "active" : ""} onClick={() => onSelect("dashboard")}><LayoutDashboard size={17} />Overview</button>
      {modules[workspace].map(([id, label, Icon, status]) => (
        <button key={id} className={module === id ? "active" : ""} onClick={() => onSelect(id)}>
          <Icon size={17} /><span>{label}</span>{status === "planned" && <span className="nav-dot" />}
        </button>
      ))}
    </nav>
  );
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
  const embeddedOptions = id === "orders"
    ? ["Order Items", "Create Work Order", "Download Work Order"]
    : id === "production"
      ? ["Production Board", "Work Orders", "Shop Schedule"]
      : [];
  const childGroups = moduleChildren[id] || [];

  return (
    <div className="module-page">
      <section className="module-hero">
        <div className="module-icon"><Icon size={26} /></div>
        <div><div className={`status ${statusTone[status]}`}>{statusLabels[status]}</div><h2>{detail.title}</h2><p>{detail.description}</p></div>
        <button className="primary-button" onClick={() => onAction(`${detail.action} selected`)}>{detail.action}<ChevronRight size={16} /></button>
      </section>
      {childGroups.length > 0 && (
        <section className="module-substructure">
          <div className="module-substructure-heading">
            <span>Page sections</span>
            <strong>{label} structure</strong>
          </div>
          <div className="module-section-grid">
            {childGroups.map((group) => (
              <article key={group.label}>
                <h3>{group.label}</h3>
                {group.children?.length ? (
                  <div>{group.children.map((child) => <button key={child} onClick={() => onAction(`${child} selected`)}>{child}<ChevronRight size={14} /></button>)}</div>
                ) : (
                  <button onClick={() => onAction(`${group.label} selected`)}>Open {group.label}<ChevronRight size={14} /></button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="module-summary">
        <div><span>Current state</span><strong>{detail.metric}</strong><p>{status === "planned" ? "This module shell establishes navigation, permissions, route ownership, and target behavior before implementation." : "This preview demonstrates the intended module location and interaction pattern."}</p></div>
        <div className="scope-list"><h2>Target capability</h2>{["Stable workspace location", "Permission-filtered actions", "Shared notes and activity", "Global search registration", "Contextual documentation"].map((text) => <p key={text}><Check size={15} />{text}</p>)}</div>
      </section>
      {embeddedOptions.length > 0 && (
        <section className="embedded-options">
          <h2>{id === "orders" ? "Order tools" : "Production tools"}</h2>
          <div>{embeddedOptions.map((option) => <button key={option} onClick={() => onAction(`${option} selected`)}>{option}<ChevronRight size={15} /></button>)}</div>
        </section>
      )}
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
      <div className="create-palette"><div className="modal-heading"><div><h2>Create</h2><p>Start common work from anywhere.</p></div><button onClick={onClose}><X size={18} /></button></div><div className="create-grid">{quickCreate.map(([label, workspace, module, Icon]) => <button key={label} onClick={() => { onNavigate(workspace, module); onClose(); }}><Icon size={20} /><span><strong>{label}</strong><small>Available in preview</small></span><ChevronRight size={15} /></button>)}</div></div>
    </ModalShell>
  );
}

function NotificationsPanel({ onClose }) {
  return <aside className="notifications-panel"><div className="modal-heading"><div><h2>Notifications</h2><p>Recent activity across the shop</p></div><button onClick={onClose}><X size={18} /></button></div>{notifications.map((item) => <button key={item.title}><span className="unread-dot" /><span><strong>{item.title}</strong><small>{item.detail}</small><em>{item.time} ago</em></span></button>)}<button className="notification-footer">View notification center<ChevronRight size={15} /></button></aside>;
}

const helpLinks = [
  ["Current page tips", "documentation"],
  ["Documentation", "documentation"],
  ["Onboarding", "onboarding"],
  ["Contact support", "help-center"],
  ["Community", "community"],
];

function HelpPanel({ onClose, onNavigate }) {
  return (
    <aside className="help-panel">
      <div className="modal-heading"><div><h2>Help</h2><p>Guidance and support without taking navigation space</p></div><button onClick={onClose}><X size={18} /></button></div>
      <div className="page-tip"><HelpCircle size={18} /><span><strong>Current page tip</strong><small>Use the ribbon for page actions, the left rail for major workspaces, and global search to find records.</small></span></div>
      {helpLinks.map(([label, moduleId]) => <button key={label} onClick={() => { onNavigate("help", moduleId); onClose(); }}><span>{label}</span><ChevronRight size={15} /></button>)}
    </aside>
  );
}

function MobileNavigation({ workspace, module, onClose, onNavigate }) {
  return <div className="mobile-nav"><div className="modal-heading"><strong>SignGuyAI</strong><button onClick={onClose}><X size={19} /></button></div><button className={workspace === "home" ? "workspace-mobile active" : "workspace-mobile"} onClick={() => onNavigate("home", "dashboard")}><Home size={18} />Home / Command Center</button>{workspaces.map(({ id, label, icon: Icon }) => <div key={id}><button className={workspace === id ? "workspace-mobile active" : "workspace-mobile"} onClick={() => onNavigate(id, "dashboard")}><Icon size={18} />{label}</button>{workspace === id && modules[id].map(([moduleId, moduleLabel]) => <button className={module === moduleId ? "module-mobile active" : "module-mobile"} key={moduleId} onClick={() => onNavigate(id, moduleId)}>{moduleLabel}</button>)}</div>)}<p className="mobile-addon-label">Add-ons</p>{addons.map(({ id, label, icon: Icon, workspace: addonWorkspace, module: addonModule }) => <button key={id} className={module === addonModule ? "workspace-mobile active" : "workspace-mobile"} onClick={() => onNavigate(addonWorkspace, addonModule)}><Icon size={18} />{label}</button>)}<p className="mobile-addon-label">Account</p>{utilityWorkspaces.map(({ id, label, icon: Icon }) => <div key={id}><button className={workspace === id ? "workspace-mobile active" : "workspace-mobile"} onClick={() => onNavigate(id, "dashboard")}><Icon size={18} />{label}</button>{workspace === id && modules[id].map(([moduleId, moduleLabel]) => <button className={module === moduleId ? "module-mobile active" : "module-mobile"} key={moduleId} onClick={() => onNavigate(id, moduleId)}>{moduleLabel}</button>)}</div>)}</div>;
}

function ModalShell({ children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div onMouseDown={(event) => event.stopPropagation()}>{children}</div></div>;
}

export default App;
