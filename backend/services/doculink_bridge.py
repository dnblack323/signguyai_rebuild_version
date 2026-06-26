try:
    from ..repositories.doculink import DocuLinkRepository
except ImportError:
    from repositories.doculink import DocuLinkRepository


class DocuLinkBridgeService:
    """Bridge methods for modules that still have legacy/local file rows."""

    def __init__(self, database):
        self.repo = DocuLinkRepository(database)

    async def link_existing_file_to_wrap_project(self, tenant_id: str, file_id: str, wrap_project_id: str, actor_id: str = "") -> dict:
        await self.repo.ensure_indexes()
        return await self.repo.create_file_link(tenant_id, {
            "file_id": file_id,
            "entity_type": "wrap_project",
            "entity_id": wrap_project_id,
            "relationship_type": "attachment",
        }, actor_id=actor_id)

    async def link_document_to_wrap_project(self, tenant_id: str, document_id: str, wrap_project_id: str, relationship_type: str = "supporting_record", actor_id: str = "") -> dict:
        await self.repo.ensure_indexes()
        return await self.repo.create_document_link(tenant_id, {
            "document_id": document_id,
            "entity_type": "wrap_project",
            "entity_id": wrap_project_id,
            "relationship_type": relationship_type,
        }, actor_id=actor_id)
