# Pricing Foundation Default Values - Original Repo

Source repo: `C:\Users\thesi\Documents\GitHub\signguyai`

Primary source file: `backend/models/pricing.py`, class `PricingDefaults`

Supporting files:
- `backend/routes/pricing.py`
- `backend/routes/documents.py`
- `backend/routes/orders.py`
- `backend/services/object_storage.py`
- `backend/services/storage_config.py`
- `PRICING_FOUNDATION_FIELD_USAGE_AUDIT.md`
- `PRICING_FOUNDATION_FIELD_ACTION_MATRIX.md`

## Storage Decision

The original repo moved uploads to object storage. New file records should store:

| Thing | Value |
|---|---|
| Storage backend | `emergent_object_storage` |
| Stored file pointer | `storage_path` |
| Upload service | `services.object_storage.put_object()` |
| Download service | `services.object_storage.get_object()` |
| Base64 storage | Legacy fallback only |
| Base64 response use | Still used by some download/API responses for client delivery |

Do not use Mongo/base64 as the primary storage strategy for new files.

## Audit Summary

The original repo's Pricing Foundation audit classified 103 fields:

| Classification | Count | Meaning |
|---|---:|---|
| Actively used | 49 | Directly changes price output |
| Used indirectly | 9 | Affects rules, multipliers, or behavior |
| Stored/display only | 45 | Stored or shown, but not active in pricing output |

These values should be treated as seed/reference defaults unless the rebuild explicitly wires them into calculator logic.

## Global Shop Defaults

| Thing | Value |
|---|---:|
| Production hourly rate | `$28.00/hr` |
| Installer hourly rate | `$40.00/hr` |
| General hourly rate | `$75.00/hr` |
| Design hourly rate | `$85.00/hr` |
| Install hourly rate | `$95.00/hr` |
| Removal hourly rate | `$65.00/hr` |
| Travel hourly rate | `$45.00/hr` |
| Admin hourly rate | `$35.00/hr` |
| Project handling hourly rate | `$35.00/hr` |
| Overhead percentage | `15%` |
| Shop overhead per hour | `$0.00/hr` |
| Apply overhead to jobs | `true` |
| Target profit margin | `40%` |
| Default markup multiplier | `2.5x` |
| Default markup percent | `100%` |
| Material markup percent | `50%` |
| Waste percentage | `10%` |
| Minimum order | `$50.00` |
| Deposit percentage | `50%` |
| Rush fee percentage | `25%` |
| Rush fee flat | `$0.00` |
| Rounding rule | `nearest_dollar` |

## Minimums And Fees

| Thing | Value |
|---|---:|
| Minimum design charge | `$75.00` |
| Minimum install charge | `$150.00` |
| Minimum removal charge | `$120.00` |
| Minimum vinyl charge | `$25.00` |
| Minimum print charge | `$35.00` |
| Minimum sign charge | `$50.00` |
| Minimum service charge | `$75.00` |
| Minimum wrap charge | `$500.00` |
| Default setup fee | `$20.00` |
| Vinyl setup fee | `$15.00` |
| Print setup fee | `$25.00` |
| Apparel screen setup fee | `$35.00` |
| Apparel DTF setup fee | `$20.00` |
| File cleanup fee | `$15.00` |
| Minimum travel charge | `$50.00` |

## Production Time Defaults

| Thing | Value |
|---|---:|
| Weeding time | `5 min/sqft` |
| Application time | `3 min/sqft` |
| Print time | `1 min/sqft` |
| Laminate time | `1.5 min/sqft` |
| Mileage rate | `$0.67/mile` |
| Banner grommet price | `$1.00 each` |
| Banner hemming tape | `$0.03/linear inch` |

## Labor Rate Rules

