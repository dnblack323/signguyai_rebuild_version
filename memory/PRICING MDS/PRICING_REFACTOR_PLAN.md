# Pricing System Refactor Plan
**Goal**: Backend as single source of truth for all pricing math. Frontend collects inputs, calls `/api/pricing/calculate`, displays cost breakdown.

---

## 📋 CURRENT STATE ANALYSIS

### Issues Identified:
1. **Category name inconsistencies**:
   - Frontend: `vehicle_graphics`, Backend: `vehicle_wraps` / `VEHICLE_GRAPHICS`
   - Frontend: `promotional`, Backend: `PROMOTIONAL`
   - Frontend calculator uses different keys than backend expects

2. **Dimension field mismatches**:
   - Frontend sends: `width_inches`, `length_inches`
   - Backend sometimes expects: `width`, `height`, `dimensions`
   - No unified dimension handling

3. **Duplicate pricing logic**:
   - Frontend has material cost calculations in `PricingCalculator.js`
   - Frontend computes areas, applies waste factors
   - Backend also computes these → **double work, potential drift**

4. **Multiple "settings" pages**:
   - `PricingFoundation.js` (NEW, comprehensive)
   - `PricingSetup.js` (Historical import tool, should be hidden from nav)
   - Should consolidate to **Pricing Foundation only**

5. **Missing itemized breakdown**:
   - Backend returns: `material_cost`, `labor_cost`, `setup_cost`, `overhead_cost`
   - Missing: `finishing_cost`, `hardware_cost`, `install_cost`, `design_cost`
   - No component-level detail (e.g., "substrate: $X", "laminate: $Y")

6. **No guided setup quiz**:
   - Users manually enter costs without context
   - Need: "What do you charge for X?" → convert to calculator defaults

---

## ✅ PHASE 1: NORMALIZE CATEGORY NAMES (Low Risk)

### Backend Changes:
**File**: `/app/backend/models/enums.py` (lines ~10-20)

```python
class PricingCategory(str, Enum):
    # Standardize all to snake_case
    PROMOTIONAL = "promotional"
    CUT_VINYL = "cut_vinyl"
    SERVICES = "services"
    DIGITAL_PRINT = "digital_print"
    RIGID_SIGNS = "rigid_signs"
    BANNERS = "banners"
    APPAREL = "apparel"
    VEHICLE_GRAPHICS = "vehicle_graphics"  # ← Change from vehicle_wraps
    CUSTOM = "custom"
```

**File**: `/app/backend/models/pricing.py` (lines ~328+)
- Update all `category_defaults` keys:
  - `"vehicle_wraps"` → `"vehicle_graphics"`
- Verify materials array uses `compatible_categories: ["vehicle_graphics"]`

**File**: `/app/backend/routes/pricing.py` (lines ~58-67)
```python
def _normalize_pricing_category(category: Any) -> PricingCategory:
    raw = str(category or "custom").lower()
    alias_map = {
        "promo_misc": PricingCategory.PROMOTIONAL,
        "vehicle_wrap": PricingCategory.VEHICLE_GRAPHICS,
        "vehicle_wraps": PricingCategory.VEHICLE_GRAPHICS,  # ← Add migration alias
    }
    # ...
```

### Frontend Changes:
**File**: `/app/frontend/src/components/PricingCalculator.js` (line ~28)
```javascript
const PRICING_CATEGORIES = [
  { id: 'promotional', name: 'Promotional Items', ... },  // ✓ Already correct
  { id: 'cut_vinyl', name: 'Cut Vinyl', ... },           // ✓
  { id: 'services', name: 'Services', ... },             // ✓
  { id: 'digital_print', name: 'Digital Print', ... },   // ✓
  { id: 'banners', name: 'Banners', ... },               // ✓
  { id: 'rigid_signs', name: 'Rigid Signs', ... },       // ✓
  { id: 'apparel', name: 'Apparel', ... },               // ✓
  { id: 'vehicle_graphics', name: 'Vehicle Graphics', ... },  // ← Change from vehicle_graphics
  { id: 'custom', name: 'Custom / Other', ... },         // ✓
];
```

### Migration Script (Optional):
**New file**: `/app/backend/migrations/normalize_categories.py`
```python
# Update existing pricing_configuration.category_defaults
# Rename "vehicle_wraps" → "vehicle_graphics"
# Update materials.compatible_categories arrays
```

