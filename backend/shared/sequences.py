from pymongo import ReturnDocument


async def next_sequence_number(database, tenant_id: str, sequence_name: str, prefix: str, pad: int = 4) -> str:
    """Atomically allocate the next tenant-scoped sequence value and format it.

    Uses a single findOneAndUpdate $inc, avoiding the count-then-insert race
    condition that count_documents()-based numbering has under concurrent
    writes. Numbers are never reused, even if the owning record is later
    voided/cancelled/deleted.
    """

    document = await database.sequence_counters.find_one_and_update(
        {"tenant_id": tenant_id, "sequence_name": sequence_name},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return f"{prefix}-{document['value']:0{pad}d}"
