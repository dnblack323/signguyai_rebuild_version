import os
from pathlib import Path

from fastapi import HTTPException, UploadFile

try:
    from ..shared.ids import new_id
    from .upload_validation import validate_upload
except ImportError:
    from shared.ids import new_id
    from services.upload_validation import validate_upload


class LocalObjectStorage:
    """Filesystem-backed object-storage adapter for local/dev deployments.

    The API stores binary content outside MongoDB and returns controlled file
    paths to backend code only. The public API streams downloads through an
    authorization endpoint rather than exposing this path.
    """

    def __init__(self, root: str | None = None):
        self.root = Path(root or os.getenv("DOCULINK_OBJECT_STORAGE_ROOT", ".object-storage")).resolve()

    async def save_upload(self, tenant_id: str, upload: UploadFile, document_id: str | None = None) -> dict:
        validated = await validate_upload(upload)
        extension = Path(validated.original_filename).suffix.lower()
        stored_uuid = new_id()
        stored_filename = f"{stored_uuid}{extension}"
        logical_document_id = document_id or "unassigned"
        relative_path = Path("signguy-ai") / "documents" / tenant_id / logical_document_id / stored_filename
        full_path = (self.root / relative_path).resolve()
        if not str(full_path).startswith(str(self.root)):
            raise HTTPException(status_code=400, detail="Invalid storage path")
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(validated.content)

        return {
            "original_filename": validated.original_filename,
            "stored_filename": stored_filename,
            "object_path": relative_path.as_posix(),
            "mime_type": validated.mime_type,
            "size_bytes": validated.size_bytes,
            "sha256": validated.sha256,
            "scan_status": "scan_unavailable",
        }

    def resolve_path(self, object_path: str) -> Path:
        full_path = (self.root / object_path).resolve()
        if not str(full_path).startswith(str(self.root)):
            raise HTTPException(status_code=403, detail="Invalid object path")
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="Stored file not found")
        return full_path


def get_object_storage() -> LocalObjectStorage:
    return LocalObjectStorage()
