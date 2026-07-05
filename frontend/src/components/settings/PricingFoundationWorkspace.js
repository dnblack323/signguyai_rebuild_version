import React, { useEffect, useMemo, useState } from "react";
import { Calculator, Check, ChevronLeft, ChevronRight, Save, Sparkles } from "lucide-react";
import { api } from "../../lib/api";

const moneyFields = new Set([
  "design_hourly_rate", "production_hourly_rate", "install_hourly_rate", "minimum_order", "deposit_percentage",
  "category_defaults.banners.sell_rate_defaults.base_rate", "category_defaults.banners.default_minimum_sell_price",
  "category_defaults.rigid_signs.sell_rate_defaults.yard_sign_rate", "category_defaults.rigid_signs.default_minimum_sell_price",
  "category_defaults.rigid_signs.sell_rate_defaults.base_rate", "category_defaults.cut_vinyl.sell_rate_defaults.base_rate",
  "category_defaults.cut_vinyl.default_minimum_sell_price", "category_defaults.digital_print.sell_rate_defaults.base_rate",
  "category_defaults.digital_print.sell_rate_defaults.laminate_addon_per_sqft", "category_defaults.vehicle_graphics.sell_rate_defaults.printed_wrap_per_sqft",
  "category_defaults.vehicle_graphics.sell_rate_defaults.color_change_per_sqft", "category_defaults.vehicle_graphics.benchmarks.package_door_lettering",
  "category_defaults.vehicle_graphics.benchmarks.package_spot_graphics", "category_defaults.vehicle_graphics.benchmarks.package_partial_wrap",
  "category_defaults.vehicle_graphics.benchmarks.package_full_wrap", "category_defaults.apparel.default_blank_cost",
  "category_defaults.apparel.default_decoration_cost", "category_defaults.apparel.shop_pricing_table.tee_one_side.qty_12",
  "category_defaults.apparel.shop_pricing_table.tee_one_side.qty_24", "category_defaults.apparel.shop_pricing_table.hoodie_one_side.qty_24",
  "category_defaults.services.labor_rate_overrides.design", "category_defaults.services.labor_rate_overrides.production",
  "category_defaults.services.labor_rate_overrides.install", "category_defaults.services.minimums.design",
  "category_defaults.services.minimums.install", "category_defaults.promotional.minimum_setup_fee",
  "category_defaults.promotional.minimum_charge", "labor.shop_labor_rate", "design.default_design_rate",
]);

const initialFoundation = {
  design_hourly_rate: 85,
  production_hourly_rate: 95,
  install_hourly_rate: 125,
  target_profit_margin_percent: 45,
  minimum_order: 50,
  deposit_percentage: 50,
  labor: { shop_labor_rate: 95, include_labor_in_price: true },
  design: { charge_design_separately: "sometimes", default_design_rate: 85, included_design_minutes: 15 },
  category_defaults: {
    banners: { sell_rate_defaults: { base_rate: 8 }, default_minimum_sell_price: 65, production_minutes_basic: 20 },
    rigid_signs: { sell_rate_defaults: { base_rate: 10, yard_sign_rate: 7 }, default_minimum_sell_price: 25, quantity_breaks: { qty_10_percent: 10, qty_25_percent: 20 }, production_minutes_basic: 20, yard_sign_setup_minutes: 10, yard_sign_minutes_per_sign: 2 },
    cut_vinyl: { sell_rate_defaults: { base_rate: 12 }, default_minimum_sell_price: 45, production_minutes_basic: 30 },
    digital_print: { sell_rate_defaults: { base_rate: 9, laminate_addon_per_sqft: 2 }, production_minutes_basic: 20 },
    vehicle_graphics: { sell_rate_defaults: { printed_wrap_per_sqft: 16, color_change_per_sqft: 18 }, benchmarks: { package_door_lettering: 250, package_spot_graphics: 950, package_partial_wrap: 2200, package_full_wrap: 4200 }, lettering_setup_minutes: 60 },
    apparel: { default_blank_cost: 5, default_decoration_cost: 4, shop_pricing_table: { tee_one_side: { qty_12: 18, qty_24: 15 }, hoodie_one_side: { qty_24: 38 } }, setup_minutes_per_order: 15, production_minutes_per_item: 3 },
    services: { labor_rate_overrides: { design: 85, production: 95, install: 125 }, minimums: { design: 45, install: 125 } },
    promotional: { default_markup_multiplier: 1.5, minimum_setup_fee: 45, minimum_charge: 75 },
    custom: { default_markup_multiplier: 1.5 },
  },
};

