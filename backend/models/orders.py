from datetime import date, datetime
from typing import Any, Literal

from pydantic import Field

from .base import PreviewEnvelope, TenantDocument


OrderStatus = Literal[
    "draft",
    "new_intake",
    "awaiting_review",
    "awaiting_quote",
    "quote_sent",
    "awaiting_approval",
    "approved",
    "in_production",
    "partially_complete",
    "ready_for_pickup",
    "out_for_delivery",
    "completed",
    "on_hold",
    "cancelled",
]
PaymentStatus = Literal["unpaid", "deposit_paid", "partially_paid", "paid", "refunded"]
ApprovalStatus = Literal["pending", "approved", "rejected"]
OrderSource = Literal["phone", "walk_in", "email", "website", "repeat_order", "sales_rep", "webstore"]
PickupDeliveryMethod = Literal["pickup", "delivery", "install", "ship", "undecided"]
ItemCategory = Literal["rigid_signs", "banners", "cut_vinyl", "digital_print", "vehicle_wrap", "apparel", "services", "promo_misc", "custom"]
ItemStatus = Literal["new", "awaiting_info", "awaiting_proof", "awaiting_approval", "approved", "queued", "in_production", "in_qc", "ready", "completed", "on_hold", "rework", "cancelled"]
ItemPriority = Literal["normal", "high", "urgent", "rush"]
EntryMode = Literal["quick", "detailed"]


class OrderPayload(PreviewEnvelope):
    customer_id: str = ""
    customer_name: str = ""
    contact_name: str = ""
    phone: str = ""
    email: str = ""
    company_name: str = ""
    order_source: OrderSource = "phone"
    requested_due_date: date | None = None
    event_date: date | None = None
    status: OrderStatus = "draft"
    payment_status: PaymentStatus = "unpaid"
    approval_status: ApprovalStatus = "pending"
    pickup_delivery_method: PickupDeliveryMethod = "undecided"
    pickup_delivery_notes: str = ""
    internal_notes: str = ""
    customer_notes: str = ""
    order_title: str = ""
    shared_production_notes: str = ""
    shared_design_notes: str = ""
    shared_install_notes: str = ""
    shared_color_brand_notes: str = ""
    default_item_category: ItemCategory | str = "custom"
    shared_artwork_default_mode: Literal["ask", "inherit", "none"] = "ask"
    created_by: str = ""
    source_quote_id: str = ""


class OrderDocument(OrderPayload, TenantDocument):
    order_number: str
    name: str = ""
    final_completion_date: date | None = None
    is_archived: bool = False


class OrderPatch(PreviewEnvelope):
    customer_id: str | None = None
    customer_name: str | None = None
    contact_name: str | None = None
    phone: str | None = None
    email: str | None = None
    company_name: str | None = None
    order_source: OrderSource | None = None
    requested_due_date: date | None = None
    event_date: date | None = None
    status: OrderStatus | None = None
    payment_status: PaymentStatus | None = None
    approval_status: ApprovalStatus | None = None
    pickup_delivery_method: PickupDeliveryMethod | None = None
    pickup_delivery_notes: str | None = None
    internal_notes: str | None = None
    customer_notes: str | None = None
    order_title: str | None = None
    shared_production_notes: str | None = None
    shared_design_notes: str | None = None
    shared_install_notes: str | None = None
    shared_color_brand_notes: str | None = None
    default_item_category: str | None = None
    shared_artwork_default_mode: str | None = None
    is_archived: bool | None = None


class OrderItemPayload(PreviewEnvelope):
    order_id: str = ""
    item_name: str
    item_category: ItemCategory = "custom"
    item_subcategory: str = ""
    quantity: int = Field(default=1, ge=1)
    unit_type: str = "each"
    due_date: date | None = None
    priority: ItemPriority = "normal"
    department_route: str = ""
    assigned_team: str = ""
    assigned_user_id: str = ""
    status: ItemStatus = "new"
    production_required: bool | None = None
    entry_mode: EntryMode = "quick"
    estimated_price_minor: int = 0
    actual_cost_minor: int = 0
    labor_estimate_minor: int = 0
    material_estimate_minor: int = 0
    manual_quote_override_minor: int = 0
    design_needed: bool = False
    customer_artwork: bool = False
    artwork_status: str = "none"
    proof_required: bool = False
    proof_approval_status: str = "none"
    revision_count: int = 0
    artwork_use_mode: str = "none"
    started_date: date | None = None
    finished_date: date | None = None
    ready_for_qc: bool = False
    qc_status: str = "none"
    ready_for_pickup: bool = False
    rework_needed: bool = False
    rework_notes: str = ""
    special_instructions: str = ""
    production_notes: str = ""
    install_notes: str = ""
    packaging_notes: str = ""
    description: str = ""


class OrderItemDocument(OrderItemPayload, TenantDocument):
    item_number: str


class OrderItemPatch(PreviewEnvelope):
    item_name: str | None = None
    item_category: ItemCategory | None = None
    item_subcategory: str | None = None
    quantity: int | None = None
    unit_type: str | None = None
    due_date: date | None = None
    priority: ItemPriority | None = None
    department_route: str | None = None
    assigned_team: str | None = None
    assigned_user_id: str | None = None
    status: ItemStatus | None = None
    production_required: bool | None = None
    entry_mode: EntryMode | None = None
    estimated_price_minor: int | None = None
    manual_quote_override_minor: int | None = None
    design_needed: bool | None = None
    customer_artwork: bool | None = None
    artwork_status: str | None = None
    proof_required: bool | None = None
    proof_approval_status: str | None = None
    revision_count: int | None = None
    artwork_use_mode: str | None = None
    ready_for_qc: bool | None = None
    qc_status: str | None = None
    ready_for_pickup: bool | None = None
    rework_needed: bool | None = None
    rework_notes: str | None = None
    special_instructions: str | None = None
    production_notes: str | None = None
    install_notes: str | None = None
    packaging_notes: str | None = None
    description: str | None = None


class OrderItemSpecPayload(PreviewEnvelope):
    specs: dict[str, Any] = Field(default_factory=dict)


class PricingCalculatePayload(PreviewEnvelope):
    specs: dict[str, Any] = Field(default_factory=dict)
    save_snapshot: bool = False


class LinkArtworkPayload(PreviewEnvelope):
    file_id: str
    relationship_type: str = "artwork"


class OrderEventPayload(PreviewEnvelope):
    event_type: str
    actor_id: str = ""
    actor_type: str = "user"
    metadata: dict[str, Any] = Field(default_factory=dict)


ORDER_ITEM_CATEGORIES: tuple[str, ...] = (
    "rigid_signs",
    "banners",
    "cut_vinyl",
    "digital_print",
    "vehicle_wrap",
    "apparel",
    "services",
    "promo_misc",
    "custom",
)


LOCKED_ORDER_STATUSES = {"completed", "cancelled"}
