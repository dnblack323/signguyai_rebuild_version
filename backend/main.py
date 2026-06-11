from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SignGuyAI Rebuild API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "release": "preview-1",
        "architecture": "four-workspace-shell",
    }


@app.get("/api/release")
def release():
    return {
        "name": "Structured Pilot MVP Preview",
        "workspaces": ["operations", "business", "productivity", "ai-hub"],
        "active_capabilities": [
            "global-command-center",
            "global-search",
            "global-create",
            "notifications",
            "module-registry",
        ],
    }

