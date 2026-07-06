import React, { useEffect, useMemo, useState } from "react";
import { Activity, Calculator, Check, FileText, FolderOpen, Link, Plus, Save, Search, ShoppingBag, Trash2, Upload, UserRound, X } from "lucide-react";
import { customerDisplayName, loadSharedCustomers } from "../customers/customerCore";
import { api } from "../../lib/api";

const quoteStatuses = ["", "draft", "sent", "approved", "declined", "expired", "converted", "cancelled"];
const actionableQuoteStatuses = ["draft", "sent", "expired", "cancelled"];
const approvalMethods = ["phone", "email", "text", "in_person", "other"];
const categories = ["banners", "rigid_signs", "cut_vinyl", "digital_print", "vehicle_wrap", "apparel", "services", "promo_misc", "custom"];
const detailTabs = ["Line Items", "Files", "Activity"];

const emptyQuoteDraft = { customer_id: "", customer_name: "", contact_name: "", email: "", phone: "", company_name: "", lead_source: "phone", title: "" };
const emptyItemDraft = { item_name: "", item_category: "banners", quantity: 1, unit_type: "each" };

export function QuotesWorkspace({ onToast, onNavigate }) {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerConnection, setCustomerConnection] = useState("checking");
  const [activeQuote, setActiveQuote] = useState(null);
  const [activeTab, setActiveTab] = useState("Line Items");
  const [activity, setActivity] = useState([]);
  const [files, setFiles] = useState({ file_links: [], document_links: [] });
  const [filters, setFilters] = useState({ query: "", status: "" });
  const [quoteDraft, setQuoteDraft] = useState(emptyQuoteDraft);
  const [itemDraft, setItemDraft] = useState(emptyItemDraft);
  const [approvalPanel, setApprovalPanel] = useState(false);
  const [declinePanel, setDeclinePanel] = useState(false);
  const [approval, setApproval] = useState({ approval_method: "phone", approval_note: "", approved_contact_name: "" });
  const [declineReason, setDeclineReason] = useState("");

  const loadQuotes = () => api(`/quotes${filters.status ? `?status=${filters.status}` : ""}`)
    .then((rows) => {
      setQuotes(rows);
      if (!activeQuote && rows.length) openQuote(rows[0].id);
    })
    .catch((error) => onToast?.(error.message || "Unable to load quotes"));

  const refreshQuote = async (quoteId = activeQuote?.id) => {
    if (!quoteId) return;
    const quote = await api(`/quotes/${quoteId}`);
    setActiveQuote(quote);
    setQuotes((current) => current.map((row) => row.id === quote.id ? { ...row, ...quote, line_items: undefined } : row));
    api(`/quotes/${quoteId}/activity`).then(setActivity).catch(() => {});
  };

  useEffect(() => {
    loadQuotes();
    loadSharedCustomers()
      .then(({ rows, connection }) => { setCustomers(rows); setCustomerConnection(connection); })
      .catch(() => setCustomerConnection("offline"));
  }, []);

  const openQuote = async (quoteId) => {
    const quote = await api(`/quotes/${quoteId}`);
    setActiveQuote(quote);
    setActiveTab("Line Items");
    setApprovalPanel(false);
    setDeclinePanel(false);
    Promise.all([api(`/quotes/${quoteId}/activity`), api(`/quotes/${quoteId}/files`)])
      .then(([activityRows, fileRows]) => { setActivity(activityRows); setFiles(fileRows); })
      .catch(() => {});
  };

  const visibleQuotes = useMemo(() => {
    const needle = filters.query.toLowerCase();
    return quotes.filter((quote) => !needle || `${quote.quote_number} ${quote.customer_name} ${quote.title} ${quote.status}`.toLowerCase().includes(needle));
  }, [quotes, filters.query]);

  const selectCustomer = (customerId) => {
    const customer = customers.find((row) => row.id === customerId);
    if (!customer) return setQuoteDraft({ ...quoteDraft, customer_id: "" });
    setQuoteDraft({
      ...quoteDraft,
      customer_id: customer.id,
      customer_name: customerDisplayName(customer),
      company_name: customer.businessName || "",
      contact_name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
      email: customer.email || "",
      phone: customer.phone || "",
    });
  };

  const createQuote = async () => {
    if (!quoteDraft.customer_name.trim()) return onToast?.("Customer name is required");
    const created = await api("/quotes", { method: "POST", body: JSON.stringify(quoteDraft) });
    setQuotes((current) => [created, ...current]);
    setQuoteDraft(emptyQuoteDraft);
    await openQuote(created.id);
    onToast?.(`Quote ${created.quote_number} created`);
  };

  const createItem = async () => {
    if (!activeQuote) return onToast?.("Open a quote first");
    if (!itemDraft.item_name.trim()) return onToast?.("Item name is required");
    try {
      await api(`/quotes/${activeQuote.id}/items`, { method: "POST", body: JSON.stringify(itemDraft) });
      await refreshQuote();
      setItemDraft(emptyItemDraft);
      onToast?.("Line item added");
    } catch (error) {
      onToast?.(error.message || "Unable to add line item");
    }
  };

  const deleteItem = async (itemId) => {
    try {
      await api(`/quotes/${activeQuote.id}/items/${itemId}`, { method: "DELETE" });
      await refreshQuote();
      onToast?.("Line item removed");
    } catch (error) {
      onToast?.(error.message || "Unable to remove line item");
    }
  };

  const calculateItem = async (item, specs = item.specs || {}) => {
    const result = await api(`/quotes/${activeQuote.id}/items/${item.id}/calculate-pricing`, { method: "POST", body: JSON.stringify({ specs }) });
    await refreshQuote();
    onToast?.(`Price calculated: ${money(result.calculation.selling_price_minor)}`);
  };

  const saveQuoteFields = async (patch) => {
    if (!activeQuote) return;
    try {
      await api(`/quotes/${activeQuote.id}`, { method: "PUT", body: JSON.stringify(patch) });
      await refreshQuote();
      onToast?.("Quote saved");
    } catch (error) {
      onToast?.(error.message || "Unable to save quote");
    }
  };

  const sendQuote = async () => {
    try {
      await api(`/quotes/${activeQuote.id}/send`, { method: "POST" });
      await refreshQuote();
      onToast?.(`${activeQuote.quote_number} marked as sent`);
    } catch (error) {
      onToast?.(error.message || "Unable to mark quote as sent");
    }
  };

  const approveQuote = async () => {
    try {
      await api(`/quotes/${activeQuote.id}/approve`, { method: "POST", body: JSON.stringify(approval) });
      await refreshQuote();
      setApprovalPanel(false);
      onToast?.(`${activeQuote.quote_number} approved`);
    } catch (error) {
      onToast?.(error.message || "Unable to approve quote");
    }
  };

  const declineQuote = async () => {
    try {
      await api(`/quotes/${activeQuote.id}/decline`, { method: "POST", body: JSON.stringify({ decline_reason: declineReason }) });
      await refreshQuote();
      setDeclinePanel(false);
      onToast?.(`${activeQuote.quote_number} declined`);
    } catch (error) {
      onToast?.(error.message || "Unable to decline quote");
    }
  };

  const convertToOrder = async () => {
    try {
      const result = await api(`/quotes/${activeQuote.id}/convert-to-order`, { method: "POST" });
      await refreshQuote();
      onToast?.(`Converted to order ${result.order.order_number}`);
      onNavigate?.("operations", "orders");
    } catch (error) {
      onToast?.(error.message || "Unable to convert quote to order");
    }
  };

  const uploadQuoteFile = async (file) => {
    if (!file || !activeQuote) return;
    const form = new FormData();
    form.append("file", file);
    form.append("entity_type", "quote");
    form.append("entity_id", activeQuote.id);
    form.append("relationship_type", "quote_file");
    await api("/doculink/files/upload", { method: "POST", body: form });
    setFiles(await api(`/quotes/${activeQuote.id}/files`));
    onToast?.("File uploaded and linked to quote");
  };

  return (
    <div className="orders-workspace" data-testid="quotes-workspace">
      <section className="orders-hero">
        <div><span>Operations</span><h1>Quotes</h1><p>Build a quote before an order exists. Once approved, convert it into an order with items and pricing carried over.</p></div>
        <button className="primary-button" onClick={createQuote} data-testid="create-quote-button"><Plus size={16} />Create Quote</button>
      </section>

      <section className="orders-create">
        <select value={quoteDraft.customer_id} onChange={(event) => selectCustomer(event.target.value)} data-testid="quote-customer-select">
          <option value="">Select shared customer ({customerConnection})</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customerDisplayName(customer)} - {customer.email || "no email"}</option>)}
        </select>
        <input value={quoteDraft.customer_name} onChange={(event) => setQuoteDraft({ ...quoteDraft, customer_name: event.target.value })} placeholder="Customer name" data-testid="quote-customer-name-input" />
        <input value={quoteDraft.title} onChange={(event) => setQuoteDraft({ ...quoteDraft, title: event.target.value })} placeholder="Quote title" data-testid="quote-title-input" />
        <input value={quoteDraft.contact_name} onChange={(event) => setQuoteDraft({ ...quoteDraft, contact_name: event.target.value })} placeholder="Contact" />
        <input value={quoteDraft.email} onChange={(event) => setQuoteDraft({ ...quoteDraft, email: event.target.value })} placeholder="Email" />
        <input value={quoteDraft.phone} onChange={(event) => setQuoteDraft({ ...quoteDraft, phone: event.target.value })} placeholder="Phone" />
        <select value={quoteDraft.lead_source} onChange={(event) => setQuoteDraft({ ...quoteDraft, lead_source: event.target.value })}><option>phone</option><option>walk_in</option><option>email</option><option>website</option><option>repeat_order</option><option>sales_rep</option></select>
        <button type="button" onClick={() => onNavigate?.("operations", "customers")}><UserRound size={14} />Open Customers</button>
      </section>

      <section className="orders-layout">
        <aside className="orders-list-panel">
          <div className="orders-filters"><label><Search size={15} /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search quotes" /></label><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>{quoteStatuses.map((status) => <option key={status} value={status}>{status || "All statuses"}</option>)}</select><button onClick={loadQuotes}>Apply</button></div>
          <div className="orders-list" data-testid="quotes-list">{visibleQuotes.map((quote) => <button key={quote.id} className={activeQuote?.id === quote.id ? "active" : ""} onClick={() => openQuote(quote.id)} data-testid={`quote-list-item-${quote.quote_number}`}><FileText size={17} /><span><strong>{quote.quote_number}</strong><small>{quote.customer_name || "No customer"} - {label(quote.status)}</small></span><b>{money(quote.total_minor)}</b></button>)}</div>
        </aside>

        <main className="order-detail-panel">
          {!activeQuote ? <Empty title="No quote selected" text="Create or select a quote to build line items and get customer approval." /> : <>
            <header className="order-detail-header">
              <div><span>{label(activeQuote.status)}</span><h2>{activeQuote.quote_number} {activeQuote.title}</h2><p>{activeQuote.customer_name} · {activeQuote.line_item_count || 0} line items</p></div>
              <div className="order-status-controls">
                <strong>{money(activeQuote.total_minor)}</strong>
                {["draft", "sent"].includes(activeQuote.status) && <button onClick={sendQuote} data-testid="quote-send-button">Mark Sent</button>}
                {["draft", "sent"].includes(activeQuote.status) && <button onClick={() => setApprovalPanel((value) => !value)} data-testid="quote-approve-toggle">Approve</button>}
                {["draft", "sent"].includes(activeQuote.status) && <button onClick={() => setDeclinePanel((value) => !value)} data-testid="quote-decline-toggle">Decline</button>}
                {activeQuote.status === "approved" && <button className="primary-button" onClick={convertToOrder} data-testid="quote-convert-button"><Check size={14} />Convert to Order</button>}
                {activeQuote.status === "converted" && <button onClick={() => onNavigate?.("operations", "orders")} data-testid="quote-view-order-button">View Order</button>}
              </div>
            </header>

            {approvalPanel && <ApprovalPanel approval={approval} setApproval={setApproval} onApprove={approveQuote} onCancel={() => setApprovalPanel(false)} />}
            {declinePanel && <DeclinePanel reason={declineReason} setReason={setDeclineReason} onDecline={declineQuote} onCancel={() => setDeclinePanel(false)} />}

            <nav className="order-detail-tabs">{detailTabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>
            {activeTab === "Line Items" && <LineItemsTab quote={activeQuote} draft={itemDraft} setDraft={setItemDraft} createItem={createItem} deleteItem={deleteItem} calculateItem={calculateItem} saveQuoteFields={saveQuoteFields} locked={!actionableQuoteStatuses.includes(activeQuote.status)} />}
            {activeTab === "Files" && <FilesTab quote={activeQuote} files={files} uploadQuoteFile={uploadQuoteFile} onOpenDocuLink={() => onNavigate?.("operations", "documents")} />}
            {activeTab === "Activity" && <ActivityTab activity={activity} />}
          </>}
        </main>
      </section>
    </div>
  );
}

