from datetime import UTC, datetime


def utc_now() -> datetime:
    """Return a timezone-aware UTC datetime for BSON/native persistence."""

    return datetime.now(UTC)


def assert_utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("datetime must be timezone-aware UTC")
    return value.astimezone(UTC)