**Testing**: 
- Call `/api/pricing/calculate` with `category: "vehicle_graphics"`
- Verify no 500 errors
- Check saved defaults still load

---

## ✅ PHASE 2: NORMALIZE DIMENSION FIELDS (Low Risk)

### Standard Field Names:
```json
{
  "width": 24.0,         // Always in inches (backend converts if needed)
  "height": 36.0,        // Always in inches
  "unit": "inches",      // or "feet" - for display only
  "area_sqft": 6.0       // Backend computes, frontend can display
}
```

### Backend Changes:
**File**: `/app/backend/models/pricing.py` (lines ~1286-1289)
```python
class JobItemPricingData(BaseModel):
    # Remove old fields:
    # width_inches, length_inches, square_footage
    
    # Add standardized fields:
    width: Optional[float] = None   # Always inches
    height: Optional[float] = None  # Always inches
    unit_of_measure: str = "inches"  # Display preference
    area_sqft: Optional[float] = None  # Backend computes
```

**File**: `/app/backend/server.py` (pricing calculators ~2556+)
- Update all calculator functions to use `data.width`, `data.height`
- Remove references to `width_inches`, `length_inches`

**File**: `/app/backend/routes/pricing.py` (lines ~31-55)
```python
def _normalize_pricing_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(payload or {})
    
    # Migrate old dimension fields
    if "width_inches" in normalized:
        normalized["width"] = normalized.pop("width_inches")
    if "length_inches" in normalized:
        normalized["height"] = normalized.pop("length_inches")
    if "square_footage" in normalized:
        normalized["area_sqft"] = normalized.pop("square_footage")
    
    # ... existing substrate normalization ...
    return normalized
```

### Frontend Changes:
**File**: `/app/frontend/src/components/PricingCalculator.js` (all category renderers)
```javascript
// Replace all:
// - pricingData.width_inches → pricingData.width
// - pricingData.length_inches → pricingData.height
// - pricingData.square_footage → pricingData.area_sqft

// Example (Cut Vinyl section, line ~1106):
<Input
  type="number"
  value={pricingData.width || ''}
  onChange={(e) => updateCutVinylField('width', parseFloat(e.target.value) || 0)}
  data-testid="cut-vinyl-width"
/>
```

**Testing**:
- Enter dimensions in calculator
- Verify backend receives `width`, `height` (not `width_inches`, `length_inches`)
- Check calculation response includes `area_sqft`

---

## ✅ PHASE 3: REMOVE DUPLICATE PRICING LOGIC (Medium Risk)

### What to Remove from Frontend:
**File**: `/app/frontend/src/components/PricingCalculator.js`

Delete/simplify:
1. Lines ~360-492: `resolveDigitalPrintDefaults()`, `resolveDigitalPrintAiSuggestions()` → Backend handles
2. Lines ~510-574: `resolveCutVinylDefaults()`, `resolveCutVinylAiSuggestions()` → Backend handles
3. Lines ~635-667: `resolveRigidSignDefaults()` → Backend handles
4. Lines ~719-752: `resolveBannerDefaults()` → Backend handles
5. All area calculations (e.g., line ~1109): `const areaPerPiece = ...` → Backend computes

### Frontend Responsibility (Keep):
- **Collect user inputs** (dimensions, material keys, complexity)
- **Display dropdowns** (material options from `/api/pricing/materials`)
- **Call `/api/pricing/calculate`** with raw inputs
- **Display breakdown** from backend response

### Backend Responsibility (Expand):
**New response schema** (see Phase 4 for details):
```python
class PricingCalculation(BaseModel):
    # Existing fields...
    material_cost: float
    labor_cost: float
    # NEW itemized fields:
    design_cost: float
    finishing_cost: float
    hardware_cost: float
    install_cost: float
    overhead_cost: float
    
    # NEW component breakdown:
    breakdown: Dict[str, Any] = {
        "materials": [
            {"name": "Coroplast 4mm", "sqft": 6.0, "rate": 0.90, "cost": 5.40},
            {"name": "Direct Print Ink", "sqft": 6.0, "rate": 1.25, "cost": 7.50}
        ],
        "labor": [
            {"type": "Production", "hours": 0.5, "rate": 28.0, "cost": 14.00},
            {"type": "Installation", "hours": 1.0, "rate": 95.0, "cost": 95.00}
        ],
        "hardware": [
            {"name": "H-Stake", "qty": 2, "unit_cost": 1.50, "cost": 3.00}
        ],
        # ... etc
    }
```