| Labor type | Hourly rate | Default time | Billing increment | Helper add-on |
|---|---:|---:|---:|---:|
| Design | `$85.00/hr` | `60 min` | `15 min` | `$0.00/hr` |
| Production | `$28.00/hr` | `60 min` | `15 min` | `$0.00/hr` |
| Finishing | `$28.00/hr` | `30 min` | `15 min` | `$0.00/hr` |
| Installation | `$95.00/hr` | `90 min` | `30 min` | `$45.00/hr` |
| Removal | `$65.00/hr` | `60 min` | `30 min` | `$35.00/hr` |
| Travel | `$45.00/hr` | `30 min` | `30 min` | `$0.00/hr` |
| Admin/project handling | `$35.00/hr` | `30 min` | `15 min` | `$0.00/hr` |
| Consultation | `$110.00/hr` | `60 min` | `30 min` | `$0.00/hr` |
| Site survey | `$95.00/hr` | `60 min` | `30 min` | `$0.00/hr` |
| Other labor | `$65.00/hr` | `30 min` | `15 min` | `$0.00/hr` |

All listed labor rules default these multipliers to `1.0`:
- after hours
- weekend
- emergency

## Apparel Blank Defaults

| Thing | Cost | Retail base without print |
|---|---:|---:|
| Gildan 5000 short sleeve tee | `$3.25` | `$7.00` |
| Bella+Canvas 3001 short sleeve tee | `$5.00` | `$9.00` |
| Gildan 2400 long sleeve tee | `$6.00` | `$10.00` |
| Bella+Canvas 3501 long sleeve tee | `$8.00` | `$12.00` |
| Gildan 18000 crewneck | `$9.00` | `$13.00` |
| Bella+Canvas 3901 crewneck | `$11.00` | `$15.00` |
| Gildan 18500 hoodie | `$13.00` | `$18.00` |
| Bella+Canvas 3719 hoodie | `$17.00` | `$22.00` |
| Gildan 8800 polo | `$6.00` | `$12.00` |
| Bella+Canvas 3415 polo | `$8.50` | `$14.00` |
| Standard cap | `$4.00` | `$10.00` |
| Premium cap | `$6.00` | `$13.00` |
| Visor | `$4.00` | `$10.00` |

## Generic Apparel Materials

| Thing | Value |
|---|---:|
| Generic T-shirt | `$4.50 each` |
| Generic hoodie | `$18.00 each` |
| Generic hat/cap | `$8.00 each` |
| Generic polo shirt | `$12.00 each` |
| Generic tank top | `$4.00 each` |
| Generic long sleeve | `$7.50 each` |
| Generic jacket | `$25.00 each` |
| Generic crewneck sweatshirt | `$15.00 each` |
| Generic safety vest | `$10.00 each` |

## Apparel Decoration Defaults

| Thing | Value |
|---|---:|
| HTV cost | `$0.50 per color` |
| Screen print transfer cost | `$0.35 per color` |
| DTF / printed transfer cost | `$0.03 per sqin` |
| Sublimation cost | `$0.04 per sqin` |
| Embroidery cost | `$0.01 per stitch` |
| Patch / emblem cost | `$3.00 each` |

## Apparel Method Defaults

| Method | Setup | Material/default cost | Minimum sell per piece |
|---|---:|---:|---:|
| HTV | `$10.00` | `$0.50/color/piece` | `$0.00` |
| Screen print transfer | `$15.00` | `$0.35/color/piece` | `$0.00` |
| DTF transfer | `$10.00` | `$0.03/sqin` | `$0.00` |
| Direct screen print | `$30.00/color` | `$0.25/color/piece` | `$5.00` |
| Embroidery | `$25.00` | `$0.75/1k stitches` | `$6.00` |
| DTG | `$5.00` | `$2.50/piece` | `$8.00` |
| Patch / emblem | `$0.00` | `$3.00/piece` | `$4.00` |
| Sublimation | `$10.00` | `$0.04/sqin` | `$5.00` |
| Specialty / custom | `$20.00` | `$3.00/piece` | `$6.00` |

Additional apparel defaults:

