import hashlib
import mimetypes
import os
from pathlib import Path

from fastapi import HTTPException, UploadFile

try:
    from ..shared.ids import new_id
except ImportError:
    from shared.ids import new_id


DEFAULT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024


class LocalObjectStorage:
    """Filesystem-backed object-storage adapter for local/dev deployments.

    The API stores binary content outside MongoDB and returns controlled file
    paths to backend code only. The public API streams downloads through an
    authorization endpoint rather than exposing this path.
    """

    def __init__(self, root: str | None = None):
        self.root = Path(root or os.getenv("DOCULINK_OBJECT_STORAGE_ROOT", ".object-storage")).resolve()

    async def save_upload(self, tenant_id: str, upload: UploadFile, document_id: str | None = None) -> dict:
        if not upload.filename:
            raise HTTPException(status_code=422, detail="Filename is required")
        original_filename = Path(upload.filename).name
        extension = Path(original_filename).suffix.lower()
        stored_uuid = new_id()
        stored_filename = f"{stored_uuid}{extension}"
        logical_document_id = document_id or "unassigned"
        relative_path = Path("signguy-ai") / "documents" / tenant_id / logical_document_id / stored_filename
        full_path = (self.root / relative_path).resolve()
        if not str(full_path).startswith(str(self.root)):
            raise HTTPException(status_code=400, detail="Invalid storage path")
        full_path.parent.mkdir(parents=True, exist_ok=True)

        sha = hashlib.sha256()
        size = 0
        with full_path.open("wb") as handle:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                if size > int(os.getenv("DOCULINK_MAX_UPLOAD_BYTES", DEFAULT_MAX_UPLOAD_BYTES)):
                    full_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="File exceeds configured upload limit")
                sha.update(chunk)
                handle.write(chunk)
        if size == 0:
            full_path.unlink(missing_ok=True)
            raise HTTPException(status_code=422, detail="Empty files are not allowed")

        declared_type = upload.content_type or "application/octet-stream"
        guessed_type = mimetypes.guess_type(original_filename)[0]
        if guessed_type and declared_type != "application/octet-stream" and declared_type.split(";")[0] != guessed_type:
            full_path.unlink(missing_ok=True)
            raise HTTPException(status_code=415, detail="Declared MIME type does not match file extension")

        return {
            "original_filename": original_filename,
            "stored_filename": stored_filename,
            "object_path": relative_path.as_posix(),
            "mime_type": declared_type,
            "size_bytes": size,
            "sha256": sha.hexdigest(),
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