const sections = [
  { id: "shop", title: "Shop Basics", subtitle: "Hourly rates, minimums, margin, and deposit defaults.", questions: [
    q("design_hourly_rate", "Design hourly rate", "number", "$/hr"), q("production_hourly_rate", "Production hourly rate", "number", "$/hr"), q("install_hourly_rate", "Install hourly rate", "number", "$/hr"),
    q("target_profit_margin_percent", "Target profit margin", "number", "%"), q("minimum_order", "Minimum order amount", "number", "$/order"), q("deposit_required", "Do you require a deposit?", "boolean", ""), q("deposit_percentage", "Deposit percentage", "number", "%"),
  ] },
  { id: "banners", title: "Banners", subtitle: "Standard 13oz vinyl banners with hems and grommets.", questions: [
    q("banner_2x4", "2ft × 4ft banner price", "number", "$/each"), q("banner_3x6", "3ft × 6ft banner price", "number", "$/each"), q("banner_4x8", "4ft × 8ft banner price", "number", "$/each"), q("banner_finishing_included", "Are hems and grommets usually included?", "boolean", ""),
  ] },
  { id: "yard", title: "Yard Signs / Coroplast", subtitle: "18in × 24in single-sided coroplast yard signs.", questions: [
    q("yard_qty_1", "Price for 1 yard sign", "number", "$/each"), q("yard_qty_10", "Price for 10 yard signs", "number", "$/each"), q("yard_qty_25", "Price for 25 yard signs", "number", "$/each"), q("yard_qty_50", "Price for 50 yard signs", "number", "$/each"), q("yard_stakes_included", "Are stakes included?", "boolean", ""),
  ] },
  { id: "rigid", title: "Rigid Signs", subtitle: "Standard substrates with direct-print or applied vinyl.", questions: [
    q("rigid_coroplast_4x4", "4ft × 4ft coroplast sign", "number", "$/each"), q("rigid_coroplast_4x8", "4ft × 8ft coroplast sign", "number", "$/each"), q("rigid_acm_4x8", "4ft × 8ft ACM / composite", "number", "$/each"), q("rigid_pvc_4x8", "4ft × 8ft PVC sign", "number", "$/each"),
  ] },
  { id: "cutvinyl", title: "Cut Vinyl", subtitle: "Plotter-cut decals, one color unless noted.", questions: [
    q("cv_12x24_one_color", "12in × 24in one-color decal", "number", "$/each"), q("cv_24x36_one_color", "24in × 36in one-color decal", "number", "$/each"), q("cv_24x36_two_color", "24in × 36in two-color decal", "number", "$/each"), q("cv_minimum_charge", "Minimum vinyl decal charge", "number", "$/order"),
  ] },
  { id: "digital", title: "Digital Print", subtitle: "Printed adhesive, paper, and panels.", questions: [
    q("dp_24x36_poster", "24in × 36in poster", "number", "$/each"), q("dp_24x36_adhesive", "24in × 36in adhesive print", "number", "$/each"), q("dp_24x36_adhesive_lam", "24in × 36in laminated adhesive", "number", "$/each"), q("dp_4x8_panel", "4ft × 8ft printed panel", "number", "$/each"),
  ] },
  { id: "vehicle", title: "Vehicle Graphics", subtitle: "Door lettering through full vehicle wraps.", questions: [
    q("vg_door_lettering", "Basic pickup door lettering", "number", "$/job"), q("vg_spot_van", "Spot graphics on a van", "number", "$/job"), q("vg_partial_wrap", "Partial wrap on a cargo van", "number", "$/job"), q("vg_full_wrap", "Full wrap on a cargo van", "number", "$/job"), q("vg_print_sqft_rate", "Printed wrap sell rate", "number", "$/sqft"), q("vg_color_change_sqft", "Color-change wrap sell rate", "number", "$/sqft"),
  ] },
  { id: "apparel", title: "Apparel", subtitle: "T-shirts and hoodies with one-color heat transfer.", questions: [
    q("ap_tee_qty_12_one_side", "12 × one-sided T-shirts, per shirt", "number", "$/each"), q("ap_tee_qty_24_one_side", "24 × one-sided T-shirts, per shirt", "number", "$/each"), q("ap_tee_qty_12_two_side", "12 × front-and-back T-shirts, per shirt", "number", "$/each"), q("ap_blank_cost", "Average blank shirt cost", "number", "$/each"), q("ap_decoration_cost", "Average transfer / decorating cost", "number", "$/each"), q("ap_hoodie_each", "Hoodie price per piece", "number", "$/each"),
  ] },
  { id: "services", title: "Services", subtitle: "Hourly rates and minimum service charges.", questions: [
    q("svc_design_rate", "Design rate", "number", "$/hr"), q("svc_production_rate", "Production rate", "number", "$/hr"), q("svc_install_rate", "Install rate", "number", "$/hr"), q("svc_min_design", "Minimum design charge", "number", "$/job"), q("svc_min_install", "Minimum install charge", "number", "$/job"),
  ] },
  { id: "promo", title: "Promotional / Custom", subtitle: "Outsourced and vendor work.", questions: [
    q("pc_vendor_markup_percent", "Markup on outsourced items", "number", "%"), q("pc_min_setup_fee", "Minimum setup fee", "number", "$/job"), q("pc_min_order", "Minimum order amount", "number", "$/order"),
  ] },
  { id: "labor", title: "Labor & Design Time", subtitle: "Production and design-time assumptions for accurate labor cost.", questions: [
    q("shop_labor_rate", "Normal shop labor rate", "number", "$/hr"), q("include_labor_in_price", "Include production labor in customer pricing?", "choice", "", ["yes", "no"]),
    q("charge_design_separately", "Charge separately for design/artwork?", "choice", "", ["yes", "no", "sometimes"]), q("default_design_rate", "Design/artwork rate", "number", "$/hr"), q("included_design_minutes", "Basic design minutes included", "number", "mins"),
    q("banner_production_minutes", "Basic banner production/finishing minutes", "number", "mins"), q("rigid_sign_production_minutes", "Basic rigid sign production/finishing minutes", "number", "mins"), q("yard_sign_setup_minutes", "Yard sign batch setup minutes", "number", "mins"), q("yard_sign_minutes_per_sign", "Yard sign production minutes per sign", "number", "mins"),
    q("cut_vinyl_production_minutes", "Basic cut vinyl production/weeding minutes", "number", "mins"), q("digital_print_production_minutes", "Basic decal/print production/finishing minutes", "number", "mins"), q("vehicle_lettering_setup_minutes", "Simple vehicle lettering setup/production minutes", "number", "mins"), q("apparel_setup_minutes", "Apparel order setup minutes", "number", "mins"), q("apparel_minutes_per_item", "Apparel production minutes per item", "number", "mins"),
  ] },
];

