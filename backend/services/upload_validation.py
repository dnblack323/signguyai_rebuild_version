import hashlib
import mimetypes
import os
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile


DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024
READ_CHUNK_BYTES = 1024 * 1024

ALLOWED_UPLOAD_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


@dataclass(frozen=True)
class ValidatedUpload:
    original_filename: str
    mime_type: str
    size_bytes: int
    sha256: str
    content: bytes


def configured_upload_limit(default: int = DEFAULT_MAX_UPLOAD_BYTES) -> int:
    raw_limit = os.getenv("SIGNGUYAI_MAX_UPLOAD_BYTES") or os.getenv("DOCULINK_MAX_UPLOAD_BYTES") or str(default)
    try:
        return max(1, int(raw_limit))
    except ValueError as exc:
        raise HTTPException(status_code=500, detail="Invalid upload size configuration") from exc


async def validate_upload(
    upload: UploadFile,
    *,
    allowed_mime_types: set[str] | None = None,
    max_size_bytes: int | None = None,
) -> ValidatedUpload:
    if not upload.filename:
        raise HTTPException(status_code=422, detail="Filename is required")

    original_filename = Path(upload.filename).name
    declared_type = _normalize_mime_type(upload.content_type)
    guessed_type = _normalize_mime_type(mimetypes.guess_type(original_filename)[0])
    mime_type = _resolve_mime_type(declared_type, guessed_type)
    allowed = allowed_mime_types or ALLOWED_UPLOAD_MIME_TYPES
    if mime_type not in allowed:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    if guessed_type and declared_type not in {"", "application/octet-stream"} and declared_type != guessed_type:
        raise HTTPException(status_code=415, detail="Declared MIME type does not match file extension")

    max_bytes = max_size_bytes or configured_upload_limit()
    content = bytearray()
    sha = hashlib.sha256()
    while chunk := await upload.read(READ_CHUNK_BYTES):
        content.extend(chunk)
        if len(content) > max_bytes:
            raise HTTPException(status_code=413, detail="File exceeds configured upload limit")
        sha.update(chunk)

    if not content:
        raise HTTPException(status_code=422, detail="Empty files are not allowed")

    bytes_content = bytes(content)
    if not _content_matches_mime(bytes_content, mime_type):
        raise HTTPException(status_code=415, detail="File content does not match declared type")

    return ValidatedUpload(
        original_filename=original_filename,
        mime_type=mime_type,
        size_bytes=len(bytes_content),
        sha256=sha.hexdigest(),
        content=bytes_content,
    )


def _normalize_mime_type(value: str | None) -> str:
    return (value or "").split(";", 1)[0].strip().lower()


def _resolve_mime_type(declared_type: str, guessed_type: str) -> str:
    if declared_type and declared_type != "application/octet-stream":
        return declared_type
    return guessed_type or declared_type or "application/octet-stream"


def _content_matches_mime(content: bytes, mime_type: str) -> bool:
    if mime_type == "application/pdf":
        return content.startswith(b"%PDF")
    if mime_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if mime_type == "image/gif":
        return content.startswith((b"GIF87a", b"GIF89a"))
    if mime_type == "image/webp":
        return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    if mime_type == "image/svg+xml":
        sample = content[:512].lstrip().lower()
        return sample.startswith(b"<svg") or sample.startswith(b"<?xml")
    if mime_type in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }:
        return content.startswith(b"PK\x03\x04")
    if mime_type in {"application/msword", "application/vnd.ms-excel"}:
        return content.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
    if mime_type in {"text/plain", "text/csv"}:
        try:
            content.decode("utf-8")
            return True
        except UnicodeDecodeError:
            try:
                content.decode("latin-1")
                return True
            except UnicodeDecodeError:
                return False
    return True