| Thing | Value |
|---|---:|
| Default decoration method | `htv` |
| Setup minutes per order | `15 min` |
| Production minutes per item | `3 min` |
| Labor hours per unit | `0.08 hr` |
| Markup multiplier | `2.15x` |
| Target profit margin | `38%` |
| Minimum charge | `$60.00` |
| Plus size upcharge per X | `$2.00` |
| Custom name/number garment | `$4.00` |
| Custom name/number hat | `$3.00` |
| Specialty finish garment | `$2.00` |
| Specialty vinyl hat | `$1.50` |
| Two-tone hat finish | `$1.50` |
| Leather patch hat | `$2.50` |
| Bag and fold | `$1.00 each` |
| Basic setup fee | `$10.00` |
| Complex layout fee min | `$20.00` |
| Complex layout fee max | `$30.00` |
| Rush percent min | `15%` |
| Rush percent max | `20%` |
| Default rush percent | `17.5%` |
| Default artwork ready | `false` |
| Default artwork needed | `false` |
| Default design complexity | `simple` |
| Default minimum sell price | `$10.00` |
| Apparel labor minutes per piece | `1.5 min` |
| Apparel handling labor minutes per piece | `0.5 min` |

## Common Material Defaults

| Thing | Value |
|---|---:|
| Vinyl | `$1.25/sqft` |
| Laminate | `$0.65/sqft` |
| Banner material | `$0.90/sqft` |
| Coroplast | `$1.35/sqft` |
| Aluminum composite | `$3.75/sqft` |
| Foam board | `$2.15/sqft` |
| Ink | `$0.35/sqft` |
| Transfer tape | `$0.35/sqft` |
| Apparel blank generic | `$5.00 each` |
| Apparel decoration generic | `$2.50/print` |
| Misc material | `$10.00 each` |
| Acrylic sheet | `$5.50/sqft` |
| Rigid sign board | `$2.85/sqft` |

## Print Media Defaults

| Thing | Cost | Sell rate |
|---|---:|---:|
| Printable adhesive vinyl | `$1.50/sqft` | `$10.00/sqft` |
| Poster paper | `$0.60/sqft` | `$6.00/sqft` |
| Canvas | `$2.25/sqft` | `$15.00/sqft` |
| Backlit film | `$2.50/sqft` | `$16.00/sqft` |
| Perforated window film | `$2.75/sqft` | `$18.00/sqft` |
| Wall graphic media | `$2.25/sqft` | `$14.00/sqft` |
| Floor graphic media | `$3.00/sqft` | `$20.00/sqft` |
| Removable adhesive print media | `$1.50/sqft` | `$10.00/sqft` |
| Photo paper | `$0.75/sqft` | `$8.00/sqft` |
| Specialty / custom print media | `$2.00/sqft` | `$12.00/sqft` |
| Digital print ink at 100% coverage | `$0.75/sqft` | Not set |

## Laminate Defaults

| Thing | Cost |
|---|---:|
| Gloss laminate | `$0.85/sqft` |
| Matte laminate | `$0.85/sqft` |
| Heavy-duty laminate | `$1.25/sqft` |
| Floor laminate | `$1.25/sqft` |
| UV laminate | `$0.85/sqft` |
| Specialty / custom laminate | `$0.85/sqft` |

## Digital Print Defaults

| Thing | Value |
|---|---:|
| Labor | `0.08 hr/sqft` |
| Markup | `2.3x` |
| Target margin | `40%` |
| Minimum charge | `$40.00` |
| Default print media | `printable_adhesive_vinyl` |
| Default ink | `digital_print_ink` |
| Default laminate required | `false` |
| Default laminate | `laminate_gloss` |
| Install included | `false` |
| Minimum billable area | `1 sqft` |
| Minimum sell price | `$20.00` |
| File prep fee | `$20.00` |
| Design time | `0.5 hr` |
| Print quality mode | `standard` |
| Ink coverage | `35%` |
| Waste | `10%` |
| Base ink cost | `$0.75/sqft` |
| Sell method | `max_of_rate_or_minimum` |
| Production labor | `0.08 hr/sqft` |
| Minimum production labor per item | `0.2 hr` |
| Mounting labor | `0.08 hr/sqft` |
| Piece separation | `0.02 hr/piece` |
| Install labor | `0.08 hr/sqft` |
| Trim premium addon | `$3.00` |
| Default use type | `indoor` |
| Default unit of measure | `inches` |
| Default contour cut | `none` |
| Default trim finish | `standard` |
| Default design complexity | `simple` |
| Default install complexity | `easy` |