### Example Refactor (Cut Vinyl):
**Before** (Frontend computes area):
```javascript
const areaPerPiece = unit === 'feet' 
  ? (widthValue * heightValue) 
  : ((widthValue * heightValue) / 144);
```

**After** (Backend computes):
```python
# In calculate_cut_vinyl():
width_in = data.width or 0
height_in = data.height or 0
area_sqft = (width_in * height_in) / 144
# ... apply waste, compute cost ...
```

**Testing**:
- Remove frontend calculation
- Call `/api/pricing/calculate` with `width: 24, height: 36`
- Verify response includes `area_sqft: 6.0` in breakdown

---

## ✅ PHASE 4: ENHANCED BACKEND RESPONSE (Medium Risk)

### Goal: Return itemized component costs

### New Response Structure:
**File**: `/app/backend/models/pricing.py` (lines ~1254-1274)

```python
class CostComponent(BaseModel):
    """Individual cost line item"""
    name: str
    quantity: float = 1.0
    unit: str = "each"  # sqft, hour, each, linear_ft
    unit_cost: float = 0.0
    total_cost: float = 0.0
    notes: Optional[str] = None

class PricingCalculation(BaseModel):
    """Enhanced pricing breakdown"""
    # Top-level totals (keep existing)
    material_cost: float = 0
    labor_cost: float = 0
    design_cost: float = 0
    finishing_cost: float = 0
    hardware_cost: float = 0
    install_cost: float = 0
    setup_cost: float = 0
    overhead_cost: float = 0
    
    production_cost: float = 0  # Sum of above
    total_cost: float = 0       # production_cost
    suggested_price: float = 0
    selling_price: float = 0
    
    profit_amount: float = 0
    profit_margin_percent: float = 0
    markup_percent: float = 0
    estimated_labor_minutes: float = 0
    
    # NEW: Itemized breakdown
    breakdown: Dict[str, Any] = Field(default_factory=lambda: {
        "materials": [],      # List[CostComponent]
        "labor": [],          # List[CostComponent]
        "hardware": [],       # List[CostComponent]
        "finishing": [],      # List[CostComponent]
        "design": [],         # List[CostComponent]
        "overhead": [],       # List[CostComponent]
        "metadata": {}        # area_sqft, waste_applied, etc.
    })
```

### Example Calculator Update:
**File**: `/app/backend/server.py` (example: `calculate_rigid_signs`)

