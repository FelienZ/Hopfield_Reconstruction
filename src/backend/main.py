from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import pickle
import os
import sys

# Agar Python bisa membaca folder 'core'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from core.hopfield import mchnn_matching
from core.utils import preprocess_image, array_to_base64

# Global variable to hold the loaded model
app_state = {
    "W": None,
    "E": None
}

# [PERBAIKAN 1] Gunakan Relative Path yang aman untuk Linux (Render) dan Windows lokal
MODEL_PATH = os.path.join(BASE_DIR, "models", "mchnn_model_final.pkl")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """ Loads the MCHNN dictionary into memory during server startup. """
    print(f"Loading MC-HNN dictionary model from: {MODEL_PATH}")
    try:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        
        with open(MODEL_PATH, 'rb') as f:
            model_data = pickle.load(f)
            app_state["W"] = model_data['W']
            app_state["E"] = model_data['E']
        print("Model loaded successfully!")
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to load model -> {e}")
        
    yield
    
    print("Shutting down and cleaning up resources...")
    app_state["W"] = None
    app_state["E"] = None

app = FastAPI(
    title="Fingerprint Recognition MC-HNN API",
    description="Microservice for processing and identifying fingerprints using MC-HNN.",
    version="1.0.0",
    lifespan=lifespan
)

# [PERBAIKAN 2] Buka akses CORS untuk Vercel nanti
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"], # Ganti "*" dengan URL Vercel-mu nanti jika ingin lebih aman
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/recognize")
async def recognize_fingerprint(image: UploadFile = File(...)):
    if app_state["W"] is None or app_state["E"] is None:
        raise HTTPException(status_code=503, detail="MC-HNN Model is not loaded into memory.")
        
    try:
        image_bytes = await image.read()
        bipolar_vector = preprocess_image(image_bytes)
        
        W = app_state["W"]
        E = app_state["E"]
        ideal_e = E[0] if len(E) > 0 else None
        
        matched_id, output_pattern, initial_se = mchnn_matching(bipolar_vector, W, E)
        
        # Affinity Tolerance Check
        ENERGY_TOLERANCE = ideal_e * 0.70 if ideal_e is not None else float('-inf')
        
        status = "AUTHORIZED"
        converged_energy = ideal_e
        
        if matched_id == "Access Denied" or initial_se > ENERGY_TOLERANCE:
            status = "DENIED"
            base64_reconstructed = array_to_base64(bipolar_vector) if output_pattern is None else array_to_base64(output_pattern)
            converged_energy = None
        else:
            base64_reconstructed = array_to_base64(output_pattern)

        return {
            "status": status,
            "matched_id": int(matched_id) if matched_id != "Access Denied" else -1,
            "diagnostics": {
                "initial_energy": float(initial_se),
                "converged_energy": float(converged_energy) if converged_energy is not None else None,
                "ideal_energy": float(ideal_e) if ideal_e is not None else None
            },
            "reconstructed_image": base64_reconstructed
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": app_state["W"] is not None}