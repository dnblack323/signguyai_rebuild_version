"""Shared Pricing contract used by every category calculation adapter.

One `PricingResult` shape is returned by every category calculator in
`services/pricing_engine.py`, regardless of which driver (area, coverage,
labor hours, unit cost, apparel quantity, or manual) or calculation method
the tenant has selected for that category. This is intentional: the legacy
audit (`PRICING_LEGACY_ARCHITECTURE_MISTAKES_AND_PREVENTION.md`) found that
having different result shapes per category caused frontend/backend drift
and duplicated math. Category-specific logic stays inside the adapters;
only the result contract is shared.
"""

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

WarningCode = Literal["below_cost", "below_margin", "missing_foundation_config"]
WarningSeverity = Literal["info", "warning", "critical"]


class PricingWarning(BaseModel):
    code: WarningCode
    severity: WarningSeverity
    message: str


class PricingBreakdownLine(BaseModel):
    name: str
    quantity: float = 1.0
    unit: str = "each"
    unit_cost_minor: int = 0
    total_cost_minor: int = 0


class PricingResult(BaseModel):
    category: str
    calculation_method: str
    quantity: int = 1
    material_cost_minor: int = 0
    labor_cost_minor: int = 0
    design_cost_minor: int = 0
    setup_cost_minor: int = 0
    finishing_cost_minor: int = 0
    hardware_cost_minor: int = 0
    install_cost_minor: int = 0
    outsourcing_cost_minor: int = 0
    overhead_cost_minor: int = 0
    base_cost_minor: int = 0
    total_cost_minor: int = 0
    markup_amount_minor: int = 0
    selling_price_minor: int = 0
    minimum_charge_minor: int = 0
    minimum_charge_applied: bool = False
    breakdown: dict[str, list[PricingBreakdownLine]] = Field(default_factory=dict)
    warnings: list[PricingWarning] = Field(default_factory=list)
    details: dict[str, Any] = Field(default_factory=dict)
    calculated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PricingOverride(BaseModel):
    override_price_minor: int
    original_price_minor: int
    reason: str
    actor_id: str
    actor_role: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