```python
async def calculate_rigid_signs(
    data: JobItemPricingData, 
    quantity: float, 
    defaults: dict
) -> PricingCalculation:
    cat_defaults = defaults.get("category_defaults", {}).get("rigid_signs", {})
    
    # Compute dimensions
    width_in = data.width or 0
    height_in = data.height or 0
    area_sqft = (width_in * height_in) / 144
    waste_pct = cat_defaults.get("waste_percentage", 5.0)
    billable_sqft = area_sqft * (1 + waste_pct / 100)
    
    # --- MATERIALS ---
    materials_list = []
    substrate_key = data.substrate_type_key or cat_defaults.get("default_substrate_key", "coroplast_4mm")
    substrate = _find_material(defaults["materials"], substrate_key)
    if substrate:
        substrate_cost_per = substrate.get("cost_per_sqft", 0.9)
        substrate_total = substrate_cost_per * billable_sqft * quantity
        materials_list.append({
            "name": substrate.get("name", substrate_key),
            "quantity": billable_sqft * quantity,
            "unit": "sqft",
            "unit_cost": substrate_cost_per,
            "total_cost": substrate_total
        })
    
    # Graphic method (direct print or mounted)
    if data.graphic_method == "direct_print":
        print_key = cat_defaults.get("direct_print_consumable_key", "direct_print_consumable")
        print_mat = _find_material(defaults["materials"], print_key)
        if print_mat:
            print_cost_per = print_mat.get("cost_per_sqft", 1.25)
            print_total = print_cost_per * billable_sqft * quantity
            materials_list.append({
                "name": print_mat.get("name", "Direct Print"),
                "quantity": billable_sqft * quantity,
                "unit": "sqft",
                "unit_cost": print_cost_per,
                "total_cost": print_total
            })
    
    material_cost_total = sum(m["total_cost"] for m in materials_list)
    
    # --- LABOR ---
    labor_list = []
    prod_hrs_per_sqft = cat_defaults.get("production_labor_hours_per_sqft", 0.15)
    prod_hrs = max(prod_hrs_per_sqft * area_sqft * quantity, 
                   cat_defaults.get("min_production_labor_hours_per_item", 0.2))
    prod_rate = defaults.get("labor_rates", {}).get("production", {}).get("hourly_rate", 28.0)
    labor_list.append({
        "name": "Production Labor",
        "quantity": prod_hrs,
        "unit": "hours",
        "unit_cost": prod_rate,
        "total_cost": prod_hrs * prod_rate
    })
    
    labor_cost_total = sum(l["total_cost"] for l in labor_list)
    
    # --- HARDWARE ---
    hardware_list = []
    if data.hardware_included and data.hardware_type:
        hw_item = _find_hardware(defaults.get("hardware_accessories", []), data.hardware_type)
        if hw_item:
            hw_qty = quantity  # assume 1 per sign
            hardware_list.append({
                "name": hw_item.get("name", data.hardware_type),
                "quantity": hw_qty,
                "unit": hw_item.get("unit_type", "each"),
                "unit_cost": hw_item.get("purchase_cost", 0),
                "total_cost": hw_item.get("purchase_cost", 0) * hw_qty
            })
    
    hardware_cost_total = sum(h["total_cost"] for h in hardware_list)
    
    # --- INSTALL ---
    install_list = []
    install_cost_total = 0
    if data.install_required:
        install_hrs = cat_defaults.get("install_hours_per_sqft", 0.08) * area_sqft * quantity
        install_rate = defaults.get("labor_rates", {}).get("installation", {}).get("hourly_rate", 95.0)
        install_list.append({
            "name": "Installation",
            "quantity": install_hrs,
            "unit": "hours",
            "unit_cost": install_rate,
            "total_cost": install_hrs * install_rate
        })
        install_cost_total = sum(i["total_cost"] for i in install_list)
    
    # --- TOTALS ---
    production_cost = material_cost_total + labor_cost_total + hardware_cost_total + install_cost_total
    overhead_pct = defaults.get("overhead_percentage", 15.0)
    overhead_cost = production_cost * (overhead_pct / 100) if defaults.get("apply_overhead_to_jobs", True) else 0
    total_cost = production_cost + overhead_cost
    
    markup = cat_defaults.get("default_markup_multiplier", 2.45)
    suggested_price = total_cost * markup
    min_charge = cat_defaults.get("minimum_charge", 25.0)
    selling_price = max(suggested_price, min_charge)
    
    profit = selling_price - total_cost
    margin = (profit / selling_price * 100) if selling_price > 0 else 0
    
    return PricingCalculation(
        material_cost=material_cost_total,
        labor_cost=labor_cost_total,
        hardware_cost=hardware_cost_total,
        install_cost=install_cost_total,
        overhead_cost=overhead_cost,
        production_cost=production_cost,
        total_cost=total_cost,
        suggested_price=suggested_price,
        selling_price=selling_price,
        profit_amount=profit,
        profit_margin_percent=margin,
        estimated_labor_minutes=prod_hrs * 60,
        breakdown={
            "materials": materials_list,
            "labor": labor_list,
            "hardware": hardware_list,
            "install": install_list,
            "overhead": [{"name": "Overhead", "unit": "%", "unit_cost": overhead_pct, "total_cost": overhead_cost}],
            "metadata": {
                "area_sqft": area_sqft,
                "billable_sqft": billable_sqft,
                "waste_applied_pct": waste_pct,
                "markup_multiplier": markup
            }
        }
    )
```

### Frontend Display:
**File**: `/app/frontend/src/components/PricingCalculator.js` (breakdown section)