function LineItemsTab({ quote, draft, setDraft, createItem, deleteItem, calculateItem, saveQuoteFields, locked }) {
  const [fields, setFields] = useState({ discount_minor: quote.discount_minor || 0, tax_minor: quote.tax_minor || 0, notes: quote.notes || "", terms: quote.terms || "" });

  useEffect(() => { setFields({ discount_minor: quote.discount_minor || 0, tax_minor: quote.tax_minor || 0, notes: quote.notes || "", terms: quote.terms || "" }); }, [quote.id]);

  return <section className="order-tab-panel">
    {!locked && <div className="order-item-create">
      <input value={draft.item_name} onChange={(event) => setDraft({ ...draft, item_name: event.target.value })} placeholder="Line item name" data-testid="quote-item-name-input" />
      <select value={draft.item_category} onChange={(event) => setDraft({ ...draft, item_category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select>
      <input type="number" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })} />
      <button onClick={createItem} data-testid="quote-add-item-button"><Plus size={15} />Add Line Item</button>
    </div>}
    <div className="order-items-grid">
      {(quote.line_items || []).map((item) => <article key={item.id} data-testid={`quote-line-item-${item.id}`}>
        <div><strong>{item.item_category}</strong><span>Qty {item.quantity}</span></div>
        <h3>{item.item_name}</h3>
        <p>{item.description || "No description yet."}</p>
        <dl><div><dt>Price</dt><dd>{money(item.estimated_price_minor)}</dd></div></dl>
        {!locked && <div className="order-item-actions">
          <button onClick={() => calculateItem(item)}><Calculator size={14} />Calculate</button>
          <button onClick={() => deleteItem(item.id)}><Trash2 size={14} />Remove</button>
        </div>}
      </article>)}
    </div>
    {!quote.line_items?.length && <Empty title="No line items yet" text="Add the first line item to start building this quote." />}

    <div className="order-financial-grid">
      <article><span>Subtotal</span><strong>{money(quote.subtotal_minor)}</strong><p>Sum of all line item prices.</p></article>
      <article><span>Discount</span><strong>{locked ? money(quote.discount_minor) : <input type="number" value={fields.discount_minor} onChange={(event) => setFields({ ...fields, discount_minor: Number(event.target.value) })} onBlur={() => saveQuoteFields({ discount_minor: fields.discount_minor })} />}</strong><p>Applied before tax.</p></article>
      <article><span>Tax</span><strong>{locked ? money(quote.tax_minor) : <input type="number" value={fields.tax_minor} onChange={(event) => setFields({ ...fields, tax_minor: Number(event.target.value) })} onBlur={() => saveQuoteFields({ tax_minor: fields.tax_minor })} />}</strong><p>Total: {money(quote.total_minor)}</p></article>
    </div>

    <div className="quote-editor">
      <div className="quote-editor-header"><div><span>Notes & Terms</span><h3>Customer-facing details</h3></div></div>
      <div className="quote-editor-grid">
        <label className="span-two"><span>Customer Notes</span><textarea value={fields.notes} disabled={locked} onChange={(event) => setFields({ ...fields, notes: event.target.value })} onBlur={() => saveQuoteFields({ notes: fields.notes })} /></label>
        <label className="span-two"><span>Terms</span><textarea value={fields.terms} disabled={locked} onChange={(event) => setFields({ ...fields, terms: event.target.value })} onBlur={() => saveQuoteFields({ terms: fields.terms })} /></label>
      </div>
    </div>
  </section>;
}

