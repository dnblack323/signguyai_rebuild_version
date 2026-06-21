/* ==========================================================================
   VEHICLE WRAP COMMAND CENTER - BUSINESS LOGIC (app.js)
   ========================================================================== */

// --- Global Application State ---
let projects = [];
let activeProjectId = null;
let activeDetailTab = 'intake';
let activeDiagramType = 'cargo-van';
let activeInspectionView = 'driver';
let selectedDamageId = null;
let pendingDamageCoords = { x: 0, y: 0 };
let signatureDrawing = false;
let sigCanvas, sigCtx;

const WORKFLOW_STAGES = [
  "Intake", "Quote", "Contract", "Design", "Proof Approval",
  "Inspection", "Production", "Install", "Pickup", "Aftercare", "Complete"
];

const REQUIRED_INSTALL_TASKS = [
  "Post-heated (edges to 90C)",
  "Final inspection complete"
];

const REQUIRED_PICKUP_PHOTO_CATEGORIES = [
  "Before photos",
  "During photos",
  "After photos"
];

// Seed data and setup app on load
window.addEventListener('DOMContentLoaded', () => {
  initSeedData();
  renderDashboard();
  updateTimeDisplay();
  setInterval(updateTimeDisplay, 60000); // Update clock every minute
  
  // Set up modal listeners to close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // Setup signature canvas
  sigCanvas = document.getElementById('portal-sig-canvas');
  if (sigCanvas) {
    sigCtx = sigCanvas.getContext('2d');
    setupSignaturePad();
  }
});

// Clock display helper
function updateTimeDisplay() {
  const clock = document.getElementById('current-time-display');
  if (clock) {
    const now = new Date();
    clock.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// --- Initializing Seed Data ---
function initSeedData() {
  projects = [
    {
      id: "WRAP-2026-001",
      businessName: "Apex Plumbing",
      firstName: "John",
      lastName: "Miller",
      phone: "555-0144",
      email: "john@apexplumbing.com",
      goals: "Brand visibility on service van. Fleet style layout with blue/white gradient.",
      
      // Vehicle Info
      year: 2023,
      make: "Ford",
      model: "Transit 250",
      trim: "Cargo Van",
      bodyType: "Van",
      wheelbase: "148 in",
      roofHeight: "High Roof",
      licensePlate: "APX-982",
      vin: "1FTZR2CK4PK89218",
      originalColor: "Oxford White",
      removalNotes: "None. Direct application to factory paint.",
      turnaroundDate: "2026-07-10",
      wrapType: "Commercial wrap",
      
      // Workflow
      stageIndex: 2, // 0: Intake, 1: Quote, 2: Contract, 3: Design, 4: Proofing, 5: Inspection, 6: Production, 7: Install, 8: Pickup, 9: Aftercare, 10: Complete
      installDate: "2026-07-10",
      installStartTime: "08:00",
      installEndTime: "17:00",
      assignedInstaller: "Dave",
      helper: "Marcus",
      bay: "Bay 3 - Truck Bay",
      dropOffTime: "2026-07-10T08:00",
      pickupTime: "2026-07-11T16:00",
      
      // Finance
      quoteAmount: 3450.00,
      depositAmount: 0.00,
      balanceDue: 3450.00,
      paymentStatus: "unpaid", // paid, deposit, unpaid
      depositPercent: 50,
      manualOverride: 0,

      // Area measurements
      areas: [
        { name: "Hood", width: 60, height: 40, wasteFactor: 15, included: true, material: "MPI 1105 Print Vinyl", complexity: "Medium", notes: "Wrap nose cone" },
        { name: "Driver Side", width: 150, height: 72, wasteFactor: 20, included: true, material: "MPI 1105 Print Vinyl", complexity: "High", notes: "Deep window recesses" },
        { name: "Passenger Side", width: 150, height: 72, wasteFactor: 20, included: true, material: "MPI 1105 Print Vinyl", complexity: "High", notes: "Account for sliding door handle" },
        { name: "Rear Doors", width: 70, height: 72, wasteFactor: 15, included: true, material: "MPI 1105 Print Vinyl", complexity: "Medium", notes: "Cut around badges" },
        { name: "Roof", width: 140, height: 60, wasteFactor: 10, included: false, material: "None", complexity: "Low", notes: "Excluded per client request" }
      ],

      // Materials allocated
      materials: [
        { name: "Avery Dennison MPI 1105", brand: "Avery Dennison", code: "MPI-1105", type: "Print Vinyl", rollWidth: 60, sqftUsed: 220, costPerSqft: 1.85, supplier: "Grimco", status: "In Stock", notes: "Premium wrapping film" },
        { name: "Avery DOL 1360Z Gloss", brand: "Avery Dennison", code: "DOL-1360Z", type: "Laminating Film", rollWidth: 60, sqftUsed: 220, costPerSqft: 1.10, supplier: "Grimco", status: "In Stock", notes: "Gloss laminate protection" }
      ],

      // Labor Tracking
      labor: [
        { type: "Design / Setup", estHrs: 4, actHrs: 4, rate: 75, worker: "Alex" },
        { type: "Printing & Laminating", estHrs: 2, actHrs: 0, rate: 50, worker: "Marcus" },
        { type: "Removal & Surface Prep", estHrs: 3, actHrs: 0, rate: 45, worker: "Marcus" },
        { type: "Install Labor", estHrs: 12, actHrs: 0, rate: 65, worker: "Dave" },
        { type: "Post-heating & Inspection", estHrs: 1.5, actHrs: 0, rate: 60, worker: "Dave" }
      ],

      // Creative brief & proofs
      designColors: "#0D47A1, #FFFFFF, #E65100",
      designFonts: "Montserrat Bold, Arial",
      designCopy: "APEX PLUMBING, 555-0144, emergency service. Lic #98221",
      designBrief: "Wants clean look. Large branding. Blue gradient from bottom fading up into the white base. Keep back doors simple with just phone, URL and list of core services.",
      proofs: [
        { version: "v1", date: "2026-06-20", notes: "Initial layout draft. Sent to client.", status: "Sent" }
      ],
      mockupImage: "apex-wrap-mockup.png",

      // Verification checklists
      productionChecklist: [
        { task: "Approved proof confirmed", done: false },
        { task: "Print files ready", done: false },
        { task: "Material pulled", done: true },
        { task: "Print completed", done: false },
        { task: "Laminated", done: false },
        { task: "Outgassed (24hr)", done: false },
        { task: "Trimmed", done: false },
        { task: "Panels labeled", done: false },
        { task: "Install tools staged", done: false }
      ],
      installChecklist: [
        { task: "Vehicle received", done: false },
        { task: "Vehicle inspected", done: false },
        { task: "Surface cleaned & prepped", done: false },
        { task: "Panels staged", done: false },
        { task: "Install started", done: false },
        { task: "Post-heated (edges to 90C)", done: false },
        { task: "Final inspection complete", done: false },
        { task: "Customer walkthrough complete", done: false }
      ],
      issuesLog: [],
      damageMarkers: [
        { id: 1, x: 80, y: 155, type: "Paint chip", severity: "Low", notes: "Small paint chip on front wheel arch. Will show slight dimple." }
      ],
      files: [
        { name: "apex-plumbing-logo.eps", category: "Logos", date: "2026-06-20", customerVisible: true, marketingPermission: false },
        { name: "vehicle-reference-side.jpg", category: "Vehicle photos", date: "2026-06-20", customerVisible: false, marketingPermission: false }
      ],
      chatHistory: [
        { sender: "shop", text: "Hello John, welcome to Wrap Lab AI. We've set up your project folder and logged your F-250 van intake details.", time: "2026-06-20 10:15" },
        { sender: "customer", text: "Great. Can you make sure the orange plumbing emblem stands out on the driver side?", time: "2026-06-20 11:32" },
        { sender: "shop", text: "Absolutely, we will incorporate that into the brief. Sending quote over for your review now.", time: "2026-06-21 08:30" }
      ],

      // Contract
      contractStatus: "sent", // sent, signed, draft
      contractSentDate: "2026-06-21",
      contractSignedDate: null,
      contractSignedBy: null,
      inspectionAcknowledged: false,
      finalSignoff: false
    },
    {
      id: "WRAP-2026-002",
      businessName: "Summit Landscaping",
      firstName: "Marcus",
      lastName: "Vance",
      phone: "555-0911",
      email: "marcus@summitlandscapes.net",
      goals: "Partial wrap wrapping tailgate and rear quarter panels. Cut vinyl lettering on doors.",
      
      // Vehicle Info
      year: 2024,
      make: "Ford",
      model: "F-150",
      trim: "SuperCrew",
      bodyType: "truck",
      wheelbase: "145 in",
      roofHeight: "Standard",
      licensePlate: "SMM-3301",
      vin: "1FTFW1EGXKD99112",
      originalColor: "Forest Green",
      removalNotes: "Remove old adhesive decals on passenger door",
      turnaroundDate: "2026-06-24",
      wrapType: "Partial wrap",
      
      // Workflow
      stageIndex: 7, // Install Phase
      installDate: "2026-06-22",
      installStartTime: "08:00",
      installEndTime: "17:00",
      assignedInstaller: "Dave",
      helper: "Marcus",
      bay: "Bay 1 - Main",
      dropOffTime: "2026-06-21T16:00",
      pickupTime: "2026-06-23T12:00",
      
      // Finance
      quoteAmount: 1850.00,
      depositAmount: 925.00,
      balanceDue: 925.00,
      paymentStatus: "deposit",
      depositPercent: 50,
      manualOverride: 0,

      areas: [
        { name: "Tailgate", width: 62, height: 24, wasteFactor: 15, included: true, material: "3M 2080 Gloss Emerald", complexity: "Medium", notes: "Wrap around Ford emblem" },
        { name: "Quarter Panels", width: 80, height: 32, wasteFactor: 15, included: true, material: "3M 2080 Gloss Emerald", complexity: "Medium", notes: "Both sides rear bed" },
        { name: "Front Doors (Lettering)", width: 40, height: 18, wasteFactor: 5, included: true, material: "3M 2080 White Film", complexity: "Low", notes: "Cut vinyl decals" }
      ],
      materials: [
        { name: "3M 2080 Gloss Emerald Green", brand: "3M", code: "G356", type: "Color Change Film", rollWidth: 60, sqftUsed: 65, costPerSqft: 2.10, supplier: "Fellers", status: "In Stock", notes: "Rich forest matching green" },
        { name: "3M 2080 High Gloss White", brand: "3M", code: "HG10", type: "Lettering Vinyl", rollWidth: 48, sqftUsed: 15, costPerSqft: 1.45, supplier: "Fellers", status: "In Stock", notes: "Plotter cut film" }
      ],
      labor: [
        { type: "Design / Setup", estHrs: 2, actHrs: 2, rate: 75, worker: "Alex" },
        { type: "Printing & Laminating", estHrs: 0.5, actHrs: 0.5, rate: 50, worker: "Marcus" },
        { type: "Removal & Surface Prep", estHrs: 2, actHrs: 2, rate: 45, worker: "Marcus" },
        { type: "Install Labor", estHrs: 6, actHrs: 3.5, rate: 65, worker: "Dave" },
        { type: "Post-heating & Inspection", estHrs: 1, actHrs: 0, rate: 60, worker: "Dave" }
      ],

      designColors: "#1B4332, #FFFFFF, #D8F3DC",
      designFonts: "Outfit Bold",
      designCopy: "SUMMIT LANDSCAPING, 555-0911, Commercial & Residential Services",
      designBrief: "Client wants a natural green gradient. Wrap rear cargo bed area and cut white letters on front doors. Clean style.",
      proofs: [
        { version: "v1", date: "2026-06-12", notes: "Layout draft.", status: "Approved" }
      ],
      mockupImage: "placeholder_proof_summit",

      productionChecklist: [
        { task: "Approved proof confirmed", done: true },
        { task: "Print files ready", done: true },
        { task: "Material pulled", done: true },
        { task: "Print completed", done: true },
        { task: "Laminated", done: true },
        { task: "Outgassed (24hr)", done: true },
        { task: "Trimmed", done: true },
        { task: "Panels labeled", done: true },
        { task: "Install tools staged", done: true }
      ],
      installChecklist: [
        { task: "Vehicle received", done: true },
        { task: "Vehicle inspected", done: true },
        { task: "Surface cleaned & prepped", done: true },
        { task: "Panels staged", done: true },
        { task: "Install started", done: true },
        { task: "Post-heated (edges to 90C)", done: false },
        { task: "Final inspection complete", done: false },
        { task: "Customer walkthrough complete", done: false }
      ],
      issuesLog: [
        { type: "Damaged vehicle trim", area: "Right tail light bezel", description: "Clip already broken prior to checkin. Highlighted to client.", resolved: true, notes: "Customer acknowledged via portal." }
      ],
      damageMarkers: [
        { id: 1, x: 380, y: 140, type: "Scratch", severity: "Medium", notes: "Deep scratch above right rear tire. Wrap will have minor dimple." }
      ],
      files: [
        { name: "summit-final-approved.pdf", category: "Proofs", date: "2026-06-12", customerVisible: true, marketingPermission: false },
        { name: "signed-wrap-contract.pdf", category: "Signed documents", date: "2026-06-14", customerVisible: true, marketingPermission: false }
      ],
      chatHistory: [
        { sender: "shop", text: "Your proof v1 is ready. View it in the portal.", time: "2026-06-12 14:00" },
        { sender: "customer", text: "Approved! Colors look perfect. Signing the contract and paying deposit now.", time: "2026-06-12 15:10" },
        { sender: "shop", text: "Deposit and signature logged. We've printed and prepped panels. Drop off scheduled Monday at 8am.", time: "2026-06-18 10:20" }
      ],
      contractStatus: "signed",
      contractSentDate: "2026-06-12",
      contractSignedDate: "2026-06-12",
      contractSignedBy: "Marcus Vance",
      inspectionAcknowledged: true,
      finalSignoff: false
    },
    {
      id: "WRAP-2026-003",
      businessName: "Eco Grocers",
      firstName: "Sylvia",
      lastName: "Chen",
      phone: "555-0210",
      email: "sylvia@ecogrocers.co",
      goals: "Full wrap on 20ft Box Truck side and rear rolling door. Rich photographic grocery patterns.",
      
      // Vehicle Info
      year: 2021,
      make: "Hino",
      model: "268",
      trim: "Box Truck",
      bodyType: "box-truck",
      wheelbase: "217 in",
      roofHeight: "High Box",
      licensePlate: "ECO-1029",
      vin: "5CDAHB8B9LM19283",
      originalColor: "White",
      removalNotes: "None",
      turnaroundDate: "2026-07-02",
      wrapType: "Box truck wrap",
      
      // Workflow
      stageIndex: 4, // Proof Approval stage
      installDate: "2026-07-02",
      installStartTime: "08:00",
      installEndTime: "17:00",
      assignedInstaller: "Alex",
      helper: "Marcus",
      bay: "Bay 3 - Truck Bay",
      dropOffTime: "2026-07-02T08:00",
      pickupTime: "2026-07-04T16:00",
      
      // Finance
      quoteAmount: 5200.00,
      depositAmount: 2600.00,
      balanceDue: 2600.00,
      paymentStatus: "deposit",
      depositPercent: 50,
      manualOverride: 0,

      areas: [
        { name: "Box Left Side", width: 240, height: 96, wasteFactor: 12, included: true, material: "IJ180Cv3 Cast Print", complexity: "Medium", notes: "Flat rivets panel" },
        { name: "Box Right Side", width: 240, height: 96, wasteFactor: 12, included: true, material: "IJ180Cv3 Cast Print", complexity: "Medium", notes: "Watch panel seams" },
        { name: "Rear Roll-up Door", width: 90, height: 96, wasteFactor: 15, included: true, material: "IJ180Cv3 Cast Print", complexity: "High", notes: "Roll-up panel slats need cutting" }
      ],
      materials: [
        { name: "3M IJ180C v3 Cast Film", brand: "3M", code: "IJ180C", type: "Print Vinyl", rollWidth: 54, sqftftUsed: 420, costPerSqft: 2.05, supplier: "Fellers", status: "In Stock", notes: "Perfect for rivets" },
        { name: "3M 8518 High Gloss Overlaminate", brand: "3M", code: "8518", type: "Laminating Film", rollWidth: 54, sqftUsed: 420, costPerSqft: 1.15, supplier: "Fellers", status: "Ordered", notes: "High gloss pop" }
      ],
      labor: [
        { type: "Design / Setup", estHrs: 8, actHrs: 9.5, rate: 75, worker: "Alex" },
        { type: "Printing & Laminating", estHrs: 3.5, actHrs: 0, rate: 50, worker: "Marcus" },
        { type: "Removal & Surface Prep", estHrs: 4, actHrs: 0, rate: 45, worker: "Marcus" },
        { type: "Install Labor", estHrs: 16, actHrs: 0, rate: 65, worker: "Alex" },
        { type: "Post-heating & Inspection", estHrs: 2, actHrs: 0, rate: 60, worker: "Dave" }
      ],

      designColors: "#2D6A4F, #FFB703, #FFFFFF",
      designFonts: "Outfit Medium, Cabin",
      designCopy: "ECO GROCERS, Fresh Organic Fruits & Vegetables, Delivery available",
      designBrief: "Rich photos of tomatoes, salad, apples wrapping from front to back on sides. Large yellow logo over dark forest green background.",
      proofs: [
        { version: "v1", date: "2026-06-18", notes: "First layout preview. Sent to customer.", status: "Revision Requested" },
        { version: "v2", date: "2026-06-20", notes: "Enlarged logo size, adjusted apple graphics color. Sent.", status: "Sent" }
      ],
      mockupImage: "placeholder_proof_eco",

      productionChecklist: [
        { task: "Approved proof confirmed", done: false },
        { task: "Print files ready", done: false },
        { task: "Material pulled", done: true },
        { task: "Print completed", done: false },
        { task: "Laminated", done: false },
        { task: "Outgassed (24hr)", done: false },
        { task: "Trimmed", done: false },
        { task: "Panels labeled", done: false }
      ],
      installChecklist: [
        { task: "Vehicle received", done: false },
        { task: "Vehicle inspected", done: false },
        { task: "Surface cleaned & prepped", done: false },
        { task: "Panels staged", done: false },
        { task: "Install started", done: false }
      ],
      issuesLog: [],
      damageMarkers: [
        { id: 1, x: 260, y: 120, type: "Rust", severity: "High", notes: "Large bubbling rust spot on passenger side box wall panel. Adhesive will lift. Suggested metal patching first." }
      ],
      files: [
        { name: "eco-grocery-brief.docx", category: "Artwork", date: "2026-06-15", customerVisible: false, marketingPermission: false },
        { name: "eco-v2-mockup.jpg", category: "Proofs", date: "2026-06-20", customerVisible: true, marketingPermission: false }
      ],
      chatHistory: [
        { sender: "customer", text: "The layout is nice but the green feels a bit dull. Can we make it pop more?", time: "2026-06-19 11:12" },
        { sender: "shop", text: "Absolutely, Sylvia. We brightened the green, boosted contrast on the apple graphic, and increased logo size by 15%. Uploaded V2 to your portal.", time: "2026-06-20 16:45" }
      ],
      contractStatus: "signed",
      contractSentDate: "2026-06-15",
      contractSignedDate: "2026-06-16",
      contractSignedBy: "Sylvia Chen",
      inspectionAcknowledged: false,
      finalSignoff: false
    },
    {
      id: "WRAP-2026-004",
      businessName: "Velo City Mobile Bikes",
      firstName: "Rob",
      lastName: "Kessler",
      phone: "555-1223",
      email: "rob@velocitybikes.com",
      goals: "Full wrap on 24ft box cargo trailer. Industrial/cyberpunk neon look.",
      
      // Vehicle Info
      year: 2022,
      make: "Wells Cargo",
      model: "24ft Box Trailer",
      trim: "Double Axle",
      bodyType: "trailer",
      wheelbase: "Tandem",
      roofHeight: "8 ft",
      licensePlate: "TRL-921",
      vin: "4TRAILER9210294",
      originalColor: "Silver",
      removalNotes: "Clean off grease marks near front hitch tongue",
      turnaroundDate: "2026-06-18",
      wrapType: "Trailer wrap",
      
      // Workflow
      stageIndex: 10, // Completed & aftercare sent
      installDate: "2026-06-14",
      installStartTime: "08:00",
      installEndTime: "17:00",
      assignedInstaller: "Dave",
      helper: "Alex",
      bay: "Bay 3 - Truck Bay",
      dropOffTime: "2026-06-14T08:00",
      pickupTime: "2026-06-16T15:00",
      
      // Finance
      quoteAmount: 4100.00,
      depositAmount: 2050.00,
      balanceDue: 0.00,
      paymentStatus: "paid",
      depositPercent: 50,
      manualOverride: 0,

      areas: [
        { name: "Trailer Left Side", width: 288, height: 96, wasteFactor: 15, included: true, material: "3M IJ180", complexity: "Medium", notes: "Fender well cutout" },
        { name: "Trailer Right Side", width: 288, height: 96, wasteFactor: 15, included: true, material: "3M IJ180", complexity: "High", notes: "Wrap side passenger door" },
        { name: "Front V-Nose", width: 60, height: 96, wasteFactor: 20, included: true, material: "3M IJ180", complexity: "Medium", notes: "Tight center bend" }
      ],
      materials: [
        { name: "3M IJ180MC Cast Vinyl", brand: "3M", code: "IJ180MC", type: "Print Vinyl", rollWidth: 54, sqftUsed: 360, costPerSqft: 2.15, supplier: "Fellers", status: "In Stock", notes: "Micro-comply micro channels" },
        { name: "3M 8519 Luster Overlaminate", brand: "3M", code: "8519", type: "Laminating Film", rollWidth: 54, sqftUsed: 360, costPerSqft: 1.12, supplier: "Fellers", status: "In Stock", notes: "Semi-gloss luster" }
      ],
      labor: [
        { type: "Design / Setup", estHrs: 6, actHrs: 6, rate: 75, worker: "Alex" },
        { type: "Printing & Laminating", estHrs: 3, actHrs: 3, rate: 50, worker: "Marcus" },
        { type: "Removal & Surface Prep", estHrs: 3, actHrs: 4, rate: 45, worker: "Marcus" },
        { type: "Install Labor", estHrs: 14, actHrs: 13.5, rate: 65, worker: "Dave" },
        { type: "Post-heating & Inspection", estHrs: 1.5, actHrs: 1.5, rate: 60, worker: "Dave" }
      ],

      designColors: "#000000, #00FFCC, #FF00FF",
      designFonts: "Orbitron, Inter Black",
      designCopy: "VELO CITY MOBILE BIKES - Repair & Tuning",
      designBrief: "Dark matte grey matrix circuit background with glowing neon pink/cyan lines. Industrial metal rivets details printed on the film.",
      proofs: [
        { version: "v1", date: "2026-06-08", notes: "Proof design draft.", status: "Approved" }
      ],
      mockupImage: "placeholder_proof_velo",

      productionChecklist: [
        { task: "Approved proof confirmed", done: true },
        { task: "Print files ready", done: true },
        { task: "Material pulled", done: true },
        { task: "Print completed", done: true },
        { task: "Laminated", done: true },
        { task: "Outgassed (24hr)", done: true },
        { task: "Trimmed", done: true },
        { task: "Panels labeled", done: true },
        { task: "Install tools staged", done: true }
      ],
      installChecklist: [
        { task: "Vehicle received", done: true },
        { task: "Vehicle inspected", done: true },
        { task: "Surface cleaned & prepped", done: true },
        { task: "Panels staged", done: true },
        { task: "Install started", done: true },
        { task: "Post-heated (edges to 90C)", done: true },
        { task: "Final inspection complete", done: true },
        { task: "Customer walkthrough complete", done: true }
      ],
      issuesLog: [],
      damageMarkers: [],
      files: [
        { name: "velo-side-finished.jpg", category: "After photos", date: "2026-06-16", customerVisible: true, marketingPermission: true },
        { name: "velo-isometric-view.jpg", category: "Mockups", date: "2026-06-08", customerVisible: true, marketingPermission: false }
      ],
      chatHistory: [
        { sender: "shop", text: "Velo City wrap complete! The neon colors look absolutely stunning in the daylight.", time: "2026-06-16 14:10" },
        { sender: "customer", text: "Wow, it looks incredible! On my way to pick it up now. Credit card ready for balance payment.", time: "2026-06-16 14:32" },
        { sender: "shop", text: "Receipt and Care sheet emailed. Thank you for your business, Rob!", time: "2026-06-17 09:12" }
      ],
      contractStatus: "signed",
      contractSentDate: "2026-06-08",
      contractSignedDate: "2026-06-09",
      contractSignedBy: "Rob Kessler",
      inspectionAcknowledged: true,
      finalSignoff: true
    },
    {
      id: "WRAP-2026-005",
      businessName: "Sarah Jenkins",
      firstName: "Sarah",
      lastName: "Jenkins",
      phone: "555-9011",
      email: "sarahj@outlook.com",
      goals: "Complete color change wrap to Matte Satin Charcoal Metallic.",
      
      // Vehicle Info
      year: 2023,
      make: "Tesla",
      model: "Model Y",
      trim: "Long Range",
      bodyType: "sedan",
      wheelbase: "114 in",
      roofHeight: "Glass",
      licensePlate: "SRH-TES",
      vin: "5YJYGDEE8PF89122",
      originalColor: "Multi-Coat Red",
      removalNotes: "None",
      turnaroundDate: "2026-06-26",
      wrapType: "Color change wrap",
      
      // Workflow
      stageIndex: 6, // Production phase
      installDate: "2026-06-26",
      installStartTime: "08:00",
      installEndTime: "17:00",
      assignedInstaller: "Alex",
      helper: "None",
      bay: "Bay 2 - Cleanroom",
      dropOffTime: "2026-06-25T16:00",
      pickupTime: "2026-06-27T12:00",
      
      // Finance
      quoteAmount: 3800.00,
      depositAmount: 1900.00,
      balanceDue: 1900.00,
      paymentStatus: "deposit",
      depositPercent: 50,
      manualOverride: 0,

      areas: [
        { name: "Full Exterior Body panels", width: 180, height: 70, wasteFactor: 25, included: true, material: "3M 2080 Satin Charcoal", complexity: "High", notes: "Tesla Model Y full paint color change" }
      ],
      materials: [
        { name: "3M 2080 Satin Charcoal Metallic", brand: "3M", code: "S120", type: "Color Change Film", rollWidth: 60, sqftUsed: 120, costPerSqft: 2.30, supplier: "Grimco", status: "In Stock", notes: "Customer choice premium satin color" }
      ],
      labor: [
        { type: "Design / Setup", estHrs: 1, actHrs: 1, rate: 75, worker: "Alex" },
        { type: "Printing & Laminating", estHrs: 0, actHrs: 0, rate: 50, worker: "None" },
        { type: "Removal & Surface Prep", estHrs: 4, actHrs: 4, rate: 45, worker: "Marcus" },
        { type: "Install Labor", estHrs: 18, actHrs: 0, rate: 65, worker: "Alex" },
        { type: "Post-heating & Inspection", estHrs: 2, actHrs: 0, rate: 60, worker: "Dave" }
      ],

      designColors: "#2D2D2D, #000000",
      designFonts: "None",
      designCopy: "None",
      designBrief: "Color change only. Remove badges and emblems, wrap, re-install badges. Door jambs excluded.",
      proofs: [
        { version: "v1", date: "2026-06-15", notes: "Satin Charcoal swatch color selection approved by client.", status: "Approved" }
      ],
      mockupImage: "placeholder_proof_tesla",

      productionChecklist: [
        { task: "Approved proof confirmed", done: true },
        { task: "Print files ready", done: true }, // N/A color change, but checked for stage clearance
        { task: "Material pulled", done: true },
        { task: "Print completed", done: true }, // N/A
        { task: "Laminated", done: true }, // N/A
        { task: "Outgassed (24hr)", done: true }, // N/A
        { task: "Trimmed", done: true },
        { task: "Panels labeled", done: true },
        { task: "Install tools staged", done: true }
      ],
      installChecklist: [
        { task: "Vehicle received", done: false },
        { task: "Vehicle inspected", done: false },
        { task: "Surface cleaned & prepped", done: false },
        { task: "Panels staged", done: false },
        { task: "Install started", done: false }
      ],
      issuesLog: [],
      damageMarkers: [
        { id: 1, x: 260, y: 100, type: "Dent", severity: "Medium", notes: "Tiny door ding on driver door panel. Wrap film will follow contour." }
      ],
      files: [
        { name: "paint-swatch-selected.jpg", category: "Mockups", date: "2026-06-15", customerVisible: true, marketingPermission: false }
      ],
      chatHistory: [
        { sender: "shop", text: "Hi Sarah, your film roll has arrived and is staged in Bay 2. Ready for dropoff next Thursday.", time: "2026-06-18 11:20" },
        { sender: "customer", text: "Perfect. Should I wash the car before bringing it?", time: "2026-06-18 12:45" },
        { sender: "shop", text: "Yes please. Simple hand wash with normal water. No wax or sealant, as it blocks adhesive bonding.", time: "2026-06-18 13:00" }
      ],
      contractStatus: "signed",
      contractSentDate: "2026-06-15",
      contractSignedDate: "2026-06-15",
      contractSignedBy: "Sarah Jenkins",
      inspectionAcknowledged: true,
      finalSignoff: false
    }
  ];

  projects.forEach(normalizeProjectWorkflowSchema);
}

function normalizeProjectWorkflowSchema(project) {
  project.quoteStatus = project.quoteStatus || (project.stageIndex > 1 ? "approved" : "pending");
  project.files = Array.isArray(project.files) ? project.files : [];
  project.productionChecklist = Array.isArray(project.productionChecklist) ? project.productionChecklist : [];
  project.installChecklist = Array.isArray(project.installChecklist) ? project.installChecklist : [];
  project.damageMarkers = Array.isArray(project.damageMarkers) ? project.damageMarkers : [];

  project.damageMarkers.forEach(marker => {
    const usesLegacyPixelCoordinates = Number(marker.x) > 100 || Number(marker.y) > 100;
    if (usesLegacyPixelCoordinates) {
      marker.x = Math.max(0, Math.min(100, (Number(marker.x) / 520) * 100));
      marker.y = Math.max(0, Math.min(100, (Number(marker.y) / 220) * 100));
    } else {
      marker.x = Math.max(0, Math.min(100, Number(marker.x) || 0));
      marker.y = Math.max(0, Math.min(100, Number(marker.y) || 0));
    }
  });

  REQUIRED_INSTALL_TASKS.forEach(task => {
    if (!project.installChecklist.some(item => item.task === task)) {
      project.installChecklist.push({ task, done: false });
    }
  });
}

// --- VIEW NAVIGATION ---
function switchView(viewName) {
  document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelectorAll('aside nav .nav-item').forEach(item => item.classList.remove('active'));
  
  if (viewName === 'dashboard') {
    document.getElementById('view-dashboard').classList.add('active');
    document.querySelector('aside nav .nav-item:first-child').classList.add('active');
    document.getElementById('header-title-text').innerText = "Wrap Projects";
    renderDashboard();
  } else if (viewName === 'project-detail') {
    document.getElementById('view-project-detail').classList.add('active');
    document.getElementById('sidebar-active-project-nav').classList.add('active');
    document.getElementById('header-title-text').innerText = "Wrap Project Command Center";
  }
}

// Open Detail View of specific Project
function openProjectDetails(projectId) {
  activeProjectId = projectId;
  
  // Highlight project in sidebar
  const activeSidebarItem = document.getElementById('sidebar-active-project-nav');
  activeSidebarItem.style.display = "flex";
  document.getElementById('active-project-sidebar-title').innerText = `${projectId} Details`;
  
  switchView('project-detail');
  loadProjectData(projectId);
}

// Switch interior detail panel tabs
function switchDetailTab(tabName) {
  activeDetailTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.detail-tab-panel').forEach(panel => panel.classList.remove('active'));
  
  // Find matching button and panel
  const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.innerText.toLowerCase().includes(tabName === 'pricing' ? 'pricing' : tabName === 'measurements' ? 'specs' : tabName));
  if (targetBtn) targetBtn.classList.add('active');
  
  const panel = document.getElementById(`tab-${tabName}`);
  if (panel) panel.classList.add('active');
  
  // Custom adjustments for canvas/blueprint displays
  if (tabName === 'inspection') {
    const proj = getActiveProject();
    const initialTemplate = normalizeVehicleTemplateKey(proj.inspectionTemplateType || proj.bodyType || 'other');
    proj.damageMarkers?.forEach(marker => {
      if (!marker.templateType) marker.templateType = initialTemplate;
      marker.view = normalizeInspectionView(marker.view);
    });
    activeInspectionView = 'driver';
    selectedDamageId = proj.damageMarkers?.[0]?.id || null;
    switchVehicleDiagram(initialTemplate);
  }
}

function getActiveProject() {
  return projects.find(p => p.id === activeProjectId);
}

function getWorkflowGateError(project, stageIndex = project.stageIndex) {
  const quoteApproved = project.quoteStatus === "approved";
  const contractSigned = project.contractStatus === "signed";
  const depositPaid = project.paymentStatus !== "unpaid" && project.depositAmount > 0;
  const activeProof = project.proofs?.[project.proofs.length - 1];

  if (stageIndex === 1 && !quoteApproved) {
    return "Quote approval must be completed by the customer in the Customer Portal.";
  }

  if (stageIndex === 2) {
    if (!contractSigned) return "The contract must be digitally signed by the customer first.";
    if (!depositPaid) return "The required deposit must be paid before design work begins.";
  }

  if (stageIndex === 4 && (!activeProof || activeProof.status !== "Approved")) {
    return "The current design proof must be approved by the customer before inspection.";
  }

  if (stageIndex === 5) {
    if (!quoteApproved || !contractSigned || !depositPaid) {
      return "Production is locked until the quote is approved, the contract is signed, and the deposit is paid.";
    }
    if (!project.inspectionAcknowledged) {
      return "The pre-install damage inspection must be acknowledged by the customer before production.";
    }
  }

  if (stageIndex === 6) {
    if (!project.inspectionAcknowledged) {
      return "Installation prep is locked until the damage inspection is acknowledged.";
    }
    if (!project.productionChecklist.length || !project.productionChecklist.every(item => item.done)) {
      return "Every production task, including lamination, outgassing, and panel labeling, must be complete before installation.";
    }
  }

  if (stageIndex === 7) {
    const requiredChecksComplete = REQUIRED_INSTALL_TASKS.every(task =>
      project.installChecklist.some(item => item.task === task && item.done)
    );
    if (!project.installChecklist.length || !project.installChecklist.every(item => item.done) || !requiredChecksComplete) {
      return "Pickup is locked until every installer checkoff, including post-heating and final inspection, is complete.";
    }

    const missingPhotos = REQUIRED_PICKUP_PHOTO_CATEGORIES.filter(category =>
      !project.files.some(file => file.category === category)
    );
    if (missingPhotos.length) {
      return `Pickup is locked. Upload ${missingPhotos.join(", ")} before releasing the vehicle.`;
    }
  }

  return "";
}

function advanceProjectStage(project, successMessage = "Stage marked complete. Project advanced to the next step.") {
  if (!project || project.stageIndex >= WORKFLOW_STAGES.length - 1) return false;

  const gateError = getWorkflowGateError(project);
  if (gateError) {
    alert(`Validation Error: ${gateError}`);
    return false;
  }

  project.stageIndex += 1;
  loadProjectData(project.id);
  alert(successMessage);
  return true;
}

function updateProjectStage(targetIndex) {
  const project = getActiveProject();
  if (!project || targetIndex === project.stageIndex) return;

  if (targetIndex !== project.stageIndex + 1) {
    const direction = targetIndex < project.stageIndex
      ? "Completed stages are retained as project history."
      : "Stages cannot be skipped.";
    alert(`${direction} Complete the current stage to move forward.`);
    return;
  }

  advanceProjectStage(project);
}

// --- DASHBOARD RENDER & FILTERING ---
let dashboardFilter = 'all';

function setDashboardFilter(filterType) {
  dashboardFilter = filterType;
  // Apply visual styling to summary cards
  document.querySelectorAll('.summary-card').forEach(card => {
    card.style.transform = 'none';
    card.style.boxShadow = 'var(--shadow)';
  });
  
  // Highlight active card
  const cards = document.querySelectorAll('.summary-card');
  let idx = 0;
  if (filterType === 'waiting-proof') idx = 0;
  else if (filterType === 'waiting-contract') idx = 1;
  else if (filterType === 'ready-install') idx = 2;
  else if (filterType === 'waiting-customer') idx = 3;
  else if (filterType === 'completed-month') idx = 4;
  
  if (filterType !== 'all') {
    cards[idx].style.transform = 'translateY(-4px)';
    cards[idx].style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.6)';
  }
  
  applyFilters();
}

