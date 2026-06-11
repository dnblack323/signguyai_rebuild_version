from fastapi import APIRouter

try:
    from ..services.release_service import get_health, get_release
except ImportError:
    from services.release_service import get_health, get_release

router = APIRouter(tags=["System"])


@router.get("/health")
def health():
    return get_health()


@router.get("/release")
def release():
    return get_release()


@router.get("/digest")
def digest():
    """Single-call dashboard contract required by the Day 1 specification."""
    return {
        "revenue_today": 6840,
        "revenue_mtd": 48620,
        "active_orders": 31,
        "pending_quotes": 12,
        "outstanding_ar": 18460.75,
        "pending_approvals": 3,
        "overdue_invoices": 2,
        "unread_messages": 7,
        "low_stock_count": 0,
        "inventory_shortages": 0,
        "yesterday_revenue": 6100,
    }
