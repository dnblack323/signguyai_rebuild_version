import React, { useRef, useState } from "react";
import {
  AlertTriangle, Archive, Camera, Check, CircleDollarSign, Download, Eye, FileDown,
  FileText, FolderOpen, ImagePlus, MessageSquareText, PackageCheck, Palette, PenLine,
  Plus, Replace, Send, ShieldCheck, Sparkles, Trash2, Upload, WandSparkles, X,
} from "lucide-react";
import { applyCustomerToProject } from "../customers/customerCore";
import { CustomerLinkPanel } from "../customers/CustomerLinkPanel";
import { money, projectName, VEHICLES } from "./wrapLabData";

const VIEWS = ["driver", "passenger", "front", "rear", "top"];
const FEEDBACK_TAGS = ["Keep layout", "Change colors", "Make bolder", "Simplify", "Logo bigger", "Add phone"];
const ASSET_TYPES = ["Logo", "Inspiration", "Font", "Color Reference", "Vehicle Photo", "Other"];
const PROTECTION_RULES = ["Must Stay Exact", "Inspiration Only", "Can Reinterpret", "Ignore During Generation"];

export function IntakeTab({ project, update, customers = [], onOpenCustomers }) {
  const linkCustomer = (customer) => {
    if (!customer) update({ customerId: "" });
    else update(applyCustomerToProject(project, customer), "Shared customer linked");
  };

  return <Tab>
    <CustomerLinkPanel customers={customers} selectedId={project.customerId} onSelect={linkCustomer} onOpenCustomers={onOpenCustomers}/>
    <div className="split-layout">
      <Card title="Customer & Business Info"><FormGrid>
        <Field label="Business / Company Name" wide><Input value={project.businessName} onChange={(value) => update({ businessName: value })}/></Field>
        <Field label="Contact First Name"><Input value={project.firstName} onChange={(value) => update({ firstName: value })}/></Field>
        <Field label="Contact Last Name"><Input value={project.lastName} onChange={(value) => update({ lastName: value })}/></Field>
        <Field label="Phone Number"><Input value={project.phone} onChange={(value) => update({ phone: value })}/></Field>
        <Field label="Email Address"><Input type="email" value={project.email} onChange={(value) => update({ email: value })}/></Field>
        <Field label="Customer Goals / Wrap Objective" wide><Text value={project.goals} onChange={(value) => update({ goals: value })}/></Field>
      </FormGrid></Card>
      <Card title="Vehicle Details"><FormGrid>
        <Field label="Vehicle Year"><Input type="number" value={project.year} onChange={(value) => update({ year: Number(value) })}/></Field>
        <Field label="Make"><Input value={project.make} onChange={(value) => update({ make: value })}/></Field>
        <Field label="Model"><Input value={project.model} onChange={(value) => update({ model: value })}/></Field>
        <Field label="Trim"><Input value={project.trim} onChange={(value) => update({ trim: value })}/></Field>
        <Field label="Vehicle / Template"><Select value={project.bodyType} onChange={(value) => update({ bodyType: value })} options={VEHICLES}/></Field>
        <Field label="Wrap Type"><Select value={project.wrapType} onChange={(value) => update({ wrapType: value })} options={["Commercial wrap", "Full wrap", "Partial wrap", "Color change wrap", "Trailer wrap"]}/></Field>
        <Field label="License Plate"><Input value={project.licensePlate} onChange={(value) => update({ licensePlate: value })}/></Field>
        <Field label="VIN"><Input value={project.vin} onChange={(value) => update({ vin: value })}/></Field>
        <Field label="Original Paint Color"><Input value={project.originalColor} onChange={(value) => update({ originalColor: value })}/></Field>
        <Field label="Target Turnaround"><Input type="date" value={project.turnaroundDate} onChange={(value) => update({ turnaroundDate: value })}/></Field>
        <Field label="Removal / Surface Notes" wide><Text value={project.removalNotes} onChange={(value) => update({ removalNotes: value })}/></Field>
      </FormGrid></Card>
    </div>
  </Tab>;
}

