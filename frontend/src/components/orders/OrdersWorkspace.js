import React, { useEffect, useMemo, useState } from "react";
import { Activity, Calculator, ChevronRight, FilePlus2, FileText, FolderOpen, Link, PackagePlus, Plus, ReceiptText, Save, Search, ShoppingBag, Upload, UserRound } from "lucide-react";
import { customerDisplayName, loadSharedCustomers } from "../customers/customerCore";
import { api } from "../../lib/api";

const orderStatuses = ["", "draft", "new_intake", "awaiting_review", "awaiting_quote", "quote_sent", "awaiting_approval", "approved", "in_production", "partially_complete", "ready_for_pickup", "out_for_delivery", "completed", "on_hold", "cancelled"];
const actionableOrderStatuses = orderStatuses.filter(Boolean);
const itemStatuses = ["new", "awaiting_info", "awaiting_proof", "awaiting_approval", "approved", "queued", "in_production", "in_qc", "ready", "completed", "on_hold", "rework", "cancelled"];
const quoteStatuses = ["draft_internal", "ready_for_review", "sent", "approved", "revision_requested", "declined", "archived"];
const categories = ["banners", "rigid_signs", "cut_vinyl", "digital_print", "vehicle_wrap", "apparel", "services", "promo_misc", "custom"];
const productionDefaultCategories = new Set(["banners", "rigid_signs", "cut_vinyl", "digital_print", "vehicle_wrap", "apparel", "promo_misc", "custom"]);
const detailTabs = ["Order Items", "Production", "Financial", "Drawings", "Files", "Notes", "Activity"];

const emptyOrderDraft = { customer_id: "", customer_name: "", contact_name: "", email: "", phone: "", company_name: "", order_source: "email", order_title: "" };
const emptyItemDraft = { item_name: "", item_category: "banners", quantity: 1, unit_type: "each", production_required: true };