```javascript
{calculation?.breakdown?.materials?.length > 0 && (
  <div className="space-y-2">
    <h4 className="font-medium text-sm">Materials</h4>
    {calculation.breakdown.materials.map((item, idx) => (
      <div key={idx} className="flex justify-between text-sm">
        <span>{item.name} ({item.quantity.toFixed(2)} {item.unit})</span>
        <span>${item.total_cost.toFixed(2)}</span>
      </div>
    ))}
  </div>
)}

{calculation?.breakdown?.labor?.length > 0 && (
  <div className="space-y-2">
    <h4 className="font-medium text-sm">Labor</h4>
    {calculation.breakdown.labor.map((item, idx) => (
      <div key={idx} className="flex justify-between text-sm">
        <span>{item.name} ({item.quantity.toFixed(2)} hrs @ ${item.unit_cost}/hr)</span>
        <span>${item.total_cost.toFixed(2)}</span>
      </div>
    ))}
  </div>
)}

{/* Repeat for hardware, install, overhead... */}
```

**Testing**:
- Call `/api/pricing/calculate` with rigid sign inputs
- Verify response includes `breakdown.materials[]` with substrate + print
- Verify `breakdown.labor[]` shows production hours
- Check frontend displays all line items

---

## ✅ PHASE 5: SINGLE EDITABLE SETTINGS PAGE (Low Risk)

### Goal: Pricing Foundation = single source of truth

### Changes:
1. **Keep**: `/app/frontend/src/pages/PricingFoundation.js` (primary settings)
2. **Hide from nav**: `/app/frontend/src/pages/PricingSetup.js` (historical import only)
3. **Remove**: Any other pricing settings pages (if they exist)

### Navigation Update:
**File**: `/app/frontend/src/App.js` or nav config

```javascript
// Main nav: Show "Pricing Foundation" link
<NavLink to="/pricing-foundation">Pricing Foundation</NavLink>

// Settings submenu: Link to historical import (not in main nav)
<NavLink to="/pricing-setup" className="text-sm text-gray-500">
  Historical Import (Advanced)
</NavLink>
```

### PricingSetup Banner:
**File**: `/app/frontend/src/pages/PricingSetup.js` (top of page)

```javascript
<Alert variant="info">
  <InfoIcon className="h-4 w-4" />
  <AlertTitle>Historical Import Tool</AlertTitle>
  <AlertDescription>
    This page is for importing past invoices. For live pricing settings,
    use <Link to="/pricing-foundation" className="underline">Pricing Foundation</Link>.
  </AlertDescription>
</Alert>
```

**Testing**:
- Navigate to `/pricing-foundation` → should load settings
- Navigate to `/pricing-setup` → should show banner + import UI
- Check main nav doesn't show "Pricing Setup"

---

## ✅ PHASE 6: GUIDED SETUP QUIZ (Medium Risk, NEW Feature)

### Goal: Ask user real-world prices, convert to calculator defaults

### New Component:
**File**: `/app/frontend/src/components/PricingSetupWizard.js`

```javascript
const QUIZ_SCENARIOS = [
  {
    id: "yard_sign_24x18",
    category: "rigid_signs",
    question: "What do you charge for a 24x18 Coroplast yard sign (single-sided)?",
    defaults_to_extract: ["substrate_cost_per_sqft", "production_labor_rate", "markup_multiplier"]
  },
  {
    id: "banner_4x8",
    category: "banners",
    question: "What do you charge for a 4x8 ft 13oz banner with grommets?",
    defaults_to_extract: ["banner_material_cost", "grommet_cost", "banner_labor_rate"]
  },
  {
    id: "vehicle_spot_graphics",
    category: "vehicle_graphics",
    question: "What do you charge for basic door lettering (2 doors, vinyl, design included)?",
    defaults_to_extract: ["vinyl_cost_per_sqft", "install_rate", "design_rate"]
  },
  // ... more scenarios
];

export default function PricingSetupWizard({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  
  const handleAnswer = (scenarioId, price) => {
    setAnswers({ ...answers, [scenarioId]: price });
  };
  
  const handleFinish = async () => {
    // Send answers to backend
    const response = await fetch('/api/pricing/setup/analyze-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    const { suggested_defaults } = await response.json();
    onComplete(suggested_defaults);
  };
  
  // ... render quiz UI
}
```

### Backend Endpoint:
**File**: `/app/backend/routes/pricing_setup.py`

