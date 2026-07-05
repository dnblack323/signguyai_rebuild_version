import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .routes.activity import router as activity_router
    from .routes.auth import auth_router, users_router
    from .routes.billing import router as billing_router
    from .routes.communications import router as communications_router
    from .routes.doculink import router as doculink_router
    from .routes.customers import router as customers_router
    from .routes.health import router as health_router
    from .routes.orders import items_router, orders_router
    from .routes.platform_admin import router as platform_admin_router
    from .routes.pricing_foundation import router as pricing_foundation_router
    from .routes.settings import router as settings_router
    from .routes.shared_systems import router as shared_systems_router
    from .routes.tenants import router as tenants_router
    from .routes.webstores import router as webstores_router
    from .routes.wrap_lab import router as wrap_lab_router
except ImportError:
    from routes.activity import router as activity_router
    from routes.auth import auth_router, users_router
    from routes.billing import router as billing_router
    from routes.communications import router as communications_router
    from routes.doculink import router as doculink_router
    from routes.customers import router as customers_router
    from routes.health import router as health_router
    from routes.orders import items_router, orders_router
    from routes.platform_admin import router as platform_admin_router
    from routes.pricing_foundation import router as pricing_foundation_router
    from routes.settings import router as settings_router
    from routes.shared_systems import router as shared_systems_router
    from routes.tenants import router as tenants_router
    from routes.webstores import router as webstores_router
    from routes.wrap_lab import router as wrap_lab_router

app = FastAPI(title="SignGuyAI Rebuild API", version="0.2.0")

cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
if cors_origins_raw == "*":
    allow_origins = ["*"]
    allow_credentials = False
else:
    allow_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(activity_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(communications_router, prefix="/api")
app.include_router(doculink_router, prefix="/api")
app.include_router(customers_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(items_router, prefix="/api")
app.include_router(platform_admin_router, prefix="/api")
app.include_router(pricing_foundation_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(shared_systems_router, prefix="/api")
app.include_router(tenants_router, prefix="/api")
app.include_router(webstores_router, prefix="/api")
app.include_router(wrap_lab_router, prefix="/api")