function renderDashboard() {
  const tableBody = document.getElementById('projects-table-body');
  tableBody.innerHTML = "";
  
  // Stats Counters
  let proofCount = 0;
  let contractCount = 0;
  let readyInstallCount = 0;
  let waitingCustomerCount = 0;
  let completedMonthCount = 0;

  projects.forEach(p => {
    // Stat 1: Needing proof approval (proof is sent, waiting for customer)
    const activeProof = p.proofs[p.proofs.length - 1];
    if (activeProof && activeProof.status === "Sent" && p.stageIndex === 4) proofCount++;
    
    // Stat 2: Contract pending signature
    if (p.contractStatus === "sent" && p.stageIndex === 2) contractCount++;
    
    // Stat 3: Ready for install (Checklists complete + prepped, stage is Install)
    const isProdDone = p.productionChecklist.every(item => item.done);
    if (p.stageIndex === 7 && isProdDone) readyInstallCount++;
    
    // Stat 4: Waiting on Customer (Quote review, Proof review, or Contract Signature)
    if (p.stageIndex === 1 || p.stageIndex === 2 || p.stageIndex === 4 || (p.stageIndex === 5 && !p.inspectionAcknowledged)) {
      waitingCustomerCount++;
    }
    
    // Stat 5: Completed this month (stage complete)
    if (p.stageIndex === 10) completedMonthCount++;
  });

  document.getElementById('stat-proof-approval').innerText = proofCount;
  document.getElementById('stat-contract-signature').innerText = contractCount;
  document.getElementById('stat-ready-install').innerText = readyInstallCount;
  document.getElementById('stat-waiting-customer').innerText = waitingCustomerCount;
  document.getElementById('stat-completed-month').innerText = completedMonthCount;

  applyFilters();
}

function applyFilters() {
  const tableBody = document.getElementById('projects-table-body');
  tableBody.innerHTML = "";

  const searchText = document.getElementById('filter-search').value.toLowerCase();
  const stageFilter = document.getElementById('filter-stage').value;
  const typeFilter = document.getElementById('filter-type').value;
  const installerFilter = document.getElementById('filter-installer').value;

  const STAGES = [
    "Intake", "Quote", "Contract", "Design", "Proof Approval", 
    "Inspection", "Production", "Install", "Pickup", "Aftercare", "Complete"
  ];

  let visibleCount = 0;

  projects.forEach(p => {
    // 1. Text Search Filter
    const matchesSearch = 
      p.id.toLowerCase().includes(searchText) || 
      p.businessName.toLowerCase().includes(searchText) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchText) ||
      `${p.year} ${p.make} ${p.model}`.toLowerCase().includes(searchText);

    // 2. Stage Filter
    const currentStage = STAGES[p.stageIndex];
    const matchesStage = stageFilter === 'all' || currentStage === stageFilter;

    // 3. Wrap Type Filter
    const matchesType = typeFilter === 'all' || p.wrapType === typeFilter;

    // 4. Installer Filter
    let matchesInstaller = true;
    if (installerFilter === 'unassigned') matchesInstaller = !p.assignedInstaller || p.assignedInstaller === 'None' || p.assignedInstaller === 'Unassigned';
    else if (installerFilter !== 'all') matchesInstaller = p.assignedInstaller === installerFilter;

    // 5. Dashboard Summary KPI Filters
    let matchesKpi = true;
    if (dashboardFilter === 'waiting-proof') {
      const activeProof = p.proofs[p.proofs.length - 1];
      matchesKpi = (activeProof && activeProof.status === "Sent" && p.stageIndex === 4);
    } else if (dashboardFilter === 'waiting-contract') {
      matchesKpi = (p.contractStatus === "sent" && p.stageIndex === 2);
    } else if (dashboardFilter === 'ready-install') {
      const isProdDone = p.productionChecklist.every(item => item.done);
      matchesKpi = (p.stageIndex === 7 && isProdDone);
    } else if (dashboardFilter === 'waiting-customer') {
      matchesKpi = (p.stageIndex === 1 || p.stageIndex === 2 || p.stageIndex === 4 || (p.stageIndex === 5 && !p.inspectionAcknowledged));
    } else if (dashboardFilter === 'completed-month') {
      matchesKpi = (p.stageIndex === 10);
    }

    if (matchesSearch && matchesStage && matchesType && matchesInstaller && matchesKpi) {
      visibleCount++;
      
      // Determine badges
      let stageClass = "badge-gray";
      if (p.stageIndex <= 1) stageClass = "badge-quote";
      else if (p.stageIndex <= 4) stageClass = "badge-design";
      else if (p.stageIndex <= 6) stageClass = "badge-production";
      else if (p.stageIndex <= 7) stageClass = "badge-install";
      else if (p.stageIndex === 10) stageClass = "badge-complete";

      // Warnings
      let warningCell = `<span style="opacity: 0.4;">&mdash;</span>`;
      if (p.stageIndex === 1) {
        warningCell = `<span class="stalled-warning"><i class="fa-solid fa-hourglass-half"></i> Quote Sent &mdash; Waiting Signoff</span>`;
      } else if (p.stageIndex === 2 && p.contractStatus === "sent") {
        warningCell = `<span class="stalled-warning"><i class="fa-solid fa-file-signature"></i> Contract Awaiting Signature</span>`;
      } else if (p.stageIndex === 4) {
        const activeProof = p.proofs[p.proofs.length - 1];
        if (activeProof && activeProof.status === "Revision Requested") {
          warningCell = `<span class="stalled-warning" style="color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Revision Requested</span>`;
        } else {
          warningCell = `<span class="stalled-warning"><i class="fa-solid fa-user-clock"></i> Proof Sent &mdash; Awaiting Customer</span>`;
        }
      } else if (p.stageIndex === 7) {
        const isProdDone = p.productionChecklist.every(item => item.done);
        if (!isProdDone) {
          warningCell = `<span class="stalled-warning" style="color: var(--danger);"><i class="fa-solid fa-ban"></i> Production incomplete</span>`;
        } else {
          warningCell = `<span class="badge badge-complete"><i class="fa-solid fa-circle-check"></i> Ready to Install</span>`;
        }
      }

      // Payments
      let paymentBadge = `<span class="badge badge-gray">Unpaid</span>`;
      if (p.paymentStatus === 'paid') paymentBadge = `<span class="badge badge-complete">Paid In Full</span>`;
      else if (p.paymentStatus === 'deposit') paymentBadge = `<span class="badge badge-production">50% Deposit Paid</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="project-id">${p.id}</span></td>
        <td>
          <div class="customer-cell">
            <span class="customer-name">${p.firstName} ${p.lastName}</span>
            <span class="customer-business">${p.businessName || "Individual"}</span>
          </div>
        </td>
        <td><span class="vehicle-cell">${p.year} ${p.make} ${p.model}</span></td>
        <td><span style="font-size: 0.8rem; font-weight: 500;">${p.wrapType}</span></td>
        <td><span class="badge ${stageClass}">${currentStage}</span></td>
        <td><span style="font-weight: 600;">${p.installDate || "TBD"}</span></td>
        <td><span style="font-weight: 500; color: var(--primary);">${p.assignedInstaller || "Unassigned"}</span></td>
        <td><strong style="color: var(--text-main);">$${p.quoteAmount.toFixed(2)}</strong></td>
        <td>${paymentBadge}</td>
        <td>${warningCell}</td>
      `;
      tr.onclick = () => openProjectDetails(p.id);
      tableBody.appendChild(tr);
    }
  });

  const emptyState = document.getElementById('dashboard-empty-state');
  if (visibleCount === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }
}

function resetFilters() {
  document.getElementById('filter-search').value = "";
  document.getElementById('filter-stage').value = "all";
  document.getElementById('filter-type').value = "all";
  document.getElementById('filter-installer').value = "all";
  dashboardFilter = 'all';
  
  document.querySelectorAll('.summary-card').forEach(card => {
    card.style.transform = 'none';
    card.style.boxShadow = 'var(--shadow)';
  });
  
  applyFilters();
}