export function MeasurementsTab({ project, update }) {
  const areas = project.areas || [];
  const sqft = areas.filter((area) => area.included).reduce((sum, area) => sum + calcArea(area), 0);
  const changeArea = (index, changes) => update({ areas: areas.map((area, row) => row === index ? { ...area, ...changes } : area) });
  const addArea = () => update({ areas: [...areas, { name: "Custom Area", width: 0, height: 0, wasteFactor: 15, included: true, material: "Print Vinyl", complexity: "Medium", notes: "" }] }, "Measurement area added");
  const removeArea = (index) => update({ areas: areas.filter((_, row) => row !== index) }, "Measurement area removed");

  return <Tab>
    <div className="summary-grid measurement-summary">
      <MiniStat label="Included coverage" value={`${sqft.toFixed(1)} sq ft`}/>
      <MiniStat label="Panels" value={areas.filter((area) => area.included).length}/>
      <MiniStat label="Average waste" value={`${Math.round(areas.reduce((sum, area) => sum + Number(area.wasteFactor || 0), 0) / Math.max(1, areas.length))}%`}/>
    </div>
    <Card title="Vehicle Coverage Measurements" action={<button className="btn btn-primary" onClick={addArea}><Plus/>Add Area</button>}>
      <div className="table-container"><table className="data-table"><thead><tr><th>Include</th><th>Area</th><th>Width</th><th>Height</th><th>Waste</th><th>Material</th><th>Complexity</th><th>Sq Ft</th><th></th></tr></thead><tbody>
        {areas.map((area, index) => <tr key={`${area.name}-${index}`}>
          <td><input type="checkbox" checked={Boolean(area.included)} onChange={(event) => changeArea(index, { included: event.target.checked })}/></td>
          <td><input value={area.name || ""} onChange={(event) => changeArea(index, { name: event.target.value })}/></td>
          <td><input type="number" value={area.width || 0} onChange={(event) => changeArea(index, { width: Number(event.target.value) })}/></td>
          <td><input type="number" value={area.height || 0} onChange={(event) => changeArea(index, { height: Number(event.target.value) })}/></td>
          <td><input type="number" value={area.wasteFactor || 0} onChange={(event) => changeArea(index, { wasteFactor: Number(event.target.value) })}/></td>
          <td><input value={area.material || ""} onChange={(event) => changeArea(index, { material: event.target.value })}/></td>
          <td><select value={area.complexity || "Medium"} onChange={(event) => changeArea(index, { complexity: event.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></td>
          <td>{calcArea(area).toFixed(1)}</td>
          <td><button className="icon-button" onClick={() => removeArea(index)}><Trash2/></button></td>
        </tr>)}
      </tbody></table></div>
    </Card>
  </Tab>;
}

export function PricingTab({ project, update, action }) {
  const materialCost = (project.materials || []).reduce((sum, item) => sum + Number(item.sqftUsed || 0) * Number(item.costPerSqft || 0), 0);
  const laborCost = (project.labor || []).reduce((sum, item) => sum + Number(item.estHrs || 0) * Number(item.rate || 0), 0);
  const subtotal = materialCost + laborCost + Number(project.manualOverride || 0);
  const quote = Number(project.quoteAmount || subtotal * 1.55);
  const updateRow = (field, index, changes) => update({ [field]: (project[field] || []).map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row) });
  const setDepositPercent = (depositPercent) => update({ depositPercent, depositAmount: quote * (depositPercent / 100), balanceDue: quote - quote * (depositPercent / 100) }, "Deposit updated");

  return <Tab>
    <div className="pricing-layout">
      <div>
        <Card title="Materials & Consumables"><EditableRows rows={project.materials || []} columns={["name", "type", "sqftUsed", "costPerSqft", "status"]} onChange={(index, changes) => updateRow("materials", index, changes)} renderTotal={(item) => money(item.sqftUsed * item.costPerSqft)}/></Card>
        <Card title="Labor Estimate"><EditableRows rows={project.labor || []} columns={["type", "estHrs", "actHrs", "rate", "worker"]} onChange={(index, changes) => updateRow("labor", index, changes)} renderTotal={(item) => money(item.estHrs * item.rate)}/></Card>
      </div>
      <Card title="Quote Summary">
        <div className="quote-breakdown">
          <p><span>Material cost</span><strong>{money(materialCost)}</strong></p>
          <p><span>Estimated labor</span><strong>{money(laborCost)}</strong></p>
          <p><span>Manual adjustment</span><input className="form-input" type="number" value={project.manualOverride || 0} onChange={(event) => update({ manualOverride: Number(event.target.value) })}/></p>
          <p className="quote-total"><span>Customer quote</span><input className="form-input" type="number" value={quote} onChange={(event) => update({ quoteAmount: Number(event.target.value), balanceDue: Number(event.target.value) - Number(project.depositAmount || 0) })}/></p>
          <p><span>Deposit percent</span><input className="form-input" type="number" value={project.depositPercent || 50} onChange={(event) => setDepositPercent(Number(event.target.value))}/></p>
          <p><span>Deposit due</span><strong>{money(quote * ((project.depositPercent || 50) / 100))}</strong></p>
          <p><span>Gross margin</span><strong>{quote ? `${Math.max(0, ((quote - subtotal) / quote) * 100).toFixed(1)}%` : "0%"}</strong></p>
        </div>
        <button className="btn btn-primary full-button" onClick={() => action("approve_quote", {}, "Quote approved")}>Approve Quote</button>
      </Card>
    </div>
  </Tab>;
}

export function DesignTab({ project, update, notify }) {
  const proofs = project.proofs || [];
  const [proofNotes, setProofNotes] = useState("");
  const addProof = () => {
    const version = `v${proofs.length + 1}`;
    update({ proofs: [...proofs, { version, date: today(), notes: proofNotes || "New proof uploaded", status: "Pending" }] }, "Proof version added");
    setProofNotes("");
  };

  return <Tab>
    <div className="split-layout">
      <Card title="Creative Direction"><FormGrid>
        <Field label="Brand Colors"><Input value={project.designColors} onChange={(value) => update({ designColors: value })}/></Field>
        <Field label="Preferred Fonts"><Input value={project.designFonts} onChange={(value) => update({ designFonts: value })}/></Field>
        <Field label="Required Copy" wide><Text value={project.designCopy} onChange={(value) => update({ designCopy: value })}/></Field>
        <Field label="Design Brief" wide><Text value={project.designBrief} onChange={(value) => update({ designBrief: value })}/></Field>
      </FormGrid></Card>
      <Card title="Current Vehicle Mockup">
        <div className="mockup-viewport"><img src={project.mockupImage || "/wrap-lab-assets/apex-wrap-mockup.png"} alt="Current vehicle mockup"/></div>
        <div className="card-actions">
          <button className="btn" onClick={() => downloadUrl(project.mockupImage || "/wrap-lab-assets/apex-wrap-mockup.png", `${project.id}-mockup.png`)}><Download/>Download</button>
          <button className="btn" onClick={() => notify("Proof approval request queued for the portal")}><Send/>Request Approval</button>
        </div>
      </Card>
    </div>
    <Card title="Proof Version History" action={<div className="inline-action"><input className="form-input" placeholder="Proof notes" value={proofNotes} onChange={(event) => setProofNotes(event.target.value)}/><button className="btn btn-primary" onClick={addProof}><Upload/>Add Proof</button></div>}>
      <div className="proof-grid">{proofs.length ? proofs.map((proof, index) => <article className="proof-card" key={index}>
        <div className="proof-thumb"><Palette/></div><div><strong>{proof.version}</strong><span>{proof.date}</span><p>{proof.notes}</p><span className={`badge ${proof.status === "Approved" ? "badge-complete" : "badge-warning"}`}>{proof.status}</span></div>
      </article>) : <Empty icon={ImagePlus} title="No proof versions yet" text="Add a proof or generate concepts below."/>}</div>
    </Card>
    <MockupStudio project={project} update={update} notify={notify}/>
  </Tab>;
}

export function InspectionTab({ project, update }) {
  const [view, setView] = useState("driver");
  const [selected, setSelected] = useState(project.damageMarkers?.[0]?.id || null);
  const markers = project.damageMarkers || [];
  const template = VEHICLES.some(([key]) => key === project.bodyType) ? project.bodyType : "other";
  const visibleMarkers = markers.filter((marker) => (marker.view || "driver") === view);
  const addMarker = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const type = window.prompt("Damage type", "Scratch");
    if (!type) return;
    const severity = window.prompt("Severity", "Medium") || "Medium";
    const notes = window.prompt("Damage notes", "Pre-existing damage documented before installation.") || "";
    const marker = { id: Date.now(), x: ((event.clientX - bounds.left) / bounds.width) * 100, y: ((event.clientY - bounds.top) / bounds.height) * 100, view, type, severity, notes };
    update({ damageMarkers: [...markers, marker] }, "Damage marker added");
    setSelected(marker.id);
  };
  const current = markers.find((marker) => marker.id === selected);
  const patchMarker = (changes) => update({ damageMarkers: markers.map((marker) => marker.id === selected ? { ...marker, ...changes } : marker) }, "Damage marker updated");
  const remove = () => { update({ damageMarkers: markers.filter((marker) => marker.id !== selected) }, "Damage marker removed"); setSelected(null); };

  return <Tab>
    <div className="inspection-workspace">
      <div className="inspection-main-column">
        <Card title="Damage Map">
          <div className="vehicle-type-pills">{VEHICLES.map(([key, label]) => <button key={key} className={template === key ? "active" : ""} onClick={() => update({ bodyType: key })}>{label}</button>)}</div>
          <div className="inspection-view-tabs">{VIEWS.map((name) => <button key={name} className={view === name ? "active" : ""} onClick={() => setView(name)}>{name}</button>)}</div>
          <div className="diagram-canvas-container inspection-primary-canvas" onClick={addMarker}>
            <img src={`/wrap-lab-assets/inspection/${template}-${view}.webp`} onError={(event) => { event.currentTarget.src = `/wrap-lab-assets/inspection/other-${view}.webp`; }} alt={`${template} ${view} inspection view`}/>
            <div className="damage-dots-overlay">{visibleMarkers.map((marker) => <button key={marker.id} className={`damage-marker-dot severity-${String(marker.severity || "medium").toLowerCase()}`} style={{ left: `${marker.x}%`, top: `${marker.y}%` }} onClick={(event) => { event.stopPropagation(); setSelected(marker.id); }}>{marker.id}</button>)}</div>
          </div>
          <div className="damage-legend"><span><i className="minor"/>Minor</span><span><i className="medium"/>Medium</span><span><i className="major"/>Major</span></div>
        </Card>
        <Card title="Required Pre-Install Photos"><div className="photo-prompt-grid">{["Front", "Rear", "Driver Side", "Passenger Side", "Roof", "Problem Areas"].map((label) => <button key={label}><Camera/><span>{label}</span><small>{project.files?.some((file) => file.category === `Before photos - ${label}`) ? "Uploaded" : "Photo required"}</small></button>)}</div></Card>
      </div>
      <div className="inspection-detail-column">
        <Card title="Damage Details">{current ? <div className="selected-damage-detail">
          <span className="badge badge-warning">{current.severity}</span><h3>{current.type}</h3><p>{current.notes}</p><small>{view} view - {current.x.toFixed(1)}%, {current.y.toFixed(1)}%</small>
          <Field label="Type"><Input value={current.type} onChange={(value) => patchMarker({ type: value })}/></Field>
          <Field label="Severity"><Select value={current.severity} onChange={(value) => patchMarker({ severity: value })} options={["Minor", "Medium", "Major"]}/></Field>
          <Field label="Notes"><Text value={current.notes} onChange={(value) => patchMarker({ notes: value })}/></Field>
          <button className="btn btn-danger" onClick={remove}><Trash2/>Delete Marker</button>
        </div> : <Empty icon={ShieldCheck} title="Select a pin or damage record" text="Click the vehicle surface to document pre-existing damage."/>}</Card>
        <Card title="Inspection Summary"><p className="inspection-summary-copy">{markers.length} pre-existing condition{markers.length === 1 ? "" : "s"} documented.</p><span className={`badge ${project.inspectionAcknowledged ? "badge-complete" : "badge-warning"}`}>{project.inspectionAcknowledged ? "Customer acknowledged" : "Awaiting customer review"}</span></Card>
      </div>
    </div>
  </Tab>;
}

export function ProductionTab({ project, update, action }) {
  const checklist = project.productionChecklist || [];
  const toggle = (index) => update({ productionChecklist: checklist.map((item, row) => row === index ? { ...item, done: !item.done } : item) });
  const complete = checklist.length > 0 && checklist.every((item) => item.done);
  return <Tab>
    <div className="split-layout">
      <Card title="Production Checklist"><div className="checklist-list">{checklist.map((item, index) => <label key={item.task} className={item.done ? "complete" : ""}><input type="checkbox" checked={item.done} onChange={() => toggle(index)}/><span>{item.task}</span>{item.done && <Check/>}</label>)}</div></Card>
      <Card title="Production Status"><div className="production-progress"><strong>{checklist.filter((item) => item.done).length}/{checklist.length}</strong><span>production steps complete</span><progress max={checklist.length} value={checklist.filter((item) => item.done).length}/></div><Field label="Production Notes"><Text value={project.productionNotes} onChange={(value) => update({ productionNotes: value })}/></Field><button className="btn btn-primary full-button" disabled={!complete} onClick={() => action("complete_stage", {}, "Production complete")}>Release to Installation</button></Card>
    </div>
    <Card title="Production Tasks"><div className="production-task-grid">{(project.materials || []).map((material) => <article key={material.name}><PackageCheck/><div><strong>{material.name}</strong><span>{material.sqftUsed} sq ft - {material.rollWidth} in roll</span><small>{material.status}</small></div></article>)}</div></Card>
  </Tab>;
}

export function InstallTab({ project, update, action }) {
  const checklist = project.installChecklist || [];
  const issues = project.issuesLog || [];
  const toggle = (index) => update({ installChecklist: checklist.map((item, row) => row === index ? { ...item, done: !item.done } : item) });
  const addIssue = () => {
    const description = window.prompt("Describe installation issue");
    if (!description) return;
    const area = window.prompt("Vehicle area", "Vehicle") || "Vehicle";
    update({ issuesLog: [...issues, { type: "Install issue", area, description, resolved: false, notes: "" }] }, "Issue logged");
  };
  return <Tab>
    <div className="split-layout">
      <Card title="Install Schedule & Assignment"><FormGrid>
        <Field label="Install Date"><Input type="date" value={project.installDate} onChange={(value) => update({ installDate: value })}/></Field>
        <Field label="Bay"><Input value={project.bay} onChange={(value) => update({ bay: value })}/></Field>
        <Field label="Lead Installer"><Input value={project.assignedInstaller} onChange={(value) => update({ assignedInstaller: value })}/></Field>
        <Field label="Helper"><Input value={project.helper} onChange={(value) => update({ helper: value })}/></Field>
        <Field label="Drop-Off"><Input type="datetime-local" value={project.dropOffTime} onChange={(value) => update({ dropOffTime: value })}/></Field>
        <Field label="Expected Pickup"><Input type="datetime-local" value={project.pickupTime} onChange={(value) => update({ pickupTime: value })}/></Field>
      </FormGrid></Card>
      <Card title="Installer Checkoff"><div className="checklist-list">{checklist.map((item, index) => <label key={item.task} className={item.done ? "complete" : ""}><input type="checkbox" checked={item.done} onChange={() => toggle(index)}/><span>{item.task}</span>{item.done && <Check/>}</label>)}</div><button className="btn btn-primary full-button" disabled={!checklist.length || !checklist.every((item) => item.done)} onClick={() => action("complete_stage", {}, "Complete installation")}>Complete Installation</button></Card>
    </div>
    <Card title="Install Issues" action={<button className="btn btn-danger" onClick={addIssue}><AlertTriangle/>Log Issue</button>}>{issues.length ? <div className="issues-list">{issues.map((issue, index) => <article key={index} className={issue.resolved ? "resolved" : ""}><AlertTriangle/><div><strong>{issue.type} - {issue.area}</strong><p>{issue.description}</p></div><button className="btn" disabled={issue.resolved} onClick={() => update({ issuesLog: issues.map((row, rowIndex) => rowIndex === index ? { ...row, resolved: true, resolvedAt: new Date().toISOString() } : row) }, "Issue resolved")}>{issue.resolved ? "Resolved" : "Resolve"}</button></article>)}</div> : <Empty icon={Check} title="No installation issues" text="Issues logged by the install team will appear here."/>}</Card>
  </Tab>;
}

export function FilesTab({ project, update, notify }) {
  const files = project.files || [];
  const inputRef = useRef(null);
  const [category, setCategory] = useState("Other");
  const upload = (event) => {
    const incoming = Array.from(event.target.files || []);
    if (!incoming.length) return;
    Promise.all(incoming.map(readFile)).then((loaded) => {
      update({ files: [...files, ...loaded.map(({ file, dataUrl }) => ({ id: `file-${Date.now()}-${file.name}`, name: file.name, category, date: today(), contentType: file.type, dataUrl, customerVisible: false, marketingPermission: false }))] }, "Files uploaded");
    });
    event.target.value = "";
  };
  return <Tab>
    <input id="wrap-file-input" ref={inputRef} type="file" multiple hidden onChange={upload}/>
    <Card title="Categorized Project File Manager" action={<div className="inline-action"><select className="form-input" value={category} onChange={(event) => setCategory(event.target.value)}><option>Customer Art</option><option>Production Files</option><option>Before Photos</option><option>After Photos</option><option>Signed Documents</option><option>Other</option></select><button className="btn btn-primary" onClick={() => inputRef.current?.click()}><Upload/>Upload Files</button></div>}>
      <div className="files-grid">{files.map((file, index) => <article className="file-card" key={file.id || `${file.name}-${index}`}>
        <div className="file-preview">{file.dataUrl?.startsWith("data:image") ? <img src={file.dataUrl} alt=""/> : <FileText/>}</div>
        <div className="file-info"><strong>{file.name}</strong><span>{file.category} - {file.date}</span>
          <label><input type="checkbox" checked={Boolean(file.customerVisible)} onChange={(event) => update({ files: files.map((row, rowIndex) => rowIndex === index ? { ...row, customerVisible: event.target.checked } : row) })}/>Customer Portal</label>
          <label><input type="checkbox" checked={Boolean(file.marketingPermission)} onChange={(event) => update({ files: files.map((row, rowIndex) => rowIndex === index ? { ...row, marketingPermission: event.target.checked } : row) })}/>Marketing permission</label>
          <div><button onClick={() => file.dataUrl ? window.open(file.dataUrl, "_blank") : notify("File preview unavailable")}><Eye/></button><button onClick={() => downloadUrl(file.dataUrl, file.name)}><Download/></button><button onClick={() => update({ files: files.filter((_, rowIndex) => rowIndex !== index) }, "File removed")}><Trash2/></button></div>
        </div>
      </article>)}</div>
      {files.length === 0 && <Empty icon={FolderOpen} title="No project files" text="Upload logos, proofs, production files, and completion photos."/>}
    </Card>
  </Tab>;
}

export function CommunicationTab({ project, action, notify }) {
  const [message, setMessage] = useState("");
  const send = async () => { if (!message.trim()) return; await action("send_message", { sender: "shop", message }, "Customer update sent"); setMessage(""); };
  const templates = ["Your quote is ready for review.", "A new design proof is ready in your portal.", "Your installation has been scheduled.", "Your vehicle is ready for pickup."];
  return <Tab><div className="communication-layout">
    <Card title="Customer Conversation"><div className="chat-history">{(project.chatHistory || []).map((entry, index) => <div key={index} className={`chat-message ${entry.sender}`}><p>{entry.text}</p><span>{entry.time}</span></div>)}</div><div className="chat-compose"><textarea id="wrap-chat-input" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type a manual SMS or portal update..."/><button className="btn btn-primary" onClick={send}><Send/>Send Update</button></div></Card>
    <Card title="Communication Templates"><div className="template-list">{templates.map((template) => <button key={template} onClick={() => setMessage(template)}><MessageSquareText/><span>{template}</span></button>)}</div><button className="btn full-button" onClick={() => notify("Communication history exported")}><Download/>Export History</button></Card>
  </div></Tab>;
}

export function WrapCustomerPortal({ project, close, action, update }) {
  const [signature, setSignature] = useState("");
  const [revision, setRevision] = useState("");
  const [packetName, setPacketName] = useState("");
  const proof = project.proofs?.at(-1);
  const concepts = project.mockupStudio?.concepts?.filter((concept) => concept.sentToPortal && !concept.archived) || [];

  return <div id="customer-portal-overlay" className="active">
    <div className="portal-simulator-bar"><span><ShieldCheck/>WRAP LAB AI - CUSTOMER PORTAL PREVIEW</span><button className="btn btn-danger" onClick={close}><X/>Return to Admin Command Center</button></div>
    <div className="portal-wrapper"><div className="portal-container">
      <div className="portal-header"><h2>{projectName(project)}</h2><p>Order {project.id} - Status Page</p></div>
      <div className="portal-body">
        <div className="portal-stage"><span>Current Stage:</span><span className="badge badge-design">{project.stage}</span></div>
        <PortalSection title="1. Quote & Scope of Work" badge={project.quoteStatus === "approved" ? "Approved" : "Awaiting Approval"} done={project.quoteStatus === "approved"}>
          <p>Please review wrap coverage, design scope, premium vinyl, installation labor, and project assumptions.</p>
          <div className="portal-financials"><span><small>Estimated Quote Total</small><strong>{money(project.quoteAmount)}</strong></span><span><small>Required Deposit</small><strong>{money(project.quoteAmount * ((project.depositPercent || 50) / 100))}</strong></span></div>
          {project.quoteStatus !== "approved" && <><textarea className="form-input" placeholder="Revision reason" value={revision} onChange={(event) => setRevision(event.target.value)}/><div className="portal-actions"><button className="btn btn-danger" onClick={() => action("request_quote_revision", { message: revision || "Customer requested quote changes." }, "Revision requested")}>Request Revision</button><button className="btn btn-success" onClick={() => action("approve_quote", {}, "Quote approved")}>Approve Quote</button></div></>}
        </PortalSection>
        <PortalSection title="2. Wrap Contract & Liability Terms" badge={project.contractStatus === "signed" ? "Signed" : "Pending Signature"} done={project.contractStatus === "signed"}>
          <div className="contract-terms"><strong>VEHICLE WRAP INSTALLATION GENERAL CONTRACT TERMS</strong><p>Paint and clearcoat condition, outgassing requirements, payment policies, design approval, install environment, and aftercare terms apply. The shop is not responsible for adhesion failure caused by pre-existing paint or body conditions.</p></div>
          <div className="portal-payment-box"><div><span className="portal-payment-label">Required project deposit</span><strong>{money(project.quoteAmount * ((project.depositPercent || 50) / 100))}</strong><span className={`badge ${project.paymentStatus === "unpaid" ? "badge-warning" : "badge-complete"}`}>{project.paymentStatus === "unpaid" ? "Payment Required" : "Paid"}</span></div>{project.paymentStatus === "unpaid" && <button className="btn btn-primary" onClick={() => action("pay_deposit", { amount: project.quoteAmount * ((project.depositPercent || 50) / 100) }, "Deposit paid")}>Pay Required Deposit</button>}</div>
          {project.contractStatus !== "signed" && <div className="signature-area"><label>Type full legal name to sign</label><input className="form-input" value={signature} onChange={(event) => setSignature(event.target.value)}/><button className="btn btn-success" disabled={!signature || project.paymentStatus === "unpaid"} onClick={() => action("sign_contract", { signedBy: signature, signature }, "Contract signed")}>Sign and Authorize</button></div>}
        </PortalSection>
        <PortalSection title="3. Creative Artwork Layout Proof" badge={proof?.status || "Awaiting Proof"} done={proof?.status === "Approved"}>
          <div className="mockup-viewport"><img src={project.mockupImage || "/wrap-lab-assets/apex-wrap-mockup.png"} alt="Customer proof"/></div>
          {proof && proof.status !== "Approved" && <div className="portal-actions"><button className="btn btn-danger" onClick={() => action("request_proof_revision", { message: revision || "Customer requested proof changes." }, "Proof revision requested")}>Request Revision</button><button className="btn btn-success" onClick={() => action("approve_proof", {}, "Proof approved")}>Approve & Freeze Artwork</button></div>}
        </PortalSection>
        <PortalSection title="4. AI Concept Direction Review" badge={concepts.length ? `${concepts.length} Shared` : "No Concepts Sent"}>
          <div className="portal-concept-disclaimer"><AlertTriangle/><div><strong>Concepts are direction only.</strong><p>Final production art still requires shop proofing and approval.</p></div></div>
          <div className="portal-concept-grid">{concepts.map((concept) => <PortalConcept key={concept.id} project={project} concept={concept} update={update} action={action}/>)}</div>
          {!concepts.length && <p>No AI concepts are currently shared. Your project team will send selected directions when ready.</p>}
        </PortalSection>
        <PortalSection title="5. Documented Vehicle Pre-existing Damage" badge={project.inspectionAcknowledged ? "Acknowledged" : "Awaiting Review"} done={project.inspectionAcknowledged}>
          <div className="portal-damage-list">{(project.damageMarkers || []).map((marker) => <p key={marker.id}><strong>{marker.type} - {marker.severity}</strong><span>{marker.notes}</span></p>)}</div>
          {!project.inspectionAcknowledged && <button className="btn btn-success" onClick={() => action("acknowledge_inspection", {}, "Inspection acknowledged")}>Acknowledge Marked Damage</button>}
        </PortalSection>
        <PortalSection title="6. Pre-Install and Final Packets" badge={project.preInstallPacketSigned && project.finalPacketSigned ? "Signed" : "Needs Signature"} done={project.preInstallPacketSigned && project.finalPacketSigned}>
          <div className="portal-actions"><button className="btn" onClick={() => printPacket(project, "pre-install")}><FileDown/>View Pre-Install Packet</button><button className="btn" onClick={() => printPacket(project, "final")}><FileDown/>View Final Packet</button></div>
          <div className="signature-area"><label>Type name for packet signature</label><input className="form-input" value={packetName} onChange={(event) => setPacketName(event.target.value)}/><button className="btn btn-success" disabled={!packetName} onClick={() => action("sign_pre_install_packet", { signedBy: packetName }, "Pre-install packet signed")}>Sign Pre-Install</button><button className="btn btn-success" disabled={!packetName || project.stageIndex < 8} onClick={() => action("sign_final_packet", { signedBy: packetName }, "Final packet signed")}>Sign Final</button></div>
        </PortalSection>
      </div>
    </div></div>
  </div>;
}

function PortalConcept({ project, concept, update, action }) {
  const [question, setQuestion] = useState("");
  const patch = (changes) => updateConcept(project, update, concept.id, changes);
  const submitFeedback = () => action("customer_concept_feedback", {
    conceptId: concept.id,
    customerSelected: Boolean(concept.customerSelected),
    customerComment: concept.customerComment || "",
    feedbackTags: concept.feedbackTags || [],
    annotations: concept.annotations || [],
    questions: concept.questions || [],
  }, "Concept feedback submitted");
  const annotate = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const note = window.prompt("Annotation note", "Change this area");
    if (!note) return;
    const annotations = concept.annotations || [];
    patch({ annotations: [...annotations, { id: Date.now(), x: ((event.clientX - bounds.left) / bounds.width) * 100, y: ((event.clientY - bounds.top) / bounds.height) * 100, note }] });
  };
  return <article className={`portal-concept-card ${concept.customerSelected ? "selected" : ""}`}>
    <div className="portal-concept-image-shell" onClick={annotate}><img src={concept.image} alt={concept.title}/>{(concept.annotations || []).map((pin, index) => <span key={pin.id} className="portal-annotation-pin" title={pin.note} style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>{index + 1}</span>)}</div>
    <div className="portal-concept-body"><div><span>Concept {concept.number}</span><h4>{concept.title}</h4><p>{concept.explanation}</p></div>
      <label className="portal-select-concept"><input type="checkbox" checked={Boolean(concept.customerSelected)} onChange={(event) => patch({ customerSelected: event.target.checked })}/>Select this direction</label>
      <div className="portal-feedback-tags">{FEEDBACK_TAGS.map((tag) => <button key={tag} className={(concept.feedbackTags || []).includes(tag) ? "active" : ""} onClick={() => patch({ feedbackTags: toggleValue(concept.feedbackTags || [], tag) })}>{tag}</button>)}</div>
      <textarea value={concept.customerComment || ""} placeholder="Tell the design team what to keep or change" onChange={(event) => patch({ customerComment: event.target.value })}/>
      <div className="portal-concept-actions"><input className="form-input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask the design team a question"/><button className="btn" onClick={() => { if (question.trim()) { patch({ questions: [...(concept.questions || []), { text: question, time: new Date().toISOString() }] }); setQuestion(""); } }}>Ask</button><button className="btn btn-success" onClick={submitFeedback}>Submit Feedback</button></div>
    </div>
  </article>;
}

