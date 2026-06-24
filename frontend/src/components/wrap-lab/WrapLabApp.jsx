import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarDays, CarFront, ChartNoAxesCombined, Check, CirclePlus, FileDown,
  FolderOpen, Gauge, LayoutDashboard, MessageSquareText, Plus, Search, Send, ShieldCheck,
  Sparkles, Stethoscope, UserRound, WandSparkles, X,
} from "lucide-react";
import { api } from "../../lib/api";
import { DETAIL_TABS, money, projectName, SEED_PROJECTS, STAGES } from "./wrapLabData";
import {
  CommunicationTab, DesignTab, FilesTab, InspectionTab, InstallTab, IntakeTab,
  MeasurementsTab, PricingTab, ProductionTab, WrapCustomerPortal,
} from "./WrapLabScreens";
import "./wrap-lab.css";

const tabIcons = {
  intake: UserRound, measurements: Gauge, pricing: ChartNoAxesCombined, design: WandSparkles,
  inspection: ShieldCheck, production: Stethoscope, install: CarFront, files: FolderOpen,
  communication: MessageSquareText,
};

const filters = {
  "waiting-proof": (project) => project.stageIndex === 4 && project.proofs?.at(-1)?.status !== "Approved",
  "waiting-contract": (project) => project.contractStatus !== "signed",
  "ready-install": (project) => project.stageIndex === 7,
  "waiting-customer": (project) => ["pending", "revision_requested"].includes(project.quoteStatus) || project.contractStatus !== "signed",
  "completed-month": (project) => project.stageIndex === 10,
};

