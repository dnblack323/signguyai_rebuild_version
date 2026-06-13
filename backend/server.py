import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .routes.health import router as health_router
    from .routes.webstores import router as webstores_router
except ImportError:
    from routes.health import router as health_router
    from routes.webstores import router as webstores_router

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
app.include_router(webstores_router, prefix="/api")