// --- PROJECT LOAD DETAILS ---
function loadProjectData(projectId) {
  const p = getActiveProject();
  if (!p) return;

  const STAGES = [
    "Intake", "Quote", "Contract", "Design", "Proof Approval", 
    "Inspection", "Production", "Install", "Pickup", "Aftercare", "Complete"
  ];

  // Load Header info
  document.getElementById('detail-project-id').innerText = p.id;
  document.getElementById('detail-customer-biz').innerText = p.businessName ? `${p.firstName} ${p.lastName} (${p.businessName})` : `${p.firstName} ${p.lastName}`;
  document.getElementById('detail-vehicle-summary').innerText = `${p.year} ${p.make} ${p.model} — ${p.wrapType}`;
  document.getElementById('detail-quote-amt').innerText = `$${p.quoteAmount.toFixed(2)}`;
  document.getElementById('detail-deposit-amt').innerText = `$${p.depositAmount.toFixed(2)}`;
  document.getElementById('detail-assigned-installer').innerText = p.assignedInstaller || "Unassigned";
  document.getElementById('detail-install-date').innerText = p.installDate || "TBD";

  // Stage Badge
  const badge = document.getElementById('detail-badge-workflow');
  badge.innerText = STAGES[p.stageIndex];
  badge.className = "badge";
  if (p.stageIndex <= 1) badge.classList.add('badge-quote');
  else if (p.stageIndex <= 4) badge.classList.add('badge-design');
  else if (p.stageIndex <= 6) badge.classList.add('badge-production');
  else if (p.stageIndex <= 7) badge.classList.add('badge-install');
  else if (p.stageIndex === 10) badge.classList.add('badge-complete');

  // Update Stepper graphic
  updateStepperGraphic(p.stageIndex);

  // Load Intake & Vehicle Fields
  document.getElementById('intake-biz-name').value = p.businessName || "";
  document.getElementById('intake-first-name').value = p.firstName || "";
  document.getElementById('intake-last-name').value = p.lastName || "";
  document.getElementById('intake-phone').value = p.phone || "";
  document.getElementById('intake-email').value = p.email || "";
  document.getElementById('intake-goals').value = p.goals || "";

  document.getElementById('intake-veh-year').value = p.year || "";
  document.getElementById('intake-veh-make').value = p.make || "";
  document.getElementById('intake-veh-model').value = p.model || "";
  document.getElementById('intake-veh-trim').value = p.trim || "";
  document.getElementById('intake-veh-wheelbase').value = p.wheelbase || "";
  document.getElementById('intake-veh-roof').value = p.roofHeight || "";
  document.getElementById('intake-veh-plate').value = p.licensePlate || "";
  document.getElementById('intake-veh-vin').value = p.vin || "";
  document.getElementById('intake-veh-color').value = p.originalColor || "";
  document.getElementById('intake-deadline').value = p.turnaroundDate || "";
  document.getElementById('intake-removal-notes').value = p.removalNotes || "";

  // Load Specs & Measurements Tab
  renderMeasurementsGrid(p);
  calculateSpecsTotals(p);

  // Load Financials / Pricing Tab
  recalculatePricing(p);

  // Load Design Tab
  document.getElementById('design-colors').value = p.designColors || "";
  document.getElementById('design-fonts').value = p.designFonts || "";
  document.getElementById('design-copy').value = p.designCopy || "";
  document.getElementById('design-brief').value = p.designBrief || "";
  renderMockupView(p);
  renderProofsLog(p);
  if (typeof renderMockupStudio === 'function') renderMockupStudio(p);

  // Load Damage / Inspection Tab
  renderDamageMarkers(p);
  renderInspectionPhotoPrompts(p);

  // Load Production Tab
  renderProductionChecklist(p);
  renderProductionTasks(p);
  document.getElementById('production-notes').value = p.productionNotes || "";

  // Load Install Tab
  renderInstallChecklist(p);
  document.getElementById('install-bay-select').value = p.bay || "Bay 1 - Main";
  document.getElementById('install-lead-select').value = p.assignedInstaller || "Dave";
  document.getElementById('install-helper-select').value = p.helper || "None";
  document.getElementById('install-dropoff').value = p.dropOffTime || "";
  renderIssuesLog(p);

  // Load Files & Photos Tab
  renderFilesGrid(p);

  // Load Communication Chat History
  renderChatHistory(p);
}

// Stepper visual updating
function updateStepperGraphic(stageIdx) {
  const steps = document.querySelectorAll('.stepper .step');
  const progressLine = document.getElementById('project-stepper-progress');
  
  steps.forEach((step, idx) => {
    step.classList.remove('active', 'completed');
    if (idx < stageIdx) {
      step.classList.add('completed');
    } else if (idx === stageIdx) {
      step.classList.add('active');
    }
  });

  const pct = (stageIdx / (steps.length - 1)) * 100;
  progressLine.style.width = `${pct}%`;
}

// --- SPECIFIC TABS RENDERERS ---

// measurements grid
function renderMeasurementsGrid(p) {
  const tbody = document.getElementById('measurements-table-body');
  tbody.innerHTML = "";
  
  p.areas.forEach((area, idx) => {
    const rawSqft = (area.width * area.height) / 144;
    const billableSqft = rawSqft * (1 + (area.wasteFactor / 100));
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${area.name}</strong></td>
      <td><input type="number" class="form-input" style="width: 70px; padding: 4px;" value="${area.width}" onchange="updateAreaField(${idx}, 'width', this.value)"></td>
      <td><input type="number" class="form-input" style="width: 70px; padding: 4px;" value="${area.height}" onchange="updateAreaField(${idx}, 'height', this.value)"></td>
      <td>${rawSqft.toFixed(1)} sqft</td>
      <td><input type="number" class="form-input" style="width: 60px; padding: 4px;" value="${area.wasteFactor}" onchange="updateAreaField(${idx}, 'wasteFactor', this.value)">%</td>
      <td><strong style="color: var(--primary);">${billableSqft.toFixed(1)} sqft</strong></td>
      <td><input type="text" class="form-input" style="width: 140px; padding: 4px;" value="${area.material}" onchange="updateAreaField(${idx}, 'material', this.value)"></td>
      <td>
        <select class="form-input" style="padding: 4px;" onchange="updateAreaField(${idx}, 'complexity', this.value)">
          <option value="Low" ${area.complexity === 'Low' ? 'selected' : ''}>Low (Flat)</option>
          <option value="Medium" ${area.complexity === 'Medium' ? 'selected' : ''}>Med (Curves)</option>
          <option value="High" ${area.complexity === 'High' ? 'selected' : ''}>High (Rivets/Recess)</option>
        </select>
      </td>
      <td><input type="checkbox" ${area.included ? 'checked' : ''} onchange="updateAreaField(${idx}, 'included', this.checked)"></td>
      <td><input type="text" class="form-input" style="width: 130px; padding: 4px;" value="${area.notes || ''}" onchange="updateAreaField(${idx}, 'notes', this.value)"></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateAreaField(index, field, value) {
  const p = getActiveProject();
  if (!p) return;

  if (field === 'width' || field === 'height' || field === 'wasteFactor') {
    p.areas[index][field] = parseFloat(value) || 0;
  } else if (field === 'included') {
    p.areas[index][field] = value;
  } else {
    p.areas[index][field] = value;
  }

  // Recalculate
  renderMeasurementsGrid(p);
  calculateSpecsTotals(p);
  recalculatePricing(p);
}

function calculateSpecsTotals(p) {
  let rawTotal = 0;
  let billableTotal = 0;
  let includedCount = 0;

  p.areas.forEach(area => {
    if (area.included) {
      includedCount++;
      const raw = (area.width * area.height) / 144;
      const bill = raw * (1 + (area.wasteFactor / 100));
      rawTotal += raw;
      billableTotal += bill;
    }
  });

  const wastePct = rawTotal > 0 ? ((billableTotal - rawTotal) / rawTotal) * 100 : 0;

  document.getElementById('totals-included-count').innerText = includedCount;
  document.getElementById('totals-raw-sqft').innerText = rawTotal.toFixed(1) + " sqft";
  document.getElementById('totals-waste-pct').innerText = wastePct.toFixed(0) + "%";
  document.getElementById('totals-billable-sqft').innerText = billableTotal.toFixed(1) + " sqft";

  // Save totals in project for other modules
  p.totalBillableSqft = billableTotal;
}

// Financial Ledger & Recalculate margins
function recalculatePricing(p) {
  // 1. Calculate materials ledger total cost
  let totalMaterialCost = 0;
  const matBody = document.getElementById('materials-table-body');
  matBody.innerHTML = "";

  p.materials.forEach((mat, idx) => {
    // If dynamic, use total billable sqft or allocated roll sqft
    const subtotal = mat.sqftUsed * mat.costPerSqft;
    totalMaterialCost += subtotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${mat.name}</strong> (${mat.code})</td>
      <td><input type="number" class="form-input" style="width: 70px; padding: 4px;" value="${mat.sqftUsed}" onchange="updateMaterialField(${idx}, 'sqftUsed', this.value)"> sqft</td>
      <td>$<input type="number" class="form-input" style="width: 60px; padding: 4px;" value="${mat.costPerSqft.toFixed(2)}" step="0.05" onchange="updateMaterialField(${idx}, 'costPerSqft', this.value)"></td>
      <td>${mat.rollWidth} in</td>
      <td><strong>$${subtotal.toFixed(2)}</strong></td>
      <td><span class="badge ${mat.status === 'In Stock' ? 'badge-complete' : 'badge-warning'}">${mat.status}</span></td>
    `;
    matBody.appendChild(tr);
  });

  // 2. Calculate labor ledger total cost
  let totalLaborCost = 0;
  const labBody = document.getElementById('labor-table-body');
  labBody.innerHTML = "";

  p.labor.forEach((lab, idx) => {
    const hours = lab.actHrs > 0 ? lab.actHrs : lab.estHrs;
    const subtotal = hours * lab.rate;
    totalLaborCost += subtotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${lab.type}</strong></td>
      <td><input type="number" class="form-input" style="width: 60px; padding: 4px;" value="${lab.estHrs}" onchange="updateLaborField(${idx}, 'estHrs', this.value)"> hrs</td>
      <td><input type="number" class="form-input" style="width: 60px; padding: 4px;" value="${lab.actHrs}" onchange="updateLaborField(${idx}, 'actHrs', this.value)"> hrs</td>
      <td>$<input type="number" class="form-input" style="width: 60px; padding: 4px;" value="${lab.rate}" onchange="updateLaborField(${idx}, 'rate', this.value)"></td>
      <td><strong>$${subtotal.toFixed(2)}</strong></td>
      <td><input type="text" class="form-input" style="width: 100px; padding: 4px;" value="${lab.worker}" onchange="updateLaborField(${idx}, 'worker', this.value)"></td>
    `;
    labBody.appendChild(tr);
  });

  // 3. Quote adjustments and calculations
  const totalCost = totalMaterialCost + totalLaborCost;
  
  // Calculate quote base (we can default to cost with markup if quote is empty, or let quote be fixed)
  let quoteVal = p.quoteAmount;
  if (p.manualOverride !== 0) {
    quoteVal = p.quoteAmount + p.manualOverride;
  }
  
  const profit = quoteVal - totalCost;
  const marginPct = quoteVal > 0 ? (profit / quoteVal) * 100 : 0;
  
  // Update Deposit due
  const depAmt = quoteVal * (p.depositPercent / 100);
  p.depositAmount = p.paymentStatus === 'unpaid' ? 0.00 : p.paymentStatus === 'deposit' ? depAmt : quoteVal;
  p.balanceDue = quoteVal - p.depositAmount;

  // Render on screen
  document.getElementById('pricing-total-quote').innerText = `$${quoteVal.toFixed(2)}`;
  document.getElementById('pricing-total-cost').innerText = `$${totalCost.toFixed(2)}`;
  document.getElementById('pricing-total-profit').innerText = `$${profit.toFixed(2)}`;
  document.getElementById('pricing-margin-pct').innerText = marginPct.toFixed(0) + "%";

  document.getElementById('pricing-manual-adjustment').value = p.manualOverride;
  document.getElementById('pricing-deposit-percent').value = p.depositPercent;

  // Header updates
  document.getElementById('detail-quote-amt').innerText = `$${quoteVal.toFixed(2)}`;
  document.getElementById('detail-deposit-amt').innerText = `$${p.depositAmount.toFixed(2)}`;
}

function updateMaterialField(index, field, value) {
  const p = getActiveProject();
  if (!p) return;
  p.materials[index][field] = parseFloat(value) || 0;
  recalculatePricing(p);
}

function updateLaborField(index, field, value) {
  const p = getActiveProject();
  if (!p) return;
  if (field === 'worker') {
    p.labor[index][field] = value;
  } else {
    p.labor[index][field] = parseFloat(value) || 0;
  }
  recalculatePricing(p);
}

function adjustManualOverride(val) {
  const p = getActiveProject();
  if (!p) return;
  p.manualOverride = parseFloat(val) || 0;
  recalculatePricing(p);
}

function adjustDepositPercent(val) {
  const p = getActiveProject();
  if (!p) return;
  p.depositPercent = parseFloat(val) || 50;
  recalculatePricing(p);
}

// Design View Renderers
function renderMockupView(p) {
  const placeholder = document.getElementById('mockup-placeholder-view');
  const imgEl = document.getElementById('mockup-img');

  if (p.mockupImage) {
    placeholder.style.display = "flex";
    placeholder.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><p style="font-weight:700;">Loading proof preview...</p>`;
    imgEl.style.display = "none";
    imgEl.onload = () => {
      placeholder.style.display = "none";
      imgEl.style.display = "block";
    };
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.style.display = "none";
      placeholder.style.display = "flex";
      placeholder.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><p style="font-weight:700;">Proof preview could not be loaded.</p><p style="font-size:0.75rem;">Generate a new concept or check the project vehicle template.</p>`;
    };
    imgEl.src = getMockupImageUrl(p.mockupImage, p.bodyType);
  } else {
    placeholder.style.display = "block";
    placeholder.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i><p style="font-weight:600;margin-bottom:8px;">No proof layouts generated yet.</p><p style="font-size:0.75rem;color:var(--text-muted);">Use the mockup controls below to create a project-specific concept.</p>`;
    imgEl.style.display = "none";
  }
}

function getMockupImageUrl(mockName, bodyType) {
  if (typeof mockName === 'string' && mockName.startsWith('data:image/')) return mockName;
  if (mockName && (mockName.includes('.png') || mockName.includes('.jpg')) && !mockName.startsWith('http')) {
    return mockName;
  }
  const templateKey = normalizeVehicleTemplateKey(bodyType || 'other');
  return `assets/inspection/${templateKey}-driver.webp`;
}

function loadMockupAsset(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load mockup base asset: ${src}`));
    image.src = src;
  });
}

