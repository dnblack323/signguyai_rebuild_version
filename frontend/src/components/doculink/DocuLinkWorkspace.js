import React, { useEffect, useMemo, useState } from "react";
import { Archive, Check, ChevronRight, FileText, FolderOpen, Link, LockKeyhole, Search, Upload } from "lucide-react";
import { api } from "../../lib/api";

const statuses = ["", "draft", "internal_review", "ready_to_send", "sent", "approved", "signed", "finalized", "archived", "voided"];
const sections = ["All Documents", "Files", "Templates", "Questionnaires", "Approvals", "Signed Records", "Archive"];
const entityTypes = ["customer", "order", "order_item", "quote", "invoice", "wrap_project", "webstore"];
const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || "";

export function DocuLinkWorkspace({ onToast }) {
  const [documents, setDocuments] = useState([]);
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState({ file_links: [], document_links: [] });
  const [activeSection, setActiveSection] = useState("All Documents");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ query: "", status: "", visibility: "", document_type: "", entity_type: "", entity_id: "" });
  const [draft, setDraft] = useState({ title: "", document_type: "general", visibility: "internal", source_type: "manual" });
  const [linkDraft, setLinkDraft] = useState({ entity_type: "customer", entity_id: "", relationship_type: "reference" });

  const load = () => {
    setLoading(true);
    Promise.all([
      api(`/doculink/documents${queryString({ status: filters.status, visibility: filters.visibility, document_type: filters.document_type })}`),
      api("/doculink/files"),
      api(`/doculink/links${queryString({ entity_type: filters.entity_type, entity_id: filters.entity_id })}`),
    ])
      .then(([documentRows, fileRows, linkRows]) => {
        setDocuments(documentRows);
        setFiles(fileRows);
        setLinks(linkRows);
        if (!selected && documentRows.length) setSelected(documentRows[0]);
      })
      .catch((error) => onToast?.(error.message || "Unable to load DocuLink"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const visibleDocuments = useMemo(() => {
    const needle = filters.query.toLowerCase();
    return documents.filter((document) => !needle || `${document.title} ${document.document_type} ${document.status}`.toLowerCase().includes(needle));
  }, [documents, filters.query]);

  const visibleFiles = useMemo(() => {
    const needle = filters.query.toLowerCase();
    return files.filter((file) => !needle || `${file.original_filename} ${file.mime_type}`.toLowerCase().includes(needle));
  }, [files, filters.query]);

  const createDocument = async () => {
    if (!draft.title.trim()) return onToast?.("Document title is required");
    const created = await api("/doculink/documents", { method: "POST", body: JSON.stringify(draft) });
    setDocuments((current) => [created, ...current]);
    setSelected(created);
    setDraft({ title: "", document_type: "general", visibility: "internal", source_type: "manual" });
    onToast?.("DocuLink document created");
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    if (selected?.id) form.append("document_id", selected.id);
    const uploaded = await api("/doculink/files/upload", { method: "POST", body: form });
    setFiles((current) => [uploaded, ...current]);
    onToast?.("File uploaded to DocuLink");
    event.target.value = "";
  };

  const linkSelectedDocument = async () => {
    if (!selected?.id) return onToast?.("Select a document first");
    if (!linkDraft.entity_id.trim()) return onToast?.("Linked record ID is required");
    const created = await api(`/doculink/documents/${selected.id}/links`, { method: "POST", body: JSON.stringify(linkDraft) });
    setLinks((current) => ({ ...current, document_links: [created, ...current.document_links] }));
    onToast?.("Document linked");
  };

  const markStatus = async (status) => {
    if (!selected?.id) return;
    const updated = await api(`/doculink/documents/${selected.id}`, { method: "PUT", body: JSON.stringify({ status }) });
    setSelected(updated);
    setDocuments((current) => current.map((document) => document.id === updated.id ? updated : document));
    onToast?.(`Document marked ${status}`);
  };

  return (
    <div className="doculink-workspace">
      <section className="doculink-hero">
        <div>
          <span>Documents</span>
          <h1>DocuLink</h1>
          <p>Shared document, file, template, approval, and record-linking system for the whole platform.</p>
        </div>
        <label className="primary-button"><Upload size={16} />Upload File<input type="file" hidden onChange={uploadFile} /></label>
      </section>

      <nav className="doculink-tabs">{sections.map((section) => <button key={section} className={activeSection === section ? "active" : ""} onClick={() => setActiveSection(section)}>{section}</button>)}</nav>

      <section className="doculink-filters">
        <label><Search size={16} /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search documents and files" /></label>
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>{statuses.map((status) => <option value={status} key={status}>{status || "All statuses"}</option>)}</select>
        <select value={filters.visibility} onChange={(event) => setFilters({ ...filters, visibility: event.target.value })}><option value="">All visibility</option><option value="internal">Internal</option><option value="customer_portal">Customer Portal</option><option value="secure_link">Secure Link</option></select>
        <button onClick={load}>Apply Filters</button>
      </section>

      <section className="doculink-grid">
        <div className="doculink-panel">
          <div className="doculink-panel-title"><h2>{activeSection}</h2><span>{loading ? "Loading" : `${visibleDocuments.length} docs / ${visibleFiles.length} files`}</span></div>
          {activeSection === "All Documents" && <DocumentList rows={visibleDocuments} selected={selected} onSelect={setSelected} />}
          {activeSection === "Files" && <FileList rows={visibleFiles} />}
          {["Templates", "Questionnaires", "Approvals", "Signed Records", "Archive"].includes(activeSection) && <PlaceholderSection section={activeSection} />}
        </div>

        <aside className="doculink-side">
          <div className="doculink-card">
            <h2>Create Document</h2>
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Document title" />
            <select value={draft.document_type} onChange={(event) => setDraft({ ...draft, document_type: event.target.value })}><option>general</option><option>proof</option><option>contract</option><option>packet</option><option>questionnaire</option><option>invoice</option></select>
            <select value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value })}><option value="internal">Internal</option><option value="customer_portal">Customer Portal</option><option value="secure_link">Secure Link</option></select>
            <button className="primary-button" onClick={createDocument}>Create Document</button>
          </div>

          <div className="doculink-card">
            <h2>Document Detail</h2>
            {selected ? <DocumentDetail document={selected} onStatus={markStatus} /> : <p>Select a document to see status, visibility, source, and links.</p>}
          </div>

          <div className="doculink-card">
            <h2>Link Selected Document</h2>
            <select value={linkDraft.entity_type} onChange={(event) => setLinkDraft({ ...linkDraft, entity_type: event.target.value })}>{entityTypes.map((type) => <option key={type}>{type}</option>)}</select>
            <input value={linkDraft.entity_id} onChange={(event) => setLinkDraft({ ...linkDraft, entity_id: event.target.value })} placeholder="Record ID, e.g. WRAP-123" />
            <select value={linkDraft.relationship_type} onChange={(event) => setLinkDraft({ ...linkDraft, relationship_type: event.target.value })}><option>reference</option><option>attachment</option><option>generated_for</option><option>approval_for</option><option>portal_visible_for</option><option>supporting_record</option></select>
            <button className="secondary-button" onClick={linkSelectedDocument}><Link size={15} />Link Document</button>
          </div>

          <div className="doculink-card">
            <h2>Linked Records</h2>
            {[...links.document_links, ...links.file_links].slice(0, 8).map((link) => <p key={link.id}><strong>{link.entity_type}</strong> {link.entity_id}<small>{link.relationship_type}</small></p>)}
            {!links.document_links.length && !links.file_links.length && <p>No links yet.</p>}
          </div>
        </aside>
      </section>
    </div>
  );
}

