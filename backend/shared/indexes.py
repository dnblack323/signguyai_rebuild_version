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
}


def collection_indexes(collection_name: str) -> tuple[IndexSpec, ...]:
    return INDEX_MANIFEST.get(collection_name, (TENANT_ID_INDEX,))


async def ensure_collection_indexes(collection, collection_name: str, extra_indexes: Iterable[IndexSpec] = ()) -> None:
    for spec in (*collection_indexes(collection_name), *tuple(extra_indexes)):
        await collection.create_index(list(spec.keys), **spec.kwargs())