function q(key, label, type, unit, options = []) { return { key, label, type, unit, options }; }
const answered = (answers, key) => answers[key] !== undefined && answers[key] !== "" && answers[key] !== null;
const n = (answers, key) => answered(answers, key) ? Number(answers[key]) : null;
const avg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const round2 = (value) => Math.round(value * 100) / 100;

function getPath(source, path) {
  return path.split(".").reduce((current, part) => current?.[part], source);
}

function setPath(source, path, value) {
  const clone = structuredClone(source);
  let cursor = clone;
  const parts = path.split(".");
  parts.slice(0, -1).forEach((part) => {
    cursor[part] = cursor[part] || {};
    cursor = cursor[part];
  });
  cursor[parts.at(-1)] = value;
  return clone;
}

function direct(path, value, source, confidence = "High") {
  if (value === null || value === undefined || (typeof value === "number" && !Number.isFinite(value))) return null;
  return { path, value, source, confidence, selected: confidence === "High" };
}

function generateSuggestions(answers) {
  const out = [];
  const add = (suggestion) => { if (suggestion) out.push({ id: `${suggestion.path}-${out.length}`, ...suggestion }); };

  ["design_hourly_rate", "production_hourly_rate", "install_hourly_rate", "target_profit_margin_percent", "minimum_order"].forEach((key) => add(direct(key, n(answers, key), key)));
  if (answers.deposit_required === true) add(direct("deposit_percentage", n(answers, "deposit_percentage"), "Deposit enabled in quiz"));

  const bannerRates = [[n(answers, "banner_2x4"), 8], [n(answers, "banner_3x6"), 18], [n(answers, "banner_4x8"), 32]].filter(([price]) => price !== null).map(([price, sqft]) => price / sqft);
  add(direct("category_defaults.banners.sell_rate_defaults.base_rate", round2(avg(bannerRates) ?? NaN), `Average of ${bannerRates.length} banner price answer(s)`, bannerRates.length > 1 ? "High" : "Review"));
  const bannerPrices = ["banner_2x4", "banner_3x6", "banner_4x8"].map((key) => n(answers, key)).filter((value) => value !== null);
  add(direct("category_defaults.banners.default_minimum_sell_price", bannerPrices.length ? Math.min(...bannerPrices) : null, "Smallest answered banner price", "Review"));

  const yardMid = n(answers, "yard_qty_25") ?? n(answers, "yard_qty_10") ?? n(answers, "yard_qty_50") ?? n(answers, "yard_qty_1");
  add(direct("category_defaults.rigid_signs.sell_rate_defaults.yard_sign_rate", yardMid !== null ? round2(yardMid / 3) : null, "18×24 yard sign mid-quantity price ÷ 3 sqft", "Review"));
  add(direct("category_defaults.rigid_signs.default_minimum_sell_price", n(answers, "yard_qty_1"), "Qty-1 yard sign price", "Review"));
  const yard1 = n(answers, "yard_qty_1");
  if (yard1 && n(answers, "yard_qty_10") !== null && n(answers, "yard_qty_10") < yard1) add(direct("category_defaults.rigid_signs.quantity_breaks.qty_10_percent", Math.round((1 - n(answers, "yard_qty_10") / yard1) * 100), "Qty-10 discount derived against qty-1", "Review"));
  if (yard1 && n(answers, "yard_qty_25") !== null && n(answers, "yard_qty_25") < yard1) add(direct("category_defaults.rigid_signs.quantity_breaks.qty_25_percent", Math.round((1 - n(answers, "yard_qty_25") / yard1) * 100), "Qty-25 discount derived against qty-1", "Review"));

  const rigidRates = [[n(answers, "rigid_coroplast_4x4"), 16], [n(answers, "rigid_coroplast_4x8"), 32], [n(answers, "rigid_acm_4x8"), 32], [n(answers, "rigid_pvc_4x8"), 32]].filter(([price]) => price !== null).map(([price, sqft]) => price / sqft);
  add(direct("category_defaults.rigid_signs.sell_rate_defaults.base_rate", round2(avg(rigidRates) ?? NaN), `Average of ${rigidRates.length} rigid sign price answer(s)`, rigidRates.length > 1 ? "High" : "Review"));

  const vinylRates = [[n(answers, "cv_12x24_one_color"), 2, 1], [n(answers, "cv_24x36_one_color"), 6, 1], [n(answers, "cv_24x36_two_color"), 6, 2]].filter(([price]) => price !== null).map(([price, sqft, colors]) => price / sqft / colors);
  add(direct("category_defaults.cut_vinyl.sell_rate_defaults.base_rate", round2(avg(vinylRates) ?? NaN), `Average of ${vinylRates.length} cut vinyl answer(s)`, vinylRates.length > 1 ? "High" : "Review"));
  add(direct("category_defaults.cut_vinyl.default_minimum_sell_price", n(answers, "cv_minimum_charge"), "Minimum vinyl decal charge", "High"));

  const digitalRates = [[n(answers, "dp_24x36_poster"), 6], [n(answers, "dp_24x36_adhesive"), 6], [n(answers, "dp_4x8_panel"), 32]].filter(([price]) => price !== null).map(([price, sqft]) => price / sqft);
  add(direct("category_defaults.digital_print.sell_rate_defaults.base_rate", round2(avg(digitalRates) ?? NaN), `Average of ${digitalRates.length} digital print answer(s)`, digitalRates.length > 1 ? "High" : "Review"));
  if (n(answers, "dp_24x36_adhesive_lam") !== null && n(answers, "dp_24x36_adhesive") !== null) add(direct("category_defaults.digital_print.sell_rate_defaults.laminate_addon_per_sqft", round2((n(answers, "dp_24x36_adhesive_lam") - n(answers, "dp_24x36_adhesive")) / 6), "Laminated minus unlaminated adhesive price ÷ 6 sqft", "Review"));

  add(direct("category_defaults.vehicle_graphics.sell_rate_defaults.printed_wrap_per_sqft", n(answers, "vg_print_sqft_rate"), "Entered printed wrap sqft rate", "High"));
  add(direct("category_defaults.vehicle_graphics.sell_rate_defaults.color_change_per_sqft", n(answers, "vg_color_change_sqft"), "Entered color-change wrap sqft rate", "High"));
  [["vg_door_lettering", "package_door_lettering"], ["vg_spot_van", "package_spot_graphics"], ["vg_partial_wrap", "package_partial_wrap"], ["vg_full_wrap", "package_full_wrap"]].forEach(([key, field]) => add(direct(`category_defaults.vehicle_graphics.benchmarks.${field}`, n(answers, key), key, "Review")));

  add(direct("category_defaults.apparel.shop_pricing_table.tee_one_side.qty_12", n(answers, "ap_tee_qty_12_one_side"), "12-piece tee price tier", "Review"));
  add(direct("category_defaults.apparel.shop_pricing_table.tee_one_side.qty_24", n(answers, "ap_tee_qty_24_one_side"), "24-piece tee price tier", "Review"));
  add(direct("category_defaults.apparel.default_blank_cost", n(answers, "ap_blank_cost"), "Average blank shirt cost", "High"));
  add(direct("category_defaults.apparel.default_decoration_cost", n(answers, "ap_decoration_cost"), "Average decoration cost", "High"));
  add(direct("category_defaults.apparel.shop_pricing_table.hoodie_one_side.qty_24", n(answers, "ap_hoodie_each"), "Hoodie price tier", "Review"));

  [["svc_design_rate", "design"], ["svc_production_rate", "production"], ["svc_install_rate", "install"]].forEach(([key, field]) => add(direct(`category_defaults.services.labor_rate_overrides.${field}`, n(answers, key), key, "High")));
  add(direct("category_defaults.services.minimums.design", n(answers, "svc_min_design"), "Minimum design charge", "High"));
  add(direct("category_defaults.services.minimums.install", n(answers, "svc_min_install"), "Minimum install charge", "High"));

  const markup = n(answers, "pc_vendor_markup_percent");
  if (markup !== null) {
    add(direct("category_defaults.promotional.default_markup_multiplier", round2(1 + markup / 100), "Vendor markup percent converted to multiplier", "High"));
    add(direct("category_defaults.custom.default_markup_multiplier", round2(1 + markup / 100), "Vendor markup percent converted to multiplier", "High"));
  }
  add(direct("category_defaults.promotional.minimum_setup_fee", n(answers, "pc_min_setup_fee"), "Minimum setup fee", "High"));
  add(direct("category_defaults.promotional.minimum_charge", n(answers, "pc_min_order"), "Promotional minimum order", "High"));

  add(direct("labor.shop_labor_rate", n(answers, "shop_labor_rate"), "Normal shop labor rate", "High"));
  if (answered(answers, "include_labor_in_price")) add(direct("labor.include_labor_in_price", answers.include_labor_in_price === "yes", "Include labor in price choice", "High"));
  if (answered(answers, "charge_design_separately")) add(direct("design.charge_design_separately", answers.charge_design_separately, "Design billing choice", "High"));
  add(direct("design.default_design_rate", n(answers, "default_design_rate"), "Default design rate", "High"));
  add(direct("design.included_design_minutes", n(answers, "included_design_minutes"), "Included design minutes", "High"));
  [["banner_production_minutes", "category_defaults.banners.production_minutes_basic"], ["rigid_sign_production_minutes", "category_defaults.rigid_signs.production_minutes_basic"], ["yard_sign_setup_minutes", "category_defaults.rigid_signs.yard_sign_setup_minutes"], ["yard_sign_minutes_per_sign", "category_defaults.rigid_signs.yard_sign_minutes_per_sign"], ["cut_vinyl_production_minutes", "category_defaults.cut_vinyl.production_minutes_basic"], ["digital_print_production_minutes", "category_defaults.digital_print.production_minutes_basic"], ["vehicle_lettering_setup_minutes", "category_defaults.vehicle_graphics.lettering_setup_minutes"], ["apparel_setup_minutes", "category_defaults.apparel.setup_minutes_per_order"], ["apparel_minutes_per_item", "category_defaults.apparel.production_minutes_per_item"]].forEach(([key, path]) => add(direct(path, n(answers, key), key, "High")));

  return out;
}

