"""
CV Inspection FastAPI Server
Real-time hole detection for Sabre Turbine Housing inspection.
Integrates with mes-factory for part lookup and result storage.
"""
import asyncio
import base64
import json
import time
from io import BytesIO
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from PIL import Image

from app.hole_detector import HoleDetector, FeatureStatus
from app.igs_parser import get_reference_geometry

app = FastAPI(
    title="CV Inspection Service",
    description="Real-time computer vision inspection for Sabre Turbine Housing",
    version="1.0.0"
)

# CORS — allow mes-factory frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global detector instance
detector = HoleDetector()

# Reference geometry from the IGS file
IGS_PATH = r"d:\mes\saber turbine housing 3d model.igs"
reference_geometry = None

# Active inspection sessions
active_sessions: dict[str, dict] = {}


@app.on_event("startup")
async def startup():
    global reference_geometry
    try:
        reference_geometry = get_reference_geometry(IGS_PATH)
        print(f"Loaded IGS reference: {reference_geometry['total_arcs']} arcs, "
              f"{reference_geometry['classified_holes']} classified holes")
    except Exception as e:
        print(f"Warning: Could not load IGS reference: {e}")
        reference_geometry = {"error": str(e)}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "cv-inspection", "detector": "ready"}


@app.get("/api/reference-geometry")
def get_reference():
    """Return the parsed hole reference geometry from the IGS file."""
    return reference_geometry


@app.post("/api/inspect/start")
def start_inspection(part_id: str, data_matrix_value: Optional[str] = None):
    """
    Start a new inspection session after scanning the 2D Data Matrix.
    The part_id links back to the mes-factory system.
    """
    session_id = f"session_{int(time.time() * 1000)}"
    active_sessions[session_id] = {
        "session_id": session_id,
        "part_id": part_id,
        "data_matrix": data_matrix_value,
        "started_at": time.time(),
        "frames_analyzed": 0,
        "latest_result": None,
        "final_result": None,
    }
    return {
        "session_id": session_id,
        "part_id": part_id,
        "checkpoints": [
            {"id": "group_a", "name": "Balloons 70-73 (3x M6 Threaded)", "expected": 3, "check_thread": True},
            {"id": "group_b", "name": "Balloons 62-67 (Through Holes)", "expected": 6, "check_thread": False},
            {"id": "group_c", "name": "Balloons 10-13 (Flange Holes)", "expected": 4, "check_thread": False},
        ],
        "reference_holes": reference_geometry.get("classified_holes", 0) if reference_geometry else 0,
    }


@app.post("/api/inspect/frame")
async def analyze_frame(session_id: str, file: UploadFile = File(...)):
    """
    Analyze a single video frame for hole/thread detection.
    The frontend sends frames from the camera continuously.
    """
    if session_id not in active_sessions:
        return JSONResponse(status_code=404, content={"error": "Session not found"})
    
    # Read image from upload
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return JSONResponse(status_code=400, content={"error": "Invalid image"})
    
    # Run detection
    result = detector.analyze_frame(frame)
    
    # Update session
    session = active_sessions[session_id]
    session["frames_analyzed"] += 1
    session["latest_result"] = {
        "checkpoints": result["checkpoints"],
        "has_defect": result["has_defect"],
        "defect_alert": result["defect_alert"],
        "total_circles": result["total_circles_detected"],
    }
    
    # Encode annotated frame as base64 for frontend
    annotated_b64 = base64.b64encode(result["annotated_frame"]).decode("utf-8")
    
    return {
        "session_id": session_id,
        "frame_number": session["frames_analyzed"],
        "checkpoints": result["checkpoints"],
        "has_defect": result["has_defect"],
        "defect_alert": result["defect_alert"],
        "total_circles": result["total_circles_detected"],
        "threaded_count": result["threaded_count"],
        "plain_count": result["plain_count"],
        "annotated_frame_b64": annotated_b64,
    }


@app.post("/api/inspect/complete")
def complete_inspection(session_id: str):
    """
    Finalize the inspection session and return the final verdict.
    This result will be sent to mes-factory for storage.
    """
    if session_id not in active_sessions:
        return JSONResponse(status_code=404, content={"error": "Session not found"})
    
    session = active_sessions[session_id]
    latest = session.get("latest_result")
    
    if not latest:
        return JSONResponse(status_code=400, content={"error": "No frames analyzed yet"})
    
    # Build final result
    final = {
        "session_id": session_id,
        "part_id": session["part_id"],
        "data_matrix": session["data_matrix"],
        "frames_analyzed": session["frames_analyzed"],
        "duration_seconds": round(time.time() - session["started_at"], 1),
        "verdict": "FAIL" if latest["has_defect"] else "PASS",
        "checkpoints": latest["checkpoints"],
        "defect_alert": latest["defect_alert"],
    }
    
    session["final_result"] = final
    
    return final


@app.websocket("/ws/inspect/{session_id}")
async def websocket_inspection(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time continuous frame analysis.
    The frontend streams frames, the backend returns detection results.
    """
    await websocket.accept()
    
    if session_id not in active_sessions:
        await websocket.send_json({"error": "Session not found"})
        await websocket.close()
        return
    
    session = active_sessions[session_id]
    
    try:
        while True:
            # Receive frame as binary (JPEG bytes)
            data = await websocket.receive_bytes()
            
            # Decode frame
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                await websocket.send_json({"error": "Invalid frame"})
                continue
            
            # Analyze
            result = detector.analyze_frame(frame)
            
            # Update session
            session["frames_analyzed"] += 1
            session["latest_result"] = {
                "checkpoints": result["checkpoints"],
                "has_defect": result["has_defect"],
                "defect_alert": result["defect_alert"],
                "total_circles": result["total_circles_detected"],
            }
            
            # Send results back (without the heavy annotated frame over WS)
            await websocket.send_json({
                "frame_number": session["frames_analyzed"],
                "checkpoints": result["checkpoints"],
                "has_defect": result["has_defect"],
                "defect_alert": result["defect_alert"],
                "total_circles": result["total_circles_detected"],
                "threaded_count": result["threaded_count"],
                "plain_count": result["plain_count"],
            })
            
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8500)
