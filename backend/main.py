from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from database import create_tables
from routes import system, dataset, training, experiments, auth

app = FastAPI(title="Hybrid AI SysID", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

create_tables()

app.include_router(system.router, prefix="/api/system")
app.include_router(dataset.router, prefix="/api/dataset")
app.include_router(training.router, prefix="/api/training")
app.include_router(experiments.router, prefix="/api/experiments")
app.include_router(auth.router, prefix="/api/auth")

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Hybrid AI SysID Backend"}

# Serve frontend build if available
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        index = frontend_dist / "index.html"
        return FileResponse(str(index))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
