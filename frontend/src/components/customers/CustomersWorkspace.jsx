import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus, Search, UserRound } from "lucide-react";
import { createSharedCustomer, customerDisplayName, loadSharedCustomers } from "./customerCore";

export function CustomersWorkspace({ onToast, onNavigate }) {
  const [customers, setCustomers] = useState([]);
  const [connection, setConnection] = useState("checking");
  const [query, setQuery] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);

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

  return (
    <div className="customers-workspace">
      <section className="customers-toolbar">
        <div>
          <h1>Customers</h1>
          <p>Shared customer records used by Wrap Lab, orders, quotes, webstores, and future modules.</p>
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
              <span>{customer.email || "No email"} · {customer.phone || "No phone"}</span>
            </div>
            <dl>
              <div><dt>Open work</dt><dd>{customer.openOrders || 0}</dd></div>
              <div><dt>Lifetime</dt><dd>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(customer.lifetimeValue || 0)}</dd></div>
            </dl>
            <button onClick={() => onNavigate?.("operations", "wraps")}>Open in Wrap Center<ChevronRight size={15} /></button>
          </article>
        ))}
      </section>
      {draftOpen && <CustomerDraftModal close={() => setDraftOpen(false)} create={createCustomer} />}
    </div>
  );
}

function CustomerDraftModal({ close, create }) {
  const [draft, setDraft] = useState({ businessName: "", firstName: "", lastName: "", email: "", phone: "", companyType: "", source: "manual", tags: [] });
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
        </div>
        <div className="modal-actions"><button onClick={close}>Cancel</button><button className="primary-button" disabled={!draft.businessName && !draft.firstName && !draft.lastName} onClick={() => create(draft)}>Create customer</button></div>
      </div>
    </div>
  );
}