```python
@router.post("/setup/analyze-quiz")
async def analyze_quiz_answers(
    request: Dict[str, Any],
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Convert user's real-world prices into calculator defaults"""
    answers = request.get("answers", {})
    
    # Example: yard sign 24x18 = $45
    # Known: area = 3 sqft, substrate ~$0.90/sqft, labor ~0.15hrs/sqft
    # Solve for markup: $45 = (material + labor + overhead) * markup
    
    suggested_defaults = {
        "materials": [],
        "labor_rates": {},
        "category_defaults": {}
    }
    
    if "yard_sign_24x18" in answers:
        price = answers["yard_sign_24x18"]
        area = 3.0  # 24*18/144
        assumed_substrate = 0.90 * area  # $2.70
        assumed_labor = 0.15 * area * 28.0  # $12.60
        production_cost = assumed_substrate + assumed_labor
        markup = price / production_cost  # e.g., $45 / $15.30 = 2.94x
        
        suggested_defaults["category_defaults"]["rigid_signs"] = {
            "default_markup_multiplier": round(markup, 2)
        }
        suggested_defaults["materials"].append({
            "key": "coroplast_4mm",
            "cost_per_sqft": 0.90,
            "confidence": "assumed_industry_average"
        })
    
    # ... repeat for other scenarios
    
    return {"suggested_defaults": suggested_defaults}
```

### Integration:
**File**: `/app/frontend/src/pages/PricingFoundation.js`

```javascript
const [showWizard, setShowWizard] = useState(false);

// Button at top of page
<Button onClick={() => setShowWizard(true)} variant="outline">
  <Sparkles className="mr-2 h-4 w-4" />
  Quick Setup Wizard
</Button>

{showWizard && (
  <PricingSetupWizard
    onComplete={(defaults) => {
      // Apply suggested defaults to form
      setFoundationSettings({ ...foundationSettings, ...defaults });
      setShowWizard(false);
      toast.success("Defaults applied! Review and save.");
    }}
  />
)}
```

**Testing**:
- Click "Quick Setup Wizard"
- Answer quiz questions
- Verify backend returns suggested defaults
- Check defaults populate in Pricing Foundation form
- User can review/edit before saving

---

## 📁 EXACT FILES TO CHANGE

### Backend (7 files):
1. `/app/backend/models/enums.py` (lines ~10-20) — Update `PricingCategory` enum
2. `/app/backend/models/pricing.py` (lines ~328+, ~1254-1350) — Update defaults keys, dimension fields, response model
3. `/app/backend/routes/pricing.py` (lines ~31-67) — Add migration aliases, normalize payload
4. `/app/backend/server.py` (lines ~2556+, pricing calculators) — Update field names, enhance breakdown
5. `/app/backend/routes/pricing_setup.py` (NEW endpoint) — Add quiz analysis endpoint
6. `/app/backend/migrations/normalize_categories.py` (NEW, optional) — Migrate existing data
7. `/app/backend/tests/test_pricing.py` — Update test assertions for new response schema

### Frontend (3 files):
1. `/app/frontend/src/components/PricingCalculator.js` (lines ~28, ~360+, ~1106+) — Update category IDs, remove duplicate logic, use new field names
2. `/app/frontend/src/pages/PricingFoundation.js` (top of page) — Add wizard button
3. `/app/frontend/src/components/PricingSetupWizard.js` (NEW) — Implement guided quiz
4. `/app/frontend/src/pages/PricingSetup.js` (top of page) — Add info banner
5. `/app/frontend/src/App.js` (nav config) — Hide PricingSetup from main nav

---

## 🎯 CATEGORY NAMING STANDARD (Final Decision)

**Standard**: All lowercase `snake_case`, matching enum values

| Frontend ID | Backend Enum | Notes |
|-------------|--------------|-------|
| `promotional` | `PROMOTIONAL = "promotional"` | ✓ |
| `cut_vinyl` | `CUT_VINYL = "cut_vinyl"` | ✓ |
| `services` | `SERVICES = "services"` | ✓ |
| `digital_print` | `DIGITAL_PRINT = "digital_print"` | ✓ |
| `rigid_signs` | `RIGID_SIGNS = "rigid_signs"` | ✓ |
| `banners` | `BANNERS = "banners"` | ✓ |
| `apparel` | `APPAREL = "apparel"` | ✓ |
| `vehicle_graphics` | `VEHICLE_GRAPHICS = "vehicle_graphics"` | **Changed** |
| `custom` | `CUSTOM = "custom"` | ✓ |

