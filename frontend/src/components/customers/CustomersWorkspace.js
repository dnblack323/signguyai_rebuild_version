import React, { useEffect, useMemo, useState } from "react";
import { Building2, ChevronRight, ClipboardList, FileText, Globe2, MessageSquareText, Plus, Search, Tag, UserRound, X } from "lucide-react";
import { createSharedCustomer, customerDisplayName, loadSharedCustomers, updateSharedCustomer } from "./customerCore";

export function CustomersWorkspace({ onToast, onNavigate }) {
  const [customers, setCustomers] = useState([]);
  const [connection, setConnection] = useState("checking");
  const [query, setQuery] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailDraft, setDetailDraft] = useState(null);

  useEffect(() => {
    let active = true;
    loadSharedCustomers().then(({ rows, connection }) => {
      if (!active) return;
      setCustomers(rows);
      setConnection(connection);
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return customers.filter((customer) => !needle || `${customerDisplayName(customer)} ${customer.email} ${customer.phone}`.toLowerCase().includes(needle));
  }, [customers, query]);

  const createCustomer = async (draft) => {
    const created = await createSharedCustomer(draft, connection, customers);
    setCustomers((current) => [...current.filter((customer) => customer.id !== created.id), created]);
    setDraftOpen(false);
    onToast?.("Shared customer created");
  };

  const openCustomer = (customer) => {
    setSelectedCustomer(customer);
    setDetailDraft({
      ...customer,
      tagsText: (customer.tags || []).join(", "),
      brandProfile: customer.brandProfile || { colors: "", fonts: "", voice: "" },
    });
  };

  const saveCustomer = async () => {
    const payload = {
      ...detailDraft,
      tags: detailDraft.tagsText.split(",").map((tag) => tag.trim()).filter(Boolean),
    };
    delete payload.tagsText;
    const saved = await updateSharedCustomer(payload, connection, customers);
    setCustomers((current) => current.map((customer) => customer.id === saved.id ? saved : customer));
    setSelectedCustomer(saved);
    setDetailDraft({ ...saved, tagsText: (saved.tags || []).join(", "), brandProfile: saved.brandProfile || {} });
    onToast?.("Customer updated");
  };

  return (
    <div className="customers-workspace">
      <section className="customers-toolbar">
        <div>
          <h2>Shared customer records</h2>
          <p>Used by Wrap It!, orders, quotes, Sell It!, and future modules.</p>
        </div>
        <span className={`backend-status ${connection}`}><i />{connection === "connected" ? "Mongo customers" : connection === "offline" ? "Local customers" : "Checking"}</span>
        <button className="primary-button" onClick={() => setDraftOpen(true)}><Plus size={16} />New customer</button>
      </section>
      <section className="customers-search">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shared customers..." />
      </section>
      <section className="customers-grid">
        {filtered.map((customer) => (
          <article className="customer-card" key={customer.id}>
            <div className="customer-avatar"><UserRound size={20} /></div>
            <div>
              <h3>{customerDisplayName(customer)}</h3>
              <p>{customer.firstName || customer.lastName ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() : "Primary contact not set"}</p>
              <span>{customer.email || "No email"} - {customer.phone || "No phone"}</span>
            </div>
            <dl>
              <div><dt>Open work</dt><dd>{customer.openOrders || 0}</dd></div>
              <div><dt>Lifetime</dt><dd>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(customer.lifetimeValue || 0)}</dd></div>
            </dl>
            <button onClick={() => openCustomer(customer)}>Open customer<ChevronRight size={15} /></button>
          </article>
        ))}
      </section>
      {draftOpen && <CustomerDraftModal close={() => setDraftOpen(false)} create={createCustomer} />}
      {detailDraft && <CustomerDetailDrawer
        customer={detailDraft}
        setCustomer={setDetailDraft}
        close={() => { setSelectedCustomer(null); setDetailDraft(null); }}
        save={saveCustomer}
        onNavigate={onNavigate}
      />}
    </div>
  );
}