Digital print quality multipliers:

| Quality | Multiplier |
|---|---:|
| Draft | `0.9x` |
| Standard | `1.0x` |
| High | `1.15x` |
| Photo | `1.3x` |

Digital print contour cut multipliers:

| Type | Multiplier |
|---|---:|
| None | `1.0x` |
| Simple | `1.2x` |
| Complex | `1.5x` |
| Kiss cut | `1.15x` |

Digital print quantity discounts:

| Quantity | Discount |
|---|---:|
| 1-4 | `0%` |
| 5-24 | `5%` |
| 25-99 | `10%` |
| 100+ | `15%` |

## Banner Defaults

| Thing | Value |
|---|---:|
| Labor | `0.10 hr/sqft` |
| Markup | `2.35x` |
| Target margin | `40%` |
| Minimum charge | `$35.00` |
| Default material | `banner_13oz` |
| Default laminate required | `false` |
| Default laminate | `banner_laminate_coating` |
| Default install included | `false` |
| Minimum billable area | `4 sqft` |
| Minimum sell price | `$35.00` |
| Design time | `0.5 hr` |
| Waste | `8%` |
| Production labor | `0.10 hr/sqft` |
| Minimum production labor per item | `0.2 hr` |
| Standard hem | `$0.75/linear ft` |
| Reinforced hem | `$1.25/linear ft` |
| Pole pocket | `$3.50/linear ft` |
| Specialty sewing | `$2.00/linear ft` |
| Grommet cost | `$0.20 each` |
| Grommet sell | `$0.75 each` |
| Grommet minimum charge | `$4.00` |
| Default corner grommet count | `4` |
| Reinforced corners charge | `$6.00` |
| Wind slit charge | `$2.00` |
| Install labor | `0.04 hr/sqft` |
| Install base time | `0.5 hr` |
| Event premium multiplier | `1.2x` |
| Pole banner premium multiplier | `1.3x` |
| Sell method | `max_of_rate_or_minimum` |
| Default unit of measure | `feet` |
| Default use type | `outdoor` |
| Default hems | `standard` |
| Default grommets | `corners` |
| Default pole pockets | `none` |
| Default double sided | `no` |
| Default reinforced corners | `false` |
| Default wind slits | `false` |
| Default specialty sewing | `false` |
| Default event premium | `false` |
| Default install complexity | `easy` |
| Default design complexity | `simple` |

Banner material defaults:

| Material | Cost | Sell rate |
|---|---:|---:|
| 13 oz banner | `$0.85/sqft` | `$8.00/sqft` |
| 18 oz banner | `$1.25/sqft` | `$10.00/sqft` |
| Mesh banner | `$1.40/sqft` | `$11.00/sqft` |
| Blockout banner | `$1.65/sqft` | `$12.00/sqft` |
| Pole banner material | `$2.25/sqft` | `$14.00/sqft` |
| Fabric display banner | `$2.75/sqft` | `$16.00/sqft` |
| Double-sided banner material | `$1.95/sqft` | `$13.00/sqft` |
| Specialty / custom banner material | `$2.00/sqft` | `$12.00/sqft` |
| Banner print consumable | `$0.75/sqft` | Not set |
| Optional laminate / coating | `$0.60/sqft` | Not set |

Banner quantity discounts:

| Quantity | Discount |
|---|---:|
| 1-2 | `0%` |
| 3-9 | `5%` |
| 10-24 | `10%` |
| 25+ | `15%` |

## Rigid Sign Defaults