export function OrdersWorkspace({ onToast, onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerConnection, setCustomerConnection] = useState("checking");
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeTab, setActiveTab] = useState("Order Items");
  const [activity, setActivity] = useState([]);
  const [files, setFiles] = useState({ file_links: [], document_links: [] });
  const [quoteDrafts, setQuoteDrafts] = useState([]);
  const [invoiceDrafts, setInvoiceDrafts] = useState([]);
  const [workOrderDrafts, setWorkOrderDrafts] = useState([]);
  const [filters, setFilters] = useState({ query: "", status: "" });
  const [orderDraft, setOrderDraft] = useState(emptyOrderDraft);
  const [itemDraft, setItemDraft] = useState(emptyItemDraft);

  const loadOrders = () => api(`/orders${filters.status ? `?status=${filters.status}` : ""}`)
    .then((rows) => {
      setOrders(rows);
      if (!activeOrder && rows.length) openOrder(rows[0].id);
    })
    .catch((error) => onToast?.(error.message || "Unable to load orders"));

  const refreshOrder = async (orderId = activeOrder?.id) => {
    if (!orderId) return;
    const order = await api(`/orders/${orderId}`);
    setActiveOrder(order);
    setOrders((current) => current.map((row) => row.id === order.id ? { ...row, ...order, items: undefined } : row));
    api(`/orders/${orderId}/activity`).then(setActivity).catch(() => {});
    api(`/orders/${orderId}/quotes`).then(setQuoteDrafts).catch(() => {});
    api(`/orders/${orderId}/invoices`).then(setInvoiceDrafts).catch(() => {});
    api(`/orders/${orderId}/work-orders`).then(setWorkOrderDrafts).catch(() => {});
  };

  useEffect(() => {
    loadOrders();
    loadSharedCustomers()
      .then(({ rows, connection }) => {
        setCustomers(rows);
        setCustomerConnection(connection);
      })
      .catch(() => setCustomerConnection("offline"));
  }, []);

  const openOrder = async (orderId) => {
    const order = await api(`/orders/${orderId}`);
    setActiveOrder(order);
    setActiveTab("Order Items");
    Promise.all([api(`/orders/${orderId}/activity`), api(`/orders/${orderId}/files`), api(`/orders/${orderId}/quotes`), api(`/orders/${orderId}/invoices`), api(`/orders/${orderId}/work-orders`)])
      .then(([activityRows, fileRows, quoteRows, invoiceRows, workOrderRows]) => { setActivity(activityRows); setFiles(fileRows); setQuoteDrafts(quoteRows); setInvoiceDrafts(invoiceRows); setWorkOrderDrafts(workOrderRows); })
      .catch(() => {});
  };

  const visibleOrders = useMemo(() => {
    const needle = filters.query.toLowerCase();
    return orders.filter((order) => !needle || `${order.order_number} ${order.customer_name} ${order.order_title} ${order.status}`.toLowerCase().includes(needle));
  }, [orders, filters.query]);

  const selectCustomer = (customerId) => {
    const customer = customers.find((row) => row.id === customerId);
    if (!customer) return setOrderDraft({ ...orderDraft, customer_id: "" });
    setOrderDraft({
      ...orderDraft,
      customer_id: customer.id,
      customer_name: customerDisplayName(customer),
      company_name: customer.businessName || "",
      contact_name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
      email: customer.email || "",
      phone: customer.phone || "",
    });
  };

  const createOrder = async () => {
    if (!orderDraft.customer_name.trim()) return onToast?.("Customer name is required");
    const created = await api("/orders", { method: "POST", body: JSON.stringify(orderDraft) });
    setOrders((current) => [created, ...current]);
    setOrderDraft(emptyOrderDraft);
    await openOrder(created.id);
    onToast?.("Order created");
  };

  const createItem = async () => {
    if (!activeOrder) return onToast?.("Open an order first");
    if (!itemDraft.item_name.trim()) return onToast?.("Item name is required");
    const created = await api(`/orders/${activeOrder.id}/items`, { method: "POST", body: JSON.stringify(itemDraft) });
    setActiveOrder((current) => ({ ...current, items: [...(current.items || []), created], order_item_count: (current.order_item_count || 0) + 1 }));
    setItemDraft(emptyItemDraft);
    onToast?.("Order item created");
  };

  const saveItemSpecs = async (item, specs) => {
    await api(`/order-items/${item.id}`, { method: "PUT", body: JSON.stringify({ specs }) });
    await refreshOrder();
    onToast?.("Item specs saved");
  };

  const calculateItem = async (item, specs = item.specs || {}) => {
    const result = await api(`/order-items/${item.id}/save-pricing`, { method: "POST", body: JSON.stringify({ specs }) });
    await refreshOrder();
    onToast?.(`Price calculated: ${money(result.calculation.selling_price_minor)}`);
  };

  const updateOrderStatus = async (status) => {
    if (!activeOrder || status === activeOrder.status) return;
    await api(`/orders/${activeOrder.id}`, { method: "PUT", body: JSON.stringify({ status }) });
    await refreshOrder();
    onToast?.(`Order moved to ${label(status)}`);
  };

  const nextOrderStep = async () => {
    if (!activeOrder) return;
    const currentIndex = actionableOrderStatuses.indexOf(activeOrder.status);
    const nextStatus = actionableOrderStatuses[Math.min(currentIndex + 1, actionableOrderStatuses.length - 1)] || "new_intake";
    await updateOrderStatus(nextStatus);
  };

  const updateItemStatus = async (item, status) => {
    if (status === item.status) return;
    await api(`/order-items/${item.id}`, { method: "PUT", body: JSON.stringify({ status }) });
    await refreshOrder();
    onToast?.(`${item.item_number} moved to ${label(status)}`);
  };

  const updateItemProductionRequired = async (item, productionRequired) => {
    await api(`/order-items/${item.id}`, { method: "PUT", body: JSON.stringify({ production_required: productionRequired }) });
    await refreshOrder();
    onToast?.(`${item.item_number} ${productionRequired ? "will be included in production" : "removed from production handoff"}`);
  };

  const uploadOrderFile = async (file) => {
    if (!file || !activeOrder) return;
    const form = new FormData();
    form.append("file", file);
    form.append("entity_type", "order");
    form.append("entity_id", activeOrder.id);
    form.append("relationship_type", "order_file");
    await api("/doculink/files/upload", { method: "POST", body: form });
    setFiles(await api(`/orders/${activeOrder.id}/files`));
    onToast?.("File uploaded and linked to order");
  };

  const generateQuoteDraft = async () => {
    if (!activeOrder) return;
    try {
      const quote = await api(`/orders/${activeOrder.id}/generate-quote`, { method: "POST" });
      setQuoteDrafts(await api(`/orders/${activeOrder.id}/quotes`));
      await refreshOrder();
      onToast?.(`Quote draft ${quote.quote_number} generated`);
    } catch (error) {
      onToast?.(error.message || "Unable to generate quote draft");
    }
  };

  const saveQuoteDraft = async (quoteId, patch) => {
    if (!activeOrder) return;
    const updated = await api(`/orders/${activeOrder.id}/quotes/${quoteId}`, { method: "PUT", body: JSON.stringify(patch) });
    setQuoteDrafts((current) => current.map((quote) => quote.id === updated.id ? updated : quote));
    api(`/orders/${activeOrder.id}/activity`).then(setActivity).catch(() => {});
    onToast?.(`Quote draft ${updated.quote_number} saved`);
  };

  const generateInvoiceDraft = async () => {
    if (!activeOrder) return;
    try {
      const invoice = await api(`/orders/${activeOrder.id}/generate-invoice`, { method: "POST" });
      setInvoiceDrafts(await api(`/orders/${activeOrder.id}/invoices`));
      api(`/orders/${activeOrder.id}/activity`).then(setActivity).catch(() => {});
      onToast?.(`Invoice draft ${invoice.invoice_number} generated`);
    } catch (error) {
      onToast?.(error.message || "Unable to generate invoice draft");
    }
  };

  const generateWorkOrderDraft = async () => {
    if (!activeOrder) return;
    try {
      const workOrder = await api(`/orders/${activeOrder.id}/generate-work_order`, { method: "POST" });
      setWorkOrderDrafts(await api(`/orders/${activeOrder.id}/work-orders`));
      await refreshOrder();
      onToast?.(`Work order draft ${workOrder.work_order_number} generated`);
    } catch (error) {
      onToast?.(error.message || "Unable to generate work order draft");
    }
  };

  return (
    <div className="orders-workspace">
      <section className="orders-hero">
        <div><span>Operations</span><h1>Orders</h1><p>Order to Order Items to quotes, invoices, work orders, and production tasks.</p></div>
        <button className="primary-button" onClick={createOrder}><Plus size={16} />Create Order</button>
      </section>

      <section className="orders-create">
        <select value={orderDraft.customer_id} onChange={(event) => selectCustomer(event.target.value)}>
          <option value="">Select shared customer ({customerConnection})</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customerDisplayName(customer)} - {customer.email || "no email"}</option>)}
        </select>
        <input value={orderDraft.customer_name} onChange={(event) => setOrderDraft({ ...orderDraft, customer_name: event.target.value })} placeholder="Customer name" />
        <input value={orderDraft.order_title} onChange={(event) => setOrderDraft({ ...orderDraft, order_title: event.target.value })} placeholder="Order title" />
        <input value={orderDraft.contact_name} onChange={(event) => setOrderDraft({ ...orderDraft, contact_name: event.target.value })} placeholder="Contact" />
        <input value={orderDraft.email} onChange={(event) => setOrderDraft({ ...orderDraft, email: event.target.value })} placeholder="Email" />
        <input value={orderDraft.phone} onChange={(event) => setOrderDraft({ ...orderDraft, phone: event.target.value })} placeholder="Phone" />
        <select value={orderDraft.order_source} onChange={(event) => setOrderDraft({ ...orderDraft, order_source: event.target.value })}><option>phone</option><option>walk_in</option><option>email</option><option>website</option><option>repeat_order</option><option>sales_rep</option><option>webstore</option></select>
        <button type="button" onClick={() => onNavigate?.("operations", "customers")}><UserRound size={14} />Open Customers</button>
      </section>

      <section className="orders-layout">
        <aside className="orders-list-panel">
          <div className="orders-filters"><label><Search size={15} /><input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Search orders" /></label><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>{orderStatuses.map((status) => <option key={status} value={status}>{status || "All statuses"}</option>)}</select><button onClick={loadOrders}>Apply</button></div>
          <div className="orders-list">{visibleOrders.map((order) => <button key={order.id} className={activeOrder?.id === order.id ? "active" : ""} onClick={() => openOrder(order.id)}><ShoppingBag size={17} /><span><strong>{order.order_number}</strong><small>{order.customer_name || "No customer"} - {label(order.status)}</small></span><b>{money(order.estimated_total_minor)}</b></button>)}</div>
        </aside>

        <main className="order-detail-panel">
          {!activeOrder ? <Empty title="No order selected" text="Create or select an order to manage order items." /> : <>
            <header className="order-detail-header">
              <div><span>{label(activeOrder.status)}</span><h2>{activeOrder.order_number} {activeOrder.order_title || activeOrder.name}</h2><p>{activeOrder.customer_name} · {activeOrder.order_item_count || 0} items · {activeOrder.overall_progress || 0}% complete</p></div>
              <div className="order-status-controls"><strong>{money(activeOrder.estimated_total_minor)}</strong><select value={activeOrder.status} onChange={(event) => updateOrderStatus(event.target.value)}>{actionableOrderStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><button onClick={nextOrderStep}>Next Step</button></div>
            </header>
            <nav className="order-detail-tabs">{detailTabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>
            {activeTab === "Order Items" && <OrderItemsTab order={activeOrder} draft={itemDraft} setDraft={setItemDraft} createItem={createItem} saveItemSpecs={saveItemSpecs} calculateItem={calculateItem} updateItemStatus={updateItemStatus} updateItemProductionRequired={updateItemProductionRequired} />}
            {activeTab === "Production" && <ProductionTab workOrderDrafts={workOrderDrafts} generateWorkOrderDraft={generateWorkOrderDraft} />}
            {activeTab === "Financial" && <FinancialTab order={activeOrder} quoteDrafts={quoteDrafts} invoiceDrafts={invoiceDrafts} generateQuoteDraft={generateQuoteDraft} saveQuoteDraft={saveQuoteDraft} generateInvoiceDraft={generateInvoiceDraft} />}
            {activeTab === "Drawings" && <Placeholder icon={FileText} title="Drawings use DocuLink" text="Order drawings and markups will be linked through DocuLink file/document IDs." />}
            {activeTab === "Files" && <FilesTab order={activeOrder} files={files} uploadOrderFile={uploadOrderFile} onOpenDocuLink={() => onNavigate?.("operations", "documents")} />}
            {activeTab === "Notes" && <NotesTab order={activeOrder} />}
            {activeTab === "Activity" && <ActivityTab activity={activity} />}
          </>}
        </main>
      </section>
    </div>
  );
}

