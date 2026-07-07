import React, { useEffect, useMemo, useState } from "react";
import { Activity, DollarSign, FolderOpen, Link, ReceiptText, Save, Search, ShoppingBag, Upload } from "lucide-react";
import { api } from "../../lib/api";

const invoiceStatuses = ["", "draft", "issued", "partially_paid", "paid", "overdue", "void", "cancelled"];
const editableInvoiceStatuses = ["draft", "issued", "void", "cancelled", "overdue"];
const paymentMethods = ["cash", "check", "card", "ach", "other"];
const detailTabs = ["Line Items", "Files", "Activity"];

export function InvoicesWorkspace({ onToast, onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState("Line Items");
  const [activity, setActivity] = useState([]);
  const [files, setFiles] = useState({ file_links: [], document_links: [] });
  const [filters, setFilters] = useState({ query: "", status: "" });
  const [payment, setPayment] = useState({ amount_minor: 0, payment_method: "cash", note: "" });

  const loadInvoices = () => api(`/invoices${filters.status ? `?status=${filters.status}` : ""}`)
    .then((rows) => {
      setInvoices(rows);
      if (!activeInvoice && rows.length) openInvoice(rows[0].id);
    })
    .catch((error) => onToast?.(error.message || "Unable to load invoices"));

  const refreshInvoice = async (invoiceId = activeInvoice?.id) => {
    if (!invoiceId) return;
    const invoice = await api(`/invoices/${invoiceId}`);
    setActiveInvoice(invoice);
    setInvoices((current) => current.map((row) => row.id === invoice.id ? invoice : row));
    api(`/invoices/${invoiceId}/activity`).then(setActivity).catch(() => {});
  };

  useEffect(() => { loadInvoices(); }, []);

  const openInvoice = async (invoiceId) => {
    const invoice = await api(`/invoices/${invoiceId}`);
    setActiveInvoice(invoice);
    setActiveTab("Line Items");
    setPayment({ amount_minor: 0, payment_method: "cash", note: "" });
    Promise.all([api(`/invoices/${invoiceId}/activity`), api(`/invoices/${invoiceId}/files`)])
      .then(([activityRows, fileRows]) => { setActivity(activityRows); setFiles(fileRows); })
      .catch(() => {});
  };

  const visibleInvoices = useMemo(() => {
    const needle = filters.query.toLowerCase();
    return invoices.filter((invoice) => !needle || `${invoice.invoice_number} ${invoice.customer_name} ${invoice.order_number} ${invoice.status}`.toLowerCase().includes(needle));
  }, [invoices, filters.query]);

  const updateStatus = async (status) => {
    if (!activeInvoice || status === activeInvoice.status) return;
    try {
      await api(`/invoices/${activeInvoice.id}`, { method: "PUT", body: JSON.stringify({ status }) });
      await refreshInvoice();
      onToast?.(`Invoice moved to ${label(status)}`);
    } catch (error) {
      onToast?.(error.message || "Unable to update invoice status");
    }
  };

  const recordPayment = async () => {
    if (!activeInvoice) return;
    if (!payment.amount_minor || payment.amount_minor <= 0) return onToast?.("Enter a payment amount greater than zero");
    try {
      await api(`/invoices/${activeInvoice.id}/record-payment`, { method: "POST", body: JSON.stringify(payment) });
      await refreshInvoice();
      setPayment({ amount_minor: 0, payment_method: "cash", note: "" });
      onToast?.("Payment recorded");
    } catch (error) {
      onToast?.(error.message || "Unable to record payment");
    }
  };

  const uploadInvoiceFile = async (file) => {
    if (!file || !activeInvoice) return;
    const form = new FormData();
    form.append("file", file);
    form.append("entity_type", "invoice");
    form.append("entity_id", activeInvoice.id);
    form.append("relationship_type", "invoice_file");
    await api("/doculink/files/upload", { method: "POST", body: form });
    setFiles(await api(`/invoices/${activeInvoice.id}/files`));
    onToast?.("File uploaded and linked to invoice");
  };

  return (
    <div className="orders-workspace" data-testid="invoices-workspace">
      <section className="orders-hero">
        <div><span>Business Management · Billing</span><h1>Invoices</h1><p>Invoices are generated from Orders. Track balances, record payments, and follow up on outstanding amounts.</p></div>
        <button className="primary-button" onClick={() => onNavigate?.("operations", "orders")} data-testid="invoices-open-orders-button"><ShoppingBag size={16} />Open Orders to Generate</button>
      </section>

      <section className="orders-layout">
        <aside className="orders-list-panel">
          <div className="orders-filters"><label><Search size={15} /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search invoices" /></label><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>{invoiceStatuses.map((status) => <option key={status} value={status}>{status || "All statuses"}</option>)}</select><button onClick={loadInvoices}>Apply</button></div>
          <div className="orders-list" data-testid="invoices-list">{visibleInvoices.map((invoice) => <button key={invoice.id} className={activeInvoice?.id === invoice.id ? "active" : ""} onClick={() => openInvoice(invoice.id)} data-testid={`invoice-list-item-${invoice.invoice_number}`}><ReceiptText size={17} /><span><strong>{invoice.invoice_number}</strong><small>{invoice.customer_name || "No customer"} - {label(invoice.status)}</small></span><b>{money(invoice.balance_due_minor)}</b></button>)}</div>
        </aside>

        <main className="order-detail-panel">
          {!activeInvoice ? <Empty icon={ReceiptText} title="No invoice selected" text="Generate an invoice from an order's Financial tab, or select one from the list." /> : <>
            <header className="order-detail-header">
              <div><span>{label(activeInvoice.status)}</span><h2>{activeInvoice.invoice_number} - {activeInvoice.order_number}</h2><p>{activeInvoice.customer_name} · Balance due {money(activeInvoice.balance_due_minor)}</p></div>
              <div className="order-status-controls">
                <strong>{money(activeInvoice.total_minor)}</strong>
                <select value={activeInvoice.status} onChange={(event) => updateStatus(event.target.value)} data-testid="invoice-status-select">{invoiceStatuses.filter(Boolean).map((status) => <option key={status} value={status} disabled={!editableInvoiceStatuses.includes(status) && status !== activeInvoice.status}>{label(status)}</option>)}</select>
                <button onClick={() => onNavigate?.("operations", "orders")}>View Order</button>
              </div>
            </header>
            <nav className="order-detail-tabs">{detailTabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>
            {activeTab === "Line Items" && <LineItemsTab invoice={activeInvoice} payment={payment} setPayment={setPayment} recordPayment={recordPayment} />}
            {activeTab === "Files" && <FilesTab invoice={activeInvoice} files={files} uploadInvoiceFile={uploadInvoiceFile} onOpenDocuLink={() => onNavigate?.("operations", "documents")} />}
            {activeTab === "Activity" && <ActivityTab activity={activity} />}
          </>}
        </main>
      </section>
    </div>
  );
}

function LineItemsTab({ invoice, payment, setPayment, recordPayment }) {
  const canPay = !["paid", "void", "cancelled"].includes(invoice.status);
  return <section className="order-tab-panel">
    <div className="order-items-grid">
      {(invoice.line_items || []).map((item) => <article key={item.order_item_id}>
        <div><strong>{item.item_number}</strong><span>Qty {item.quantity}</span></div>
        <h3>{item.description}</h3>
        <dl><div><dt>Amount</dt><dd>{money(item.amount_minor)}</dd></div></dl>
      </article>)}
    </div>
    {!invoice.line_items?.length && <Empty icon={ReceiptText} title="No line items" text="This invoice has no line items." />}

    <div className="order-financial-grid">
      <article><span>Subtotal</span><strong>{money(invoice.subtotal_minor)}</strong><p>Snapshot from order items.</p></article>
      <article><span>Total</span><strong>{money(invoice.total_minor)}</strong><p>Discount {money(invoice.discount_minor)} · Tax {money(invoice.tax_minor)}</p></article>
      <article><span>Balance Due</span><strong>{money(invoice.balance_due_minor)}</strong><p>Paid so far {money(invoice.amount_paid_minor)}</p></article>
    </div>

    {canPay && <div className="quote-editor" data-testid="invoice-record-payment-panel">
      <div className="quote-editor-header"><div><span>Record Payment</span><h3>Manual payment entry</h3></div></div>
      <div className="quote-editor-grid">
        <label><span>Amount ($)</span><input type="number" step="0.01" value={payment.amount_minor ? (payment.amount_minor / 100) : ""} onChange={(event) => setPayment({ ...payment, amount_minor: Math.round(Number(event.target.value || 0) * 100) })} data-testid="invoice-payment-amount-input" /></label>
        <label><span>Method</span><select value={payment.payment_method} onChange={(event) => setPayment({ ...payment, payment_method: event.target.value })}>{paymentMethods.map((method) => <option key={method} value={method}>{label(method)}</option>)}</select></label>
        <label className="span-two"><span>Note</span><input value={payment.note} onChange={(event) => setPayment({ ...payment, note: event.target.value })} /></label>
      </div>
      <div className="quote-editor-actions"><button onClick={recordPayment} data-testid="invoice-record-payment-button"><DollarSign size={14} />Record Payment</button></div>
    </div>}
  </section>;
}

function FilesTab({ invoice, files, uploadInvoiceFile, onOpenDocuLink }) {
  const links = [...(files.file_links || []), ...(files.document_links || [])];
  return <section className="order-tab-panel"><div className="orders-file-callout"><Upload size={20} /><span><strong>DocuLink files for {invoice.invoice_number}</strong><small>Uploads are stored in DocuLink and linked back to this invoice record.</small></span><label><input type="file" onChange={(event) => uploadInvoiceFile(event.target.files?.[0])} />Upload File</label><button onClick={onOpenDocuLink}><FolderOpen size={14} />Open DocuLink</button></div><div className="orders-linked-list">{links.map((row) => <p key={row.id}><Link size={14} />{row.relationship_type} · {row.file_id || row.document_id}</p>)}</div>{!links.length && <Empty title="No linked files yet" text="Upload here or link files from DocuLink." />}</section>;
}

function ActivityTab({ activity }) {
  return <section className="order-tab-panel"><div className="orders-activity-list">{activity.map((event) => <p key={event.id}><Activity size={14} /><strong>{label(event.event_type)}</strong></p>)}</div>{!activity.length && <Empty title="No activity yet" text="Invoice events will appear here." />}</section>;
}

function Empty({ icon: Icon = ShoppingBag, title, text }) { return <div className="orders-empty"><Icon size={28} /><h2>{title}</h2><p>{text}</p></div>; }
function money(value = 0) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(value) || 0) / 100); }
function label(value = "") { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