| Thing | Value |
|---|---:|
| Labor | `0.15 hr/sqft` |
| Markup | `2.45x` |
| Target margin | `41%` |
| Minimum charge | `$25.00` |
| Default substrate | `coroplast_4mm` |
| Default finish required | `false` |
| Default finish | `rigid_finish_standard` |
| Default install included | `false` |
| Minimum billable area | `1 sqft` |
| Minimum sell price | `$25.00` |
| Design time | `0.5 hr` |
| Mounting labor | `0.08 hr/sqft` |
| Waste | `5%` |
| Production labor | `0.15 hr/sqft` |
| Minimum production labor per item | `0.2 hr` |
| Install labor | `0.08 hr/sqft` |
| Hardware handling labor cost | `$5.00` |
| Drill prep fee | `$3.00` |
| Sell method | `max_of_rate_or_minimum` |
| Default unit of measure | `inches` |
| Default graphic method | `direct_print` |
| Default protective finish | `false` |
| Default sidedness | `single` |
| Default double-sided art | `same` |
| Default shape | `rectangle` |
| Default finish quality | `standard` |
| Yard sign setup | `10 min` |
| Yard sign per-sign time | `2 min` |

Rigid substrate/material defaults:

| Material | Cost | Sell rate |
|---|---:|---:|
| Coroplast 4mm | `$0.90/sqft` | `$10.00/sqft` |
| Coroplast 10mm | `$1.60/sqft` | `$14.00/sqft` |
| PVC 3mm | `$2.25/sqft` | `$16.00/sqft` |
| PVC 6mm | `$3.50/sqft` | `$22.00/sqft` |
| ACM / Dibond 3mm | `$4.25/sqft` | `$24.00/sqft` |
| Aluminum .040 | `$3.25/sqft` | `$18.00/sqft` |
| Aluminum .063 | `$4.25/sqft` | `$22.00/sqft` |
| Aluminum .080 | `$5.25/sqft` | `$26.00/sqft` |
| Acrylic 1/8 inch | `$4.50/sqft` | `$24.00/sqft` |
| Acrylic 1/4 inch | `$6.50/sqft` | `$32.00/sqft` |
| Foamboard 3/16 inch | `$1.25/sqft` | `$12.00/sqft` |
| MDO 1/2 inch | `$3.75/sqft` | `$20.00/sqft` |
| Custom other substrate | `$4.00/sqft` | `$20.00/sqft` |
| Mounted print graphic | `$2.00/sqft` | Not set |
| Direct print consumable | `$1.25/sqft` | Not set |
| Standard protective finish | `$0.75/sqft` | Not set |

Rigid quantity discounts:

| Quantity | Discount |
|---|---:|
| 1-4 | `0%` |
| 5-24 | `5%` |
| 25-99 | `10%` |
| 100+ | `15%` |

## Cut Vinyl Defaults

| Thing | Value |
|---|---:|
| Labor | `0.20 hr/sqft` |
| Markup | `2.3x` |
| Target margin | `40%` |
| Minimum charge | `$20.00` |
| Default vinyl | `oracal_651` |
| Masking required | `true` |
| Install included | `false` |
| Minimum billable area | `0.5 sqft` |
| Minimum sell price | `$20.00` |
| Cleanup fee | `$20.00` |
| Design time | `0.5 hr` |
| Default use type | `indoor` |
| Default unit of measure | `inches` |
| Default weeding complexity | `simple` |
| Default design complexity | `simple` |
| Default install complexity | `easy` |
| Default surface type | `flat_smooth` |
| Default number of colors | `1` |
| Waste | `10%` |
| Production labor | `0.20 hr/sqft` |
| Minimum production labor per item | `0.25 hr` |
| Install labor | `0.06 hr/sqft` |
| Transfer tape | `transfer_tape` |

Cut vinyl material defaults:

| Material | Cost | Sell rate |
|---|---:|---:|
| Oracal 651 | `$1.25/sqft` | `$12.00/sqft` |
| Oracal 751 | `$2.50/sqft` | `$15.00/sqft` |
| Oracal 951 | `$2.50/sqft` | `$15.00/sqft` |
| Avery HP750 | `$2.50/sqft` | `$15.00/sqft` |
| Reflective vinyl | `$4.50/sqft` | `$22.00/sqft` |
| Metallic vinyl | `$4.50/sqft` | `$22.00/sqft` |
| Fluorescent vinyl | `$4.50/sqft` | `$22.00/sqft` |
| Etched/frost vinyl | `$4.50/sqft` | `$20.00/sqft` |
| Wall vinyl | `$2.50/sqft` | `$15.00/sqft` |
| Specialty/custom vinyl | `$4.50/sqft` | `$24.00/sqft` |

Cut vinyl quantity discounts:

| Quantity | Discount |
|---|---:|
| 1-5 | `0%` |
| 6-24 | `5%` |
| 25-99 | `10%` |
| 100+ | `15%` |

## Vehicle Graphics / Wrap Defaults

| Thing | Value |
|---|---:|
| Labor | `0.12 hr/sqft` |
| Markup | `2.4x` |
| Target margin | `42%` |
| Minimum charge | `$150.00` |
| Default material key in config | `wrap_standard_calendered` |
| Available material key | `wrap_standard_calendared` |
| Default laminate | `wrap_laminate_gloss` |
| Default graphic type | `spot` |
| Default coverage type | `spot` |
| Laminate required for prints | `true` |
| Laminate required for lettering | `false` |
| Default minimum sell price | `$150.00` |
| Waste | `12%` |
| Production labor | `0.12 hr/sqft` |
| Minimum production labor per item | `1 hr` |
| Removal consumables allowance | `$8.00` |
| Install rate | `$75.00/hr` |
| Install minimum | `$125.00` |
| Second installer rate | `$35.00/hr` |
| Window perf rear sell rate | `$18.00/sqft` |
| Window perf side sell rate | `$20.00/sqft` |
| Rush increase | `30%` |
| Sell method | `max_of_package_or_cost_plus` |
| Default install difficulty | `medium` |
| Default seam complexity | `basic` |
| Default surface prep | `none` |
| Default removal scope | `none` |
| Default design complexity | `medium` |
| Default second installer required | `false` |
| Default window perf included | `false` |
| Default window perf scope | `rear` |
| Default install required | `true` |

Important risk: `wrap_standard_calendered` and `wrap_standard_calendared` are both present. The default key appears misspelled compared to the available material key.

Vehicle wrap material defaults:

| Material | Cost | Sell rate |
|---|---:|---:|
| Standard calendared vinyl | `$1.50/sqft` | `$9.00/sqft` |
| Premium cast vinyl | `$2.75/sqft` | `$14.00/sqft` |
| Wrap cast film | `$3.50/sqft` | `$18.00/sqft` |
| Reflective vinyl | `$5.00/sqft` | `$24.00/sqft` |
| Etched/frost film | `$2.75/sqft` | `$14.00/sqft` |
| Specialty/custom vehicle media | `$4.00/sqft` | `$20.00/sqft` |
| Window perf film | `$2.50/sqft` | `$18.00/sqft` |
| Gloss wrap laminate | `$1.25/sqft` | Not set |
| Matte wrap laminate | `$1.25/sqft` | Not set |
| Satin wrap laminate | `$1.35/sqft` | Not set |

Vehicle base square footage defaults:

| Vehicle | Base sqft |
|---|---:|
| Car sedan | `150` |
| Car SUV | `200` |
| Pickup truck | `175` |
| Cargo van | `250` |
| Sprinter van | `350` |
| Box truck 12ft | `400` |
| Box truck 16ft | `500` |
| Box truck 24ft | `650` |
| Trailer | `450` |
| Semi truck | `800` |
| Other vehicle | `160` |

## Service Defaults