function OrderItemsTab({ order, draft, setDraft, createItem, saveItemSpecs, calculateItem, updateItemStatus, updateItemProductionRequired }) {
  const updateDraftCategory = (category) => setDraft({ ...draft, item_category: category, production_required: productionDefaultCategories.has(category) });

  return <section className="order-tab-panel">
    <div className="order-item-create"><input value={draft.item_name} onChange={(event) => setDraft({ ...draft, item_name: event.target.value })} placeholder="Item name / order item description" /><select value={draft.item_category} onChange={(event) => updateDraftCategory(event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select><input type="number" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })} /><label><input type="checkbox" checked={draft.production_required} onChange={(event) => setDraft({ ...draft, production_required: event.target.checked })} />Production</label><button onClick={createItem}><Plus size={15} />Add Item</button></div>
    <div className="order-items-grid">{(order.items || []).map((item) => <OrderItemCard key={item.id} item={item} saveItemSpecs={saveItemSpecs} calculateItem={calculateItem} updateItemStatus={updateItemStatus} updateItemProductionRequired={updateItemProductionRequired} />)}</div>
    {!order.items?.length && <Empty title="No order items yet" text="Add the first order item to start pricing and production planning." />}
  </section>;
}

function OrderItemCard({ item, saveItemSpecs, calculateItem, updateItemStatus, updateItemProductionRequired }) {
  const [expanded, setExpanded] = useState(false);
  const [schema, setSchema] = useState([]);
  const [specs, setSpecs] = useState(item.specs || {});

  useEffect(() => { setSpecs(item.specs || {}); }, [item.id, item.specs]);
  useEffect(() => {
    if (!expanded) return;
    api(`/order-items/schema/${item.item_category}`).then((row) => setSchema(row.fields || [])).catch(() => setSchema([]));
  }, [expanded, item.item_category]);

  const setSpec = (key, value, type) => setSpecs((current) => ({ ...current, [key]: type === "number" ? Number(value || 0) : type === "toggle" ? Boolean(value) : value }));

  return <article>
    <div><strong>{item.item_number}</strong><span>{item.item_category}</span></div>
    <h3>{item.item_name}</h3>
    <p>{item.description || "No item description yet."}</p>
    <dl><div><dt>Qty</dt><dd>{item.quantity}</dd></div><div><dt>Status</dt><dd>{label(item.status)}</dd></div><div><dt>Price</dt><dd>{money(item.estimated_price_minor)}</dd></div></dl>
    <div className="order-item-status-row"><span>Item Status</span><select value={item.status} onChange={(event) => updateItemStatus(item, event.target.value)}>{itemStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div>
    <label className="order-item-production-toggle"><input type="checkbox" checked={Boolean(item.production_required)} onChange={(event) => updateItemProductionRequired(item, event.target.checked)} />Production required</label>
    <div className="order-item-actions">
      <button onClick={() => setExpanded((value) => !value)}><FileText size={14} />{expanded ? "Hide Specs" : "Edit Specs"}</button>
      <button onClick={() => calculateItem(item, specs)}><Calculator size={14} />Calculate</button>
      {item.item_category === "vehicle_wrap" && <button><ChevronRight size={14} />Open Wrap Command Center</button>}
    </div>
    {expanded && <div className="order-spec-editor">
      {schema.map((field) => <label key={field.key}>
        <span>{field.label}{field.affects_price ? " *" : ""}</span>
        {field.type === "select" ? <select value={specs[field.key] ?? ""} onChange={(event) => setSpec(field.key, event.target.value, field.type)}><option value="">Select</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
          : field.type === "toggle" ? <input type="checkbox" checked={Boolean(specs[field.key])} onChange={(event) => setSpec(field.key, event.target.checked, field.type)} />
          : field.type === "textarea" ? <textarea value={specs[field.key] ?? ""} onChange={(event) => setSpec(field.key, event.target.value, field.type)} />
          : <input type={field.type === "number" ? "number" : "text"} value={specs[field.key] ?? ""} onChange={(event) => setSpec(field.key, event.target.value, field.type)} />}
      </label>)}
      <div className="order-spec-actions"><button onClick={() => saveItemSpecs(item, specs)}><Save size={14} />Save Specs</button><button onClick={() => calculateItem(item, specs)}><Calculator size={14} />Save Price</button></div>
    </div>}
  </article>;
}

function ProductionTab({ workOrderDrafts, generateWorkOrderDraft }) {
  const latest = workOrderDrafts[0];
  return <section className="order-tab-panel">
    <div className="order-quote-panel production-panel">
      <div><span>Work Order Drafts</span><h3>Snapshot order items for production</h3><p>This creates a production handoff from current Order Items. The full production board can later consume these tasks without reusing quote or invoice records.</p></div>
      <button onClick={generateWorkOrderDraft}><PackagePlus size={15} />Generate Work Order Draft</button>
    </div>
    {latest && <div className="work-order-summary"><strong>{latest.work_order_number}</strong><span>{label(latest.status)}</span><b>{latest.item_count || latest.production_items?.length || 0} production items</b></div>}
    <div className="work-order-list">
      {workOrderDrafts.map((workOrder) => <article key={workOrder.id}><div><strong>{workOrder.work_order_number}</strong><span>{label(workOrder.status)}</span></div>{(workOrder.production_items || []).map((item) => <p key={item.order_item_id}><span>{item.item_number}</span><strong>{item.item_name}</strong><small>{item.tasks?.length || 0} tasks</small></p>)}</article>)}
    </div>
    {!workOrderDrafts.length && <Empty icon={PackagePlus} title="No work order drafts yet" text="Generate a draft when the order is ready to hand off to production." />}
  </section>;
}

function FinancialTab({ order, quoteDrafts, invoiceDrafts, generateQuoteDraft, saveQuoteDraft, generateInvoiceDraft }) {
  const latest = quoteDrafts[0];
  const latestInvoice = invoiceDrafts[0];
  const [selectedId, setSelectedId] = useState("");
  const selected = quoteDrafts.find((quote) => quote.id === selectedId) || latest;

  useEffect(() => {
    if (!selectedId && latest) setSelectedId(latest.id);
  }, [latest?.id, selectedId]);

  return <section className="order-tab-panel">
    <div className="order-financial-grid">
      <article><span>Estimated Total</span><strong>{money(order.estimated_total_minor)}</strong><p>Built from order item pricing snapshots.</p></article>
      <article><span>Payment Status</span><strong>{label(order.payment_status)}</strong><p>Invoices and payments come in the billing phase.</p></article>
      <article><span>Latest Quote Draft</span><strong>{latest ? money(latest.total_minor) : "$0.00"}</strong><p>{latest ? `${latest.quote_number} - ${label(latest.status)}` : "No quote draft generated yet."}</p></article>
    </div>
    <div className="order-quote-panel">
      <div><span>Internal Quote Drafts</span><h3>Snapshot current order pricing</h3><p>This creates an internal quote draft from current Order Item prices. Customer approval, revision, signing, and sending will come with the full Quotes module.</p></div>
      <button onClick={generateQuoteDraft}><FilePlus2 size={15} />Generate Quote Draft</button>
    </div>
    <div className="order-quote-panel invoice-panel">
      <div><span>Invoice Drafts</span><h3>Create billing draft</h3><p>Uses the approved quote draft when available. Otherwise it snapshots current order item pricing for internal billing review.</p></div>
      <button onClick={generateInvoiceDraft}><ReceiptText size={15} />Generate Invoice Draft</button>
    </div>
    <div className="order-invoice-list">
      {invoiceDrafts.map((invoice) => <article key={invoice.id}><strong>{invoice.invoice_number}</strong><span>{label(invoice.status)}</span><b>{money(invoice.total_minor)}</b><small>{invoice.source === "quote_draft" ? "From quote" : "From order"}</small></article>)}
    </div>
    <div className="order-quote-list">
      {quoteDrafts.map((quote) => <article key={quote.id} className={selected?.id === quote.id ? "active" : ""} onClick={() => setSelectedId(quote.id)}><strong>{quote.quote_number}</strong><span>{label(quote.status)}</span><b>{money(quote.total_minor)}</b><small>{quote.line_items?.length || 0} line items</small></article>)}
    </div>
    {selected && <QuoteDraftEditor quote={selected} saveQuoteDraft={saveQuoteDraft} />}
  </section>;
}

function QuoteDraftEditor({ quote, saveQuoteDraft }) {
  const [draft, setDraft] = useState(quote);

  useEffect(() => { setDraft(quote); }, [quote.id]);

  const save = () => saveQuoteDraft(quote.id, {
    status: draft.status,
    title: draft.title,
    notes: draft.notes,
    internal_notes: draft.internal_notes,
    terms: draft.terms,
    discount_minor: Number(draft.discount_minor || 0),
    tax_minor: Number(draft.tax_minor || 0),
  });

  const previewTotal = Math.max(0, Number(quote.subtotal_minor || 0) - Number(draft.discount_minor || 0) + Number(draft.tax_minor || 0));

  return <div className="quote-editor">
    <div className="quote-editor-header"><div><span>Quote Draft Detail</span><h3>{quote.quote_number}</h3></div><strong>{money(previewTotal)}</strong></div>
    <div className="quote-editor-grid">
      <label><span>Status</span><select value={draft.status || "draft_internal"} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{quoteStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
      <label><span>Title</span><input value={draft.title || ""} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label><span>Discount</span><input type="number" value={draft.discount_minor || 0} onChange={(event) => setDraft({ ...draft, discount_minor: Number(event.target.value) })} /></label>
      <label><span>Tax</span><input type="number" value={draft.tax_minor || 0} onChange={(event) => setDraft({ ...draft, tax_minor: Number(event.target.value) })} /></label>
      <label className="span-two"><span>Customer Notes</span><textarea value={draft.notes || ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      <label className="span-two"><span>Terms</span><textarea value={draft.terms || ""} onChange={(event) => setDraft({ ...draft, terms: event.target.value })} /></label>
      <label className="span-two"><span>Internal Notes</span><textarea value={draft.internal_notes || ""} onChange={(event) => setDraft({ ...draft, internal_notes: event.target.value })} /></label>
    </div>
    <div className="quote-line-items">
      {(quote.line_items || []).map((item) => <p key={item.order_item_id}><span>{item.item_number}</span><strong>{item.item_name}</strong><b>{money(item.selling_price_minor)}</b></p>)}
    </div>
    <div className="quote-editor-actions"><button onClick={save}><Save size={14} />Save Quote Draft</button></div>
  </div>;
}

function FilesTab({ order, files, uploadOrderFile, onOpenDocuLink }) {
  const links = [...(files.file_links || []), ...(files.document_links || [])];
  return <section className="order-tab-panel"><div className="orders-file-callout"><Upload size={20} /><span><strong>DocuLink files for {order.order_number}</strong><small>Uploads are stored in DocuLink and linked back to this order record.</small></span><label><input type="file" onChange={(event) => uploadOrderFile(event.target.files?.[0])} />Upload File</label><button onClick={onOpenDocuLink}><FolderOpen size={14} />Open DocuLink</button></div><div className="orders-linked-list">{links.map((row) => <p key={row.id}><Link size={14} />{row.relationship_type} · {row.file_id || row.document_id}</p>)}</div>{!links.length && <Empty title="No linked files yet" text="Upload here or link files from DocuLink." />}</section>;
}

function NotesTab({ order }) {
  return <section className="order-tab-panel order-notes-grid"><article><span>Internal Notes</span><p>{order.internal_notes || "No internal notes."}</p></article><article><span>Customer Notes</span><p>{order.customer_notes || "No customer-visible notes."}</p></article><article><span>Shared Production Context</span><p>{order.shared_production_notes || "No shared production notes."}</p></article><article><span>Design / Color / Install</span><p>{[order.shared_design_notes, order.shared_color_brand_notes, order.shared_install_notes].filter(Boolean).join(" · ") || "No shared context yet."}</p></article></section>;
}

function ActivityTab({ activity }) {
  return <section className="order-tab-panel"><div className="orders-activity-list">{activity.map((event) => <p key={event.id}><Activity size={14} /><strong>{label(event.event_type)}</strong><small>{event.order_item_id || "order-level"}</small></p>)}</div>{!activity.length && <Empty title="No activity yet" text="Order events will appear here." />}</section>;
}

function Placeholder({ icon: Icon, title, text }) { return <section className="order-tab-panel"><Empty icon={Icon} title={title} text={text} /></section>; }
function Empty({ icon: Icon = ShoppingBag, title, text }) { return <div className="orders-empty"><Icon size={28} /><h2>{title}</h2><p>{text}</p></div>; }
function money(value = 0) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(value) || 0) / 100); }
function label(value = "") { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
