from fastapi import APIRouter, Query

try:
    from ..models.webstores import WebstoreCapabilities
    from ..services.webstore_service import get_webstore_capabilities
except ImportError:
    from models.webstores import WebstoreCapabilities
    from services.webstore_service import get_webstore_capabilities

router = APIRouter(prefix="/webstores", tags=["Webstores"])


@router.get("/capabilities", response_model=WebstoreCapabilities)
def capabilities(product_mode: str = Query(default="full_app")):
    return get_webstore_capabilities(product_mode)