function formatValue(path, value) {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (path.includes("percent")) return `${value}%`;
  if (moneyFields.has(path)) return `$${Number(value).toFixed(2)}`;
  return value;
}

export function PricingFoundationWorkspace({ onToast }) {
  const [foundation, setFoundation] = useState(initialFoundation);
  const [answers, setAnswers] = useState({});
  const [appliedSuggestions, setAppliedSuggestions] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState({});
  const suggestions = useMemo(() => generateSuggestions(answers), [answers]);
  const reviewMode = step >= sections.length;
  const active = sections[step] || sections[0];
  const selectedMap = useMemo(() => Object.fromEntries(suggestions.map((item) => [item.id, selected[item.id] ?? item.selected])), [suggestions, selected]);

  const setAnswer = (key, value) => setAnswers((current) => ({ ...current, [key]: value }));
  const applySelected = () => {
    const chosen = suggestions.filter((suggestion) => selectedMap[suggestion.id]);
    const next = chosen.reduce((current, suggestion) => setPath(current, suggestion.path, suggestion.value), foundation);
    setFoundation(next);
    setAppliedSuggestions(chosen);
    onToast?.("Selected pricing defaults applied. Click Save All to persist them.");
  };
  const saveAll = async () => {
    setSaving(true);
    try {
      const saved = await api("/pricing-foundation", {
        method: "PUT",
        body: JSON.stringify({
          status: "active",
          source: appliedSuggestions.length ? "pricing_setup_quiz" : "manual",
          settings: foundation,
          quiz_answers: answers,
          applied_suggestions: appliedSuggestions,
        }),
      });
      setRecord(saved);
      onToast?.("Pricing Foundation saved to backend.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let active = true;
    api("/pricing-foundation")
      .then((row) => {
        if (!active) return;
        setRecord(row);
        if (row.settings && Object.keys(row.settings).length) setFoundation(row.settings);
        if (row.quiz_answers) setAnswers(row.quiz_answers);
        if (row.applied_suggestions) setAppliedSuggestions(row.applied_suggestions);
      })
      .catch(() => onToast?.("Pricing Foundation backend unavailable; using local defaults."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <div className="pricing-foundation-workspace">
      <section className="pricing-foundation-hero">
        <div><span>Settings → Pricing Foundation</span><h1>Pricing Setup Quiz</h1><p>{loading ? "Loading saved Pricing Foundation..." : `Backend status: ${record?.version ? `saved version ${record.version}` : "no saved version yet"}.`} Answer category-specific mini-quizzes and convert real prices into reviewable defaults.</p></div>
        <button className="primary-button" onClick={() => setStep(0)}><Sparkles size={16} />Run Pricing Setup Quiz</button>
      </section>

      <section className="pricing-foundation-layout">
        <aside className="pricing-section-list">
          {sections.map((section, index) => <button key={section.id} className={step === index ? "active" : ""} onClick={() => setStep(index)}><span>{index + 1}</span><strong>{section.title}</strong><small>{section.questions.filter((item) => answered(answers, item.key)).length}/{section.questions.length} answered</small></button>)}
          <button className={reviewMode ? "active review" : "review"} onClick={() => setStep(sections.length)}><span><Check size={14} /></span><strong>Review Suggestions</strong><small>{suggestions.length} generated</small></button>
        </aside>

        <main className="pricing-quiz-panel">
          {!reviewMode ? (
            <>
              <div className="pricing-quiz-heading"><span>Step {step + 1} of {sections.length}</span><h2>{active.title}</h2><p>{active.subtitle}</p></div>
              <div className="pricing-question-grid">
                {active.questions.map((question) => <Question key={question.key} question={question} value={answers[question.key]} onChange={setAnswer} />)}
              </div>
              <div className="pricing-quiz-actions">
                <button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ChevronLeft size={15} />Back</button>
                <button onClick={() => setStep((value) => Math.min(sections.length, value + 1))}>{step === sections.length - 1 ? "Review Suggestions" : "Next"}<ChevronRight size={15} /></button>
              </div>
            </>
          ) : (
            <ReviewPanel foundation={foundation} suggestions={suggestions} selectedMap={selectedMap} setSelected={setSelected} applySelected={applySelected} saveAll={saveAll} saving={saving} onToast={onToast} />
          )}
        </main>
      </section>

      <section className="pricing-foundation-current">
        <div><Calculator size={18} /><span><strong>Current Pricing Foundation preview</strong><small>Applied quiz suggestions update this local settings object. Save All is intentionally separate.</small></span></div>
        <pre>{JSON.stringify(foundation, null, 2)}</pre>
      </section>
    </div>
  );
}

function Question({ question, value, onChange }) {
  if (question.type === "boolean") {
    return <label className="pricing-question"><span>{question.label}</span><div className="segmented"><button type="button" className={value === true ? "active" : ""} onClick={() => onChange(question.key, true)}>Yes</button><button type="button" className={value === false ? "active" : ""} onClick={() => onChange(question.key, false)}>No</button></div></label>;
  }
  if (question.type === "choice") {
    return <label className="pricing-question"><span>{question.label}</span><select value={value || ""} onChange={(event) => onChange(question.key, event.target.value)}><option value="">Skip</option>{question.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  }
  return <label className="pricing-question"><span>{question.label}</span><div><input type="number" value={value || ""} onChange={(event) => onChange(question.key, event.target.value)} placeholder="Skip if unsure" />{question.unit && <em>{question.unit}</em>}</div></label>;
}

function ReviewPanel({ foundation, suggestions, selectedMap, setSelected, applySelected, saveAll, saving, onToast }) {
  return <div className="pricing-review">
    <div className="pricing-quiz-heading"><span>Review Screen</span><h2>Toggle suggestions before applying</h2><p>Recommended suggestions are selected by default. Review suggestions stay off until you choose them.</p></div>
    <div className="pricing-suggestion-list">
      {suggestions.length === 0 && <div className="empty-workspace"><Calculator size={28} /><h2>No suggestions yet</h2><p>Answer any mini-quiz question to generate suggested defaults.</p></div>}
      {suggestions.map((suggestion) => (
        <article key={suggestion.id} className={selectedMap[suggestion.id] ? "selected" : ""}>
          <label><input type="checkbox" checked={selectedMap[suggestion.id]} onChange={(event) => setSelected((current) => ({ ...current, [suggestion.id]: event.target.checked }))} /><span>{suggestion.confidence === "High" ? "Recommended" : "Review recommended"}</span></label>
          <strong>{suggestion.path}</strong>
          <p>{suggestion.source}</p>
          <dl><div><dt>Current</dt><dd>{formatValue(suggestion.path, getPath(foundation, suggestion.path))}</dd></div><div><dt>Suggested</dt><dd>{formatValue(suggestion.path, suggestion.value)}</dd></div></dl>
        </article>
      ))}
    </div>
    <div className="pricing-quiz-actions">
      <button onClick={() => onToast?.("Pricing defaults are still unchanged until you apply selected suggestions.")}>Cancel</button>
      <button onClick={applySelected}><Check size={15} />Apply Selected Defaults</button>
      <button onClick={saveAll} disabled={saving}><Save size={15} />{saving ? "Saving..." : "Save All"}</button>
    </div>
  </div>;
}