function MockupStudio({ project, update, notify }) {
  const studio = normalizeStudio(project.mockupStudio);
  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const [uploadMeta, setUploadMeta] = useState({ type: "Logo", protection: "Must Stay Exact", note: "" });
  const [replaceId, setReplaceId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const change = (changes, message) => update({ mockupStudio: { ...studio, ...changes } }, message);
  const log = (message, patch = {}) => change({ ...patch, activity: [{ message, time: new Date().toLocaleString() }, ...(studio.activity || [])] }, message);
  const uploadAssets = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    Promise.all(files.map(readFile)).then((loaded) => {
      const assets = loaded.map(({ file, dataUrl }) => ({ id: `asset-${Date.now()}-${file.name}`, ref: nextAssetRef(studio, uploadMeta.type), name: file.name, type: uploadMeta.type, protection: uploadMeta.protection, note: uploadMeta.note, dataUrl, size: file.size, contentType: file.type, uploadedAt: new Date().toISOString() }));
      log(`${assets.length} studio asset${assets.length === 1 ? "" : "s"} uploaded`, { assets: [...studio.assets, ...assets] });
    });
    event.target.value = "";
  };
  const replaceAsset = (event) => {
    const file = event.target.files?.[0];
    if (!file || !replaceId) return;
    readFile(file).then(({ dataUrl }) => log("Studio asset replaced", { assets: studio.assets.map((asset) => asset.id === replaceId ? { ...asset, name: file.name, dataUrl, size: file.size, contentType: file.type, uploadedAt: new Date().toISOString() } : asset) }));
    event.target.value = "";
    setReplaceId(null);
  };
  const updateAsset = (id, changes) => change({ assets: studio.assets.map((asset) => asset.id === id ? { ...asset, ...changes } : asset) });
  const generate = (surprise = false) => {
    setGenerating(true);
    window.setTimeout(() => {
      const count = surprise ? 5 : Number(studio.settings?.count || 3);
      const styles = surprise ? ["Bold / High Energy", "Premium / Minimal", "Rugged / Industrial", "Illustrated", "Clean / Corporate"] : [studio.direction?.style || "Clean / Corporate"];
      const concepts = Array.from({ length: count }, (_, index) => {
        const style = styles[index % styles.length];
        return { id: `concept-${Date.now()}-${index}`, number: studio.concepts.length + index + 1, title: ["Precision Fleet", "Bold Motion", "Clean Authority", "Unexpected Angle", "Premium Route"][index % 5], style, explanation: `${style} direction using ${project.designColors || "the supplied brand palette"} with ${studio.assets.length} referenced asset${studio.assets.length === 1 ? "" : "s"}.`, image: project.mockupImage || "/wrap-lab-assets/apex-wrap-mockup.png", favorite: false, selected: false, sentToPortal: false, archived: false, customerSelected: false, customerComment: "", feedbackTags: [], annotations: [], questions: [] };
      });
      log(`${count} concept${count === 1 ? "" : "s"} generated`, { concepts: [...studio.concepts, ...concepts] });
      setGenerating(false);
      notify(surprise ? "Surprise concept batch generated" : "AI concept batch generated");
    }, 700);
  };
  const updateConcept = (id, changes) => change({ concepts: studio.concepts.map((concept) => concept.id === id ? { ...concept, ...changes } : concept) });

  return <section id="mockup-studio" className="mockup-studio">
    <div className="studio-hero"><div><span className="studio-eyebrow">AI MOCKUP STUDIO</span><h2>Explore design directions before production artwork</h2><p>Upload protected brand assets, set the creative direction, generate concept batches, compare options, and send selected concepts to the customer portal.</p></div><Sparkles/></div>
    <div className="studio-grid">
      <Card title="Brand Assets">
        <input ref={fileInputRef} type="file" multiple hidden onChange={uploadAssets}/>
        <input ref={replaceInputRef} type="file" hidden onChange={replaceAsset}/>
        <FormGrid><Field label="Asset Type"><Select value={uploadMeta.type} onChange={(type) => setUploadMeta({ ...uploadMeta, type })} options={ASSET_TYPES}/></Field><Field label="Protection"><Select value={uploadMeta.protection} onChange={(protection) => setUploadMeta({ ...uploadMeta, protection })} options={PROTECTION_RULES}/></Field><Field label="Upload Note" wide><Text value={uploadMeta.note} onChange={(note) => setUploadMeta({ ...uploadMeta, note })}/></Field></FormGrid>
        <button className="studio-dropzone" onClick={() => fileInputRef.current?.click()}><Upload/><strong>Upload logos, fonts, colors, inspiration, and vehicle photos</strong><small>Assets remain project-specific and can be protected from reinterpretation</small></button>
        <div className="studio-asset-list">{studio.assets.map((asset) => <article key={asset.id} className="studio-asset-row"><div>{asset.dataUrl?.startsWith("data:image") ? <img src={asset.dataUrl} alt=""/> : <FileText/>}</div><strong>{asset.ref} - {asset.name}</strong><select value={asset.protection} onChange={(event) => updateAsset(asset.id, { protection: event.target.value })}>{PROTECTION_RULES.map((rule) => <option key={rule}>{rule}</option>)}</select><button onClick={() => downloadUrl(asset.dataUrl, asset.name)}><Download/></button><button onClick={() => { setReplaceId(asset.id); replaceInputRef.current?.click(); }}><Replace/></button><button onClick={() => log("Studio asset deleted", { assets: studio.assets.filter((row) => row.id !== asset.id) })}><Trash2/></button></article>)}</div>
      </Card>
      <Card title="Creative Direction">
        <Field label="Style"><Select value={studio.direction?.style} onChange={(value) => change({ direction: { ...studio.direction, style: value } })} options={["Clean / Corporate", "Bold / High Energy", "Premium / Minimal", "Illustrated", "Rugged / Industrial"]}/></Field>
        <Field label="Direction Notes"><Text value={studio.direction?.notes} onChange={(value) => change({ direction: { ...studio.direction, notes: value } })}/></Field>
        <div className="studio-generation-settings"><label>Concepts<select value={studio.settings?.count || 3} onChange={(event) => change({ settings: { ...studio.settings, count: Number(event.target.value) } })}><option>2</option><option>3</option><option>4</option></select></label><label>Surprise<input type="range" min="0" max="100" value={studio.settings?.surprise || 25} onChange={(event) => change({ settings: { ...studio.settings, surprise: Number(event.target.value) } })}/></label></div>
        <button className="btn btn-ai full-button" onClick={() => generate(false)} disabled={generating}><WandSparkles/>{generating ? "Generating Concepts..." : "Generate Concept Batch"}</button>
        <button className="btn full-button" onClick={() => generate(true)} disabled={generating}><Sparkles/>Surprise Me</button>
      </Card>
    </div>
    <section className="studio-gallery-section"><div className="studio-gallery-header"><div><span className="studio-eyebrow">RESULTS</span><h3>Concept Gallery</h3><p>Review internally and send only chosen concepts to the portal.</p></div><button className="btn" onClick={() => printDesignerBrief(project, studio)}><FileText/>Create Designer Brief</button></div>
      <div className="studio-concept-grid">{studio.concepts.filter((concept) => !concept.archived).map((concept) => <article className={`studio-concept-card ${concept.selected ? "selected" : ""}`} key={concept.id}><div className="studio-concept-image"><img src={concept.image} alt={concept.title}/><span>Concept {concept.number}</span></div><div className="studio-concept-body"><h4>{concept.title}</h4><p>{concept.explanation}</p><textarea value={concept.refinement || ""} placeholder="Refinement instruction" onChange={(event) => updateConcept(concept.id, { refinement: event.target.value })}/><div className="studio-concept-actions"><button className={concept.favorite ? "active" : ""} onClick={() => updateConcept(concept.id, { favorite: !concept.favorite })}>Favorite</button><button className={concept.selected ? "active" : ""} onClick={() => updateConcept(concept.id, { selected: !concept.selected })}>Compare</button><button onClick={() => updateConcept(concept.id, { title: `${concept.title} Rev`, explanation: `${concept.explanation} Refined: ${concept.refinement || "minor layout adjustment"}` })}><PenLine/>Refine</button><button className={concept.sentToPortal ? "active" : ""} onClick={() => updateConcept(concept.id, { sentToPortal: !concept.sentToPortal })}><Send/>Portal</button><button onClick={() => updateConcept(concept.id, { archived: true })}><Archive/>Archive</button></div></div></article>)}</div>
      {!studio.concepts?.length && <Empty icon={Sparkles} title="No concepts generated" text="Set the direction and generate a batch to begin."/>}
      {studio.activity?.length > 0 && <div className="studio-activity">{studio.activity.slice(0, 5).map((entry, index) => <p key={index}><strong>{entry.time}</strong> {entry.message}</p>)}</div>}
    </section>
  </section>;
}

