from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="HidroLeak API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).parent / "accidents.db"
GEOJSON_PATH = Path(__file__).parent.parent / "hydroleak-frontend/src/data/bulgaria-regions.json"

SEVERITIES = ["Low", "Medium", "High"]


def _point_in_polygon(lat: float, lng: float, ring: list) -> bool:
    """Ray-casting algorithm matching the TypeScript implementation."""
    x, y = lng, lat
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _load_regions():
    with open(GEOJSON_PATH) as f:
        data = json.load(f)
    return data["features"]


def get_region_from_coords(lat: float, lng: float, features: list) -> str:
    for feature in features:
        name = feature["properties"]["shapeName"]
        geometry = feature["geometry"]
        if geometry["type"] == "Polygon":
            if _point_in_polygon(lat, lng, geometry["coordinates"][0]):
                return name
        elif geometry["type"] == "MultiPolygon":
            for polygon in geometry["coordinates"]:
                if _point_in_polygon(lat, lng, polygon[0]):
                    return name
    return "National"


def get_sector(lat: float, lng: float) -> str:
    lat_index = int((lat - 41.0) * 10)
    lng_index = int((lng - 22.0) * 10)
    row = chr(65 + (lat_index % 26))
    col = lng_index + 1
    return f"{row}{col}"


def generate_seed_data():
    rng = random.Random(42)
    base_time = datetime(2025, 1, 1)
    features = _load_regions()
    leaks = []
    i = 0
    attempts = 0
    while i < 80 and attempts < 5000:
        attempts += 1
        lat = 41.2 + rng.random() * (44.3 - 41.2)
        lng = 22.3 + rng.random() * (28.7 - 22.3)
        region_name = get_region_from_coords(lat, lng, features)
        if region_name == "National":
            continue  # point fell outside all regions, try again
        days_offset = rng.randint(0, 365)
        timestamp = (base_time + timedelta(days=days_offset)).isoformat()
        leaks.append({
            "id": f"leak-{i}",
            "region_name": region_name,
            "lat": lat,
            "lng": lng,
            "severity": rng.choice(SEVERITIES),
            "timestamp": timestamp,
            "sector": get_sector(lat, lng),
            "estimated_loss": f"{rng.random() * 10:.1f}L/sec",
            "status": "pending",
        })
        i += 1
    return leaks


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_leak(row) -> dict:
    return {
        "id": row["id"],
        "regionName": row["region_name"],
        "coordinates": [row["lat"], row["lng"]],
        "severity": row["severity"],
        "timestamp": row["timestamp"],
        "sector": row["sector"],
        "estimatedLoss": row["estimated_loss"],
        "status": row["status"],
    }


def init_db():
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS accidents (
            id TEXT PRIMARY KEY,
            region_name TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            severity TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            sector TEXT NOT NULL,
            estimated_loss TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending'
        )
    """)
    conn.commit()
    count = conn.execute("SELECT COUNT(*) FROM accidents").fetchone()[0]
    if count == 0:
        conn.executemany(
            "INSERT INTO accidents VALUES (:id, :region_name, :lat, :lng, :severity, :timestamp, :sector, :estimated_loss, :status)",
            generate_seed_data(),
        )
        conn.commit()
        print(f"Seeded 80 accidents into the database.")
    conn.close()



@app.get("/api/accidents")
def list_accidents(region: Optional[str] = None):
    conn = get_conn()
    if region:
        rows = conn.execute(
            "SELECT * FROM accidents WHERE region_name = ?", (region,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM accidents").fetchall()
    conn.close()
    return [row_to_leak(r) for r in rows]


@app.get("/api/accidents/{accident_id}")
def get_accident(accident_id: str):
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM accidents WHERE id = ?", (accident_id,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Accident not found")
    return row_to_leak(row)


@app.post("/api/accidents")
def create_accident(body: dict):
    lat = body.get("lat")
    lng = body.get("lng")
    severity = body.get("severity", "Medium")
    estimated_loss = body.get("estimatedLoss", "0.0L/sec")

    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="lat and lng are required")
    if severity not in ("Low", "Medium", "High"):
        raise HTTPException(status_code=400, detail="Invalid severity")

    features = _load_regions()
    region_name = get_region_from_coords(lat, lng, features)

    accident = {
        "id": f"leak-{uuid.uuid4().hex[:8]}",
        "region_name": region_name,
        "lat": lat,
        "lng": lng,
        "severity": severity,
        "timestamp": datetime.now().isoformat(),
        "sector": get_sector(lat, lng),
        "estimated_loss": estimated_loss,
        "status": "pending",
    }

    conn = get_conn()
    conn.execute(
        "INSERT INTO accidents VALUES (:id, :region_name, :lat, :lng, :severity, :timestamp, :sector, :estimated_loss, :status)",
        accident,
    )
    conn.commit()
    row = conn.execute("SELECT * FROM accidents WHERE id = ?", (accident["id"],)).fetchone()
    conn.close()
    return row_to_leak(row)


@app.patch("/api/accidents/{accident_id}/status")
def update_status(accident_id: str, body: dict):
    status = body.get("status")
    if status not in ("pending", "in_progress", "resolved", "dismissed", "fixed", "fake"):
        raise HTTPException(status_code=400, detail="Invalid status")
    conn = get_conn()
    result = conn.execute(
        "UPDATE accidents SET status = ? WHERE id = ?", (status, accident_id)
    )
    conn.commit()
    if result.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Accident not found")
    row = conn.execute("SELECT * FROM accidents WHERE id = ?", (accident_id,)).fetchone()
    conn.close()
    return row_to_leak(row)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["."])