export default function WrapLabApp({ onExit }) {
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState("intake");
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState("checking");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [dashboardFilter, setDashboardFilter] = useState(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const activeProject = projects.find((project) => project.id === activeId);

  useEffect(() => {
    let current = true;
    api("/wrap-lab/projects")
      .then(async (rows) => {
        if (!current) return;
        if (rows.length) setProjects(rows);
        else {
          const seeded = await Promise.all(SEED_PROJECTS.map((project) => api("/wrap-lab/projects", { method: "POST", body: JSON.stringify(project) })));
          if (current) setProjects(seeded);
        }
        if (current) setConnection("connected");
      })
      .catch(() => {
        if (!current) return;
        const stored = localStorage.getItem("wrap-lab-preview-projects");
        setProjects(stored ? JSON.parse(stored) : structuredClone(SEED_PROJECTS));
        setConnection("offline");
      })
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, []);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 2600);
  };

  const persist = async (nextProject, message) => {
    setProjects((current) => current.map((project) => project.id === nextProject.id ? nextProject : project));
    if (connection === "connected") {
      try {
        const saved = await api(`/wrap-lab/projects/${nextProject.id}`, { method: "PUT", body: JSON.stringify(nextProject) });
        setProjects((current) => current.map((project) => project.id === saved.id ? saved : project));
      } catch (error) {
        notify(error.message || "Unable to save change");
      }
    } else {
      const nextProjects = projects.map((project) => project.id === nextProject.id ? nextProject : project);
      localStorage.setItem("wrap-lab-preview-projects", JSON.stringify(nextProjects));
    }
    if (message) notify(message);
  };

  const update = (changes, message) => persist({ ...activeProject, ...changes }, message);
  const updateNested = (field, value, message) => update({ [field]: value }, message);

  const action = async (actionName, payload = {}, message) => {
    if (connection !== "connected") {
      const local = localAction(activeProject, actionName, payload);
      await persist(local, message);
      return local;
    }
    try {
      const saved = await api(`/wrap-lab/projects/${activeProject.id}/actions`, {
        method: "POST", body: JSON.stringify({ action: actionName, payload }),
      });
      setProjects((current) => current.map((project) => project.id === saved.id ? saved : project));
      if (message) notify(message);
      return saved;
    } catch (error) {
      notify(error.message);
      return null;
    }
  };

  const createProject = async (draft) => {
    const project = { ...structuredClone(SEED_PROJECTS[0]), ...draft, id: `WRAP-${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, "0")}`, stage: "Intake", stageIndex: 0 };
    let created = project;
    if (connection === "connected") created = await api("/wrap-lab/projects", { method: "POST", body: JSON.stringify(project) });
    const nextProjects = [...projects, created];
    setProjects(nextProjects);
    if (connection !== "connected") localStorage.setItem("wrap-lab-preview-projects", JSON.stringify(nextProjects));
    setNewProjectOpen(false);
    setActiveId(created.id);
    setTab("intake");
    notify("Wrap project created");
  };

  const visibleProjects = useMemo(() => projects.filter((project) => {
    const query = search.toLowerCase();
    const matchesSearch = !query || `${project.id} ${projectName(project)} ${project.make} ${project.model}`.toLowerCase().includes(query);
    const matchesStage = stageFilter === "all" || project.stage === stageFilter;
    const matchesDashboard = !dashboardFilter || filters[dashboardFilter]?.(project);
    return matchesSearch && matchesStage && matchesDashboard;
  }), [projects, search, stageFilter, dashboardFilter]);

  if (loading) return <div className="wrap-lab-root wrap-loading"><div className="loading-spinner"/><p>Loading Wrap Lab projects...</p></div>;

  return <div className="wrap-lab-root" data-testid="wrap-lab-app">
    <div id="app-container">
      <aside>
        <div className="sidebar-header"><div className="logo-icon"><CarFront size={23}/></div><div className="logo-text"><h1>WRAP LAB AI</h1><span>Vehicle Graphics Ops</span></div></div>
        <nav>
          <button className={`nav-item ${!activeProject ? "active" : ""}`} onClick={() => setActiveId(null)}><LayoutDashboard/><span>Dashboard</span></button>
          <button className="nav-item" onClick={() => setNewProjectOpen(true)}><CirclePlus/><span>New Wrap Job</span></button>
          {activeProject && <button className="nav-item active" onClick={() => setActiveId(activeProject.id)}><CarFront/><span>{activeProject.id} Details</span></button>}
        </nav>
        <div className="sidebar-footer">
          <p>Logged in as: <strong>Admin (Shop Mgr)</strong></p>
          <p className="wrap-connection"><i className={connection}/>{connection === "connected" ? "Mongo API connected" : "Local preview data"}</p>
          <button className="diagnostics-btn" onClick={() => notify(`${projects.length} projects · ${connection === "connected" ? "API and persistence healthy" : "Mongo API unavailable"}`)}><Stethoscope/>Run Diagnostics</button>
          <button className="diagnostics-btn return-button" onClick={onExit}><ArrowLeft/>Return to SignGuyAI</button>
        </div>
      </aside>
      <main>
        <header className="main-header"><div className="header-title"><h2>{activeProject ? "Wrap Project Command Center" : "Wrap Projects"}</h2></div><div className="header-meta"><div className="shop-info"><span className="shop-status-dot"/><span>Production Bay Active</span></div><div className="user-profile"><div className="avatar">SM</div><span>Shop Manager</span></div></div></header>
        {!activeProject ? <Dashboard projects={projects} visibleProjects={visibleProjects} search={search} setSearch={setSearch} stageFilter={stageFilter} setStageFilter={setStageFilter} dashboardFilter={dashboardFilter} setDashboardFilter={setDashboardFilter} openProject={(id) => { setActiveId(id); setTab("intake"); }} newProject={() => setNewProjectOpen(true)}/>
          : <ProjectCommandCenter project={activeProject} tab={tab} setTab={setTab} update={update} updateNested={updateNested} action={action} openPortal={() => setPortalOpen(true)} notify={notify}/>
        }
      </main>
    </div>
    {newProjectOpen && <NewProjectModal close={() => setNewProjectOpen(false)} create={createProject}/>} 
    {portalOpen && activeProject && <WrapCustomerPortal project={activeProject} close={() => setPortalOpen(false)} action={action} update={update}/>} 
    {toast && <div className="wrap-toast"><Check size={17}/>{toast}</div>}
  </div>;
}