| Thing | Value |
|---|---:|
| Markup | `1.8x` |
| Target margin | `35%` |
| Minimum charge | `$25.00` |
| Default service type | `general_labor` |
| Default labor role | `production` |
| Travel cost | `$0.65/mile` |
| Travel sell rate | `$1.25/mile` |
| Trip charge default | `$45.00` |
| Trip charge cost | `$0.00` |
| Equipment cost | `$150.00/day` |
| Equipment sell | `$225.00/day` |
| Subcontract markup | `20%` |
| Rush percent | `25%` |
| Minimum billable quantity | `1` |
| Default minimum sell | `$25.00` |
| Design setup minimum | `$25.00` |
| Service call minimum | `$50.00` |
| Install minimum | `$125.00` |
| Minimum trip charge | `$45.00` |
| Default sell method | `max_of_both` |

Service type defaults:

| Service | Billing unit | Labor role | Sell rate / flat fee | Minimum |
|---|---|---|---:|---:|
| Graphic design | hour | design | `$95.00/hr` | `$25.00` |
| Artwork setup | flat | design | `$25.00 flat` | `$25.00` |
| File cleanup | flat | design | `$25.00 flat` | `$25.00` |
| Consultation | hour | project management | `$95.00/hr`, `$50 flat` | `$50.00` |
| Site survey | flat | installer | `$125.00 flat` | `$125.00` |
| Measurement | flat | installer | `$75.00 flat` | `$75.00` |
| Delivery | trip | helper | `$45.00 flat` | `$45.00` |
| Installation | hour | installer | `$95.00/hr` | `$125.00` |
| Removal | hour | installer | `$85.00/hr` | `$100.00` |
| Maintenance / repair | hour | installer | `$95.00/hr` | `$95.00` |
| Vehicle graphics install labor | hour | installer | `$95.00/hr` | `$125.00` |
| Wrap install labor | hour | lead installer | `$110.00/hr` | `$450.00` |
| Service call labor | hour | installer | `$110.00/hr` | `$150.00` |
| Project management | hour | project manager | `$95.00/hr` | `$50.00` |
| Permit handling | flat | admin | `$175.00 flat` | `$175.00` |
| Equipment / lift rental | day | installer | cost plus | `$0.00` |
| Subcontracted service | flat | outsourced | pass-through plus markup | `$0.00` |
| General labor service | hour | production | `$75.00/hr` | `$25.00` |
| Specialty/custom service | hour | specialty technician | `$125.00/hr` | `$50.00` |

Service labor role defaults:

| Role | Cost | Sell |
|---|---:|---:|
| Design | `$45.00/hr` | `$95.00/hr` |
| Production | `$28.00/hr` | `$75.00/hr` |
| Installer | `$35.00/hr` | `$95.00/hr` |
| Lead installer | `$45.00/hr` | `$110.00/hr` |
| Helper | `$22.00/hr` | `$55.00/hr` |
| Project manager | `$45.00/hr` | `$95.00/hr` |
| Admin | `$30.00/hr` | `$75.00/hr` |
| Outsourced/subcontracted | `$0.00/hr` | `$0.00/hr` |
| Specialty technician | `$55.00/hr` | `$125.00/hr` |

Equipment defaults:

| Equipment | Cost/day | Sell/day | Cost/hour | Sell/hour |
|---|---:|---:|---:|---:|
| Scissor lift | `$225.00` | `$325.00` | `$35.00` | `$55.00` |
| Boom lift | `$325.00` | `$475.00` | `$55.00` | `$80.00` |
| Ladder rig | `$50.00` | `$95.00` | `$15.00` | `$25.00` |
| Generator | `$80.00` | `$125.00` | `$15.00` | `$25.00` |
| Utility truck | `$120.00` | `$200.00` | `$25.00` | `$40.00` |
| Custom equipment | `$150.00` | `$225.00` | `$25.00` | `$45.00` |

## Hardware Defaults

