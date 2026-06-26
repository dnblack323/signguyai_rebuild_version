import os
import random
import time
import uuid


def uuid7_str() -> str:
    """Return an app-generated UUIDv7 string.

    Python 3.14+ exposes uuid.uuid7. The fallback below preserves the UUIDv7
    layout for environments that do not have it yet: 48-bit millisecond time,
    version 7, RFC 4122 variant, and random payload bits.
    """

    native_uuid7 = getattr(uuid, "uuid7", None)
    if native_uuid7:
        return str(native_uuid7())

    unix_ts_ms = int(time.time() * 1000) & ((1 << 48) - 1)
    rand_a = random.getrandbits(12)
    rand_b = random.getrandbits(62)
    value = (
        (unix_ts_ms << 80)
        | (0x7 << 76)
        | (rand_a << 64)
        | (0b10 << 62)
        | rand_b
    )
    return str(uuid.UUID(int=value))


def new_id() -> str:
    return uuid7_str()


def preview_id(prefix: str) -> str:
    """Temporary display-friendly IDs for non-authoritative preview rows.

    Authoritative records should use new_id/uuid7_str directly. This helper is
    gated so preview IDs cannot accidentally leak into stricter environments.
    """

    if os.getenv("SIGNGUYAI_ALLOW_PREVIEW_IDS", "false").lower() in {"1", "true", "yes"}:
        return f"{prefix}-{uuid7_str()}"
    return uuid7_str()