function ApprovalPanel({ approval, setApproval, onApprove, onCancel }) {
  return <div className="quote-editor" data-testid="quote-approval-panel">
    <div className="quote-editor-header"><div><span>Record Approval</span><h3>How did the customer approve?</h3></div><button onClick={onCancel}><X size={16} /></button></div>
    <div className="quote-editor-grid">
      <label><span>Approval Method</span><select value={approval.approval_method} onChange={(event) => setApproval({ ...approval, approval_method: event.target.value })} data-testid="approval-method-select">{approvalMethods.map((method) => <option key={method} value={method}>{label(method)}</option>)}</select></label>
      <label><span>Approved By (contact)</span><input value={approval.approved_contact_name} onChange={(event) => setApproval({ ...approval, approved_contact_name: event.target.value })} /></label>
      <label className="span-two"><span>Note</span><textarea value={approval.approval_note} onChange={(event) => setApproval({ ...approval, approval_note: event.target.value })} /></label>
    </div>
    <div className="quote-editor-actions"><button onClick={onApprove} data-testid="quote-approve-submit"><Save size={14} />Confirm Approval</button></div>
  </div>;
}

function DeclinePanel({ reason, setReason, onDecline, onCancel }) {
  return <div className="quote-editor" data-testid="quote-decline-panel">
    <div className="quote-editor-header"><div><span>Decline Quote</span><h3>Why was it declined?</h3></div><button onClick={onCancel}><X size={16} /></button></div>
    <div className="quote-editor-grid"><label className="span-two"><span>Reason</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label></div>
    <div className="quote-editor-actions"><button onClick={onDecline} data-testid="quote-decline-submit"><Save size={14} />Confirm Decline</button></div>
  </div>;
}

