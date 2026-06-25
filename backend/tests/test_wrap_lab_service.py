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

    def test_packet_and_concept_actions_persist(self):
        project = self.project() | {
            "mockupStudio": {"concepts": [{"id": "concept-1", "customerSelected": False}]}
        }
        apply_workflow_action(project, "sign_pre_install_packet", {"signedBy": "Test Customer"})
        apply_workflow_action(project, "sign_final_packet", {"signedBy": "Test Customer"})
        result = apply_workflow_action(project, "customer_concept_feedback", {
            "conceptId": "concept-1",
            "customerSelected": True,
            "customerComment": "Use this one",
            "feedbackTags": ["Keep layout"],
        })
        self.assertTrue(result["preInstallPacketSigned"])
        self.assertTrue(result["finalSignoff"])
        self.assertTrue(result["mockupStudio"]["concepts"][0]["customerSelected"])


if __name__ == "__main__":
    unittest.main()