function EditableRows({ rows, columns, onChange, renderTotal }) {
  return <div className="table-container"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}<th>Total</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}><input value={row[column] ?? ""} type={typeof row[column] === "number" ? "number" : "text"} onChange={(event) => onChange(index, { [column]: typeof row[column] === "number" ? Number(event.target.value) : event.target.value })}/></td>)}<td>{renderTotal(row)}</td></tr>)}</tbody></table></div>;
}

function updateConcept(project, update, id, changes) {
  const studio = normalizeStudio(project.mockupStudio);
  update({ mockupStudio: { ...studio, concepts: studio.concepts.map((concept) => concept.id === id ? { ...concept, ...changes } : concept) } }, "Concept feedback saved");
}

function PortalSection({ title, badge, done, children }) { return <section className="portal-section"><div className="portal-section-title"><span>{title}</span><span className={`badge ${done ? "badge-complete" : "badge-warning"}`}>{badge}</span></div>{children}</section>; }
function Tab({ children }) { return <div className="detail-tab-panel active">{children}</div>; }
function Card({ title, action, children }) { return <section className="info-card"><h4><span>{title}</span>{action}</h4>{children}</section>; }
function FormGrid({ children }) { return <div className="form-grid">{children}</div>; }
function Field({ label, wide, children }) { return <label className={`form-group ${wide ? "span-2" : ""}`}><span>{label}</span>{children}</label>; }
function Input({ value = "", type = "text", onChange }) { return <input className="form-input" type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)}/>; }
function Text({ value = "", onChange }) { return <textarea className="form-input" value={value ?? ""} onChange={(event) => onChange(event.target.value)}/>; }
function Select({ value = "", onChange, options }) { return <select className="form-input" value={value ?? ""} onChange={(event) => onChange(event.target.value)}>{options.map((option) => { const [key, label] = Array.isArray(option) ? option : [option, option]; return <option value={key} key={key}>{label}</option>; })}</select>; }
function MiniStat({ label, value }) { return <div className="summary-card"><div className="card-value">{value}</div><div className="card-label">{label}</div></div>; }
function Empty({ icon: Icon, title, text }) { return <div className="empty-state compact"><Icon/><h3>{title}</h3><p>{text}</p></div>; }