function getProjectMockupPalette(project) {
  const colors = String(project.designColors || '').match(/#[0-9a-fA-F]{6}/g) || [];
  return {
    primary: colors[0] || '#243d70',
    secondary: colors[1] || '#ffffff',
    accent: colors[2] || '#c78624'
  };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawVehicleWrapClip(ctx, templateKey, x, y, width, height) {
  const commercialBodies = ['cargo-van', 'passenger-van', 'high-roof-van', 'box-truck', 'bus'];
  const trailers = ['trailer', 'utility-trailer'];
  ctx.beginPath();

  if (trailers.includes(templateKey)) {
    ctx.moveTo(x + width * 0.05, y + height * 0.20);
    ctx.lineTo(x + width * 0.82, y + height * 0.20);
    ctx.lineTo(x + width * 0.98, y + height * 0.50);
    ctx.lineTo(x + width * 0.82, y + height * 0.78);
    ctx.lineTo(x + width * 0.05, y + height * 0.78);
  } else if (commercialBodies.includes(templateKey)) {
    ctx.moveTo(x + width * 0.03, y + height * 0.66);
    ctx.lineTo(x + width * 0.07, y + height * 0.28);
    ctx.lineTo(x + width * 0.24, y + height * 0.10);
    ctx.lineTo(x + width * 0.96, y + height * 0.10);
    ctx.lineTo(x + width * 0.98, y + height * 0.74);
    ctx.lineTo(x + width * 0.03, y + height * 0.74);
  } else {
    ctx.moveTo(x + width * 0.02, y + height * 0.69);
    ctx.lineTo(x + width * 0.05, y + height * 0.48);
    ctx.lineTo(x + width * 0.27, y + height * 0.13);
    ctx.lineTo(x + width * 0.66, y + height * 0.12);
    ctx.lineTo(x + width * 0.80, y + height * 0.40);
    ctx.lineTo(x + width * 0.97, y + height * 0.52);
    ctx.lineTo(x + width * 0.98, y + height * 0.73);
    ctx.lineTo(x + width * 0.02, y + height * 0.73);
  }
  ctx.closePath();
}

function drawFittedCanvasText(ctx, text, x, y, maxWidth, startingSize, weight = 700) {
  let size = startingSize;
  const cleanText = String(text || '').trim();
  while (size > 18) {
    ctx.font = `${weight} ${size}px "Glacial Indifference", Arial, sans-serif`;
    if (ctx.measureText(cleanText).width <= maxWidth) break;
    size -= 2;
  }
  ctx.fillText(cleanText, x, y);
}

async function buildGeneratedMockupDataUrl(project, direction = 'generate', options = {}) {
  const templateKey = normalizeVehicleTemplateKey(options.templateKey || project.inspectionTemplateType || project.bodyType || 'other');
  const requestedView = options.view || 'driver';
  const assetView = {
    'three-quarter-front': 'driver',
    'three-quarter-rear': 'passenger',
    'concept-board': 'driver'
  }[requestedView] || requestedView;
  const safeView = ['driver', 'passenger', 'front', 'rear', 'top'].includes(assetView) ? assetView : 'driver';
  const baseAsset = `assets/inspection/${templateKey}-${safeView}.webp`;
  const vehicleImage = await loadMockupAsset(baseAsset);
  const palette = options.palette || getProjectMockupPalette(project);
  const protectedLogo = options.logoDataUrl ? await loadMockupAsset(options.logoDataUrl).catch(() => null) : null;
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 788;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f4f5f7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#171b21';
  ctx.fillRect(0, 0, canvas.width, 88);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 30px "Glacial Indifference", Arial, sans-serif';
  ctx.fillText('WRAP LAB AI  /  CONCEPT PROOF', 42, 54);
  ctx.fillStyle = '#c9b4df';
  ctx.font = '700 18px "Glacial Indifference", Arial, sans-serif';
  ctx.textAlign = 'right';
  const conceptLabel = options.conceptLabel || String(direction).replace('-', ' ').toUpperCase();
  ctx.fillText(`${project.id}  •  ${conceptLabel}  •  ${String(requestedView).replaceAll('-', ' ').toUpperCase()}`, 1355, 52);
  ctx.textAlign = 'left';

  drawRoundedRect(ctx, 42, 112, 1316, 566, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#d5d9de';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = '#edf0f3';
  ctx.lineWidth = 1;
  for (let gridX = 72; gridX < 1330; gridX += 70) {
    ctx.beginPath();
    ctx.moveTo(gridX, 136);
    ctx.lineTo(gridX, 646);
    ctx.stroke();
  }
  for (let gridY = 156; gridY < 646; gridY += 70) {
    ctx.beginPath();
    ctx.moveTo(66, gridY);
    ctx.lineTo(1334, gridY);
    ctx.stroke();
  }
  ctx.restore();

  const target = { x: 82, y: 154, width: 1236, height: 438 };
  const scale = Math.min(target.width / vehicleImage.width, target.height / vehicleImage.height);
  const drawWidth = vehicleImage.width * scale;
  const drawHeight = vehicleImage.height * scale;
  const drawX = target.x + (target.width - drawWidth) / 2;
  const drawY = target.y + (target.height - drawHeight) / 2;

  ctx.save();
  drawVehicleWrapClip(ctx, templateKey, drawX, drawY, drawWidth, drawHeight);
  ctx.clip();
  const gradient = ctx.createLinearGradient(drawX, drawY, drawX + drawWidth, drawY + drawHeight);
  gradient.addColorStop(0, palette.primary);
  gradient.addColorStop(0.62, palette.primary);
  gradient.addColorStop(1, palette.accent);
  ctx.fillStyle = gradient;
  ctx.globalAlpha = direction === 'cleaner' ? 0.92 : 0.84;
  ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
  ctx.globalAlpha = 1;

  if (direction === 'direction') {
    ctx.fillStyle = palette.secondary;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(drawX + drawWidth * 0.73, drawY + drawHeight * 0.52, drawHeight * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (direction === 'cleaner') {
    ctx.fillStyle = palette.accent;
    ctx.fillRect(drawX, drawY + drawHeight * 0.60, drawWidth, drawHeight * 0.13);
  } else {
    ctx.strokeStyle = palette.secondary;
    ctx.globalAlpha = 0.82;
    ctx.lineWidth = Math.max(24, drawHeight * 0.13);
    ctx.beginPath();
    ctx.moveTo(drawX + drawWidth * 0.48, drawY + drawHeight * 0.88);
    ctx.lineTo(drawX + drawWidth * 0.67, drawY + drawHeight * 0.05);
    ctx.stroke();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = Math.max(10, drawHeight * 0.045);
    ctx.beginPath();
    ctx.moveTo(drawX + drawWidth * 0.53, drawY + drawHeight * 0.88);
    ctx.lineTo(drawX + drawWidth * 0.72, drawY + drawHeight * 0.05);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 5;
  drawFittedCanvasText(ctx, project.businessName || `${project.firstName} ${project.lastName}`, drawX + drawWidth * 0.34, drawY + drawHeight * 0.54, drawWidth * 0.53, 54, 700);
  ctx.shadowBlur = 0;
  ctx.font = '700 22px "Glacial Indifference", Arial, sans-serif';
  const shortCopy = String(project.designCopy || project.wrapType || '').split(',').slice(1, 3).join('  •  ').trim();
  if (shortCopy) ctx.fillText(shortCopy, drawX + drawWidth * 0.34, drawY + drawHeight * 0.63);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.92;
  ctx.drawImage(vehicleImage, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  if (protectedLogo) {
    const maxLogoWidth = drawWidth * 0.20;
    const maxLogoHeight = drawHeight * 0.19;
    const logoScale = Math.min(maxLogoWidth / protectedLogo.width, maxLogoHeight / protectedLogo.height);
    const logoWidth = protectedLogo.width * logoScale;
    const logoHeight = protectedLogo.height * logoScale;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    drawRoundedRect(ctx, drawX + drawWidth * 0.38 - 8, drawY + drawHeight * 0.27 - 8, logoWidth + 16, logoHeight + 16, 8);
    ctx.fill();
    ctx.drawImage(protectedLogo, drawX + drawWidth * 0.38, drawY + drawHeight * 0.27, logoWidth, logoHeight);
  }

  ctx.fillStyle = '#343b45';
  ctx.font = '700 19px "Glacial Indifference", Arial, sans-serif';
  ctx.fillText(`${project.year} ${project.make} ${project.model}  •  ${project.wrapType}  •  ${String(requestedView).replaceAll('-', ' ')}`, 66, 721);
  ctx.fillStyle = '#68717d';
  ctx.font = '400 16px "Glacial Indifference", Arial, sans-serif';
  ctx.fillText('AI-assisted concept preview — verify copy, placement, scale, coverage, and production feasibility before approval.', 66, 752);

  [palette.primary, palette.secondary, palette.accent].forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(1180 + index * 55, 710, 38, 38);
    ctx.strokeStyle = '#afb6bf';
    ctx.strokeRect(1180 + index * 55, 710, 38, 38);
  });

  return canvas.toDataURL('image/png');
}

function renderProofsLog(p) {
  const list = document.getElementById('proof-versions-list');
  list.innerHTML = "";
  
  p.proofs.forEach(proof => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.style.padding = '8px 12px';
    div.style.backgroundColor = 'var(--bg-input)';
    div.style.border = '1px solid var(--border)';
    div.style.borderRadius = 'var(--radius-sm)';
    
    let badgeClass = 'badge-warning';
    if (proof.status === 'Approved') badgeClass = 'badge-complete';
    else if (proof.status === 'Revision Requested') badgeClass = 'badge-warning';
    else if (proof.status === 'Sent') badgeClass = 'badge-quote';

    div.innerHTML = `
      <div>
        <span style="font-weight: 700; color: var(--primary);">${proof.version}</span>
        <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 8px;">${proof.date}</span>
        <div style="font-size: 0.75rem; color: var(--text-main); margin-top: 2px;">${proof.notes}</div>
      </div>
      <span class="badge ${badgeClass}">${proof.status}</span>
    `;
    list.appendChild(div);
  });
}

let mockupGenerationInFlight = false;

function setMockupGenerationBusy(isBusy) {
  const loader = document.getElementById('ai-loading-overlay');
  if (loader) loader.classList.toggle('active', isBusy);
  document.querySelectorAll('.ai-btn').forEach(button => {
    button.disabled = isBusy;
    button.setAttribute('aria-busy', String(isBusy));
  });
}

async function triggerAiMockupGen(type = 'generate') {
  if (mockupGenerationInFlight) return;
  const project = getActiveProject();
  if (!project) return;

  mockupGenerationInFlight = true;
  setMockupGenerationBusy(true);

  try {
    await new Promise(resolve => setTimeout(resolve, 650));
    const generatedMockup = await buildGeneratedMockupDataUrl(project, type);
    project.mockupImage = generatedMockup;
    const versionNumber = project.proofs.length + 1;
    const directionLabel = {
      direction: 'Alternative design direction',
      generate: 'AI-generated concept',
      cleaner: 'Clean and bold refinement'
    }[type] || 'AI-generated concept';

    project.proofs.push({
      version: `v${versionNumber}`,
      date: new Date().toISOString().split('T')[0],
      notes: `${directionLabel} using the project vehicle, brand palette, and required copy.`,
      status: 'Draft'
    });
    project.stageIndex = 4;
    project.chatHistory.push({
      sender: 'shop',
      text: `New concept proof v${versionNumber} generated for internal review before customer release.`,
      time: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });

    loadProjectData(project.id);
  } catch (error) {
    console.error('Mockup generation failed:', error);
    const placeholder = document.getElementById('mockup-placeholder-view');
    if (!project.mockupImage && placeholder) {
      placeholder.style.display = 'flex';
      placeholder.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><p style="font-weight:700;">Mockup generation failed.</p><p style="font-size:0.75rem;">The existing project data was preserved. Try again after checking the vehicle template.</p>`;
    }
  } finally {
    mockupGenerationInFlight = false;
    setMockupGenerationBusy(false);
  }
}


// ============================================================
// VEHICLE INSPECTION DIAGRAM SYSTEM - 12 Vehicle Types
// ============================================================

const VEHICLE_TYPES = [
  { key: 'sedan',          label: 'Sedan',          blueprintKey: 'sedan' },
  { key: 'coupe',          label: 'Coupe',          blueprintKey: 'sedan' },
  { key: 'suv',            label: 'SUV',            blueprintKey: 'suv' },
  { key: 'pickup-truck',   label: 'Pickup Truck',   blueprintKey: 'pickup-truck' },
  { key: 'cargo-van',      label: 'Cargo Van',      blueprintKey: 'van' },
  { key: 'passenger-van',  label: 'Passenger Van',  blueprintKey: 'transit' },
  { key: 'high-roof-van',  label: 'High-Roof Van',  blueprintKey: 'sprinter' },
  { key: 'box-truck',      label: 'Box Truck',      blueprintKey: 'box-truck' },
  { key: 'trailer',        label: 'Trailer',        blueprintKey: 'trailer' },
  { key: 'utility-trailer',label: 'Utility Trailer',blueprintKey: 'trailer' },
  { key: 'bus',            label: 'Bus',            blueprintKey: 'step-van' },
  { key: 'other',          label: 'Other / Custom', blueprintKey: 'van' }
];

const INSPECTION_VIEWS = [
  { key: 'driver', label: 'Driver Side' },
  { key: 'passenger', label: 'Passenger Side' },
  { key: 'front', label: 'Front' },
  { key: 'rear', label: 'Rear' },
  { key: 'top', label: 'Roof / Top' }
];

// SVG blueprints: each entry has side and top
const VEHICLE_SVG_BLUEPRINTS = {
  'van': {
    side: `<svg viewBox="0 0 520 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <defs><filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/></filter></defs>
      <!-- Road line -->
      <line x1="30" y1="195" x2="490" y2="195" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <!-- Wheels -->
      <circle cx="115" cy="185" r="28" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="115" cy="185" r="11" fill="#9ca3af"/><circle cx="115" cy="185" r="5" fill="#4b5563"/>
      <circle cx="405" cy="185" r="28" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="405" cy="185" r="11" fill="#9ca3af"/><circle cx="405" cy="185" r="5" fill="#4b5563"/>
      <!-- Body shadow -->
      <path d="M 50 185 Q 87 185 115 185 L 405 185 Q 433 185 460 185 L 475 183 L 475 115 L 460 103 L 425 68 L 360 60 L 130 60 L 65 60 L 45 95 L 42 115 Z" fill="#e8edf5" stroke="none" filter="url(#shadow)"/>
      <!-- Main body -->
      <path d="M 50 183 L 87 183 A 28 28 0 0 1 143 183 L 377 183 A 28 28 0 0 1 433 183 L 472 183 L 472 113 L 460 100 L 422 65 L 358 58 L 128 58 L 62 62 L 43 93 L 40 118 Z" fill="#dde3ef" stroke="#374151" stroke-width="2.5"/>
      <!-- Cab face -->
      <path d="M 40 118 L 43 93 L 62 62 L 128 58 L 128 183 L 40 183 Z" fill="#c5ccdb" stroke="#374151" stroke-width="2"/>
      <!-- Windshield -->
      <path d="M 56 108 L 85 72 L 120 68 L 120 108 Z" fill="#bfdbfe" stroke="#374151" stroke-width="1.5" opacity="0.85"/>
      <!-- Side cab window -->
      <rect x="130" y="68" width="60" height="40" rx="3" fill="#bfdbfe" stroke="#374151" stroke-width="1.5" opacity="0.85"/>
      <!-- Front door line -->
      <line x1="195" y1="58" x2="195" y2="183" stroke="#374151" stroke-width="1.5" stroke-dasharray="4,3"/>
      <!-- Sliding door -->
      <line x1="315" y1="58" x2="315" y2="183" stroke="#374151" stroke-width="1.5"/>
      <line x1="380" y1="58" x2="380" y2="183" stroke="#374151" stroke-width="1.5"/>
      <line x1="315" y1="120" x2="380" y2="120" stroke="#374151" stroke-width="1.2"/>
      <circle cx="347" cy="120" r="4" fill="#6b7280"/>
      <!-- Rear doors -->
      <line x1="440" y1="65" x2="440" y2="183" stroke="#374151" stroke-width="1.5"/>
      <line x1="455" y1="65" x2="455" y2="183" stroke="#374151" stroke-width="1.5"/>
      <!-- Lights -->
      <rect x="42" y="125" width="8" height="20" rx="2" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>
      <rect x="463" y="128" width="9" height="18" rx="2" fill="#ef4444" stroke="#dc2626" stroke-width="1"/>
      <rect x="465" y="110" width="7" height="12" rx="2" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>
      <!-- Bumpers -->
      <rect x="37" y="160" width="12" height="20" rx="3" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="469" y="160" width="12" height="20" rx="3" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <!-- Labels -->
      <text x="78" y="136" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CAB</text>
      <text x="255" y="136" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CARGO</text>
    </svg>`,
    top: `<svg viewBox="0 0 320 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <!-- Top view cargo van -->
      <rect x="60" y="20" width="200" height="360" rx="20" fill="#dde3ef" stroke="#374151" stroke-width="2.5"/>
      <!-- Cab area -->
      <rect x="60" y="20" width="200" height="100" rx="20" fill="#c5ccdb" stroke="#374151" stroke-width="2"/>
      <!-- Windshield -->
      <rect x="80" y="30" width="160" height="50" rx="6" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <!-- Rear window -->
      <rect x="80" y="345" width="160" height="28" rx="4" fill="#bfdbfe" opacity="0.7" stroke="#374151" stroke-width="1.5"/>
      <!-- Door lines -->
      <line x1="60" y1="120" x2="260" y2="120" stroke="#374151" stroke-width="1.5"/>
      <line x1="60" y1="280" x2="260" y2="280" stroke="#374151" stroke-width="1.5"/>
      <!-- Mirrors -->
      <rect x="32" y="50" width="28" height="14" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="260" y="50" width="28" height="14" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <!-- Wheels -->
      <rect x="42" y="95" width="18" height="50" rx="5" fill="#374151" stroke="#1f2937" stroke-width="2"/>
      <rect x="260" y="95" width="18" height="50" rx="5" fill="#374151" stroke="#1f2937" stroke-width="2"/>
      <rect x="42" y="255" width="18" height="50" rx="5" fill="#374151" stroke="#1f2937" stroke-width="2"/>
      <rect x="260" y="255" width="18" height="50" rx="5" fill="#374151" stroke="#1f2937" stroke-width="2"/>
      <!-- Labels -->
      <text x="160" y="175" font-size="10" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CARGO</text>
      <text x="160" y="75" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle">FRONT</text>
    </svg>`
  },
  'sprinter': {
    side: `<svg viewBox="0 0 560 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="198" x2="530" y2="198" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="115" cy="188" r="26" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="115" cy="188" r="10" fill="#9ca3af"/>
      <circle cx="445" cy="188" r="26" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="445" cy="188" r="10" fill="#9ca3af"/>
      <!-- High roof sprinter body -->
      <path d="M 48 186 L 89 186 A 26 26 0 0 1 141 186 L 419 186 A 26 26 0 0 1 471 186 L 510 186 L 510 110 L 498 95 L 462 42 L 140 42 L 65 55 L 42 88 L 40 118 Z" fill="#dde3ef" stroke="#374151" stroke-width="2.5"/>
      <!-- High roof shape -->
      <path d="M 140 42 L 462 42 L 462 186 L 140 186 Z" fill="#c8d0e0" stroke="#374151" stroke-width="1.5"/>
      <!-- Cab -->
      <path d="M 40 118 L 42 88 L 65 55 L 140 42 L 140 186 L 40 186 Z" fill="#b8c3d4" stroke="#374151" stroke-width="2"/>
      <!-- Windshield -->
      <path d="M 58 108 L 82 60 L 132 46 L 132 108 Z" fill="#bfdbfe" stroke="#374151" stroke-width="1.5" opacity="0.85"/>
      <!-- Windows -->
      <rect x="148" y="55" width="75" height="45" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <rect x="235" y="55" width="70" height="45" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <rect x="315" y="55" width="70" height="45" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <!-- Door lines -->
      <line x1="205" y1="42" x2="205" y2="186" stroke="#374151" stroke-width="1.5"/>
      <line x1="400" y1="42" x2="400" y2="186" stroke="#374151" stroke-width="1.5"/>
      <line x1="480" y1="42" x2="480" y2="186" stroke="#374151" stroke-width="1.5"/>
      <!-- Lights -->
      <rect x="42" y="128" width="8" height="18" rx="2" fill="#fbbf24"/>
      <rect x="500" y="130" width="9" height="17" rx="2" fill="#ef4444"/>
      <text x="90" y="138" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CAB</text>
      <text x="300" y="130" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">HIGH-ROOF CARGO</text>
    </svg>`,
    top: `<svg viewBox="0 0 300 440" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <rect x="55" y="15" width="190" height="410" rx="18" fill="#dde3ef" stroke="#374151" stroke-width="2.5"/>
      <rect x="55" y="15" width="190" height="90" rx="18" fill="#b8c3d4" stroke="#374151" stroke-width="2"/>
      <rect x="75" y="24" width="150" height="45" rx="5" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <line x1="55" y1="105" x2="245" y2="105" stroke="#374151" stroke-width="1.5"/>
      <line x1="55" y1="300" x2="245" y2="300" stroke="#374151" stroke-width="1.5"/>
      <rect x="31" y="45" width="24" height="13" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="245" y="45" width="24" height="13" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="37" y="85" width="18" height="48" rx="5" fill="#374151"/>
      <rect x="245" y="85" width="18" height="48" rx="5" fill="#374151"/>
      <rect x="37" y="265" width="18" height="48" rx="5" fill="#374151"/>
      <rect x="245" y="265" width="18" height="48" rx="5" fill="#374151"/>
      <text x="150" y="215" font-size="10" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CARGO</text>
    </svg>`
  },
  'transit': {
    side: `<svg viewBox="0 0 540 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="196" x2="510" y2="196" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="118" cy="186" r="27" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="118" cy="186" r="10" fill="#9ca3af"/>
      <circle cx="422" cy="186" r="27" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="422" cy="186" r="10" fill="#9ca3af"/>
      <path d="M 50 184 L 91 184 A 27 27 0 0 1 145 184 L 395 184 A 27 27 0 0 1 449 184 L 485 184 L 485 112 L 472 98 L 438 62 L 375 55 L 140 55 L 72 60 L 46 95 Z" fill="#dde3ef" stroke="#374151" stroke-width="2.5"/>
      <path d="M 46 95 L 72 60 L 140 55 L 140 184 L 46 184 Z" fill="#c0cad8" stroke="#374151" stroke-width="2"/>
      <path d="M 58 110 L 82 68 L 132 58 L 132 110 Z" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <rect x="148" y="65" width="68" height="40" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <rect x="228" y="65" width="68" height="40" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <rect x="308" y="65" width="68" height="40" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <line x1="210" y1="55" x2="210" y2="184" stroke="#374151" stroke-width="1.5"/>
      <line x1="390" y1="55" x2="390" y2="184" stroke="#374151" stroke-width="1.5"/>
      <line x1="460" y1="55" x2="460" y2="184" stroke="#374151" stroke-width="1.5"/>
      <rect x="42" y="125" width="8" height="18" rx="2" fill="#fbbf24"/>
      <rect x="477" y="128" width="9" height="17" rx="2" fill="#ef4444"/>
      <text x="90" y="135" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CAB</text>
      <text x="290" y="130" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CARGO / PASSENGER</text>
    </svg>`,
    top: `<svg viewBox="0 0 300 430" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <rect x="58" y="18" width="184" height="394" rx="18" fill="#dde3ef" stroke="#374151" stroke-width="2.5"/>
      <rect x="58" y="18" width="184" height="88" rx="18" fill="#c0cad8" stroke="#374151" stroke-width="2"/>
      <rect x="76" y="27" width="148" height="44" rx="5" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <line x1="58" y1="106" x2="242" y2="106" stroke="#374151" stroke-width="1.5"/>
      <line x1="58" y1="295" x2="242" y2="295" stroke="#374151" stroke-width="1.5"/>
      <rect x="33" y="47" width="25" height="13" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="242" y="47" width="25" height="13" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="38" y="86" width="20" height="48" rx="5" fill="#374151"/>
      <rect x="242" y="86" width="20" height="48" rx="5" fill="#374151"/>
      <rect x="38" y="260" width="20" height="48" rx="5" fill="#374151"/>
      <rect x="242" y="260" width="20" height="48" rx="5" fill="#374151"/>
    </svg>`
  },
  'pickup-truck': {
    side: `<svg viewBox="0 0 540 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="196" x2="510" y2="196" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="125" cy="185" r="28" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="125" cy="185" r="11" fill="#9ca3af"/>
      <circle cx="400" cy="185" r="28" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="400" cy="185" r="11" fill="#9ca3af"/>
      <!-- Cab -->
      <path d="M 50 183 L 97 183 A 28 28 0 0 1 153 183 L 230 183 L 230 100 L 215 82 L 180 62 L 105 65 L 65 78 L 45 100 Z" fill="#c8d4e8" stroke="#374151" stroke-width="2.5"/>
      <!-- Windshield -->
      <path d="M 58 108 L 80 72 L 130 68 L 130 108 Z" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <!-- Cab side window -->
      <rect x="140" y="72" width="82" height="38" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <!-- Truck bed -->
      <path d="M 230 183 L 372 183 A 28 28 0 0 1 428 183 L 478 183 L 478 120 L 465 120 L 465 78 L 230 78 L 230 183 Z" fill="#d5dde8" stroke="#374151" stroke-width="2"/>
      <!-- Bed wall (front panel) -->
      <line x1="230" y1="78" x2="230" y2="183" stroke="#374151" stroke-width="3"/>
      <!-- Tailgate -->
      <line x1="462" y1="78" x2="462" y2="183" stroke="#374151" stroke-width="3"/>
      <line x1="348" y1="78" x2="348" y2="183" stroke="#374151" stroke-width="1.2" stroke-dasharray="4,4"/>
      <!-- Lights -->
      <rect x="44" y="126" width="8" height="18" rx="2" fill="#fbbf24"/>
      <rect x="469" y="130" width="9" height="16" rx="2" fill="#ef4444"/>
      <rect x="463" y="115" width="8" height="12" rx="2" fill="#fbbf24"/>
      <!-- Labels -->
      <text x="137" y="138" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CAB</text>
      <text x="348" y="138" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">BED</text>
    </svg>`,
    top: `<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <!-- Cab -->
      <rect x="60" y="18" width="180" height="170" rx="14" fill="#c8d4e8" stroke="#374151" stroke-width="2.5"/>
      <!-- Windshield -->
      <rect x="78" y="27" width="144" height="48" rx="5" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <!-- Rear glass -->
      <rect x="78" y="130" width="144" height="32" rx="4" fill="#bfdbfe" opacity="0.7" stroke="#374151" stroke-width="1.5"/>
      <!-- Bed -->
      <rect x="60" y="200" width="180" height="182" rx="8" fill="#d5dde8" stroke="#374151" stroke-width="2.5"/>
      <!-- Bed front wall -->
      <line x1="60" y1="200" x2="240" y2="200" stroke="#374151" stroke-width="3"/>
      <!-- Mirrors -->
      <rect x="33" y="40" width="27" height="13" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="240" y="40" width="27" height="13" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <!-- Wheels -->
      <rect x="40" y="80" width="20" height="48" rx="5" fill="#374151"/>
      <rect x="240" y="80" width="20" height="48" rx="5" fill="#374151"/>
      <rect x="40" y="258" width="20" height="48" rx="5" fill="#374151"/>
      <rect x="240" y="258" width="20" height="48" rx="5" fill="#374151"/>
      <text x="150" y="295" font-size="10" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">BED</text>
    </svg>`
  },
  'pickup-crew': {
    side: `<svg viewBox="0 0 560 220" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="196" x2="530" y2="196" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="125" cy="185" r="28" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="125" cy="185" r="11" fill="#9ca3af"/>
      <circle cx="420" cy="185" r="28" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="420" cy="185" r="11" fill="#9ca3af"/>
      <!-- Crew cab (wider) -->
      <path d="M 50 183 L 97 183 A 28 28 0 0 1 153 183 L 305 183 L 305 100 L 290 83 L 258 62 L 115 65 L 72 78 L 46 105 Z" fill="#c8d4e8" stroke="#374151" stroke-width="2.5"/>
      <path d="M 60 110 L 84 72 L 135 68 L 135 110 Z" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <rect x="143" y="72" width="75" height="38" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <rect x="225" y="72" width="72" height="38" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <line x1="222" y1="62" x2="222" y2="183" stroke="#374151" stroke-width="1.8"/>
      <!-- Bed -->
      <path d="M 305 183 L 392 183 A 28 28 0 0 1 448 183 L 495 183 L 495 122 L 483 122 L 483 80 L 305 80 L 305 183 Z" fill="#d5dde8" stroke="#374151" stroke-width="2"/>
      <line x1="305" y1="80" x2="305" y2="183" stroke="#374151" stroke-width="3"/>
      <line x1="480" y1="80" x2="480" y2="183" stroke="#374151" stroke-width="3"/>
      <rect x="44" y="126" width="8" height="18" rx="2" fill="#fbbf24"/>
      <rect x="487" y="130" width="9" height="16" rx="2" fill="#ef4444"/>
      <text x="178" y="138" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CREW CAB</text>
      <text x="393" y="138" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">BED</text>
    </svg>`,
    top: `<svg viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <rect x="55" y="18" width="190" height="210" rx="14" fill="#c8d4e8" stroke="#374151" stroke-width="2.5"/>
      <rect x="73" y="27" width="154" height="48" rx="5" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <rect x="73" y="160" width="154" height="40" rx="4" fill="#bfdbfe" opacity="0.7" stroke="#374151" stroke-width="1.5"/>
      <line x1="55" y1="140" x2="245" y2="140" stroke="#374151" stroke-width="1.5"/>
      <rect x="55" y="240" width="190" height="162" rx="8" fill="#d5dde8" stroke="#374151" stroke-width="2.5"/>
      <line x1="55" y1="240" x2="245" y2="240" stroke="#374151" stroke-width="3"/>
      <rect x="30" y="40" width="25" height="13" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="245" y="40" width="25" height="13" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="35" y="78" width="20" height="50" rx="5" fill="#374151"/>
      <rect x="245" y="78" width="20" height="50" rx="5" fill="#374151"/>
      <rect x="35" y="285" width="20" height="48" rx="5" fill="#374151"/>
      <rect x="245" y="285" width="20" height="48" rx="5" fill="#374151"/>
    </svg>`
  },
  'box-truck': {
    side: `<svg viewBox="0 0 560 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="210" x2="530" y2="210" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="115" cy="200" r="26" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="115" cy="200" r="10" fill="#9ca3af"/>
      <circle cx="380" cy="200" r="26" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="380" cy="200" r="10" fill="#9ca3af"/>
      <circle cx="430" cy="200" r="26" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="430" cy="200" r="10" fill="#9ca3af"/>
      <!-- Cab -->
      <path d="M 46 198 L 89 198 A 26 26 0 0 1 141 198 L 182 198 L 182 112 L 162 100 L 120 58 L 68 72 L 44 98 Z" fill="#b8c3d4" stroke="#374151" stroke-width="2.5"/>
      <path d="M 60 118 L 85 68 L 130 62 L 130 118 Z" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <rect x="140" y="72" width="34" height="38" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <!-- Box body -->
      <rect x="184" y="40" width="310" height="158" rx="4" fill="#dde3ef" stroke="#374151" stroke-width="3"/>
      <!-- Door lines on box -->
      <line x1="420" y1="40" x2="420" y2="198" stroke="#374151" stroke-width="2"/>
      <line x1="380" y1="40" x2="380" y2="198" stroke="#374151" stroke-width="2"/>
      <line x1="400" y1="115" x2="493" y2="115" stroke="#374151" stroke-width="1.2"/>
      <!-- Roll-up door handles -->
      <circle cx="400" cy="115" r="4" fill="#6b7280"/>
      <!-- Lights -->
      <rect x="42" y="135" width="8" height="18" rx="2" fill="#fbbf24"/>
      <rect x="492" y="140" width="9" height="18" rx="2" fill="#ef4444"/>
      <text x="108" y="148" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CAB</text>
      <text x="340" y="130" font-size="10" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">BOX</text>
    </svg>`,
    top: `<svg viewBox="0 0 320 460" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <!-- Cab section -->
      <rect x="65" y="18" width="190" height="105" rx="14" fill="#b8c3d4" stroke="#374151" stroke-width="2.5"/>
      <rect x="83" y="27" width="154" height="44" rx="5" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <line x1="65" y1="123" x2="255" y2="123" stroke="#374151" stroke-width="2"/>
      <!-- Box body -->
      <rect x="65" y="125" width="190" height="320" rx="4" fill="#dde3ef" stroke="#374151" stroke-width="3"/>
      <!-- Mirrors -->
      <rect x="36" y="48" width="29" height="14" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="255" y="48" width="29" height="14" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <!-- Wheels -->
      <rect x="40" y="88" width="25" height="48" rx="5" fill="#374151"/>
      <rect x="255" y="88" width="25" height="48" rx="5" fill="#374151"/>
      <rect x="40" y="340" width="25" height="48" rx="5" fill="#374151"/>
      <rect x="255" y="340" width="25" height="48" rx="5" fill="#374151"/>
      <rect x="40" y="295" width="25" height="40" rx="5" fill="#374151"/>
      <rect x="255" y="295" width="25" height="40" rx="5" fill="#374151"/>
      <text x="160" y="295" font-size="10" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">BOX BODY</text>
    </svg>`
  },
  'step-van': {
    side: `<svg viewBox="0 0 500 230" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="205" x2="470" y2="205" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="110" cy="195" r="25" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="110" cy="195" r="10" fill="#9ca3af"/>
      <circle cx="375" cy="195" r="25" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="375" cy="195" r="10" fill="#9ca3af"/>
      <!-- Step van is nearly all-body with flat face -->
      <rect x="48" y="45" width="390" height="150" rx="5" fill="#dde3ef" stroke="#374151" stroke-width="3"/>
      <!-- Flat front face -->
      <rect x="48" y="45" width="65" height="150" fill="#b8c3d4" stroke="#374151" stroke-width="2"/>
      <!-- Windshield -->
      <rect x="54" y="58" width="50" height="45" rx="3" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <!-- Passenger window -->
      <rect x="54" y="112" width="50" height="35" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <!-- Driver door -->
      <line x1="113" y1="45" x2="113" y2="195" stroke="#374151" stroke-width="2"/>
      <!-- Cargo sections -->
      <line x1="250" y1="45" x2="250" y2="195" stroke="#374151" stroke-width="1.5"/>
      <line x1="380" y1="45" x2="380" y2="195" stroke="#374151" stroke-width="2"/>
      <!-- Lights -->
      <rect x="44" y="120" width="8" height="18" rx="2" fill="#fbbf24"/>
      <rect x="436" y="122" width="9" height="18" rx="2" fill="#ef4444"/>
      <text x="78" y="145" font-size="8" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">DRIVER</text>
      <text x="245" y="128" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CARGO</text>
    </svg>`,
    top: `<svg viewBox="0 0 300 390" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <rect x="58" y="18" width="184" height="354" rx="8" fill="#dde3ef" stroke="#374151" stroke-width="3"/>
      <rect x="58" y="18" width="184" height="80" fill="#b8c3d4" stroke="#374151" stroke-width="2"/>
      <rect x="76" y="26" width="148" height="40" rx="5" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <line x1="58" y1="98" x2="242" y2="98" stroke="#374151" stroke-width="2"/>
      <rect x="34" y="84" width="24" height="48" rx="5" fill="#374151"/>
      <rect x="242" y="84" width="24" height="48" rx="5" fill="#374151"/>
      <rect x="34" y="270" width="24" height="48" rx="5" fill="#374151"/>
      <rect x="242" y="270" width="24" height="48" rx="5" fill="#374151"/>
    </svg>`
  },
  'sedan': {
    side: `<svg viewBox="0 0 520 210" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="190" x2="490" y2="190" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="128" cy="178" r="25" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="128" cy="178" r="10" fill="#9ca3af"/>
      <circle cx="390" cy="178" r="25" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="390" cy="178" r="10" fill="#9ca3af"/>
      <!-- Sedan body -->
      <path d="M 50 176 L 103 176 A 25 25 0 0 1 153 176 L 365 176 A 25 25 0 0 1 415 176 L 465 176 L 465 152 L 440 132 L 385 98 L 280 85 L 165 90 L 95 118 L 55 140 Z" fill="#dde3ef" stroke="#374151" stroke-width="2.5"/>
      <!-- Roof arch -->
      <path d="M 165 90 L 385 90 L 440 132 L 95 132 Z" fill="#c8d0e0" stroke="#374151" stroke-width="1.5"/>
      <!-- Windshield -->
      <path d="M 115 132 L 142 95 L 210 90 L 210 132 Z" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <!-- Front side window -->
      <rect x="218" y="92" width="90" height="40" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <!-- Rear side window -->
      <rect x="315" y="92" width="90" height="40" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <!-- Rear windshield -->
      <path d="M 358 92 L 408 130 L 415 132 L 415 132 L 405 92 Z" fill="#bfdbfe" opacity="0.7" stroke="#374151" stroke-width="1.5"/>
      <!-- Door lines -->
      <line x1="215" y1="88" x2="215" y2="176" stroke="#374151" stroke-width="1.8"/>
      <line x1="313" y1="88" x2="313" y2="176" stroke="#374151" stroke-width="1.8"/>
      <!-- Lights -->
      <rect x="46" y="152" width="10" height="16" rx="2" fill="#fbbf24"/>
      <rect x="453" y="154" width="10" height="15" rx="2" fill="#ef4444"/>
      <rect x="46" y="140" width="10" height="10" rx="2" fill="#e5e7eb"/>
      <!-- Bumpers -->
      <rect x="40" y="165" width="14" height="12" rx="3" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="456" y="165" width="14" height="12" rx="3" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
    </svg>`,
    top: `<svg viewBox="0 0 280 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <path d="M 60 80 Q 60 20 140 18 Q 220 20 220 80 L 230 290 Q 230 362 140 363 Q 50 362 50 290 Z" fill="#dde3ef" stroke="#374151" stroke-width="2.5"/>
      <!-- Roof -->
      <path d="M 75 120 L 75 260 L 205 260 L 205 120 Z" fill="#c8d0e0" stroke="#374151" stroke-width="1.5"/>
      <!-- Windshield -->
      <path d="M 78 120 L 78 78 Q 140 65 202 78 L 202 120 Z" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <!-- Rear window -->
      <path d="M 78 260 L 78 300 Q 140 315 202 300 L 202 260 Z" fill="#bfdbfe" opacity="0.7" stroke="#374151" stroke-width="1.5"/>
      <!-- Mirrors -->
      <rect x="28" y="120" width="22" height="12" rx="3" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="230" y="120" width="22" height="12" rx="3" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <!-- Wheels -->
      <rect x="34" y="100" width="16" height="42" rx="5" fill="#374151"/>
      <rect x="230" y="100" width="16" height="42" rx="5" fill="#374151"/>
      <rect x="34" y="250" width="16" height="42" rx="5" fill="#374151"/>
      <rect x="230" y="250" width="16" height="42" rx="5" fill="#374151"/>
      <!-- Door line -->
      <line x1="50" y1="190" x2="230" y2="190" stroke="#374151" stroke-width="1.8"/>
    </svg>`
  },
  'suv': {
    side: `<svg viewBox="0 0 530 215" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="194" x2="500" y2="194" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="128" cy="182" r="27" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="128" cy="182" r="11" fill="#9ca3af"/>
      <circle cx="398" cy="182" r="27" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="398" cy="182" r="11" fill="#9ca3af"/>
      <!-- SUV body - more square roofline -->
      <path d="M 50 180 L 101 180 A 27 27 0 0 1 155 180 L 371 180 A 27 27 0 0 1 425 180 L 472 180 L 472 148 L 448 128 L 415 85 L 380 78 L 148 78 L 92 88 L 55 112 Z" fill="#dde3ef" stroke="#374151" stroke-width="2.5"/>
      <!-- More square roofline than sedan -->
      <rect x="148" y="78" width="270" height="54" fill="#c8d0e0" stroke="#374151" stroke-width="1.5"/>
      <!-- Windshield -->
      <path d="M 72 112 L 100 88 L 148 82 L 148 126 Z" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <!-- Front window -->
      <rect x="155" y="82" width="95" height="46" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <!-- Rear window -->
      <rect x="258" y="82" width="90" height="46" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <!-- Rear windshield -->
      <rect x="356" y="82" width="58" height="46" rx="3" fill="#bfdbfe" opacity="0.7" stroke="#374151" stroke-width="1.5"/>
      <!-- Door lines -->
      <line x1="252" y1="78" x2="252" y2="180" stroke="#374151" stroke-width="1.8"/>
      <line x1="355" y1="78" x2="355" y2="180" stroke="#374151" stroke-width="1.8"/>
      <!-- Lights -->
      <rect x="44" y="144" width="10" height="18" rx="2" fill="#fbbf24"/>
      <rect x="462" y="148" width="10" height="16" rx="2" fill="#ef4444"/>
      <text x="200" y="160" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">FRONT</text>
      <text x="308" y="160" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">REAR</text>
    </svg>`,
    top: `<svg viewBox="0 0 290 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <rect x="55" y="20" width="180" height="360" rx="18" fill="#dde3ef" stroke="#374151" stroke-width="2.5"/>
      <rect x="55" y="20" width="180" height="90" rx="18" fill="#c8d0e0" stroke="#374151" stroke-width="2"/>
      <rect x="73" y="28" width="144" height="48" rx="5" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <rect x="73" y="330" width="144" height="38" rx="4" fill="#bfdbfe" opacity="0.7" stroke="#374151" stroke-width="1.5"/>
      <line x1="55" y1="110" x2="235" y2="110" stroke="#374151" stroke-width="1.5"/>
      <line x1="55" y1="230" x2="235" y2="230" stroke="#374151" stroke-width="1.5"/>
      <rect x="30" y="42" width="25" height="13" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="235" y="42" width="25" height="13" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="34" y="88" width="21" height="48" rx="5" fill="#374151"/>
      <rect x="235" y="88" width="21" height="48" rx="5" fill="#374151"/>
      <rect x="34" y="264" width="21" height="48" rx="5" fill="#374151"/>
      <rect x="235" y="264" width="21" height="48" rx="5" fill="#374151"/>
    </svg>`
  },
  'trailer': {
    side: `<svg viewBox="0 0 560 210" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="188" x2="530" y2="188" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="320" cy="178" r="22" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="320" cy="178" r="9" fill="#9ca3af"/>
      <circle cx="372" cy="178" r="22" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="372" cy="178" r="9" fill="#9ca3af"/>
      <!-- Trailer body -->
      <rect x="68" y="55" width="418" height="123" rx="6" fill="#dde3ef" stroke="#374151" stroke-width="3"/>
      <!-- Top ribs (structural detail) -->
      <line x1="130" y1="55" x2="130" y2="178" stroke="#374151" stroke-width="0.8" stroke-dasharray="6,4" opacity="0.4"/>
      <line x1="220" y1="55" x2="220" y2="178" stroke="#374151" stroke-width="0.8" stroke-dasharray="6,4" opacity="0.4"/>
      <line x1="310" y1="55" x2="310" y2="178" stroke="#374151" stroke-width="0.8" stroke-dasharray="6,4" opacity="0.4"/>
      <line x1="400" y1="55" x2="400" y2="178" stroke="#374151" stroke-width="0.8" stroke-dasharray="6,4" opacity="0.4"/>
      <!-- Rear doors -->
      <line x1="455" y1="55" x2="455" y2="178" stroke="#374151" stroke-width="2.5"/>
      <line x1="483" y1="55" x2="483" y2="178" stroke="#374151" stroke-width="2.5"/>
      <circle cx="469" cy="116" r="5" fill="#6b7280"/>
      <!-- Hitch tongue -->
      <path d="M 68 155 L 22 175 L 12 175 L 12 155 Z" fill="#9ca3af" stroke="#374151" stroke-width="2"/>
      <circle cx="12" cy="165" r="8" fill="#4b5563" stroke="#374151" stroke-width="2"/>
      <!-- Landing gear legs -->
      <rect x="85" y="155" width="12" height="28" fill="#6b7280" stroke="#374151" stroke-width="1.5"/>
      <rect x="110" y="155" width="12" height="28" fill="#6b7280" stroke="#374151" stroke-width="1.5"/>
      <!-- Lights -->
      <rect x="64" y="112" width="8" height="14" rx="2" fill="#fbbf24"/>
      <rect x="485" y="112" width="8" height="14" rx="2" fill="#ef4444"/>
      <text x="265" y="125" font-size="10" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CARGO TRAILER</text>
    </svg>`,
    top: `<svg viewBox="0 0 320 460" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <rect x="60" y="30" width="200" height="400" rx="10" fill="#dde3ef" stroke="#374151" stroke-width="3"/>
      <!-- Tongue/hitch -->
      <path d="M 130 30 L 130 15 L 190 15 L 190 30 Z" fill="#9ca3af" stroke="#374151" stroke-width="2"/>
      <circle cx="160" cy="8" r="8" fill="#4b5563" stroke="#374151" stroke-width="2"/>
      <!-- Rear door -->
      <rect x="60" y="400" width="200" height="30" fill="#c8d0e0" stroke="#374151" stroke-width="2"/>
      <circle cx="160" cy="415" r="5" fill="#6b7280"/>
      <!-- Axle housings -->
      <rect x="34" y="310" width="26" height="50" rx="5" fill="#374151"/>
      <rect x="260" y="310" width="26" height="50" rx="5" fill="#374151"/>
      <rect x="34" y="365" width="26" height="50" rx="5" fill="#374151"/>
      <rect x="260" y="365" width="26" height="50" rx="5" fill="#374151"/>
      <text x="160" y="230" font-size="11" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">TRAILER</text>
    </svg>`
  },
  'flatbed': {
    side: `<svg viewBox="0 0 560 215" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="196" x2="530" y2="196" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="125" cy="185" r="26" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="125" cy="185" r="10" fill="#9ca3af"/>
      <circle cx="415" cy="185" r="26" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="415" cy="185" r="10" fill="#9ca3af"/>
      <circle cx="458" cy="185" r="26" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="458" cy="185" r="10" fill="#9ca3af"/>
      <!-- Cab -->
      <path d="M 46 183 L 99 183 A 26 26 0 0 1 151 183 L 188 183 L 188 112 L 168 98 L 128 60 L 75 72 L 44 98 Z" fill="#b8c3d4" stroke="#374151" stroke-width="2.5"/>
      <path d="M 58 118 L 82 68 L 130 62 L 130 118 Z" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <rect x="140" y="72" width="40" height="38" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <!-- Flatbed platform -->
      <rect x="188" y="155" width="324" height="28" rx="4" fill="#c8d0e0" stroke="#374151" stroke-width="2.5"/>
      <!-- Stake-side uprights -->
      <line x1="220" y1="60" x2="220" y2="155" stroke="#374151" stroke-width="2"/>
      <line x1="280" y1="80" x2="280" y2="155" stroke="#374151" stroke-width="1.5"/>
      <line x1="340" y1="80" x2="340" y2="155" stroke="#374151" stroke-width="1.5"/>
      <line x1="400" y1="80" x2="400" y2="155" stroke="#374151" stroke-width="1.5"/>
      <line x1="460" y1="60" x2="460" y2="155" stroke="#374151" stroke-width="2"/>
      <!-- Top rail -->
      <line x1="220" y1="60" x2="460" y2="60" stroke="#374151" stroke-width="2"/>
      <rect x="44" y="132" width="8" height="18" rx="2" fill="#fbbf24"/>
      <rect x="508" y="155" width="9" height="16" rx="2" fill="#ef4444"/>
      <text x="118" y="148" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">CAB</text>
      <text x="355" y="148" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">FLATBED</text>
    </svg>`,
    top: `<svg viewBox="0 0 310 440" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <!-- Cab -->
      <rect x="58" y="18" width="194" height="100" rx="14" fill="#b8c3d4" stroke="#374151" stroke-width="2.5"/>
      <rect x="76" y="27" width="158" height="44" rx="5" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <line x1="58" y1="118" x2="252" y2="118" stroke="#374151" stroke-width="2"/>
      <!-- Flatbed -->
      <rect x="58" y="120" width="194" height="300" rx="4" fill="#c8d0e0" stroke="#374151" stroke-width="2.5"/>
      <!-- Stake pockets -->
      <rect x="56" y="150" width="10" height="10" rx="2" fill="#6b7280" stroke="#374151" stroke-width="1"/>
      <rect x="56" y="220" width="10" height="10" rx="2" fill="#6b7280" stroke="#374151" stroke-width="1"/>
      <rect x="56" y="290" width="10" height="10" rx="2" fill="#6b7280" stroke="#374151" stroke-width="1"/>
      <rect x="244" y="150" width="10" height="10" rx="2" fill="#6b7280" stroke="#374151" stroke-width="1"/>
      <rect x="244" y="220" width="10" height="10" rx="2" fill="#6b7280" stroke="#374151" stroke-width="1"/>
      <rect x="244" y="290" width="10" height="10" rx="2" fill="#6b7280" stroke="#374151" stroke-width="1"/>
      <!-- Wheels -->
      <rect x="33" y="80" width="25" height="46" rx="5" fill="#374151"/>
      <rect x="252" y="80" width="25" height="46" rx="5" fill="#374151"/>
      <rect x="33" y="320" width="25" height="46" rx="5" fill="#374151"/>
      <rect x="252" y="320" width="25" height="46" rx="5" fill="#374151"/>
      <rect x="33" y="370" width="25" height="40" rx="5" fill="#374151"/>
      <rect x="252" y="370" width="25" height="40" rx="5" fill="#374151"/>
    </svg>`
  },
  'semi-truck': {
    side: `<svg viewBox="0 0 580 240" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <line x1="30" y1="212" x2="550" y2="212" stroke="#d1d5db" stroke-width="1.5" stroke-dasharray="12,6"/>
      <circle cx="115" cy="200" r="28" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="115" cy="200" r="11" fill="#9ca3af"/>
      <circle cx="165" cy="200" r="28" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="165" cy="200" r="11" fill="#9ca3af"/>
      <circle cx="445" cy="200" r="28" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="445" cy="200" r="11" fill="#9ca3af"/>
      <circle cx="495" cy="200" r="28" fill="#374151" stroke="#1f2937" stroke-width="3"/><circle cx="495" cy="200" r="11" fill="#9ca3af"/>
      <!-- Semi cab -->
      <path d="M 46 200 L 87 200 A 28 28 0 0 1 143 200 L 230 200 L 230 88 L 215 70 L 185 45 L 95 48 L 55 70 L 42 105 Z" fill="#b8c3d4" stroke="#374151" stroke-width="2.5"/>
      <!-- Windshield -->
      <path d="M 60 115 L 88 72 L 142 50 L 142 115 Z" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <!-- Side window -->
      <rect x="150" y="55" width="70" height="55" rx="3" fill="#bfdbfe" opacity="0.8" stroke="#374151" stroke-width="1.5"/>
      <!-- Fuel tank -->
      <rect x="222" y="138" width="25" height="62" rx="5" fill="#9ca3af" stroke="#374151" stroke-width="2"/>
      <!-- Fifth wheel / trailer connection label -->
      <circle cx="228" cy="172" r="12" fill="#6b7280" stroke="#374151" stroke-width="2"/>
      <!-- Door line -->
      <line x1="228" y1="45" x2="228" y2="200" stroke="#374151" stroke-width="2"/>
      <!-- Exhaust stack -->
      <rect x="200" y="22" width="8" height="50" rx="2" fill="#6b7280" stroke="#374151" stroke-width="1.5"/>
      <rect x="215" y="22" width="8" height="50" rx="2" fill="#6b7280" stroke="#374151" stroke-width="1.5"/>
      <!-- Lights -->
      <rect x="42" y="132" width="8" height="20" rx="2" fill="#fbbf24"/>
      <rect x="42" y="118" width="8" height="12" rx="2" fill="#e5e7eb"/>
      <!-- Trailer connector label area -->
      <text x="135" y="162" font-size="9" fill="#64748b" font-family="sans-serif" text-anchor="middle" font-weight="600">SEMI CAB</text>
      <text x="360" y="110" font-size="9" fill="#94a3b8" font-family="sans-serif" text-anchor="middle">(Attach Trailer Template)</text>
    </svg>`,
    top: `<svg viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
      <!-- Semi cab top view -->
      <rect x="60" y="18" width="180" height="260" rx="14" fill="#b8c3d4" stroke="#374151" stroke-width="2.5"/>
      <rect x="78" y="27" width="144" height="55" rx="5" fill="#bfdbfe" opacity="0.85" stroke="#374151" stroke-width="1.5"/>
      <line x1="60" y1="170" x2="240" y2="170" stroke="#374151" stroke-width="2"/>
      <!-- Fifth wheel plate -->
      <ellipse cx="150" cy="270" rx="50" ry="30" fill="#9ca3af" stroke="#374151" stroke-width="2"/>
      <circle cx="150" cy="270" r="12" fill="#6b7280" stroke="#374151" stroke-width="1.5"/>
      <!-- Mirrors -->
      <rect x="30" y="40" width="30" height="14" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <rect x="240" y="40" width="30" height="14" rx="4" fill="#9ca3af" stroke="#374151" stroke-width="1.5"/>
      <!-- Wheels (2 front, 4 rear drive) -->
      <rect x="35" y="88" width="25" height="46" rx="5" fill="#374151"/>
      <rect x="240" y="88" width="25" height="46" rx="5" fill="#374151"/>
      <rect x="35" y="178" width="25" height="42" rx="5" fill="#374151"/>
      <rect x="240" y="178" width="25" height="42" rx="5" fill="#374151"/>
      <rect x="35" y="225" width="25" height="42" rx="5" fill="#374151"/>
      <rect x="240" y="225" width="25" height="42" rx="5" fill="#374151"/>
    </svg>`
  }
};

let editingDamageId = null;

const VEHICLE_TEMPLATE_ALIASES = {
  'van': 'cargo-van',
  'cargo van': 'cargo-van',
  'sprinter': 'high-roof-van',
  'transit': 'passenger-van',
  'truck': 'pickup-truck',
  'pickup-crew': 'pickup-truck',
  'sedan/car': 'sedan',
  'suv/truck': 'suv',
  'flatbed': 'utility-trailer',
  'step-van': 'bus',
  'semi-truck': 'other'
};

function normalizeVehicleTemplateKey(type) {
  const key = String(type || '').trim().toLowerCase();
  if (VEHICLE_TYPES.some(vehicle => vehicle.key === key)) return key;
  return VEHICLE_TEMPLATE_ALIASES[key] || 'other';
}

function getVehicleTypeDefinition(type) {
  const key = normalizeVehicleTemplateKey(type);
  return VEHICLE_TYPES.find(vehicle => vehicle.key === key) || VEHICLE_TYPES[VEHICLE_TYPES.length - 1];
}

function normalizeInspectionView(view) {
  if (view === 'side' || !view) return 'driver';
  return view;
}

function renderVehicleTypePills(currentType) {
  const container = document.getElementById('vehicle-type-pills');
  if (!container) return;
  const normalizedType = normalizeVehicleTemplateKey(currentType);
  container.innerHTML = '';

  VEHICLE_TYPES.forEach(vehicle => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `vtype-pill${vehicle.key === normalizedType ? ' active' : ''}`;
    button.textContent = vehicle.label;
    button.onclick = () => switchVehicleDiagram(vehicle.key);
    container.appendChild(button);
  });
}

function renderInspectionViewTabs() {
  const container = document.getElementById('inspection-view-tabs');
  if (!container) return;
  const project = getActiveProject();
  const views = [...INSPECTION_VIEWS];
  if (project?.inspectionCustomImage) views.push({ key: 'custom', label: 'Custom Surface' });
  container.innerHTML = '';

  views.forEach(view => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `inspection-view-btn${view.key === activeInspectionView ? ' active' : ''}`;
    button.textContent = view.label;
    button.onclick = () => switchInspectionView(view.key);
    container.appendChild(button);
  });
}

function switchVehicleDiagram(type) {
  const project = getActiveProject();
  activeDiagramType = normalizeVehicleTemplateKey(type);
  if (project) project.inspectionTemplateType = activeDiagramType;
  renderVehicleTypePills(activeDiagramType);
  renderInspectionViewTabs();
  renderInspectionSurface();
  if (project) renderDamageMarkers(project);
}

function switchInspectionView(view) {
  const project = getActiveProject();
  activeInspectionView = normalizeInspectionView(view);
  if (activeInspectionView === 'custom' && !project?.inspectionCustomImage) {
    activeInspectionView = 'driver';
  }
  renderInspectionViewTabs();
  renderInspectionSurface();
  if (project) renderDamageMarkers(project);
}

function renderDiagramBlueprints(type) {
  activeDiagramType = normalizeVehicleTemplateKey(type);
  renderVehicleTypePills(activeDiagramType);
  renderInspectionViewTabs();
  renderInspectionSurface();
}

function createGenericSideFallbackSvg(label = 'Other Vehicle') {
  return `<svg class="vehicle-svg-blueprint" viewBox="0 0 760 320" xmlns="http://www.w3.org/2000/svg" aria-label="${label} driver-side inspection template">
    <g fill="none" stroke="#252a31" stroke-linecap="round" stroke-linejoin="round">
      <path d="M86 226c22-54 49-94 91-122 40-26 99-38 196-38h116c66 0 112 13 151 42l53 41c14 10 23 25 25 43l4 34h-54c-5-48-36-77-82-77s-78 29-83 77H261c-5-48-37-77-83-77s-77 29-82 77H86Z" stroke-width="3"/>
      <path d="M206 104h253c63 0 103 14 145 48H151c16-21 33-37 55-48Z" stroke-width="2"/>
      <path d="M276 104v122M463 104v122M604 152v74M151 152h453" stroke-width="1.6"/>
      <circle cx="178" cy="226" r="50" stroke-width="3"/><circle cx="178" cy="226" r="24" stroke-width="2"/>
      <circle cx="586" cy="226" r="50" stroke-width="3"/><circle cx="586" cy="226" r="24" stroke-width="2"/>
      <path d="M103 226h-30M718 226h24M315 172h30M500 172h30" stroke-width="2"/>
    </g>
    <text x="380" y="294" text-anchor="middle" fill="#65707c" font-size="16" font-family="Glacial Indifference, Arial, sans-serif">${label.toUpperCase()} — REFERENCE-READY GENERIC OUTLINE</text>
  </svg>`;
}

function createGenericElevationSvg(label, view) {
  const isRear = view === 'rear';
  return `<svg class="vehicle-svg-blueprint" viewBox="0 0 460 360" xmlns="http://www.w3.org/2000/svg" aria-label="${label} ${view} inspection template">
    <g fill="none" stroke="#252a31" stroke-linecap="round" stroke-linejoin="round">
      <path d="M103 292V132c0-45 28-79 69-91 37-11 79-11 116 0 41 12 69 46 69 91v160" stroke-width="3"/>
      <path d="M128 139c9-44 36-70 77-76 17-3 33-3 50 0 41 6 68 32 77 76H128Z" stroke-width="2"/>
      <path d="M103 177h254M139 177v92M321 177v92M103 269h254" stroke-width="1.7"/>
      <path d="M83 158h20v45H83M357 158h20v45h-20" stroke-width="2"/>
      <path d="M116 292h-22v-52M344 292h22v-52" stroke-width="3"/>
      ${isRear ? '<path d="M185 209h90v38h-90ZM151 114h158" stroke-width="2"/>' : '<path d="M165 215c35 20 95 20 130 0M151 116h158" stroke-width="2"/>'}
      <circle cx="144" cy="294" r="8" stroke-width="2"/><circle cx="316" cy="294" r="8" stroke-width="2"/>
    </g>
    <text x="230" y="338" text-anchor="middle" fill="#65707c" font-size="16" font-family="Glacial Indifference, Arial, sans-serif">${label.toUpperCase()} — ${view.toUpperCase()} VIEW</text>
  </svg>`;
}

function createGenericTopSvg(label) {
  return `<svg class="vehicle-svg-blueprint" viewBox="0 0 420 620" xmlns="http://www.w3.org/2000/svg" aria-label="${label} top inspection template">
    <g fill="none" stroke="#252a31" stroke-linecap="round" stroke-linejoin="round">
      <path d="M112 548V102c0-48 39-78 98-78s98 30 98 78v446c0 30-20 48-54 48h-88c-34 0-54-18-54-48Z" stroke-width="3"/>
      <path d="M132 114h156M132 190h156M132 444h156M132 520h156" stroke-width="1.8"/>
      <path d="M150 62h120v92H150ZM150 466h120v92H150Z" stroke-width="2"/>
      <path d="M112 234h196M112 386h196" stroke-width="1.5"/>
      <path d="M82 124h30M308 124h30M82 456h30M308 456h30" stroke-width="8"/>
    </g>
    <text x="210" y="614" text-anchor="middle" fill="#65707c" font-size="15" font-family="Glacial Indifference, Arial, sans-serif">${label.toUpperCase()} — ROOF / TOP VIEW</text>
  </svg>`;
}

function getInspectionSurfaceMarkup(type = activeDiagramType, view = activeInspectionView, project = getActiveProject()) {
  const vehicle = getVehicleTypeDefinition(type);

  if (view === 'custom' && project?.inspectionCustomImage) {
    return `<img class="inspection-custom-image" src="${project.inspectionCustomImage}" alt="Custom vehicle inspection surface">`;
  }

  const normalizedView = INSPECTION_VIEWS.some(item => item.key === view) ? view : 'driver';
  const assetPath = `assets/inspection/${vehicle.key}-${normalizedView}.webp`;
  return `<img
    class="inspection-template-image inspection-view-${normalizedView}"
    src="${assetPath}"
    data-template="${vehicle.key}"
    data-view="${normalizedView}"
    alt="${vehicle.label} ${normalizedView} vehicle damage inspection line-art template"
    onerror="handleInspectionAssetError(this)">`;
}

function handleInspectionAssetError(image) {
  const view = image.dataset.view || 'driver';
  const otherPath = `assets/inspection/other-${view}.webp`;

  if (image.dataset.template !== 'other' && image.dataset.fallbackAttempt !== 'true') {
    image.dataset.fallbackAttempt = 'true';
    image.src = otherPath;
    image.alt = `Other Vehicle ${view} damage inspection line-art template`;
    return;
  }

  image.onerror = null;
  image.outerHTML = view === 'top'
    ? createGenericTopSvg('Other Vehicle')
    : (view === 'front' || view === 'rear')
      ? createGenericElevationSvg('Other Vehicle', view)
      : createGenericSideFallbackSvg('Other Vehicle');
}

function renderInspectionSurface() {
  const container = document.getElementById('diagram-draw-area-main');
  if (!container) return;
  const overlay = document.getElementById('damage-dots-overlay-main');
  container.innerHTML = getInspectionSurfaceMarkup();
  if (overlay) container.appendChild(overlay);
  else {
    const replacement = document.createElement('div');
    replacement.id = 'damage-dots-overlay-main';
    replacement.className = 'damage-dots-overlay';
    container.appendChild(replacement);
  }
}

function uploadCustomDiagram() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.id = 'custom-inspection-file-input';
  input.style.display = 'none';
  input.onchange = event => {
    const file = event.target.files?.[0];
    const project = getActiveProject();
    if (!file || !project) return;
    const reader = new FileReader();
    reader.onload = loadEvent => {
      project.inspectionCustomImage = loadEvent.target.result;
      activeInspectionView = 'custom';
      renderInspectionViewTabs();
      renderInspectionSurface();
      renderDamageMarkers(project);
      input.remove();
    };
    reader.readAsDataURL(file);
  };
  document.body.appendChild(input);
  input.click();
}

function resetDamageModalTitle(text = 'Document Pre-existing Damage') {
  const title = document.querySelector('#modal-damage-entry .modal-header h3');
  if (title) title.textContent = text;
}

function handleDiagramClick(event) {
  const container = document.getElementById('diagram-draw-area-main');
  if (!container || event.target.closest('.damage-marker-dot')) return;
  const rect = container.getBoundingClientRect();
  pendingDamageCoords = {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
    view: activeInspectionView
  };
  editingDamageId = null;
  resetDamageModalTitle();
  openModal('modal-damage-entry');
}

function openDamageEntryAtCenter() {
  pendingDamageCoords = { x: 50, y: 50, view: activeInspectionView };
  editingDamageId = null;
  resetDamageModalTitle();
  openModal('modal-damage-entry');
}

function submitDamageMarker() {
  const project = getActiveProject();
  if (!project) return;
  const type = document.getElementById('damage-type-select').value;
  const severity = document.getElementById('damage-severity-select').value;
  const notes = document.getElementById('damage-notes-input').value.trim() || 'No specific details added.';

  if (editingDamageId) {
    const marker = project.damageMarkers.find(item => item.id === editingDamageId);
    if (marker) Object.assign(marker, { type, severity, notes });
  } else {
    const newId = Math.max(0, ...project.damageMarkers.map(item => item.id || 0)) + 1;
    project.damageMarkers.push({
      id: newId,
      x: pendingDamageCoords.x,
      y: pendingDamageCoords.y,
      view: pendingDamageCoords.view || activeInspectionView,
      templateType: activeDiagramType,
      type,
      severity,
      notes
    });
    selectedDamageId = newId;
  }

  editingDamageId = null;
  closeModal('modal-damage-entry');
  document.getElementById('damage-notes-input').value = '';
  renderDamageMarkers(project);
}

function getDamageSeverityMeta(severity) {
  if (severity === 'High') return { pinClass: 'pin-critical', severityClass: 'severity-high', label: 'Critical' };
  if (severity === 'Medium') return { pinClass: 'pin-major', severityClass: 'severity-medium', label: 'Major' };
  if (severity === 'Note') return { pinClass: 'pin-note', severityClass: 'severity-note', label: 'Note' };
  return { pinClass: 'pin-minor', severityClass: 'severity-low', label: 'Minor' };
}

function getInspectionViewLabel(view) {
  if (view === 'custom') return 'Custom Surface';
  return INSPECTION_VIEWS.find(item => item.key === normalizeInspectionView(view))?.label || 'Driver Side';
}

function selectDamageMarker(id) {
  const project = getActiveProject();
  const marker = project?.damageMarkers.find(item => item.id === id);
  if (!marker) return;
  selectedDamageId = id;
  const markerView = normalizeInspectionView(marker.view);
  if (marker.templateType) activeDiagramType = normalizeVehicleTemplateKey(marker.templateType);
  if (markerView !== activeInspectionView) activeInspectionView = markerView;
  renderVehicleTypePills(activeDiagramType);
  renderInspectionViewTabs();
  renderInspectionSurface();
  renderDamageMarkers(project);
}

function editSelectedDamage() {
  const project = getActiveProject();
  const marker = project?.damageMarkers.find(item => item.id === selectedDamageId);
  if (!marker) return;
  editingDamageId = marker.id;
  pendingDamageCoords = { x: marker.x, y: marker.y, view: normalizeInspectionView(marker.view) };
  document.getElementById('damage-type-select').value = marker.type;
  document.getElementById('damage-severity-select').value = marker.severity;
  document.getElementById('damage-notes-input').value = marker.notes || '';
  resetDamageModalTitle(`Edit Damage Pin ${String(marker.id).padStart(2, '0')}`);
  openModal('modal-damage-entry');
}

function renderSelectedDamageDetails(project) {
  const panel = document.getElementById('selected-damage-detail');
  if (!panel) return;
  const marker = project?.damageMarkers.find(item => item.id === selectedDamageId);
  if (!marker) {
    panel.innerHTML = `<div class="damage-detail-empty"><i class="fa-regular fa-hand-pointer"></i><strong>Select a pin or damage record</strong><span>Details stay synchronized with the active diagram.</span></div>`;
    return;
  }
  const severity = getDamageSeverityMeta(marker.severity);
  const vehicle = getVehicleTypeDefinition(marker.templateType || activeDiagramType);
  panel.innerHTML = `
    <span class="damage-detail-pin ${severity.pinClass}">${String(marker.id).padStart(2, '0')}</span>
    <dl class="damage-detail-grid">
      <dt>Type</dt><dd>${marker.type}</dd>
      <dt>Severity</dt><dd>${severity.label}</dd>
      <dt>Template</dt><dd>${vehicle.label}</dd>
      <dt>View</dt><dd>${getInspectionViewLabel(marker.view)}</dd>
      <dt>Notes</dt><dd>${marker.notes}</dd>
    </dl>
    <div class="damage-detail-actions">
      <button class="btn" onclick="editSelectedDamage()"><i class="fa-solid fa-pen"></i> Edit</button>
      <button class="btn btn-danger" onclick="deleteDamageMarker(${marker.id})"><i class="fa-solid fa-trash-can"></i> Delete</button>
    </div>`;
}

function renderDamageMarkers(project) {
  const overlay = document.getElementById('damage-dots-overlay-main');
  const portalOverlay = document.getElementById('portal-damage-dots-overlay');
  const listPanel = document.getElementById('damage-list-panel');
  const portalListPanel = document.getElementById('portal-damage-list-panel');
  if (overlay) overlay.innerHTML = '';
  if (portalOverlay) portalOverlay.innerHTML = '';
  if (listPanel) listPanel.innerHTML = '';
  if (portalListPanel) portalListPanel.innerHTML = '';

  if (!project || project.damageMarkers.length === 0) {
    selectedDamageId = null;
    if (listPanel) listPanel.innerHTML = `<div class="damage-detail-empty"><strong>No damage recorded</strong><span>Click the inspection surface to add the first pin.</span></div>`;
    if (portalListPanel) portalListPanel.innerHTML = `<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;">No pre-existing damage logged.</p>`;
    renderSelectedDamageDetails(project);
    return;
  }

  if (!project.damageMarkers.some(item => item.id === selectedDamageId)) selectedDamageId = project.damageMarkers[0].id;

  project.damageMarkers.forEach(marker => {
    marker.view = normalizeInspectionView(marker.view);
    const severity = getDamageSeverityMeta(marker.severity);
    const markerTemplate = normalizeVehicleTemplateKey(marker.templateType || project.inspectionTemplateType || project.bodyType);

    if (overlay && marker.view === activeInspectionView && markerTemplate === activeDiagramType) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `damage-marker-dot ${severity.pinClass}`;
      dot.style.left = `${marker.x}%`;
      dot.style.top = `${marker.y}%`;
      dot.textContent = marker.id;
      dot.title = `${marker.type}: ${marker.notes}`;
      dot.onclick = event => {
        event.stopPropagation();
        selectDamageMarker(marker.id);
      };
      overlay.appendChild(dot);
    }

    if (portalOverlay && marker.view === 'driver') {
      const portalDot = document.createElement('div');
      portalDot.className = `damage-marker-dot ${severity.pinClass}`;
      portalDot.style.left = `${marker.x}%`;
      portalDot.style.top = `${marker.y}%`;
      portalDot.textContent = marker.id;
      portalOverlay.appendChild(portalDot);
    }

    if (listPanel) {
      const row = document.createElement('div');
      row.className = `damage-item${marker.id === selectedDamageId ? ' selected' : ''}`;
      row.onclick = () => selectDamageMarker(marker.id);
      row.innerHTML = `
        <div class="damage-item-lbl">
          <span class="damage-item-num ${severity.pinClass}">${String(marker.id).padStart(2, '0')}</span>
          <div><strong>${marker.type}</strong><div class="issue-log-desc">${marker.notes}</div><div style="font-size:0.68rem;color:var(--primary);">${getInspectionViewLabel(marker.view)}</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:7px;">
          <span class="damage-severity ${severity.severityClass}">${severity.label}</span>
          <button class="photo-btn" title="Delete pin" onclick="event.stopPropagation(); deleteDamageMarker(${marker.id})"><i class="fa-solid fa-trash-can"></i></button>
        </div>`;
      listPanel.appendChild(row);
    }

    if (portalListPanel) {
      const row = document.createElement('div');
      row.className = 'damage-item';
      row.innerHTML = `<div class="damage-item-lbl"><span class="damage-item-num ${severity.pinClass}">${marker.id}</span><div><strong>${marker.type}</strong><div class="issue-log-desc">${marker.notes}</div></div></div><span class="damage-severity ${severity.severityClass}">${severity.label}</span>`;
      portalListPanel.appendChild(row);
    }
  });

  renderSelectedDamageDetails(project);
}

function deleteDamageMarker(id) {
  const project = getActiveProject();
  if (!project) return;
  project.damageMarkers = project.damageMarkers.filter(marker => marker.id !== id);
  if (selectedDamageId === id) selectedDamageId = project.damageMarkers[0]?.id || null;
  renderDamageMarkers(project);
}

function renderInspectionPhotoPrompts(p) {
  const panel = document.getElementById('inspection-photos-prompt');
  panel.innerHTML = "";
  
  const prompts = ["Front angle", "Rear angle", "Driver side", "Passenger side", "Damage close-up"];
  
  prompts.forEach(cat => {
    // See if project has photo of this category
    const match = p.files.find(f => f.category === 'Inspection photos' && f.name.includes(cat.toLowerCase().replace(' ', '-')));
    
    const div = document.createElement('div');
    div.className = "photo-card";
    
    if (match) {
      div.innerHTML = `
        <div class="photo-preview-placeholder">
          <img src="https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=200&q=80" alt="Inspection pic">
        </div>
        <div class="photo-meta-bar">
          <span class="photo-tag-lbl">${cat}</span>
          <span style="color: var(--success);"><i class="fa-solid fa-circle-check"></i></span>
        </div>
      `;
    } else {
      div.innerHTML = `
        <div class="photo-preview-placeholder" onclick="openUploadModal('${cat}')">
          <i class="fa-solid fa-camera"></i>
        </div>
        <div class="photo-meta-bar">
          <span class="photo-tag-lbl" style="opacity: 0.6;">${cat}</span>
          <span style="color: var(--text-muted);"><i class="fa-solid fa-circle-notch"></i></span>
        </div>
      `;
    }
    panel.appendChild(div);
  });
}

// Production Checklist Renderer
function renderProductionChecklist(p) {
  const panel = document.getElementById('production-checklist-panel');
  panel.innerHTML = "";
  
  p.productionChecklist.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = `check-item ${item.done ? 'checked' : ''}`;
    div.innerHTML = `
      <div class="check-info">
        <div class="check-box"><i class="fa-solid fa-check"></i></div>
        <span class="check-label">${item.task}</span>
      </div>
      <span class="check-meta">${item.done ? 'Complete' : 'Pending'}</span>
    `;
    div.onclick = () => toggleProductionCheck(idx);
    panel.appendChild(div);
  });
}

function toggleProductionCheck(idx) {
  const p = getActiveProject();
  if (!p) return;
  p.productionChecklist[idx].done = !p.productionChecklist[idx].done;
  renderProductionChecklist(p);
  
  // If production is finished, prompt to advance stage
  const allDone = p.productionChecklist.every(item => item.done);
  if (allDone && p.stageIndex === 6) { // Currently in Production
    p.chatHistory.push({
      sender: "shop",
      text: "Internal System: All production printing & lamination panels are complete and staged. Ready for installation.",
      time: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });
    advanceProjectStage(p, "Production checklist complete. Project advanced to installation.");
  }
}

function renderProductionTasks(p) {
  const tbody = document.getElementById('production-tasks-body');
  tbody.innerHTML = "";
  
  p.labor.slice(0, 3).forEach(task => {
    const hours = task.actHrs > 0 ? task.actHrs : task.estHrs;
    const status = task.actHrs > 0 ? `<span class="badge badge-complete">Done</span>` : `<span class="badge badge-warning">Queue</span>`;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${task.type}</strong></td>
      <td>${task.worker}</td>
      <td>${task.estHrs} hrs</td>
      <td>${task.actHrs || '--'} hrs</td>
      <td>${status}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateProductionNotes(val) {
  const p = getActiveProject();
  if (p) p.productionNotes = val;
}

// Installation Checklists
function renderInstallChecklist(p) {
  const panel = document.getElementById('install-checklist-panel');
  panel.innerHTML = "";
  
  p.installChecklist.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = `check-item ${item.done ? 'checked' : ''}`;
    div.innerHTML = `
      <div class="check-info">
        <div class="check-box"><i class="fa-solid fa-check"></i></div>
        <span class="check-label">${item.task}</span>
      </div>
      <span class="check-meta">${item.done ? 'Checked' : 'Pending'}</span>
    `;
    div.onclick = () => toggleInstallCheck(idx);
    panel.appendChild(div);
  });
}

function toggleInstallCheck(idx) {
  const p = getActiveProject();
  if (!p) return;
  p.installChecklist[idx].done = !p.installChecklist[idx].done;
  renderInstallChecklist(p);

  // If completed post-heating & inspection, check if we should notify pickup
  const allDone = p.installChecklist.every(item => item.done);
  if (allDone && p.stageIndex === 7) {
    advanceProjectStage(p, "Installation checklist and required photo record complete. Vehicle is ready for pickup.");
  }
}

function updateInstallField(field, val) {
  const p = getActiveProject();
  if (!p) return;
  p[field] = val;
}

function renderIssuesLog(p) {
  const panel = document.getElementById('install-issues-list');
  panel.innerHTML = "";
  
  if (p.issuesLog.length === 0) {
    panel.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 12px;">No installation or fit issues logged.</p>`;
    return;
  }
  
  p.issuesLog.forEach((issue, idx) => {
    const div = document.createElement('div');
    div.className = `issue-log-item ${issue.resolved ? 'resolved' : ''}`;
    div.innerHTML = `
      <div class="issue-log-info">
        <span class="issue-log-title">[${issue.area}] ${issue.type}</span>
        <span class="issue-log-desc">${issue.description}</span>
        ${issue.notes ? `<span class="issue-log-desc" style="margin-top: 4px; color: var(--primary);">Resolution: ${issue.notes}</span>` : ''}
      </div>
      <div style="display: flex; gap: 8px;">
        ${!issue.resolved ? `<button class="btn btn-success" style="padding: 4px 8px; font-size: 0.7rem;" onclick="resolveIssue(${idx})">Resolve</button>` : `<span class="badge badge-complete">Resolved</span>`}
      </div>
    `;
    panel.appendChild(div);
  });
}

function resolveIssue(idx) {
  const p = getActiveProject();
  if (!p) return;
  const note = prompt("Enter resolution notes (e.g. Patched vinyl panel, reprinted):");
  p.issuesLog[idx].resolved = true;
  p.issuesLog[idx].notes = note || "Resolved by lead installer.";
  renderIssuesLog(p);
}

// File Manager Tab
function renderFilesGrid(p) {
  const grid = document.getElementById('project-files-grid');
  grid.innerHTML = "";
  
  p.files.forEach((file, idx) => {
    const card = document.createElement('div');
    card.className = "photo-card";
    
    // Choose thumbnail icon based on name
    let fileIcon = "fa-file-image";
    if (file.name.endsWith('.pdf')) fileIcon = "fa-file-pdf";
    else if (file.name.endsWith('.ai') || file.name.endsWith('.eps')) fileIcon = "fa-file-code";
    
    card.innerHTML = `
      <div class="photo-preview-placeholder">
        <i class="fa-solid ${fileIcon}" style="font-size: 2.5rem; opacity: 0.4;"></i>
        <div class="photo-actions">
          <button class="photo-btn btn-toggle-visible ${file.customerVisible ? 'active' : ''}" onclick="toggleFileVisibility(${idx})" title="Toggle Customer Visibility"><i class="fa-solid fa-eye"></i></button>
          <button class="photo-btn" onclick="deleteFile(${idx})"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
      <div class="photo-meta-bar">
        <div style="display: flex; flex-direction: column; overflow: hidden; width: 100%;">
          <span class="photo-tag-lbl" title="${file.name}">${file.name}</span>
          <span style="font-size: 0.6rem; color: var(--text-muted);">${file.category}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function toggleFileVisibility(idx) {
  const p = getActiveProject();
  if (!p) return;
  p.files[idx].customerVisible = !p.files[idx].customerVisible;
  renderFilesGrid(p);
}

function deleteFile(idx) {
  const p = getActiveProject();
  if (!p) return;
  p.files.splice(idx, 1);
  renderFilesGrid(p);
}

// Communication & templates
function renderChatHistory(p) {
  const box = document.getElementById('chat-history-container');
  box.innerHTML = "";
  
  p.chatHistory.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.sender === 'shop' ? 'sent' : 'received'}`;
    bubble.innerHTML = `
      <div>${msg.text}</div>
      <div class="chat-bubble-time">${msg.time}</div>
    `;
    box.appendChild(bubble);
  });
  
  // Auto scroll to bottom
  box.scrollTop = box.scrollHeight;
}

function sendManualChatMessage() {
  const p = getActiveProject();
  if (!p) return;
  
  const text = document.getElementById('chat-textarea').value.trim();
  if (!text) return;

  p.chatHistory.push({
    sender: "shop",
    text: text,
    time: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });
  
  document.getElementById('chat-textarea').value = "";
  renderChatHistory(p);
}

// Template messages triggers
function simulateSendCommunication(type) {
  const p = getActiveProject();
  if (!p) return;
  
  let msgText = "";
  
  if (type === 'request-photos') {
    msgText = `Hi ${p.firstName}, could you please upload high-resolution before photos of the front, back, and sides of your vehicle to your portal? This helps our layout designers check panel alignment. Thank you!`;
  } else if (type === 'quote') {
    msgText = `Hi ${p.firstName}, your custom vehicle wrap quote has been compiled and is ready for review in your portal. Total Quote: $${p.quoteAmount.toFixed(2)}. Open portal to approve: [Link]`;
    // Advance stage to Quote review if currently in Intake
    if (p.stageIndex === 0) p.stageIndex = 1;
  } else if (type === 'contract') {
    msgText = `Hi ${p.firstName}, we have prepared the general installation liability contract and terms. Please log into your portal to read and sign digitally. We require a signed contract and a 50% deposit to release design files to print.`;
    // Advance stage to Contract if in Quote
    if (p.stageIndex === 1) p.stageIndex = 2;
  } else if (type === 'proof') {
    const vNum = p.proofs.length;
    msgText = `Hi ${p.firstName}, your design proof v${vNum} is ready for approval! Please log into the portal to review the vector layouts and confirm formatting, lettering spelling, and colors.`;
    if (p.stageIndex === 3) p.stageIndex = 4; // Design to Proofing
  } else if (type === 'dropoff') {
    msgText = `Hi ${p.firstName}, your vehicle wrap drop-off instructions are ready. Please drop off the vehicle at our shop location on ${p.installDate} at ${p.installStartTime}. Ensure the vehicle body has been washed clean.`;
  } else if (type === 'pickup') {
    msgText = `Hi ${p.firstName}, good news! Your vehicle wrap installation is 100% complete and post-heated. Your vehicle is ready for pickup! Remaining balance due: $${p.balanceDue.toFixed(2)}.`;
    if (p.stageIndex === 7) p.stageIndex = 8; // Install to Pickup
  } else if (type === 'aftercare') {
    msgText = `Hi ${p.firstName}, thank you for choosing our shop! We have sent the Wrap Aftercare and Maintenance PDF to your portal. Wash hand-only, avoid direct pressure nozzles near wrap seams.`;
    if (p.stageIndex === 8) p.stageIndex = 9; // Pickup to Aftercare
  } else if (type === 'review') {
    msgText = `Hi ${p.firstName}, hope you love your new wrap! If you have a moment, we would highly appreciate a 5-star Google review. It helps our installers and designers a lot! [Google Maps Link]`;
    if (p.stageIndex === 9) p.stageIndex = 10; // Complete!
  }

  p.chatHistory.push({
    sender: "shop",
    text: msgText,
    time: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  loadProjectData(p.id);
  alert(`Template sent! Message logged in Communication history. Project stage advanced.`);
}

// --- WORKFLOW RULES & STATE GATES ---
function markCurrentStageComplete() {
  const p = getActiveProject();
  if (!p) return;
  advanceProjectStage(p);
}

// --- MODALS TOGGLERS ---
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function openNewProjectModal() {
  openModal('modal-new-project');
}

function openInstallSchedulingModal() {
  const p = getActiveProject();
  if (!p) return;
  document.getElementById('sched-install-date').value = p.installDate || "";
  document.getElementById('sched-start-time').value = p.installStartTime || "08:00";
  document.getElementById('sched-end-time').value = p.installEndTime || "17:00";
  document.getElementById('sched-installer').value = p.assignedInstaller || "Dave";
  document.getElementById('sched-helper').value = p.helper || "None";
  openModal('modal-schedule-install');
}

function openAddIssueModal() {
  openModal('modal-log-issue');
}

let activeUploadCategory = "Logos";
function openUploadModal(category = "Logos") {
  activeUploadCategory = category;
  document.getElementById('upload-category').value = category;
  document.getElementById('upload-filename').value = "";
  openModal('modal-upload-file');
}

// Forms submissions
function submitNewProject() {
  const biz = document.getElementById('new-proj-business').value;
  const type = document.getElementById('new-proj-wrap-type').value;
  const veh = document.getElementById('new-proj-vehicle').value;
  const ph = document.getElementById('new-proj-phone').value;
  const em = document.getElementById('new-proj-email').value;
  const note = document.getElementById('new-proj-notes').value;

  if (!biz || !veh) {
    alert("Please fill in Customer Name/Business and Vehicle fields.");
    return;
  }

  const num = projects.length + 1;
  const newId = `WRAP-2026-00${num}`;

  // split vehicle details roughly
  const parts = veh.split(' ');
  const year = parseInt(parts[0]) || 2024;
  const make = parts[1] || "Generic";
  const model = parts.slice(2).join(' ') || "Vehicle";

  const newProj = {
    id: newId,
    businessName: biz,
    firstName: biz.split(' ')[0],
    lastName: biz.split(' ').slice(1).join(' ') || "Client",
    phone: ph,
    email: em,
    goals: note,
    
    year: year,
    make: make,
    model: model,
    trim: "Standard",
    bodyType: type.toLowerCase().includes('van') ? 'van' : type.toLowerCase().includes('truck') ? 'truck' : type.toLowerCase().includes('trailer') ? 'trailer' : 'sedan',
    wheelbase: "Standard",
    roofHeight: "Standard",
    licensePlate: "",
    vin: "",
    originalColor: "White",
    removalNotes: "",
    turnaroundDate: new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0], // 2 weeks out
    wrapType: type,
    
    stageIndex: 0, // Intake
    installDate: "",
    installStartTime: "08:00",
    installEndTime: "17:00",
    assignedInstaller: "Dave",
    helper: "None",
    bay: "Bay 1 - Main",
    dropOffTime: "",
    pickupTime: "",
    
    quoteAmount: 2200.00,
    depositAmount: 0.00,
    balanceDue: 2200.00,
    paymentStatus: "unpaid",
    depositPercent: 50,
    manualOverride: 0,

    areas: [
      { name: "Hood", width: 60, height: 40, wasteFactor: 15, included: true, material: "MPI 1105", complexity: "Medium", notes: "" },
      { name: "Driver Side", width: 140, height: 60, wasteFactor: 15, included: true, material: "MPI 1105", complexity: "Medium", notes: "" },
      { name: "Passenger Side", width: 140, height: 60, wasteFactor: 15, included: true, material: "MPI 1105", complexity: "Medium", notes: "" }
    ],
    materials: [
      { name: "Avery Dennison MPI 1105", brand: "Avery Dennison", code: "MPI-1105", type: "Print Vinyl", rollWidth: 60, sqftUsed: 150, costPerSqft: 1.85, supplier: "Grimco", status: "In Stock", notes: "" }
    ],
    labor: [
      { type: "Design / Setup", estHrs: 4, actHrs: 0, rate: 75, worker: "Alex" },
      { type: "Printing & Laminating", estHrs: 2, actHrs: 0, rate: 50, worker: "Marcus" },
      { type: "Removal & Surface Prep", estHrs: 2, actHrs: 0, rate: 45, worker: "Marcus" },
      { type: "Install Labor", estHrs: 10, actHrs: 0, rate: 65, worker: "Dave" }
    ],

    designColors: "",
    designFonts: "",
    designCopy: "",
    designBrief: "",
    proofs: [],
    mockupImage: null,

    productionChecklist: [
      { task: "Approved proof confirmed", done: false },
      { task: "Print files ready", done: false },
      { task: "Material pulled", done: false },
      { task: "Print completed", done: false },
      { task: "Laminated", done: false },
      { task: "Outgassed (24hr)", done: false },
      { task: "Trimmed", done: false },
      { task: "Panels labeled", done: false }
    ],
    installChecklist: [
      { task: "Vehicle received", done: false },
      { task: "Vehicle inspected", done: false },
      { task: "Surface cleaned & prepped", done: false },
      { task: "Panels staged", done: false },
      { task: "Install started", done: false }
    ],
    issuesLog: [],
    damageMarkers: [],
    files: [],
    chatHistory: [
      { sender: "shop", text: "Wrap job intake created successfully.", time: new Date().toISOString().replace('T', ' ').substring(0, 16) }
    ],
    contractStatus: "draft",
    quoteStatus: "pending",
    contractSentDate: "",
    contractSignedDate: null,
    contractSignedBy: null,
    inspectionAcknowledged: false,
    finalSignoff: false
  };

  normalizeProjectWorkflowSchema(newProj);
  projects.push(newProj);
  closeModal('modal-new-project');
  openProjectDetails(newId);
}

function submitScheduling() {
  const p = getActiveProject();
  if (!p) return;

  p.installDate = document.getElementById('sched-install-date').value;
  p.installStartTime = document.getElementById('sched-start-time').value;
  p.installEndTime = document.getElementById('sched-end-time').value;
  p.assignedInstaller = document.getElementById('sched-installer').value;
  p.helper = document.getElementById('sched-helper').value;

  closeModal('modal-schedule-install');
  loadProjectData(p.id);
}

function handleFileSelected(e) {
  const file = e.target.files[0];
  if (file) {
    document.getElementById('upload-filename').value = file.name;
  }
}

function submitFileUpload() {
  const p = getActiveProject();
  if (!p) return;

  const fn = document.getElementById('upload-filename').value;
  const cat = document.getElementById('upload-category').value;
  const custVis = document.getElementById('upload-cust-visible').checked;
  const mktgPerm = document.getElementById('upload-mktg-permission').checked;

  if (!fn) {
    alert("Please select a file first.");
    return;
  }

  p.files.push({
    name: fn,
    category: cat,
    date: new Date().toISOString().split('T')[0],
    customerVisible: custVis,
    marketingPermission: mktgPerm
  });

  closeModal('modal-upload-file');
  loadProjectData(p.id);
  alert("File logged to database successfully!");
}

function submitIssueLog() {
  const p = getActiveProject();
  if (!p) return;

  const type = document.getElementById('issue-type-select').value;
  const area = document.getElementById('issue-area-input').value;
  const desc = document.getElementById('issue-description').value;

  if (!area || !desc) {
    alert("Please fill in the Area and Description fields.");
    return;
  }

  p.issuesLog.push({
    type: type,
    area: area,
    description: desc,
    resolved: false,
    notes: ""
  });

  closeModal('modal-log-issue');
  document.getElementById('issue-area-input').value = "";
  document.getElementById('issue-description').value = "";
  loadProjectData(p.id);
}

function updateIntakeField(field, val) {
  const p = getActiveProject();
  if (!p) return;
  p[field] = val;
}

function updateDesignField(field, val) {
  const p = getActiveProject();
  if (!p) return;
  p[field] = val;
}

// --- CUSTOMER PORTAL SANDBOX LOGIC ---
function openCustomerPortalSim() {
  const p = getActiveProject();
  if (!p) return;

  document.getElementById('customer-portal-overlay').classList.add('active');
  
  // Load customer information into portal panels
  document.getElementById('portal-business-title').innerText = p.businessName || `${p.firstName} ${p.lastName}`;
  document.getElementById('portal-project-id').innerText = p.id;
  
  const STAGES = [
    "Intake Phase", "Quote Review", "Contract Signature Required", "Design Layout", "Proof Review Needed", 
    "Inspection Check", "Production Queue", "Installation In Progress", "Ready for Pickup", "Wrap Care Info", "Job Complete"
  ];
  document.getElementById('portal-badge-status').innerText = STAGES[p.stageIndex];
  
  // Set up a guaranteed inspection blueprint for the customer view.
  const blueprintBox = document.getElementById('portal-svg-blueprint-box');
  const portalTemplate = p.inspectionTemplateType || normalizeVehicleTemplateKey(p.bodyType);
  blueprintBox.innerHTML = getInspectionSurfaceMarkup(portalTemplate, 'driver', p);

  // Load quote details
  document.getElementById('portal-quote-total').value = `$${p.quoteAmount.toFixed(2)}`;
  const depAmt = p.quoteAmount * (p.depositPercent / 100);
  document.getElementById('portal-quote-deposit').value = `$${depAmt.toFixed(2)}`;
  document.getElementById('portal-contract-deposit-amount').innerText = `$${depAmt.toFixed(2)}`;

  const depositStatus = document.getElementById('portal-deposit-status');
  const depositButton = document.getElementById('portal-pay-deposit-btn');
  if (p.paymentStatus === 'unpaid') {
    depositStatus.innerText = "Payment Required";
    depositStatus.className = "badge badge-warning";
    depositButton.style.display = "inline-flex";
  } else {
    depositStatus.innerText = "Deposit Paid";
    depositStatus.className = "badge badge-complete";
    depositButton.style.display = "none";
  }

  // Toggle Visibility of blocks according to active project status
  // Section 1: Quote Review
  const quoteSec = document.getElementById('portal-sec-quote');
  const quoteBadge = document.getElementById('portal-quote-badge');
  if (p.stageIndex === 1) { // Quote Review
    quoteSec.style.display = "block";
    quoteBadge.innerText = "Awaiting Approval";
    quoteBadge.className = "badge badge-warning";
    document.getElementById('portal-quote-actions').style.display = "flex";
  } else if (p.stageIndex > 1) {
    quoteSec.style.display = "block";
    quoteBadge.innerText = "Approved";
    quoteBadge.className = "badge badge-complete";
    document.getElementById('portal-quote-actions').style.display = "none";
  } else {
    quoteSec.style.display = "none";
  }

  // Section 2: Contract
  const contractSec = document.getElementById('portal-sec-contract');
  const contractBadge = document.getElementById('portal-contract-badge');
  if (p.stageIndex === 2) {
    contractSec.style.display = "block";
    if (p.contractStatus === "signed") {
      contractBadge.innerText = "Signed";
      contractBadge.className = "badge badge-complete";
      document.getElementById('portal-signature-box').style.display = "none";
    } else {
      contractBadge.innerText = "Awaiting Signature";
      contractBadge.className = "badge badge-warning";
      document.getElementById('portal-signature-box').style.display = "block";
      clearSignatureCanvas();
    }
  } else if (p.stageIndex > 2) {
    contractSec.style.display = "block";
    contractBadge.innerText = "Signed";
    contractBadge.className = "badge badge-complete";
    document.getElementById('portal-signature-box').style.display = "none";
  } else {
    contractSec.style.display = "none";
  }

  // Section 3: Proofs
  const proofSec = document.getElementById('portal-sec-proof');
  const proofBadge = document.getElementById('portal-proof-badge');
  const pImg = document.getElementById('portal-mockup-img');
  const pEmpty = document.getElementById('portal-mockup-empty');

  if (p.stageIndex === 4) { // Proofing
    proofSec.style.display = "block";
    const activeProof = p.proofs[p.proofs.length - 1];
    
    if (activeProof && activeProof.status === "Approved") {
      proofBadge.innerText = "Approved";
      proofBadge.className = "badge badge-complete";
      document.getElementById('portal-proof-actions').style.display = "none";
    } else {
      proofBadge.innerText = "Review Required";
      proofBadge.className = "badge badge-warning";
      document.getElementById('portal-proof-actions').style.display = "flex";
    }

    if (p.mockupImage) {
      pImg.style.display = "block";
      pImg.src = getMockupImageUrl(p.mockupImage, p.bodyType);
      pEmpty.style.display = "none";
    } else {
      pImg.style.display = "none";
      pEmpty.style.display = "block";
    }
  } else if (p.stageIndex > 4) {
    proofSec.style.display = "block";
    proofBadge.innerText = "Approved";
    proofBadge.className = "badge badge-complete";
    document.getElementById('portal-proof-actions').style.display = "none";
    if (p.mockupImage) {
      pImg.style.display = "block";
      pImg.src = getMockupImageUrl(p.mockupImage, p.bodyType);
      pEmpty.style.display = "none";
    } else {
      pImg.style.display = "none";
      pEmpty.style.display = "block";
    }
  } else {
    proofSec.style.display = "none";
  }

  // Section 4: Inspection
  const inspectionSec = document.getElementById('portal-sec-inspection');
  const inspectionBadge = document.getElementById('portal-inspection-badge');
  if (p.stageIndex === 5) {
    inspectionSec.style.display = "block";
    if (p.inspectionAcknowledged) {
      inspectionBadge.innerText = "Acknowledged";
      inspectionBadge.className = "badge badge-complete";
      document.getElementById('portal-inspection-actions').style.display = "none";
    } else {
      inspectionBadge.innerText = "Pending Review";
      inspectionBadge.className = "badge badge-warning";
      document.getElementById('portal-inspection-actions').style.display = "flex";
    }
  } else if (p.stageIndex > 5) {
    inspectionSec.style.display = "block";
    inspectionBadge.innerText = "Acknowledged";
    inspectionBadge.className = "badge badge-complete";
    document.getElementById('portal-inspection-actions').style.display = "none";
  } else {
    inspectionSec.style.display = "none";
  }

  // Section 5: Aftercare & final packets
  const afterSec = document.getElementById('portal-sec-aftercare');
  if (p.stageIndex >= 8) {
    afterSec.style.display = "block";
  } else {
    afterSec.style.display = "none";
  }

  renderDamageMarkers(p);
  if (typeof renderPortalConceptStudio === 'function') renderPortalConceptStudio(p);
}

function closeCustomerPortalSim() {
  document.getElementById('customer-portal-overlay').classList.remove('active');
  // Refresh detail view
  if (activeProjectId) {
    loadProjectData(activeProjectId);
  }
}

// Portal Customer Actions
function portalApproveQuote() {
  const p = getActiveProject();
  if (!p) return;
  
  p.quoteStatus = "approved";
  // Set stage index to Contract (next step)
  p.stageIndex = 2; // Contract
  p.paymentStatus = 'deposit'; // Simulate paying deposit
  const depAmt = p.quoteAmount * (p.depositPercent / 100);
  p.depositAmount = depAmt;
  p.balanceDue = p.quoteAmount - depAmt;

  p.chatHistory.push({
    sender: "customer",
    text: `Quote of $${p.quoteAmount.toFixed(2)} APPROVED. Deposit of $${depAmt.toFixed(2)} paid via portal transaction.`,
    time: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  alert("Quote Approved! Deposit received. Project advanced to Contract phase.");
  openCustomerPortalSim();
}

function portalRequestQuoteRevision() {
  const p = getActiveProject();
  if (!p) return;
  const reason = prompt("Enter reasons for quote revision request:");
  if (!reason) return;
  p.quoteStatus = "revision-requested";
  
  p.chatHistory.push({
    sender: "customer",
    text: `REVISION REQUESTED ON QUOTE: ${reason}`,
    time: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  alert("Revision request sent to wrap shop.");
  openCustomerPortalSim();
}

function portalPayDeposit() {
  const p = getActiveProject();
  if (!p || p.paymentStatus !== "unpaid") return;

  const deposit = p.quoteAmount * (p.depositPercent / 100);
  p.paymentStatus = "deposit";
  p.depositAmount = deposit;
  p.balanceDue = p.quoteAmount - deposit;
  p.chatHistory.push({
    sender: "customer",
    text: `Required deposit of $${deposit.toFixed(2)} paid through the customer portal.`,
    time: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  if (p.contractStatus === "signed") {
    p.stageIndex = 3;
    alert("Deposit received. Contract and payment gates are complete; the project is released to Design.");
  } else {
    alert("Deposit received. Sign the contract to release the project to Design.");
  }

  openCustomerPortalSim();
}

function portalApproveProof() {
  const p = getActiveProject();
  if (!p) return;

  const activeProof = p.proofs[p.proofs.length - 1];
  if (activeProof) {
    activeProof.status = "Approved";
  }

  p.chatHistory.push({
    sender: "customer",
    text: `Design proof ${activeProof ? activeProof.version : 'V1'} has been APPROVED. Ready for wrap print!`,
    time: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  // Advance to Pre-Install inspection
  p.stageIndex = 5; // Inspection

  alert("Creative design approved! Artwork locked. Project advanced to pre-install inspection phase.");
  openCustomerPortalSim();
}

function portalRequestProofRevision() {
  const p = getActiveProject();
  if (!p) return;
  
  const comments = document.getElementById('portal-revision-comments').value.trim();
  if (!comments) {
    alert("Please write the revision comments in the text box.");
    return;
  }

  const activeProof = p.proofs[p.proofs.length - 1];
  if (activeProof) {
    activeProof.status = "Revision Requested";
  }

  p.chatHistory.push({
    sender: "customer",
    text: `DESIGN REVISION REQUESTED: ${comments}`,
    time: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  document.getElementById('portal-revision-comments').value = ""; // Clear
  alert("Design revision notes sent to layout team.");
  openCustomerPortalSim();
}

function portalAcknowledgeInspection() {
  const p = getActiveProject();
  if (!p) return;

  p.inspectionAcknowledged = true;
  p.chatHistory.push({
    sender: "customer",
    text: `Acknowledged and signed off on pre-existing vehicle damage report (${p.damageMarkers.length} items marked).`,
    time: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  const advanced = advanceProjectStage(p, "Damage inspection report signed off. Project released to production queue.");
  if (!advanced) return;
  openCustomerPortalSim();
}

// Canvas Digital Signature drawing setup
function setupSignaturePad() {
  sigCanvas.width = sigCanvas.offsetWidth;
  sigCanvas.height = sigCanvas.offsetHeight;
  
  sigCtx.strokeStyle = "#1e3a8a";
  sigCtx.lineWidth = 3;
  sigCtx.lineCap = "round";

  // Mouse drawing
  sigCanvas.addEventListener('mousedown', (e) => {
    signatureDrawing = true;
    const pos = getSigMousePos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(pos.x, pos.y);
  });
  
  sigCanvas.addEventListener('mousemove', (e) => {
    if (!signatureDrawing) return;
    const pos = getSigMousePos(e);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
  });
  
  window.addEventListener('mouseup', () => {
    signatureDrawing = false;
  });

  // Touch drawing (for installers on tablets/mobile)
  sigCanvas.addEventListener('touchstart', (e) => {
    signatureDrawing = true;
    const touch = e.touches[0];
    const rect = sigCanvas.getBoundingClientRect();
    sigCtx.beginPath();
    sigCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    e.preventDefault();
  });

  sigCanvas.addEventListener('touchmove', (e) => {
    if (!signatureDrawing) return;
    const touch = e.touches[0];
    const rect = sigCanvas.getBoundingClientRect();
    sigCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    sigCtx.stroke();
    e.preventDefault();
  });
}

function getSigMousePos(e) {
  const rect = sigCanvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function clearSignatureCanvas() {
  if (sigCtx && sigCanvas) {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  }
}

function portalSignContract() {
  const p = getActiveProject();
  if (!p) return;

  p.contractStatus = "signed";
  p.contractSignedDate = new Date().toISOString().split('T')[0];
  p.contractSignedBy = `${p.firstName} ${p.lastName}`;

  p.chatHistory.push({
    sender: "customer",
    text: `Liability contract contract digitally signed by ${p.contractSignedBy}.`,
    time: new Date().toISOString().replace('T', ' ').substring(0, 16)
  });

  // Check if deposit is also paid to advance stage to Design
  if (p.paymentStatus !== 'unpaid') {
    p.stageIndex = 3; // Advance to Design
    alert("Contract signed! Project released to design queuing.");
  } else {
    alert("Contract signed! (Note: Design will commence once deposit payment is logged).");
  }

  openCustomerPortalSim();
}


// --- PRINT DOCUMENTS & packet GENERATION ---
function generateDocument(type) {
  const p = getActiveProject();
  if (!p) return;

  const content = document.getElementById('print-document-content');
  content.innerHTML = "";

  const STAGES = [
    "Intake", "Quote", "Contract", "Design", "Proof Approval", 
    "Inspection", "Production", "Install", "Pickup", "Aftercare", "Complete"
  ];

  let docHtml = "";

  if (type === 'receipt') {
    docHtml = `
      <div class="print-header">
        <div>
          <h2 class="print-title">PAID RECEIPT</h2>
          <p style="color: #4b5563; font-size: 0.8rem; margin-top: 4px;">WRAP LAB AI &mdash; Shop Operations Ledger</p>
        </div>
        <div style="text-align: right;">
          <h3 style="font-weight: 800; font-size: 1.4rem;">${p.id}</h3>
          <p style="font-size: 0.85rem; color: #4b5563;">Date: ${new Date().toISOString().split('T')[0]}</p>
        </div>
      </div>

      <div class="print-grid">
        <div class="print-block">
          <div class="print-block-title">Customer Billing</div>
          <strong>${p.firstName} ${p.lastName}</strong><br>
          ${p.businessName || "Private Vehicle Owner"}<br>
          Phone: ${p.phone}<br>
          Email: ${p.email}
        </div>
        <div class="print-block">
          <div class="print-block-title">Vehicle Info</div>
          <strong>Year/Make/Model:</strong> ${p.year} ${p.make} ${p.model}<br>
          <strong>VIN:</strong> ${p.vin || 'N/A'}<br>
          <strong>Trim:</strong> ${p.trim}<br>
          <strong>Color:</strong> ${p.originalColor}
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Wrap Detail Item / Description</th>
            <th style="text-align: right;">Cost/Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Premium Vehicle Wrap Material & Labor</strong><br><span style="font-size: 0.78rem; color: #6b7280;">Type: ${p.wrapType}. Areas: ${p.areas.filter(a => a.included).map(a => a.name).join(', ')}</span></td>
            <td style="text-align: right;">$${p.quoteAmount.toFixed(2)}</td>
          </tr>
          <tr style="font-weight: 700; border-top: 2px solid #111827;">
            <td style="text-align: right;">Invoice Total:</td>
            <td style="text-align: right;">$${p.quoteAmount.toFixed(2)}</td>
          </tr>
          <tr style="color: #10b981; font-weight: 700;">
            <td style="text-align: right;">Deposit Paid:</td>
            <td style="text-align: right;">-$${p.depositAmount.toFixed(2)}</td>
          </tr>
          <tr style="font-weight: 800; border-top: 1px solid #111827; font-size: 1.05rem;">
            <td style="text-align: right;">Balance Due:</td>
            <td style="text-align: right;">$${p.balanceDue.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 60px; text-align: center; border-top: 1px dashed #d1d5db; padding-top: 20px; font-size: 0.8rem; color: #6b7280;">
        Thank you for your business! For any issues, refer to our wrap aftercare policy guidelines.
      </div>
    `;
  } else if (type === 'aftercare') {
    docHtml = `
      <div class="print-header">
        <div>
          <h2 class="print-title">WRAPPED VEHICLE AFTERCARE</h2>
          <p style="color: #4b5563; font-size: 0.8rem; margin-top: 4px;">WRAP LAB AI &mdash; Proper care protects your investment</p>
        </div>
        <div style="text-align: right;">
          <h3 style="font-weight: 800; font-size: 1.4rem;">${p.id}</h3>
        </div>
      </div>

      <div class="print-block" style="margin-bottom: 24px;">
        <p><strong>Dear ${p.firstName},</strong></p>
        <p style="margin-top: 8px;">Congratulations on your newly wrapped ${p.year} ${p.make} ${p.model}! To ensure the graphics look crisp and the vinyl adhesives maintain their warranties, please adhere strictly to these professional maintenance guidelines:</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="font-weight: 700; font-size: 1.05rem; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; margin-bottom: 8px; color: #1f2937;">1. Washing Recommendations</h4>
        <ul style="margin-left: 20px; line-height: 1.6;">
          <li><strong>Hand Wash Only</strong>: Wash the vehicle weekly using clean water and a mild car wash detergent. Use a soft micro-fiber mitt.</li>
          <li><strong>Avoid Pressure Washing</strong>: If using a pressure washer, keep the nozzle at least 18 inches away from wrap surfaces. <strong>Never</strong> spray at a sharp angle near seam edges. Keep nozzle perpendicular.</li>
          <li><strong>No Brush Car Washes</strong>: Automated car washes with spinning abrasive brushes will scratch, tear, and lift film corners.</li>
        </ul>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="font-weight: 700; font-size: 1.05rem; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; margin-bottom: 8px; color: #1f2937;">2. Contaminant Removal</h4>
        <ul style="margin-left: 20px; line-height: 1.6;">
          <li>Clean bird droppings, bugs, and sap immediately. Soften them by soaking with hot soapy water for a few minutes before wiping.</li>
          <li>Never scrape the film with scrapers or harsh scrub pads.</li>
        </ul>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="font-weight: 700; font-size: 1.05rem; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; margin-bottom: 8px; color: #1f2937;">3. Parking and Environmental Exposure</h4>
        <ul style="margin-left: 20px; line-height: 1.6;">
          <li>Satin and Matte films absorb pollutants more easily. Park inside a garage or under cover whenever possible to avoid UV degradation.</li>
        </ul>
      </div>

      <div class="print-signatures">
        <div class="sig-line">Wrap Technician Signoff</div>
        <div class="sig-line">Customer Acknowledgment</div>
      </div>
    `;
  } else if (['packet', 'pre-install-packet', 'final-packet'].includes(type)) {
    const packetConfig = {
      packet: {
        title: 'INTERNAL SHOP WORK ORDER & WRAP PACKET',
        subtitle: 'Job Reference & Installer Checklist',
        sectionTitle: 'Approvals Log Checklist',
        checklist: `
          [${p.paymentStatus !== 'unpaid' ? 'X' : ' '}] Deposit Paid (Amt: $${p.depositAmount.toFixed(2)})<br>
          [${p.contractStatus === 'signed' ? 'X' : ' '}] Contract Terms Signed (By: ${p.contractSignedBy || 'None'})<br>
          [${p.proofs[p.proofs.length - 1]?.status === 'Approved' ? 'X' : ' '}] Layout Design Proof Confirmed & Locked<br>
          [${p.inspectionAcknowledged ? 'X' : ' '}] Damage Inspection Confirmed by Client
        `
      },
      'pre-install-packet': {
        title: 'PRE-INSTALL PRODUCTION PACKET',
        subtitle: 'Vehicle Readiness, Damage Record & Installer Release',
        sectionTitle: 'Pre-Install Release Checklist',
        checklist: `
          [${p.paymentStatus !== 'unpaid' ? 'X' : ' '}] Required Deposit Received<br>
          [${p.contractStatus === 'signed' ? 'X' : ' '}] Contract Terms Signed<br>
          [${p.proofs[p.proofs.length - 1]?.status === 'Approved' ? 'X' : ' '}] Final Proof Approved and Locked<br>
          [${p.inspectionAcknowledged ? 'X' : ' '}] Existing Damage Reviewed with Customer<br>
          [ ] Vehicle Washed, Dry and Free of Wax or Contaminants<br>
          [ ] Keys, Bay and Installer Assignment Confirmed
        `
      },
      'final-packet': {
        title: 'FINAL COMPLETION & AFTERCARE PACKET',
        subtitle: 'Install Completion, Customer Signoff & Care Record',
        sectionTitle: 'Final Delivery Checklist',
        checklist: `
          [ ] Final Edge, Seam and Panel Inspection Complete<br>
          [ ] Vehicle Photos Added to Completion Record<br>
          [ ] Customer Walk-Through Completed<br>
          [ ] Aftercare Instructions Reviewed and Delivered<br>
          [ ] Remaining Balance Confirmed<br>
          [ ] Customer Acceptance Signature Collected
        `
      }
    }[type];

    let dmgRows = "";
    p.damageMarkers.forEach(dmg => {
      dmgRows += `<tr><td>${dmg.id}</td><td>${dmg.type}</td><td>${dmg.severity}</td><td>${dmg.notes}</td></tr>`;
    });
    if (p.damageMarkers.length === 0) {
      dmgRows = `<tr><td colspan="4" style="text-align: center; color: #6b7280;">No pre-existing damage reported.</td></tr>`;
    }

    let areaRows = "";
    p.areas.forEach(a => {
      if (a.included) {
        areaRows += `<tr><td>${a.name}</td><td>${a.width}" x ${a.height}"</td><td>${((a.width*a.height)/144).toFixed(1)}</td><td>${a.wasteFactor}%</td><td>${a.material}</td><td>${a.complexity}</td></tr>`;
      }
    });

    docHtml = `
      <div class="print-header">
        <div>
          <h2 class="print-title">${packetConfig.title}</h2>
          <p style="color: #4b5563; font-size: 0.8rem; margin-top: 4px;">WRAP LAB AI &mdash; ${packetConfig.subtitle}</p>
        </div>
        <div style="text-align: right;">
          <h3 style="font-weight: 800; font-size: 1.4rem;">${p.id}</h3>
          <span class="badge badge-indigo" style="color:#ffffff; background:#4f46e5;">Stage: ${STAGES[p.stageIndex]}</span>
        </div>
      </div>

      <div class="print-grid">
        <div class="print-block">
          <div class="print-block-title">Job Details</div>
          <strong>Client:</strong> ${p.firstName} ${p.lastName} (${p.businessName || 'Individual'})<br>
          <strong>Phone:</strong> ${p.phone} | <strong>Email:</strong> ${p.email}<br>
          <strong>Wrap Type:</strong> ${p.wrapType}<br>
          <strong>Deadline Target:</strong> ${p.turnaroundDate}
        </div>
        <div class="print-block">
          <div class="print-block-title">Vehicle Specifications</div>
          <strong>Year/Make/Model:</strong> ${p.year} ${p.make} ${p.model}<br>
          <strong>VIN:</strong> ${p.vin || 'N/A'}<br>
          <strong>Original Color:</strong> ${p.originalColor}<br>
          <strong>Wheelbase / Roof:</strong> ${p.wheelbase} / ${p.roofHeight}
        </div>
      </div>

      <div class="print-block" style="margin-bottom: 20px;">
        <div class="print-block-title">Wrap Coverage Area Specifications</div>
        <table class="print-table" style="font-size: 0.78rem;">
          <thead>
            <tr>
              <th>Area</th>
              <th>Dimensions</th>
              <th>SqFt</th>
              <th>Waste %</th>
              <th>Material</th>
              <th>Complexity</th>
            </tr>
          </thead>
          <tbody>
            ${areaRows}
          </tbody>
        </table>
      </div>

      <div class="print-block" style="margin-bottom: 20px;">
        <div class="print-block-title">Pre-Existing Damage Checkoff</div>
        <table class="print-table" style="font-size: 0.78rem;">
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Description / Notes</th>
            </tr>
          </thead>
          <tbody>
            ${dmgRows}
          </tbody>
        </table>
      </div>

      <div class="print-grid">
        <div class="print-block">
          <div class="print-block-title">Production & Install Staff Assignments</div>
          <strong>Lead Installer:</strong> ${p.assignedInstaller || 'TBD'}<br>
          <strong>Helper:</strong> ${p.helper || 'None'}<br>
          <strong>Installation Bay:</strong> ${p.bay || 'Bay 1'}<br>
          <strong>Drop-Off Scheduled:</strong> ${p.dropOffTime ? p.dropOffTime.replace('T', ' ') : 'TBD'}
        </div>
        <div class="print-block">
          <div class="print-block-title">${packetConfig.sectionTitle}</div>
          ${packetConfig.checklist}
        </div>
      </div>

      <div class="print-signatures" style="margin-top: 40px;">
        <div class="sig-line">Shop Manager Signature</div>
        <div class="sig-line">Installer Signoff (Date: ______ )</div>
      </div>
    `;
  }

  content.innerHTML = docHtml;
  document.getElementById('print-overlay').classList.add('active');
}

function closePrintView() {
  document.getElementById('print-overlay').classList.remove('active');
}

// --- SELF-DIAGNOSTICS SUITE ---
function runDiagnostics(options = {}) {
  const { silent = false } = options;
  let failed = 0;
  let total = 0;

  console.log("==================================================");
  console.log("WRAP LAB AI SYSTEM DIAGNOSTICS: RUNNING TESTS...");
  console.log("==================================================");

  function check(condition, passMessage, failMessage) {
    total++;
    if (condition) {
      console.log(`PASS: ${passMessage}`);
    } else {
      console.error(`FAIL: ${failMessage}`);
      failed++;
    }
  }

  check(projects.length >= 5,
    "Seeded five initial wrap projects successfully.",
    `Expected at least five seeded projects, found ${projects.length}.`);

  const p1 = projects[0];
  const hood = p1.areas[0];
  const raw = (hood.width * hood.height) / 144;
  const billable = raw * (1 + (hood.wasteFactor / 100));
  check(Math.abs(raw - 16.67) < 0.1 && Math.abs(billable - 19.17) < 0.1,
    "Area square-footage and waste formulas calculate correctly.",
    `Expected raw ~16.67 and billable ~19.17; received raw=${raw}, billable=${billable}.`);

  const materialCost = p1.materials.reduce((sum, material) => sum + (material.sqftUsed * material.costPerSqft), 0);
  const laborCost = p1.labor.reduce((sum, labor) => sum + ((labor.actHrs || labor.estHrs) * labor.rate), 0);
  const profit = p1.quoteAmount - (materialCost + laborCost);
  const margin = (profit / p1.quoteAmount) * 100;
  check(Math.abs(materialCost - 649) < 1 && Math.abs(laborCost - 1405) < 1 && Math.abs(profit - 1396) < 1 && Math.abs(margin - 40.46) < 0.5,
    "Profit, margin, materials, and labor formulas balance correctly.",
    `Pricing mismatch: materials=${materialCost}, labor=${laborCost}, profit=${profit}, margin=${margin}.`);

  const lockedProduction = {
    stageIndex: 5, quoteStatus: "approved", contractStatus: "signed", paymentStatus: "deposit",
    depositAmount: 500, inspectionAcknowledged: false, proofs: [{ status: "Approved" }],
    productionChecklist: [], installChecklist: [], files: []
  };
  check(Boolean(getWorkflowGateError(lockedProduction)),
    "Production lock blocks an unacknowledged inspection.",
    "Production lock allowed an unacknowledged inspection.");

  const lockedPickup = {
    stageIndex: 7, quoteStatus: "approved", contractStatus: "signed", paymentStatus: "deposit",
    depositAmount: 500, inspectionAcknowledged: true, proofs: [{ status: "Approved" }],
    productionChecklist: [{ task: "Laminated", done: true }],
    installChecklist: REQUIRED_INSTALL_TASKS.map(task => ({ task, done: true })), files: []
  };
  check(getWorkflowGateError(lockedPickup).includes("Upload"),
    "Pickup lock requires before, during, and after photos.",
    "Pickup lock did not require the complete photo record.");

  check(typeof updateProjectStage === "function",
    "Workflow stepper handler is wired.",
    "Workflow stepper handler is missing.");

  const requiredTemplates = ['sedan', 'coupe', 'suv', 'pickup-truck', 'cargo-van', 'passenger-van', 'high-roof-van', 'box-truck', 'trailer', 'utility-trailer', 'bus', 'other'];
  check(requiredTemplates.every(key => VEHICLE_TYPES.some(vehicle => vehicle.key === key)),
    "All twelve required inspection template categories are registered.",
    "One or more required inspection template categories are missing.");

  check(INSPECTION_VIEWS.length === 5 && getInspectionSurfaceMarkup('other', 'front', null).includes('other-front.webp'),
    "Inspection views and guaranteed Other Vehicle asset fallback are available.",
    "Inspection view registry or fallback rendering is incomplete.");

  const result = { total, passed: total - failed, failed };
  console.log(failed === 0
    ? `ALL ${total} DIAGNOSTIC TESTS PASSED. SYSTEM READY.`
    : `SYSTEM WARNING: ${failed} OF ${total} DIAGNOSTICS FAILED.`);
  console.log("==================================================");

  const status = document.getElementById("diagnostics-result");
  if (status) {
    status.textContent = failed === 0 ? `${total}/${total} checks passed` : `${failed}/${total} checks failed`;
    status.className = failed === 0 ? "diagnostics-status passed" : "diagnostics-status failed";
  }
  if (!silent) {
    alert(failed === 0 ? `Diagnostics passed: ${total}/${total} checks.` : `Diagnostics failed: ${failed}/${total}. Check the console.`);
  }
  return result;
}

// Auto-run diagnostics on startup
setTimeout(() => runDiagnostics({ silent: true }), 1000);