| Hardware | Cost | Sell | Labor |
|---|---:|---:|---:|
| Standard H-stake | `$1.50` | `$3.50` | `0 min` |
| Heavy-duty stake | `$2.50` | `$5.00` | `0 min` |
| Screws/basic mounting set | `$1.00` | `$3.00` | `0 min` |
| Stand-off set | `$3.00` | `$7.00` | `0 min` |
| Easel back | `$2.00` | `$5.00` | `0 min` |
| Hanging hardware | `$1.50` | `$4.00` | `0 min` |
| Custom other hardware | `$2.00` | `$5.00` | `0 min` |
| Banner grommet | `$0.20` | `$0.75` | `0.5 min` |
| Pole pocket rod | `$3.50` | `$12.00` | `2 min` |
| Bungee cord set | `$1.50` | `$4.00` | `0 min` |
| Rope/tie set | `$1.25` | `$3.50` | `0 min` |
| Zip tie set | `$0.50` | `$2.00` | `0 min` |
| Retractable stand base | `$40.00` | `$95.00` | `5 min` |
| X-banner stand | `$18.00` | `$45.00` | `3 min` |
| Sandbag | `$8.00` | `$20.00` | `0 min` |
| Custom other banner hardware | `$2.00` | `$5.00` | `0 min` |

## Custom / Miscellaneous Defaults

| Thing | Value |
|---|---:|
| Labor hours per unit | `0.25 hr` |
| Markup | `2.25x` |
| Target margin | `38%` |
| Minimum charge | `$50.00` |
| Default material | `misc_material` |
| Default labor type | `production` |

## Quantity Break Defaults

| Break | Minimum quantity | Discount |
|---|---:|---:|
| Break 1 | `10` | `5%` |
| Break 2 | `25` | `10%` |
| Break 3 | `50` | `15%` |
| Break 4 | `100` | `20%` |

## Global Rule Defaults

| Thing | Value |
|---|---|
| Pricing method hierarchy | `max_of_margin_or_markup` |
| Overhead application | `material_and_labor` |
| Waste application | `material_only` |
| Rush application | `multiply_total` |
| Minimum billable area | `1.0` |
| Minimum price floor | `0.0` |
| Category override rules | blank string |
| Fallback warning behavior | `warn` |

## AI / Benchmark Rule Defaults

| Thing | Value |
|---|---|
| AI fill missing only | `true` |
| AI never override user values | `true` |
| AI can prefill category defaults | `true` |
| AI suggest material type | `true` |
| AI suggest complexity | `true` |
| AI suggest install | `true` |
| AI suggest design | `true` |
| Value source labels enabled | `true` |
| Benchmark rules enabled | `true` |
| Historical influence | `0.6` |
| Outlier handling | `exclude_high_low` |
| Confidence handling | `warn_low_confidence` |

## Selling Price Benchmarks

| Category | Average rate | Average order | Minimum | Low | Typical | Premium |
|---|---:|---:|---:|---:|---:|---:|
| Digital print | `$9.50/sqft` | `$280.00` | `$45.00` | `$7.00` | `$9.50` | `$13.00` |
| Vehicle wraps | `$18.75/sqft` | `$2,850.00` | `$950.00` | `$15.00` | `$18.75` | `$24.00` |
| Banners | `$8.25/sqft` | `$245.00` | `$45.00` | `$6.50` | `$8.25` | `$11.00` |
| Rigid signs | `$12.40/sqft` | `$310.00` | `$65.00` | `$9.50` | `$12.40` | `$16.00` |
| Cut vinyl | `$7.50/sqft` | `$125.00` | `$30.00` | `$5.50` | `$7.50` | `$10.00` |
| Apparel | `$24.00/unit` | `$420.00` | `$75.00` | `$18.00` | `$24.00` | `$32.00` |
| Services | `$110.00/hr` | `$240.00` | `$85.00` | `$85.00` | `$110.00` | `$145.00` |
| Custom / miscellaneous | `$75.00/unit` | `$280.00` | `$60.00` | `$55.00` | `$75.00` | `$100.00` |

## Notes For Rebuild Use

- The original values are float-dollar values. A clean rebuild should store money as integer cents where practical.
- Do not port the full pricing engine into the MVP unless pricing is explicitly in scope.
- If using these values later, import them as editable seed data rather than hardcoded business logic.
- Keep object storage as the file storage target; keep base64 only for legacy fallback or controlled response payloads.
- Fix the vehicle wrap key mismatch before relying on the wrap defaults.
