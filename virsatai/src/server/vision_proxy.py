import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()

# Allow CORS for development (frontend at http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables for Azure Computer Vision
AZURE_ENDPOINT = os.getenv("AZURE_COMPUTER_VISION_ENDPOINT")
AZURE_KEY = os.getenv("AZURE_COMPUTER_VISION_KEY")
if not AZURE_ENDPOINT or not AZURE_KEY:
    raise RuntimeError("Azure Computer Vision endpoint and key must be set in environment variables")

# Azure Vision API URL (v3.2 analyze endpoint)
ANALYZE_URL = f"{AZURE_ENDPOINT.rstrip('/')}/vision/v3.2/analyze"

@app.post("/vision/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """Forward the uploaded image to Azure Computer Vision and return the JSON response.

    The frontend expects a JSON payload similar to the Azure response, containing a
    ``tags`` array with ``name`` and ``confidence`` fields.
    """
    image_bytes = await file.read()
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/octet-stream",
    }
    params = {
        "visualFeatures": "Tags",
        "language": "en",
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(
            ANALYZE_URL,
            params=params,
            headers=headers,
            content=image_bytes,
            timeout=30,
        )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()