---

## 🎯 FIELD NAMING STANDARD (Final Decision)

**Standard**: Always use `width`, `height` (in inches), backend computes `area_sqft`

| Field | Type | Units | Source |
|-------|------|-------|--------|
| `width` | float | inches | User input |
| `height` | float | inches | User input |
| `unit_of_measure` | string | "inches" or "feet" | Display preference only |
| `area_sqft` | float | sqft | Backend computed |

**Migration aliases** (backward compat):
- `width_inches` → `width`
- `length_inches` → `height`
- `square_footage` → `area_sqft`

---

## 🎯 BACKEND CALCULATION RESPONSE SCHEMA (Final)

```typescript
interface PricingCalculation {
  // Top-level costs
  material_cost: number;
  labor_cost: number;
  design_cost: number;
  finishing_cost: number;
  hardware_cost: number;
  install_cost: number;
  setup_cost: number;
  overhead_cost: number;
  
  // Totals
  production_cost: number;  // Sum of above (excl overhead)
  total_cost: number;       // production_cost + overhead
  suggested_price: number;  // total_cost * markup
  selling_price: number;    // max(suggested_price, min_charge)
  
  // Metrics
  profit_amount: number;
  profit_margin_percent: number;
  markup_percent: number;
  estimated_labor_minutes: number;
  
  // Itemized breakdown
  breakdown: {
    materials: Array<{
      name: string;
      quantity: number;
      unit: string;  // "sqft", "each", "linear_ft"
      unit_cost: number;
      total_cost: number;
      notes?: string;
    }>;
    labor: Array<{
      name: string;       // "Production", "Installation", "Design"
      quantity: number;   // hours
      unit: string;       // "hours"
      unit_cost: number;  // hourly rate
      total_cost: number;
    }>;
    hardware: Array<{
      name: string;
      quantity: number;
      unit: string;
      unit_cost: number;
      total_cost: number;
    }>;
    finishing: Array<{...}>;
    design: Array<{...}>;
    overhead: Array<{
      name: string;  // "Overhead"
      unit: string;  // "%"
      unit_cost: number;  // percentage
      total_cost: number;
    }>;
    metadata: {
      area_sqft: number;
      billable_sqft: number;
      waste_applied_pct: number;
      markup_multiplier: number;
      [key: string]: any;
    };
  };
}
```

---

## 🔄 PHASED IMPLEMENTATION PLAN

### Phase 1: Normalize Category Names (1-2 hours)
- [ ] Update backend enum
- [ ] Update frontend constant
- [ ] Add migration aliases
- [ ] Test `/api/pricing/calculate` with both old/new names
- [ ] ✅ **Safe to deploy** (backward compatible)

### Phase 2: Normalize Dimension Fields (2-3 hours)
- [ ] Update backend model
- [ ] Add normalization in pricing route
- [ ] Update frontend field names
- [ ] Test all category calculators
- [ ] ✅ **Safe to deploy** (backward compatible)

### Phase 3: Remove Duplicate Logic (3-4 hours)
- [ ] Audit frontend calculations
- [ ] Move logic to backend
- [ ] Remove frontend math
- [ ] Update tests
- [ ] ✅ **Safe to deploy** (frontend simplification)

### Phase 4: Enhanced Breakdown (4-6 hours)
- [ ] Update `PricingCalculation` model
- [ ] Refactor 1 calculator (e.g., rigid signs) with full breakdown
- [ ] Test response format
- [ ] Update frontend display
- [ ] Roll out to remaining calculators
- [ ] ✅ **Safe to deploy** (additive changes)

### Phase 5: Single Settings Page (1 hour)
- [ ] Update navigation
- [ ] Add banner to PricingSetup
- [ ] Test both pages load
- [ ] ✅ **Safe to deploy** (UI only)

### Phase 6: Guided Quiz (6-8 hours, optional)
- [ ] Build quiz component
- [ ] Implement backend analysis
- [ ] Add to Pricing Foundation
- [ ] Test end-to-end flow
- [ ] ✅ **Safe to deploy** (new feature)

---

## ⚠️ WHAT TO DELETE

