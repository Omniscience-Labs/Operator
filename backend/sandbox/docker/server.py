from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn
import os
import time

# Ensure we're serving from the /workspace directory
workspace_dir = "/workspace"

class WorkspaceDirMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Check if workspace directory exists and recreate if deleted
        if not os.path.exists(workspace_dir):
            print(f"Workspace directory {workspace_dir} not found, recreating...")
            os.makedirs(workspace_dir, exist_ok=True)
        return await call_next(request)

app = FastAPI()
app.add_middleware(WorkspaceDirMiddleware)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint to verify server is ready"""
    return JSONResponse({
        "status": "healthy", 
        "workspace_exists": os.path.exists(workspace_dir),
        "timestamp": int(time.time())
    })

# Simple ping endpoint for basic connectivity
@app.get("/ping")
async def ping():
    """Simple ping endpoint for basic connectivity check"""
    return {"status": "ok"}

# Status endpoint for monitoring
@app.get("/status")
async def status():
    """Status endpoint with detailed information"""
    return JSONResponse({
        "server": "running",
        "workspace_directory": workspace_dir,
        "workspace_exists": os.path.exists(workspace_dir),
        "workspace_files": len(os.listdir(workspace_dir)) if os.path.exists(workspace_dir) else 0
    })

# Initial directory creation
os.makedirs(workspace_dir, exist_ok=True)
app.mount('/', StaticFiles(directory=workspace_dir, html=True), name='site')

# This is needed for the import string approach with uvicorn
if __name__ == '__main__':
    print(f"Starting server with auto-reload, serving files from: {workspace_dir}")
    # Ensure workspace exists on startup
    if not os.path.exists(workspace_dir):
        os.makedirs(workspace_dir, exist_ok=True)
    print(f"Workspace directory confirmed: {workspace_dir}")
    # Don't use reload directly in the run call
    uvicorn.run("server:app", host="0.0.0.0", port=8080, reload=True) 