function calcArea(area) { return (Number(area.width || 0) * Number(area.height || 0) / 144) * (1 + Number(area.wasteFactor || 0) / 100); }
function today() { return new Date().toISOString().slice(0, 10); }
function toggleValue(values, value) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
function normalizeStudio(studio = {}) { return { assets: [], concepts: [], activity: [], settings: { count: 3, surprise: 25 }, direction: { style: "Clean / Corporate", notes: "" }, ...studio }; }
function readFile(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ file, dataUrl: reader.result }); reader.onerror = reject; reader.readAsDataURL(file); }); }
function nextAssetRef(studio, type) { const prefix = String(type || "asset").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 6) || "asset"; return `@${prefix}${(studio.assets || []).length + 1}`; }
function downloadUrl(url, filename = "download") { if (!url) return; const link = document.createElement("a"); link.href = url; link.download = filename; link.target = "_blank"; link.click(); }

function printDesignerBrief(project, studio) {
  printHtml(`${project.id} Designer Brief`, `<h1>${projectName(project)} Designer Brief</h1><p><strong>Vehicle:</strong> ${project.year} ${project.make} ${project.model}</p><p><strong>Direction:</strong> ${studio.direction?.style}</p><p>${studio.direction?.notes || project.designBrief || ""}</p><h2>Protected Assets</h2><ul>${studio.assets.map((asset) => `<li>${asset.ref} - ${asset.name} (${asset.protection})</li>`).join("")}</ul>`);
}

function printPacket(project, type) {
  const title = type === "final" ? "Final Completion Packet" : "Pre-Install Packet";
  printHtml(`${project.id} ${title}`, `<h1>${title}</h1><h2>${projectName(project)}</h2><p><strong>Vehicle:</strong> ${project.year} ${project.make} ${project.model}</p><p><strong>Scope:</strong> ${project.wrapType}</p><p><strong>Damage records:</strong> ${(project.damageMarkers || []).length}</p><p><strong>Aftercare:</strong> Hand wash only, avoid high pressure near seams, return for edge lifting.</p>`);
}

function printHtml(title, body) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#1f2937}h1{margin-top:0}p,li{line-height:1.5}</style></head><body>${body}<script>window.print()</script></body></html>`);
  win.document.close();
}