function Dashboard({ projects, visibleProjects, search, setSearch, stageFilter, setStageFilter, dashboardFilter, setDashboardFilter, openProject, newProject }) {
  const stats = [
    ["waiting-proof", "Needing Proof Approval", projects.filter(filters["waiting-proof"]).length, WandSparkles],
    ["waiting-contract", "Contracts Pending", projects.filter(filters["waiting-contract"]).length, ShieldCheck],
    ["ready-install", "Ready for Install", projects.filter(filters["ready-install"]).length, CarFront],
    ["waiting-customer", "Waiting on Customer", projects.filter(filters["waiting-customer"]).length, UserRound],
    ["completed-month", "Completed This Month", projects.filter(filters["completed-month"]).length, Check],
  ];
  return <div className="view-panel active" data-testid="wrap-dashboard">
    <div className="summary-grid">{stats.map(([key, label, value, Icon], index) => <button key={key} className={`summary-card ${["accent-cyan", "accent-amber", "accent-indigo", "accent-rose", "accent-emerald"][index]} ${dashboardFilter === key ? "selected" : ""}`} onClick={() => setDashboardFilter(dashboardFilter === key ? null : key)}><Icon/><div className="card-value">{value}</div><div className="card-label">{label}</div></button>)}</div>
    <div className="filter-bar"><div className="filters-group"><div className="search-wrapper"><Search/><input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, vehicle..."/></div><select className="filter-control" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">All Stages</option>{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select>{dashboardFilter && <button className="btn" onClick={() => setDashboardFilter(null)}>Clear Quick Filter</button>}</div><button className="btn btn-primary" onClick={newProject}><Plus/>New Wrap Project</button></div>
    <div className="table-container"><table className="projects-table"><thead><tr><th>Order #</th><th>Customer / Business</th><th>Vehicle Info</th><th>Wrap Type</th><th>Current Stage</th><th>Install Date</th><th>Installer</th><th>Quote Amt</th><th>Deposit Status</th><th>Warning / Action</th></tr></thead><tbody>{visibleProjects.map((project) => <tr key={project.id} onClick={() => openProject(project.id)}><td><strong>{project.id}</strong></td><td>{projectName(project)}<small>{project.email}</small></td><td>{project.year} {project.make} {project.model}</td><td>{project.wrapType}</td><td><span className={`badge badge-${badgeTone(project.stageIndex)}`}>{project.stage || STAGES[project.stageIndex]}</span></td><td>{project.installDate || "TBD"}</td><td>{project.assignedInstaller || "Unassigned"}</td><td>{money(project.quoteAmount)}</td><td>{project.paymentStatus === "unpaid" ? <span className="badge badge-warning">Unpaid</span> : <span className="badge badge-complete">Deposit Paid</span>}</td><td><button className="table-action">Open <ArrowLeft className="open-arrow"/></button></td></tr>)}</tbody></table>{visibleProjects.length === 0 && <div className="empty-state"><FolderOpen/><h3>No wrap projects found</h3><p>Adjust filters or create a new wrap project.</p></div>}</div>
  </div>;
}

function ProjectCommandCenter({ project, tab, setTab, update, updateNested, action, openPortal, notify }) {
  const contentProps = { project, update, updateNested, action, notify };
  return <div className="view-panel active" data-testid="wrap-project-detail">
    <div className="project-header-panel">
      <div className="project-header-info"><div className="project-header-left"><div className="ph-left-title"><span className={`badge badge-${badgeTone(project.stageIndex)}`}>{project.stage || STAGES[project.stageIndex]}</span><h3>{project.id}</h3><span>{projectName(project)}</span></div><div className="ph-vehicle">{project.year} {project.make} {project.model} · {project.wrapType}</div></div><div className="ph-right"><Stat label="Quote Total" value={money(project.quoteAmount)}/><Stat label="Deposit Received" value={money(project.depositAmount)} tone="highlight-green"/><Stat label="Installer" value={project.assignedInstaller || "Unassigned"} tone="highlight-cyan"/><Stat label="Install Date" value={project.installDate || "TBD"} tone="highlight-amber"/></div></div>
      <div className="tabs-navigation command-center-tabs">{DETAIL_TABS.map(([id, label]) => { const Icon = tabIcons[id]; return <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}><Icon/>{label}</button>; })}</div>
      <ContextRibbon tab={tab} project={project} openPortal={openPortal} action={action} notify={notify}/>
      <div className="stepper-container project-stage-tracker"><div className="stage-tracker-label">Project stage</div><div className="stepper"><div className="stepper-progress-bar" style={{ width: `${(project.stageIndex / 10) * 100}%` }}/>{STAGES.map((stage, index) => <button key={stage} className={`step ${index < project.stageIndex ? "completed" : ""} ${index === project.stageIndex ? "active" : ""}`} onClick={() => action("advance_stage", { stageIndex: index }, `Project moved to ${stage}`)}><div className="step-node">{index < project.stageIndex ? "✓" : index + 1}</div><div className="step-label">{stage === "Proof Approval" ? "Proofing" : stage}</div></button>)}</div></div>
    </div>
    {tab === "intake" && <IntakeTab {...contentProps}/>} {tab === "measurements" && <MeasurementsTab {...contentProps}/>} {tab === "pricing" && <PricingTab {...contentProps}/>} {tab === "design" && <DesignTab {...contentProps}/>} {tab === "inspection" && <InspectionTab {...contentProps}/>} {tab === "production" && <ProductionTab {...contentProps}/>} {tab === "install" && <InstallTab {...contentProps}/>} {tab === "files" && <FilesTab {...contentProps}/>} {tab === "communication" && <CommunicationTab {...contentProps}/>} 
  </div>;
}

