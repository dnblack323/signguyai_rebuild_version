export const STAGES = [
  "Intake", "Quote", "Contract", "Design", "Proof Approval", "Inspection",
  "Production", "Install", "Pickup", "Aftercare", "Complete",
];

export const DETAIL_TABS = [
  ["intake", "Intake & Vehicle"], ["measurements", "Specs & Coverage"],
  ["pricing", "Pricing & Cost"], ["design", "Design & Proofs"],
  ["inspection", "Damage Inspection"], ["production", "Production Check"],
  ["install", "Install Log"], ["files", "Photos & Files"],
  ["communication", "Communication"],
];

export const VEHICLES = [
  ["cargo-van", "Cargo Van"], ["high-roof-van", "High Roof Van"], ["passenger-van", "Passenger Van"],
  ["pickup-truck", "Pickup Truck"], ["box-truck", "Box Truck"], ["suv", "SUV"], ["sedan", "Sedan"],
  ["coupe", "Coupe"], ["trailer", "Trailer"], ["utility-trailer", "Utility Trailer"], ["bus", "Bus"], ["other", "Other"],
];

const productionTasks = [
  "Approved proof confirmed", "Print files ready", "Material pulled", "Print completed",
  "Laminated", "Outgassed (24hr)", "Trimmed", "Panels labeled", "Install tools staged",
];

const installTasks = [
  "Vehicle received", "Vehicle inspected", "Surface cleaned & prepped", "Panels staged",
  "Install started", "Post-heated (edges to 90C)", "Final inspection complete",
];

const common = {
  goals: "Create a professional vehicle graphic that remains readable at road speed.",
  wheelbase: "148 in", roofHeight: "High Roof", originalColor: "Oxford White",
  removalNotes: "None. Direct application to factory paint.", depositPercent: 50,
  manualOverride: 0, quoteStatus: "pending", contractStatus: "pending", paymentStatus: "unpaid",
  inspectionAcknowledged: false, finalSignoff: false, designColors: "#123b65, #ffffff",
  designFonts: "Montserrat Bold", designCopy: "Licensed, insured, dependable.",
  designBrief: "Strong logo hierarchy with clear service and contact information.",
  areas: [
    { name: "Hood", width: 60, height: 40, wasteFactor: 15, included: true, material: "MPI 1105 Print Vinyl", complexity: "Medium" },
    { name: "Driver Side", width: 150, height: 72, wasteFactor: 20, included: true, material: "MPI 1105 Print Vinyl", complexity: "High" },
    { name: "Passenger Side", width: 150, height: 72, wasteFactor: 20, included: true, material: "MPI 1105 Print Vinyl", complexity: "High" },
    { name: "Rear Doors", width: 70, height: 72, wasteFactor: 15, included: true, material: "MPI 1105 Print Vinyl", complexity: "Medium" },
    { name: "Roof", width: 140, height: 60, wasteFactor: 10, included: false, material: "None", complexity: "Low" },
  ],
  materials: [
    { name: "Avery MPI 1105 EZ RS", brand: "Avery", code: "MPI-1105", type: "Print Film", rollWidth: 54, sqftUsed: 420, costPerSqft: 0.82, supplier: "Fellers", status: "In Stock" },
    { name: "Avery DOL 1360Z", brand: "Avery", code: "DOL-1360Z", type: "Laminate", rollWidth: 54, sqftUsed: 420, costPerSqft: 0.54, supplier: "Fellers", status: "In Stock" },
  ],
  labor: [
    { type: "Design / Setup", estHrs: 6, actHrs: 0, rate: 75, worker: "Alex" },
    { type: "Printing & Laminating", estHrs: 5, actHrs: 0, rate: 50, worker: "Dave" },
    { type: "Removal & Surface Prep", estHrs: 4, actHrs: 0, rate: 45, worker: "Marcus" },
    { type: "Install Labor", estHrs: 18, actHrs: 0, rate: 65, worker: "Dave" },
  ],
  productionChecklist: productionTasks.map((task) => ({ task, done: false })),
  installChecklist: installTasks.map((task) => ({ task, done: false })),
  damageMarkers: [], issuesLog: [], files: [], proofs: [], chatHistory: [], productionNotes: "",
  mockupStudio: { assets: [], concepts: [], activity: [], settings: { count: 3, surprise: 25 }, direction: { style: "Clean / Corporate", notes: "" } },
};

export const SEED_PROJECTS = [
  {
    ...structuredClone(common), id: "WRAP-2026-001", customerId: "CUST-APEX", businessName: "Apex Plumbing", firstName: "John", lastName: "Miller",
    phone: "555-0144", email: "john@apexplumbing.com", year: 2023, make: "Ford", model: "Transit 250",
    trim: "Cargo Van", bodyType: "cargo-van", licensePlate: "APX-982", vin: "1FTZR2CK4PK89218",
    wrapType: "Commercial wrap", stage: "Contract", stageIndex: 2, quoteAmount: 3450, depositAmount: 0,
    balanceDue: 3450, installDate: "2026-07-10", assignedInstaller: "Dave", helper: "Marcus", bay: "Bay 3 - Truck Bay",
    mockupImage: "/wrap-lab-assets/apex-wrap-mockup.png",
    chatHistory: [{ sender: "shop", text: "Your quote is ready for review in the portal.", time: "2026-06-12 14:00" }],
  },
  {
    ...structuredClone(common), id: "WRAP-2026-002", customerId: "CUST-GREEN-ORCHARD", businessName: "Green Orchard Markets", firstName: "Sylvia", lastName: "Reed",
    phone: "555-0188", email: "sylvia@greenorchard.example", year: 2024, make: "Mercedes-Benz", model: "Sprinter 2500",
    trim: "High Roof", bodyType: "high-roof-van", licensePlate: "GRN-221", wrapType: "Full wrap", stage: "Proof Approval",
    stageIndex: 4, quoteAmount: 5240, depositAmount: 2620, balanceDue: 2620, paymentStatus: "deposit_paid",
    quoteStatus: "approved", contractStatus: "signed", installDate: "2026-07-16", assignedInstaller: "Alex",
    proofs: [{ version: "v2", date: "2026-06-20", notes: "Updated color and logo scale.", status: "Pending" }],
  },
  {
    ...structuredClone(common), id: "WRAP-2026-003", customerId: "CUST-SARAH-JENKINS", businessName: "Sarah Jenkins", firstName: "Sarah", lastName: "Jenkins",
    phone: "555-0193", email: "sarah.jenkins@example.com", year: 2023, make: "Tesla", model: "Model Y",
    trim: "Long Range", bodyType: "suv", licensePlate: "EV-404", wrapType: "Color change wrap", stage: "Production",
    stageIndex: 6, quoteAmount: 3900, depositAmount: 1950, balanceDue: 1950, paymentStatus: "deposit_paid",
    quoteStatus: "approved", contractStatus: "signed", inspectionAcknowledged: true, assignedInstaller: "Alex",
    installDate: "2026-07-02", designColors: "#2D2D2D, #000000",
    proofs: [{ version: "v1", date: "2026-06-15", notes: "Satin charcoal selection.", status: "Approved" }],
    damageMarkers: [{ id: 1, x: 49, y: 46, view: "driver", type: "Dent", severity: "Medium", notes: "Small door ding." }],
  },
];

export function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

export function projectName(project) {
  return project.businessName || `${project.firstName || ""} ${project.lastName || ""}`.trim() || "Unnamed Customer";
}