### DO NOT DELETE:
- ❌ Existing tenant pricing data in database
- ❌ `/api/pricing/calculate` endpoint (refactor, don't remove)
- ❌ `/api/pricing/defaults` endpoint
- ❌ `PricingFoundation.js` page

### SAFE TO DELETE:
- ✅ Duplicate area calculations in frontend
- ✅ Frontend default resolution logic (lines ~360-752 in `PricingCalculator.js`)
- ✅ Old dimension field handlers (`width_inches`, `length_inches` after migration)

### HIDE (DON'T DELETE):
- 🔒 `PricingSetup.js` (keep for historical import, hide from main nav)
- 🔒 Historical import routes (keep functional, just hide UI)

---

## ✅ TESTING CHECKLIST (Per Phase)

### Phase 1 (Category Names):
- [ ] Call `/api/pricing/calculate` with `category: "vehicle_graphics"` → 200 OK
- [ ] Call with old `category: "vehicle_wraps"` → 200 OK (alias works)
- [ ] Check Pricing Foundation loads defaults for all categories
- [ ] Verify no console errors in frontend

### Phase 2 (Dimension Fields):
- [ ] Send `{width: 24, height: 36}` → backend receives correctly
- [ ] Send `{width_inches: 24, length_inches: 36}` → normalized to `width`, `height`
- [ ] Response includes `area_sqft: 6.0` in metadata
- [ ] Frontend displays area correctly

### Phase 3 (Remove Duplication):
- [ ] Frontend no longer computes `areaPerPiece` locally
- [ ] Backend breakdown includes computed `area_sqft`
- [ ] All calculators return consistent format
- [ ] No calculation drift between FE/BE

### Phase 4 (Enhanced Breakdown):
- [ ] Response includes `breakdown.materials[]` with line items
- [ ] Response includes `breakdown.labor[]` with hours + rates
- [ ] Response includes `breakdown.hardware[]` if applicable
- [ ] Frontend renders all breakdown sections
- [ ] Totals match: `sum(materials) == material_cost`, etc.

### Phase 5 (Single Settings):
- [ ] Pricing Foundation is primary nav link
- [ ] PricingSetup shows "advanced tool" banner
- [ ] Both pages load without errors
- [ ] Saved defaults apply to calculator

### Phase 6 (Quiz):
- [ ] Quiz modal opens
- [ ] User answers 3-5 scenarios
- [ ] Backend returns suggested defaults
- [ ] Defaults populate in Pricing Foundation
- [ ] User can edit before saving

---

## 🚨 ROLLBACK PLAN

If any phase causes issues:

1. **Revert backend changes**:
   ```bash
   git revert <commit-hash>
   cd /app/backend && sudo supervisorctl restart backend
   ```

2. **Revert frontend changes**:
   ```bash
   git revert <commit-hash>
   cd /app/frontend && yarn build
   ```

3. **Database rollback** (if migration ran):
   ```bash
   python /app/backend/migrations/rollback_categories.py
   ```

4. **Test**:
   ```bash
   curl -X POST $REACT_APP_BACKEND_URL/api/pricing/calculate \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"category":"rigid_signs","pricing_data":{"width":24,"height":36},"quantity":1}'
   ```

---

## 📊 SUCCESS METRICS

- [ ] Single `/api/pricing/calculate` endpoint handles all categories
- [ ] Frontend has **zero** pricing math (only input collection + display)
- [ ] Backend returns itemized breakdown with 6+ cost types
- [ ] Pricing Foundation is **only** editable settings page
- [ ] Historical import hidden from main nav
- [ ] Guided quiz helps new users bootstrap defaults
- [ ] No saved tenant data lost
- [ ] Backward compatible with existing API calls

---

## 🎉 FINAL STATE

### User Flow:
1. **Setup** → Run guided quiz OR manually enter costs in Pricing Foundation
2. **Quote** → Open calculator → Enter dimensions/materials → Backend computes → Display breakdown
3. **Review** → See itemized: materials ($X), labor ($Y), hardware ($Z), profit ($W)
4. **Save** → Add to quote/order with full cost snapshot

### Code Simplicity:
- ✅ Frontend: ~500 lines lighter (removed duplicate math)
- ✅ Backend: Single source of truth, consistent response format
- ✅ Settings: One page (Pricing Foundation), advanced tool hidden
- ✅ Testability: Backend calculators fully unit-testable

---

**End of Refactor Plan**
