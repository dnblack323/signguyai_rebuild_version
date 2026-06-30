from dataclasses import dataclass
from typing import Iterable, Mapping, Sequence

from pymongo import ASCENDING, DESCENDING


IndexKey = Sequence[tuple[str, int]]


@dataclass(frozen=True)
class IndexSpec:
    keys: IndexKey
    name: str
    unique: bool = False
    partial_filter_expression: Mapping | None = None

    def kwargs(self) -> dict:
        options: dict = {"name": self.name}
        if self.unique:
            options["unique"] = True
        if self.partial_filter_expression:
            options["partialFilterExpression"] = dict(self.partial_filter_expression)
        return options


TENANT_ID_INDEX = IndexSpec(
    keys=(("tenant_id", ASCENDING), ("id", ASCENDING)),
    name="tenant_id_1_id_1_unique",
    unique=True,
)


INDEX_MANIFEST: dict[str, tuple[IndexSpec, ...]] = {
    "customers": (
        TENANT_ID_INDEX,
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("normalized_email", ASCENDING)),
            name="tenant_id_1_normalized_email_1_partial_unique",
            unique=True,
            partial_filter_expression={"normalized_email": {"$type": "string", "$ne": ""}},
        ),
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("normalized_name", ASCENDING)),
            name="tenant_id_1_normalized_name_1",
        ),
    ),
    "customer_child_records": (
        TENANT_ID_INDEX,
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("customer_id", ASCENDING), ("record_type", ASCENDING), ("position", ASCENDING)),
            name="tenant_id_1_customer_id_1_record_type_1_position_1",
        ),
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("record_type", ASCENDING), ("updated_at", DESCENDING)),
            name="tenant_id_1_record_type_1_updated_at_-1",
        ),
    ),
    "wrap_projects": (
        TENANT_ID_INDEX,
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("updated_at", DESCENDING)),
            name="tenant_id_1_updated_at_-1",
        ),
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("customerId", ASCENDING)),
            name="tenant_id_1_customerId_1",
        ),
    ),
    "wrap_project_child_records": (
        TENANT_ID_INDEX,
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("project_id", ASCENDING), ("record_type", ASCENDING), ("position", ASCENDING)),
            name="tenant_id_1_project_id_1_record_type_1_position_1",
        ),
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("record_type", ASCENDING), ("updated_at", DESCENDING)),
            name="tenant_id_1_record_type_1_updated_at_-1",
        ),
    ),
    "shared_record_child_records": (
        TENANT_ID_INDEX,
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("parent_collection", ASCENDING), ("parent_id", ASCENDING), ("record_type", ASCENDING), ("position", ASCENDING)),
            name="tenant_parent_record_position",
        ),
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("parent_collection", ASCENDING), ("record_type", ASCENDING), ("updated_at", DESCENDING)),
            name="tenant_parent_collection_record_type_updated",
        ),
    ),
    "files": (
        IndexSpec(keys=(("tenant_id", ASCENDING), ("id", ASCENDING)), name="tenant_id_1_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("sha256", ASCENDING)), name="tenant_id_1_sha256_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("mime_type", ASCENDING)), name="tenant_id_1_mime_type_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("scan_status", ASCENDING)), name="tenant_id_1_scan_status_1"),
    ),
    "documents": (
        IndexSpec(keys=(("tenant_id", ASCENDING), ("id", ASCENDING)), name="tenant_id_1_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_status_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("document_type", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_document_type_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("visibility", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_visibility_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("customer_id", ASCENDING)), name="tenant_id_1_customer_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_id", ASCENDING)), name="tenant_id_1_order_id_1"),
    ),
    "file_links": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("entity_type", ASCENDING), ("entity_id", ASCENDING)), name="tenant_id_1_entity_type_1_entity_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("file_id", ASCENDING)), name="tenant_id_1_file_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("file_id", ASCENDING), ("entity_type", ASCENDING), ("entity_id", ASCENDING)), name="tenant_file_entity_unique", unique=True),
    ),
    "document_links": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("entity_type", ASCENDING), ("entity_id", ASCENDING)), name="tenant_id_1_entity_type_1_entity_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("document_id", ASCENDING)), name="tenant_id_1_document_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("document_id", ASCENDING), ("entity_type", ASCENDING), ("entity_id", ASCENDING)), name="tenant_document_entity_unique", unique=True),
    ),
    "document_shares": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("document_id", ASCENDING)), name="tenant_id_1_document_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("recipient_type", ASCENDING), ("recipient_id", ASCENDING)), name="tenant_id_1_recipient_type_1_recipient_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("expires_at", ASCENDING)), name="tenant_id_1_expires_at_1"),
    ),
    "document_activities": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("document_id", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_document_id_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("actor_id", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_actor_id_1_created_at_-1"),
    ),
    "document_templates": (
        IndexSpec(keys=(("tenant_id", ASCENDING), ("id", ASCENDING)), name="tenant_id_1_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("template_type", ASCENDING), ("updated_at", DESCENDING)), name="tenant_id_1_template_type_1_updated_at_-1"),
    ),
    "template_versions": (
        IndexSpec(keys=(("tenant_id", ASCENDING), ("template_id", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_template_id_1_created_at_-1"),
    ),
    "template_fields": (
        IndexSpec(keys=(("tenant_id", ASCENDING), ("template_id", ASCENDING), ("position", ASCENDING)), name="tenant_id_1_template_id_1_position_1"),
    ),
    "template_categories": (
        IndexSpec(keys=(("tenant_id", ASCENDING), ("name", ASCENDING)), name="tenant_id_1_name_1"),
    ),
    "orders": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_number", ASCENDING)), name="tenant_id_1_order_number_1_unique", unique=True),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("customer_id", ASCENDING)), name="tenant_id_1_customer_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_status_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_source", ASCENDING)), name="tenant_id_1_order_source_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("requested_due_date", ASCENDING)), name="tenant_id_1_requested_due_date_1"),
    ),
    "order_items": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("item_number", ASCENDING)), name="tenant_id_1_item_number_1_unique", unique=True),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_id", ASCENDING)), name="tenant_id_1_order_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("customer_id", ASCENDING)), name="tenant_id_1_customer_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("item_category", ASCENDING)), name="tenant_id_1_item_category_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("status", ASCENDING), ("due_date", ASCENDING)), name="tenant_id_1_status_1_due_date_1"),
    ),
    "order_item_specs": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_item_id", ASCENDING)), name="tenant_id_1_order_item_id_1_unique", unique=True),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_id", ASCENDING)), name="tenant_id_1_order_id_1"),
    ),
    "order_item_pricing_snapshots": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_item_id", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_order_item_id_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_id", ASCENDING)), name="tenant_id_1_order_id_1"),
    ),
    "order_events": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_id", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_order_id_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_item_id", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_order_item_id_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("event_type", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_event_type_1_created_at_-1"),
    ),
    "quote_drafts": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("quote_number", ASCENDING)), name="tenant_id_1_quote_number_1_unique", unique=True),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_id", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_order_id_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("customer_id", ASCENDING)), name="tenant_id_1_customer_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_status_1_created_at_-1"),
    ),
    "invoice_drafts": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("invoice_number", ASCENDING)), name="tenant_id_1_invoice_number_1_unique", unique=True),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_id", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_order_id_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("customer_id", ASCENDING)), name="tenant_id_1_customer_id_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_status_1_created_at_-1"),
    ),
    "work_order_drafts": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("work_order_number", ASCENDING)), name="tenant_id_1_work_order_number_1_unique", unique=True),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("order_id", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_order_id_1_created_at_-1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)), name="tenant_id_1_status_1_created_at_-1"),
    ),
    "community_posts": (
        TENANT_ID_INDEX,
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("created_at", DESCENDING)),
            name="tenant_id_1_created_at_-1",
        ),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("category", ASCENDING)), name="tenant_id_1_category_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("status", ASCENDING)), name="tenant_id_1_status_1"),
    ),
    "shared_notes": (
        TENANT_ID_INDEX,
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("created_at", DESCENDING)),
            name="tenant_id_1_created_at_-1",
        ),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("scope", ASCENDING)), name="tenant_id_1_scope_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("status", ASCENDING)), name="tenant_id_1_status_1"),
    ),
    "ai_responses": (
        TENANT_ID_INDEX,
        IndexSpec(
            keys=(("tenant_id", ASCENDING), ("created_at", DESCENDING)),
            name="tenant_id_1_created_at_-1",
        ),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("tool", ASCENDING)), name="tenant_id_1_tool_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("source_module", ASCENDING)), name="tenant_id_1_source_module_1"),
    ),
    "pricing_foundations": (
        TENANT_ID_INDEX,
        IndexSpec(keys=(("tenant_id", ASCENDING), ("key", ASCENDING)), name="tenant_id_1_key_1_unique", unique=True),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("status", ASCENDING)), name="tenant_id_1_status_1"),
        IndexSpec(keys=(("tenant_id", ASCENDING), ("updated_at", DESCENDING)), name="tenant_id_1_updated_at_-1"),
    ),
}


def collection_indexes(collection_name: str) -> tuple[IndexSpec, ...]:
    return INDEX_MANIFEST.get(collection_name, (TENANT_ID_INDEX,))


async def ensure_collection_indexes(collection, collection_name: str, extra_indexes: Iterable[IndexSpec] = ()) -> None:
    for spec in (*collection_indexes(collection_name), *tuple(extra_indexes)):
        await collection.create_index(list(spec.keys), **spec.kwargs())
