import unittest
from unittest.mock import AsyncMock

from services.doculink_bridge import DocuLinkBridgeService


class DocuLinkBridgeTests(unittest.IsolatedAsyncioTestCase):
    async def test_wrap_project_bridge_uses_doculink_links(self):
        service = DocuLinkBridgeService.__new__(DocuLinkBridgeService)
        service.repo = AsyncMock()
        service.repo.create_file_link = AsyncMock(return_value={"id": "LINK-1"})
        service.repo.ensure_indexes = AsyncMock()

        result = await service.link_existing_file_to_wrap_project("shop-a", "FILE-1", "WRAP-1", actor_id="user-1")
        self.assertEqual(result["id"], "LINK-1")
        service.repo.create_file_link.assert_awaited_once_with("shop-a", {
            "file_id": "FILE-1",
            "entity_type": "wrap_project",
            "entity_id": "WRAP-1",
            "relationship_type": "attachment",
        }, actor_id="user-1")


if __name__ == "__main__":
    unittest.main()