function DocumentList({ rows, selected, onSelect }) {
  if (!rows.length) return <Empty icon={FileText} title="No documents yet" text="Create or upload a document to start the DocuLink library." />;
  return <div className="doculink-list">{rows.map((document) => <button key={document.id} className={selected?.id === document.id ? "active" : ""} onClick={() => onSelect(document)}><FileText size={17} /><span><strong>{document.title}</strong><small>{document.document_type} - {document.status} - {document.visibility}</small></span><ChevronRight size={15} /></button>)}</div>;
}

function FileList({ rows }) {
  if (!rows.length) return <Empty icon={FolderOpen} title="No files uploaded" text="Uploaded binary files are stored outside MongoDB and streamed through secure endpoints." />;
  return <div className="doculink-list">{rows.map((file) => <a key={file.id} href={`${backendUrl}/api/doculink/files/${file.id}/download`}><FolderOpen size={17} /><span><strong>{file.original_filename}</strong><small>{file.mime_type} - {Math.ceil((file.size_bytes || 0) / 1024)} KB - {file.scan_status}</small></span><ChevronRight size={15} /></a>)}</div>;
}

function DocumentDetail({ document, onStatus }) {
  return <div className="doculink-detail">
    <strong>{document.title}</strong>
    <span>{document.id}</span>
    <p><LockKeyhole size={14} /> {["approved", "signed", "finalized"].includes(document.status) ? "Locked business record" : "Editable until approved/signed/finalized"}</p>
    <p>Status: <b>{document.status}</b></p>
    <p>Visibility: <b>{document.visibility}</b></p>
    <p>Source: <b>{document.source_type}</b>{document.ai_generated && <em>AI draft requires review</em>}</p>
    <div className="doculink-actions"><button onClick={() => onStatus("internal_review")}>Review</button><button onClick={() => onStatus("approved")}>Approve</button><button onClick={() => onStatus("archived")}><Archive size={14} />Archive</button></div>
  </div>;
}

function PlaceholderSection({ section }) {
  return <Empty icon={Check} title={`${section} phase placeholder`} text="The lifecycle and navigation are present now; full rendering/workflow tools come in the next DocuLink phases." />;
}

function Empty({ icon: Icon, title, text }) {
  return <div className="doculink-empty"><Icon size={28} /><h2>{title}</h2><p>{text}</p></div>;
}

function queryString(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
  const text = params.toString();
  return text ? `?${text}` : "";
}
