import unittest

from fastapi import HTTPException

from services.wrap_lab_service import apply_workflow_action, public_project


class WrapLabWorkflowTests(unittest.TestCase):
    def project(self):
        return {
            "id": "WRAP-TEST-1",
            "stageIndex": 1,
            "stage": "Quote",
            "quoteStatus": "pending",
            "contractStatus": "pending",
            "paymentStatus": "unpaid",
            "proofs": [{"version": "v1", "status": "Pending"}],
            "productionChecklist": [{"task": "Print", "done": True}],
            "installChecklist": [{"task": "Post heat", "done": True}],
            "chatHistory": [],
        }

    def test_portal_actions_unlock_design_gate(self):
        project = self.project()
        apply_workflow_action(project, "approve_quote", {})
        apply_workflow_action(project, "pay_deposit", {"amount": 1000})
        apply_workflow_action(project, "sign_contract", {"signedBy": "Test Customer"})
        result = apply_workflow_action(project, "advance_stage", {"stageIndex": 3})
        self.assertEqual(result["stage"], "Design")

    def test_design_gate_rejects_missing_approvals(self):
        with self.assertRaises(HTTPException) as error:
            apply_workflow_action(self.project(), "advance_stage", {"stageIndex": 3})
        self.assertEqual(error.exception.status_code, 409)

    def test_public_payload_is_allowlisted(self):
        project = self.project() | {
            "costSnapshot": {"margin": 42},
            "files": [
                {"name": "visible.pdf", "customerVisible": True},
                {"name": "internal.pdf", "customerVisible": False},
            ],
        }
        result = public_project(project)
        self.assertNotIn("costSnapshot", result)
        self.assertEqual([file["name"] for file in result["files"]], ["visible.pdf"])


if __name__ == "__main__":
    unittest.main()
