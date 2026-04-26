from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import sys
import os
import glob

# Add parent directory to path to import run_pipeline
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from run_pipeline import process_image

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now (dev mode)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import uuid
import shutil

# Directories for saving images
UPLOAD_DIR = "backend/uploads"
OUTPUT_DIR = "backend/outputs"

# Ensure directories exist
import json
from datetime import datetime
from fastapi.staticfiles import StaticFiles

# ... existing imports ...

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Mount static files for images
app.mount("/api/images", StaticFiles(directory=OUTPUT_DIR), name="images")

from fastapi import Header, Depends
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import database

# ... existing imports ...

import requests

# Load from environment variable
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

def verify_google_token(authorization: str = Header(None)):
    """Verifies the Google Access Token and returns the email."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    try:
        token = authorization.split(" ")[1]
        # Verify Access Token via Google API
        response = requests.get(f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={token}")
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        info = response.json()
        
        # Verify Client ID (aud)
        if info.get('aud') != GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Token audience mismatch")
            
        # Verify Email
        if not info.get('email_verified') == 'true': # Note: tokeninfo returns string 'true'
             raise HTTPException(status_code=401, detail="Email not verified")
             
        return info['email']
        
    except Exception as e:
        print(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")

@app.post("/api/generate")
async def generate_image(
    file: UploadFile = File(...),
    email: str = Depends(verify_google_token)
):
    # Check Usage Limits
    usage_count, is_unlimited = database.get_user_usage(email)
    
    # Limit: 4 free generations. 
    # If count >= 4 and NOT unlimited, block.
    if usage_count >= 4 and not is_unlimited:
        raise HTTPException(status_code=402, detail="LIMIT_EXCEEDED")

    try:
        # Generate unique ID
        request_id = str(uuid.uuid4())
        
        # Log attempt start
        database.log_attempt_start(request_id, email)
        
        # Read image file
        image_bytes = await file.read()
        
        # Save input image
        input_filename = f"{request_id}_input.png"
        input_path = os.path.join(UPLOAD_DIR, input_filename)
        with open(input_path, "wb") as f:
            f.write(image_bytes)
        
        # Process image
        output_bytes = process_image(image_bytes, request_id)
        
        # Save output image
        output_filename = f"{request_id}_output.png"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        with open(output_path, "wb") as f:
            f.write(output_bytes)
            
        # Save Metadata
        metadata = {
            "id": request_id,
            "timestamp": datetime.now().isoformat(),
            "output_image": output_filename,
            "user_email": email # Save user email for record
        }
        metadata_path = os.path.join(OUTPUT_DIR, f"{request_id}.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f)
            
        # Increment Usage Count ONLY after successful generation
        database.increment_usage(email)
        
        return {
            "id": request_id,
            "image_url": f"/api/images/{output_filename}"
        }
        
    except ValueError as ve:
        error_msg = str(ve)
        if "NO_RUNNER_DETECTED" in error_msg:
             # Already logged in run_pipeline
             raise HTTPException(status_code=400, detail="NO_RUNNER_DETECTED")
        database.log_attempt_error(request_id, "MAIN_VALUE_ERROR", error_msg)
        raise HTTPException(status_code=400, detail=error_msg)
    except RuntimeError as re:
        # Already logged in run_pipeline
        raise HTTPException(status_code=500, detail=str(re))
    except Exception as e:
        database.log_attempt_error(request_id, "MAIN_EXCEPTION", str(e))
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class ClientStatusLog(BaseModel):
    request_id: str
    status: str
    error_message: str = None

@app.post("/api/log_client_status")
async def log_client_status_endpoint(log: ClientStatusLog):
    """Endpoint for frontend to report rendering status."""
    database.log_client_status(log.request_id, log.status, log.error_message)
    return {"status": "ok"}

@app.get("/api/share/{request_id}")
async def get_share_data(request_id: str):
    metadata_path = os.path.join(OUTPUT_DIR, f"{request_id}.json")
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    with open(metadata_path, "r") as f:
        data = json.load(f)
        
    return {
        "id": data["id"],
        "timestamp": data["timestamp"],
        "image_url": f"/api/images/{data['output_image']}"
    }

from fastapi.responses import HTMLResponse

@app.get("/share/{request_id}", response_class=HTMLResponse)
async def share_page(request_id: str):
    """
    Serves a static HTML page with Open Graph tags for social sharing.
    Then redirects to the actual React app result page.
    """
    metadata_path = os.path.join(OUTPUT_DIR, f"{request_id}.json")
    
    # Base URL for the deployment (set via env var, default to localhost for dev)
    BASE_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8081")
    
    # Default values if not found
    image_url = f"{BASE_URL}/mynextpr_logo.png"
    
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                data = json.load(f)
            image_url = f"{BASE_URL}/api/images/{data['output_image']}"
        except:
            pass
            
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MyNextPR Analysis</title>
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="{FRONTEND_URL}/share/{request_id}">
        <meta property="og:title" content="Check out my running form analysis!">
        <meta property="og:description" content="I just analyzed my running gait with MyNextPR. See my blueprint!">
        <meta property="og:image" content="{image_url}">
        
        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="{FRONTEND_URL}/share/{request_id}">
        <meta property="twitter:title" content="Check out my running form analysis!">
        <meta property="twitter:description" content="I just analyzed my running gait with MyNextPR. See my blueprint!">
        <meta property="twitter:image" content="{image_url}">
        
        <script>
            window.location.href = "{FRONTEND_URL}/result"; 
        </script>
    </head>
    <body>
        <p>Redirecting to analysis...</p>
        <a href="{FRONTEND_URL}/result">Click here if not redirected</a>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/api/history")
async def get_user_history(email: str = Depends(verify_google_token)):
    """Returns a list of past analyses for the user."""
    history = []
    
    # Scan all json files in output dir
    # Note: In a production DB this would be a SQL query. 
    # For file-based, we scan.
    try:
        json_files = glob.glob(os.path.join(OUTPUT_DIR, "*.json"))
        for json_file in json_files:
            try:
                with open(json_file, "r") as f:
                    data = json.load(f)
                    
                # Check if this analysis belongs to the user
                if data.get("user_email") == email:
                    history.append({
                        "id": data["id"],
                        "timestamp": data["timestamp"],
                        "image_url": f"/api/images/{data['output_image']}"
                    })
            except Exception as e:
                print(f"Error reading {json_file}: {e}")
                continue
                
        # Sort by timestamp descending (newest first)
        history.sort(key=lambda x: x["timestamp"], reverse=True)
        return history
        
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

@app.get("/api/quota")
async def get_user_quota(email: str = Depends(verify_google_token)):
    """Returns the user's usage quota status."""
    usage_count, is_unlimited = database.get_user_usage(email)
    return {
        "usage_count": usage_count,
        "is_unlimited": is_unlimited,
        "limit": 4
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000, timeout_keep_alive=300)