function ContextRibbon({ tab, project, openPortal, action, notify }) {
  const commands = {
    intake: [["Send Quote", () => notify("Quote link sent to customer")], ["Open Customer Portal", openPortal], ["Schedule Install", () => notify("Install scheduling opened")]],
    measurements: [["Add Area", () => notify("New measurement row added")], ["Recalculate", () => notify("Coverage recalculated")], ["Print Measure Sheet", () => window.print()]],
    pricing: [["Send Quote", () => notify("Quote sent")], ["Approve Quote", () => action("approve_quote", {}, "Quote approved")], ["Export Estimate", () => window.print()]],
    design: [["Generate Concepts", () => document.getElementById("mockup-studio")?.scrollIntoView({ behavior: "smooth" })], ["Request Proof Approval", () => notify("Proof approval requested")], ["Open Portal", openPortal]],
    inspection: [["Add Damage", () => notify("Click the vehicle diagram to add damage")], ["Request Photos", () => notify("Photo request sent")], ["Open Portal", openPortal]],
    production: [["Print Work Order", () => window.print()], ["Mark Stage Complete", () => action("complete_stage", {}, "Production stage completed")]],
    install: [["Schedule Install", () => notify("Schedule controls ready below")], ["Log Issue", () => notify("Use the issue form below")], ["Mark Stage Complete", () => action("complete_stage", {}, "Install stage completed")]],
    files: [["Upload Files", () => document.getElementById("wrap-file-input")?.click()], ["Customer Portal", openPortal], ["Final Packet", () => window.print()]],
    communication: [["Send Update", () => document.getElementById("wrap-chat-input")?.focus()], ["Open Portal", openPortal]],
  };
  return <div className="contextual-action-ribbon"><span>Quick Actions</span>{commands[tab].map(([label, callback], index) => <button key={label} className={`btn ${index === 0 ? "btn-primary" : ""}`} onClick={callback}><Send/>{label}</button>)}</div>;
}

function Stat({ label, value, tone = "" }) { return <div className="stat-box"><span className="stat-box-label">{label}</span><span className={`stat-box-value ${tone}`}>{value}</span></div>; }

function NewProjectModal({ close, create }) {
  const [draft, setDraft] = useState({ businessName: "", firstName: "", lastName: "", email: "", phone: "", year: new Date().getFullYear(), make: "", model: "", bodyType: "cargo-van", wrapType: "Commercial wrap" });
  const field = (key) => (event) => setDraft({ ...draft, [key]: event.target.value });
  return <div className="modal-overlay active"><div className="modal"><div className="modal-header"><h3>New Wrap Project</h3><button onClick={close}><X/></button></div><div className="modal-body"><div className="form-grid"><label className="form-group span-2">Business / Customer Name<input className="form-input" value={draft.businessName} onChange={field("businessName")}/></label><label className="form-group">First Name<input className="form-input" value={draft.firstName} onChange={field("firstName")}/></label><label className="form-group">Last Name<input className="form-input" value={draft.lastName} onChange={field("lastName")}/></label><label className="form-group">Email<input className="form-input" value={draft.email} onChange={field("email")}/></label><label className="form-group">Phone<input className="form-input" value={draft.phone} onChange={field("phone")}/></label><label className="form-group">Vehicle Year<input className="form-input" type="number" value={draft.year} onChange={field("year")}/></label><label className="form-group">Make<input className="form-input" value={draft.make} onChange={field("make")}/></label><label className="form-group">Model<input className="form-input" value={draft.model} onChange={field("model")}/></label><label className="form-group">Wrap Type<select className="form-input" value={draft.wrapType} onChange={field("wrapType")}><option>Commercial wrap</option><option>Full wrap</option><option>Partial wrap</option><option>Color change wrap</option><option>Trailer wrap</option></select></label></div></div><div className="modal-footer"><button className="btn" onClick={close}>Cancel</button><button className="btn btn-primary" disabled={!draft.businessName || !draft.make || !draft.model} onClick={() => create(draft)}>Create Project</button></div></div></div>;
}

function badgeTone(index) { return index >= 10 ? "complete" : index >= 7 ? "install" : index >= 6 ? "production" : index >= 3 ? "design" : "quote"; }

function localAction(project, action, payload) {
  const next = structuredClone(project);
  if (action === "approve_quote") next.quoteStatus = "approved";
  if (action === "pay_deposit") { next.paymentStatus = "deposit_paid"; next.depositAmount = payload.amount || next.quoteAmount * ((next.depositPercent || 50) / 100); }
  if (action === "sign_contract") { next.contractStatus = "signed"; next.contractSignedBy = payload.signedBy || "Customer"; }
  if (action === "approve_proof" && next.proofs?.length) next.proofs[next.proofs.length - 1].status = "Approved";
  if (action === "acknowledge_inspection") next.inspectionAcknowledged = true;
  if (["advance_stage", "complete_stage"].includes(action)) { next.stageIndex = Math.min(10, payload.stageIndex ?? next.stageIndex + 1); next.stage = STAGES[next.stageIndex]; }
  if (action === "send_message") next.chatHistory = [...(next.chatHistory || []), { sender: payload.sender || "shop", text: payload.message, time: new Date().toLocaleString() }];
  return next;
}
