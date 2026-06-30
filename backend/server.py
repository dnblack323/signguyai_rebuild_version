import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .routes.doculink import router as doculink_router
    from .routes.customers import router as customers_router
    from .routes.health import router as health_router
    from .routes.orders import items_router, orders_router
    from .routes.pricing_foundation import router as pricing_foundation_router
    from .routes.shared_systems import router as shared_systems_router
    from .routes.webstores import router as webstores_router
    from .routes.wrap_lab import router as wrap_lab_router
except ImportError:
    from routes.doculink import router as doculink_router
    from routes.customers import router as customers_router
    from routes.health import router as health_router
    from routes.orders import items_router, orders_router
    from routes.pricing_foundation import router as pricing_foundation_router
    from routes.shared_systems import router as shared_systems_router
    from routes.webstores import router as webstores_router
    from routes.wrap_lab import router as wrap_lab_router

app = FastAPI(title="SignGuyAI Rebuild API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("SIGNGUYAI_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(doculink_router, prefix="/api")
app.include_router(customers_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(items_router, prefix="/api")
app.include_router(pricing_foundation_router, prefix="/api")
app.include_router(shared_systems_router, prefix="/api")
app.include_router(webstores_router, prefix="/api")
app.include_router(wrap_lab_router, prefix="/api")
