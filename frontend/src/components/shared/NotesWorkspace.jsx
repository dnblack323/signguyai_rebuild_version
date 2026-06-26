import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Plus, Search, StickyNote, X } from "lucide-react";
import { api } from "../../lib/api";
import { seedNotes } from "./seedData";

const scopes = ["general", "customers", "quotes", "orders", "production", "wrap-it", "sell-it", "team", "billing"];

export function NotesWorkspace({ onToast }) {
  const [notes, setNotes] = useState(seedNotes);
  const [connection, setConnection] = useState("checking");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", scope: "general", priority: "normal", visibility: "internal", tags: "" });

  useEffect(() => {
    let current = true;
    api("/notes")
      .then((rows) => {
        if (!current) return;
        setNotes(rows.length ? rows : seedNotes);
        setConnection("connected");
      })
      .catch(() => {
        if (!current) return;
        const stored = localStorage.getItem("notes-preview-records");
        setNotes(stored ? JSON.parse(stored) : seedNotes);
        setConnection("offline");
      });
    return () => { current = false; };
  }, []);

  const persist = (next) => {
    setNotes(next);
    if (connection !== "connected") localStorage.setItem("notes-preview-records", JSON.stringify(next));
  };

  const filtered = useMemo(() => notes.filter((note) => {
    const matchesQuery = !query || `${note.title} ${note.body} ${(note.tags || []).join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const matchesScope = !scope || note.scope === scope;
    return matchesQuery && matchesScope;
  }), [notes, query, scope]);

  const createNote = async () => {
    if (!draft.title.trim()) return onToast?.("Add a note title first");
    const payload = { ...draft, tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean), created_at: new Date().toISOString() };
    try {
      const created = connection === "connected" ? await api("/notes", { method: "POST", body: JSON.stringify(payload) }) : { ...payload, id: `NOTE-${Date.now()}` };
      persist([created, ...notes]);
      setDraftOpen(false);
      setDraft({ title: "", body: "", scope: "general", priority: "normal", visibility: "internal", tags: "" });
      onToast?.("Shared note created");
    } catch {
      onToast?.("Notes API unavailable");
    }
  };

  const closeNote = async (note) => {
    const updated = { ...note, status: note.status === "closed" ? "open" : "closed" };
    persist(notes.map((row) => row.id === note.id ? updated : row));
    if (connection === "connected") {
      try { await api(`/notes/${note.id}`, { method: "PUT", body: JSON.stringify({ status: updated.status }) }); } catch { /* local state already updated */ }
    }
  };

  return (
    <div className="shared-workspace">
      <section className="shared-toolbar">
        <div><h2>Shared notes</h2><p>Internal notes, shared order context, customer notes, and module handoff notes in one system.</p></div>
        <span className={`backend-status ${connection}`}><i />{connection === "connected" ? "Mongo notes" : connection === "offline" ? "Local notes" : "Checking"}</span>
        <button className="primary-button" onClick={() => setDraftOpen(true)}><Plus size={16} />New note</button>
      </section>
      <section className="shared-context-card">
        <FileText size={20} />
        <div><strong>Shared order context pattern brought over</strong><p>Order/project title, due date, production notes, color/brand notes, install/location notes, and design notes should be stored once and inherited by order items.</p></div>
      </section>
      <section className="shared-filters">
        <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes..." /></label>
        <select value={scope} onChange={(event) => setScope(event.target.value)}><option value="">All scopes</option>{scopes.map((item) => <option key={item}>{item}</option>)}</select>
      </section>
      {draftOpen && <section className="shared-composer">
        <div><h2>New shared note</h2><button onClick={() => setDraftOpen(false)}><X size={16} /></button></div>
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Note title" />
        <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Note body" />
        <div className="shared-form-grid">
          <select value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.target.value })}>{scopes.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}><option>low</option><option>normal</option><option>high</option></select>
        </div>
        <input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="Tags, comma separated" />
        <button className="primary-button" onClick={createNote}>Create note</button>
      </section>}
      <section className="notes-grid">
        {filtered.map((note) => <article key={note.id} className={note.status === "closed" ? "closed" : ""}>
          <div><StickyNote size={17} /><span>{note.scope}</span><em>{note.priority}</em></div>
          <h2>{note.title}</h2>
          <p>{note.body}</p>
          <div className="note-tags">{(note.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div>
          <button onClick={() => closeNote(note)}><CheckCircle2 size={15} />{note.status === "closed" ? "Reopen" : "Close"}</button>
        </article>)}
      </section>
    </div>
  );
}
