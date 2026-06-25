import { api } from "../../lib/api";

export const SHARED_CUSTOMER_SEEDS = [
  {
    id: "CUST-APEX",
    businessName: "Apex Plumbing",
    firstName: "John",
    lastName: "Miller",
    email: "john@apexplumbing.com",
    phone: "555-0144",
    companyType: "Fleet / service",
    source: "wrap-lab",
    tags: ["wrap-customer", "commercial"],
    openOrders: 1,
    lifetimeValue: 3450,
  },
  {
    id: "CUST-GREEN-ORCHARD",
    businessName: "Green Orchard Markets",
    firstName: "Sylvia",
    lastName: "Reed",
    email: "sylvia@greenorchard.example",
    phone: "555-0188",
    companyType: "Retail",
    source: "wrap-lab",
    tags: ["wrap-customer", "fleet"],
    openOrders: 1,
    lifetimeValue: 5240,
  },
  {
    id: "CUST-SARAH-JENKINS",
    businessName: "Sarah Jenkins",
    firstName: "Sarah",
    lastName: "Jenkins",
    email: "sarah.jenkins@example.com",
    phone: "555-0193",
    companyType: "Individual",
    source: "wrap-lab",
    tags: ["wrap-customer"],
    openOrders: 1,
    lifetimeValue: 3900,
  },
];

export function customerDisplayName(customer) {
  if (!customer) return "Unlinked customer";
  return customer.businessName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Unnamed Customer";
}

export function customerFromProject(project) {
  return {
    businessName: project.businessName || "",
    firstName: project.firstName || "",
    lastName: project.lastName || "",
    email: project.email || "",
    phone: project.phone || "",
    source: "wrap-lab",
    tags: ["wrap-customer"],
    openOrders: 1,
    lifetimeValue: Number(project.quoteAmount || 0),
  };
}

export function applyCustomerToProject(project, customer) {
  if (!customer) return project;
  return {
    ...project,
    customerId: customer.id,
    businessName: customer.businessName || "",
    firstName: customer.firstName || "",
    lastName: customer.lastName || "",
    email: customer.email || "",
    phone: customer.phone || "",
  };
}

export async function loadSharedCustomers() {
  try {
    const rows = await api("/customers");
    if (rows.length) return { rows, connection: "connected" };
    const seeded = await Promise.all(SHARED_CUSTOMER_SEEDS.map((customer) => api("/customers", { method: "POST", body: JSON.stringify(customer) })));
    return { rows: seeded, connection: "connected" };
  } catch {
    const stored = localStorage.getItem("signguyai-shared-customers");
    const rows = stored ? JSON.parse(stored) : SHARED_CUSTOMER_SEEDS;
    if (!stored) localStorage.setItem("signguyai-shared-customers", JSON.stringify(rows));
    return { rows, connection: "offline" };
  }
}

export async function createSharedCustomer(draft, connection, currentCustomers = []) {
  if (connection === "connected") return api("/customers", { method: "POST", body: JSON.stringify(draft) });
  const created = { ...draft, id: draft.id || `CUST-${Date.now()}` };
  const nextCustomers = [...currentCustomers, created];
  localStorage.setItem("signguyai-shared-customers", JSON.stringify(nextCustomers));
  return created;
}