function CustomerDraftModal({ close, create }) {
  const [draft, setDraft] = useState({ businessName: "", firstName: "", lastName: "", email: "", phone: "", companyType: "", source: "manual", tags: [], notes: "", portalEnabled: false, brandProfile: { colors: "", fonts: "", voice: "" } });
  const field = (key) => (event) => setDraft({ ...draft, [key]: event.target.value });

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="customer-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><h2>New shared customer</h2><p>This record is available to Wrap Lab and core modules.</p></div><button onClick={close}>×</button></div>
        <div className="customer-form-grid">
          <label>Business / Company<input value={draft.businessName} onChange={field("businessName")} /></label>
          <label>Company Type<input value={draft.companyType} onChange={field("companyType")} /></label>
          <label>First Name<input value={draft.firstName} onChange={field("firstName")} /></label>
          <label>Last Name<input value={draft.lastName} onChange={field("lastName")} /></label>
          <label>Email<input value={draft.email} onChange={field("email")} /></label>
          <label>Phone<input value={draft.phone} onChange={field("phone")} /></label>
          <label className="span-two">Internal Notes<textarea value={draft.notes} onChange={field("notes")} /></label>
        </div>
        <div className="modal-actions"><button onClick={close}>Cancel</button><button className="primary-button" disabled={!draft.businessName && !draft.firstName && !draft.lastName} onClick={() => create(draft)}>Create customer</button></div>
      </div>
    </div>
  );
}

function CustomerDetailDrawer({ customer, setCustomer, close, save, onNavigate }) {
  const update = (key, value) => setCustomer((current) => ({ ...current, [key]: value }));
  const updateBrand = (key, value) => setCustomer((current) => ({ ...current, brandProfile: { ...(current.brandProfile || {}), [key]: value } }));
  return (
    <div className="customer-detail-backdrop" onMouseDown={close}>
      <aside className="customer-detail-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="customer-detail-header">
          <div className="customer-avatar large"><UserRound size={24} /></div>
          <div><h2>{customerDisplayName(customer)}</h2><p>{customer.email || "No email"} - {customer.phone || "No phone"}</p></div>
          <button onClick={close}><X size={18} /></button>
        </div>
        <section className="customer-detail-stats">
          <article><Building2 size={16} /><strong>{customer.companyType || "Uncategorized"}</strong><span>Company type</span></article>
          <article><ClipboardList size={16} /><strong>{customer.openOrders || 0}</strong><span>Open work</span></article>
          <article><Globe2 size={16} /><strong>{customer.portalEnabled ? "Enabled" : "Not invited"}</strong><span>Customer portal</span></article>
        </section>
        <section className="customer-detail-section">
          <h3><FileText size={16} />Profile</h3>
          <div className="customer-detail-form">
            <label>Business / Company<input value={customer.businessName || ""} onChange={(event) => update("businessName", event.target.value)} /></label>
            <label>Company Type<input value={customer.companyType || ""} onChange={(event) => update("companyType", event.target.value)} /></label>
            <label>First Name<input value={customer.firstName || ""} onChange={(event) => update("firstName", event.target.value)} /></label>
            <label>Last Name<input value={customer.lastName || ""} onChange={(event) => update("lastName", event.target.value)} /></label>
            <label>Email<input value={customer.email || ""} onChange={(event) => update("email", event.target.value)} /></label>
            <label>Phone<input value={customer.phone || ""} onChange={(event) => update("phone", event.target.value)} /></label>
          </div>
        </section>
        <section className="customer-detail-section">
          <h3><MessageSquareText size={16} />Internal notes</h3>
          <textarea value={customer.notes || ""} onChange={(event) => update("notes", event.target.value)} placeholder="Internal notes hidden from customer portal..." />
        </section>
        <section className="customer-detail-section">
          <h3><Tag size={16} />Tags and brand profile</h3>
          <input value={customer.tagsText || ""} onChange={(event) => update("tagsText", event.target.value)} placeholder="Tags, comma separated" />
          <div className="customer-detail-form">
            <label>Brand Colors<input value={customer.brandProfile?.colors || ""} onChange={(event) => updateBrand("colors", event.target.value)} /></label>
            <label>Fonts<input value={customer.brandProfile?.fonts || ""} onChange={(event) => updateBrand("fonts", event.target.value)} /></label>
            <label className="span-two">Brand Voice<input value={customer.brandProfile?.voice || ""} onChange={(event) => updateBrand("voice", event.target.value)} /></label>
          </div>
        </section>
        <section className="customer-detail-actions">
          <button onClick={() => onNavigate?.("operations", "wraps")}>Open in Wrap It!<ChevronRight size={15} /></button>
          <button onClick={() => onNavigate?.("operations", "webstores")}>Open in Sell It!<ChevronRight size={15} /></button>
          <button onClick={() => onNavigate?.("team", "notes")}>Open Notes<ChevronRight size={15} /></button>
        </section>
        <div className="customer-detail-footer"><button onClick={close}>Cancel</button><button className="primary-button" onClick={save}>Save customer</button></div>
      </aside>
    </div>
  );
}