function FilesTab({ quote, files, uploadQuoteFile, onOpenDocuLink }) {
  const links = [...(files.file_links || []), ...(files.document_links || [])];
  return <section className="order-tab-panel"><div className="orders-file-callout"><Upload size={20} /><span><strong>DocuLink files for {quote.quote_number}</strong><small>Uploads are stored in DocuLink and linked back to this quote record.</small></span><label><input type="file" onChange={(event) => uploadQuoteFile(event.target.files?.[0])} />Upload File</label><button onClick={onOpenDocuLink}><FolderOpen size={14} />Open DocuLink</button></div><div className="orders-linked-list">{links.map((row) => <p key={row.id}><Link size={14} />{row.relationship_type} · {row.file_id || row.document_id}</p>)}</div>{!links.length && <Empty title="No linked files yet" text="Upload here or link files from DocuLink." />}</section>;
}

function ActivityTab({ activity }) {
  return <section className="order-tab-panel"><div className="orders-activity-list">{activity.map((event) => <p key={event.id}><Activity size={14} /><strong>{label(event.event_type)}</strong></p>)}</div>{!activity.length && <Empty title="No activity yet" text="Quote events will appear here." />}</section>;
}

function Empty({ icon: Icon = ShoppingBag, title, text }) { return <div className="orders-empty"><Icon size={28} /><h2>{title}</h2><p>{text}</p></div>; }
function money(value = 0) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(value) || 0) / 100); }
function label(value = "") { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
