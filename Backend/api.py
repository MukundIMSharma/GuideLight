from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- NEW: Import load_dotenv ---
from dotenv import load_dotenv 
# --- NEW: Load the .env file immediately ---
load_dotenv()
from Automation import TranslateAndExecute
from Model import FirstLayerDMM

app = FastAPI(title="GuideLight API")

# IMPORTANT: CORS middleware must be added BEFORE routes
# Allow local dev frontends to call the API
# Note: allow_credentials must be False when allow_origins=["*"]
# This is a CORS specification requirement
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],  # Explicitly list methods
    allow_headers=["*"],  # Allow all headers including Content-Type, Authorization, etc.
    expose_headers=["*"],  # Expose all headers
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Add manual CORS headers as a fallback
@app.middleware("http")
async def add_cors_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


class VoiceRequest(BaseModel):
    text: str


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "GuideLight API is running"}


@app.post("/api/voice")
async def handle_voice(payload: VoiceRequest):
    """
    Accepts transcribed text, routes it through the decision model,
    executes mapped actions, and returns any text responses.
    """
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    tasks = FirstLayerDMM(payload.text)

    # Collect textual outputs from the automation pipeline
    responses: list[str] = []
    async for result in TranslateAndExecute(tasks):
        if isinstance(result, str):
            responses.append(result)

    # Join tasks array as comma-separated string
    tasks_string = ", ".join(responses) if responses else ""
    
    return {"response": tasks_string, "tasks": tasks}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
