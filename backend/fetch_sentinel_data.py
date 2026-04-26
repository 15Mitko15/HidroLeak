import os
import os
import datetime
import logging
from typing import Tuple, Optional
from dotenv import load_dotenv
from sentinelhub import (
    SHConfig,
    SentinelHubCatalog,
    SentinelHubRequest,
    BBox,
    CRS,
    DataCollection,
    MimeType,
    bbox_to_dimensions,
)
import numpy as np

# Load environment variables from .env file
load_dotenv()

# Set up logging to see the requests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sentinelhub")
logger.setLevel(logging.DEBUG)

# Configuration - should be set via environment variables
config = SHConfig()
config.sh_client_id = os.environ.get("SH_CLIENT_ID")
config.sh_client_secret = os.environ.get("SH_CLIENT_SECRET")
config.sh_base_url = "https://sh.dataspace.copernicus.eu"
config.sh_token_url = "https://"


def get_bbox_from_point(lat: float, lon: float, length_meters: float) -> BBox:
    """
    Creates a BBox around a center point (lat, lon) with a given length in meters.
    """
    # Use a local UTM-like projection for accurate meter-based offsets
    # For simplicity, we'll use a generic approach or estimate degrees
    # 1 degree lat is approx 111,111 meters
    # 1 degree lon is approx 111,111 * cos(lat) meters
    
    delta_lat = (length_meters / 2) / 111111
    delta_lon = (length_meters / 2) / (111111 * np.cos(np.radians(lat)))
    
    return BBox([lon - delta_lon, lat - delta_lat, lon + delta_lon, lat + delta_lat], crs=CRS.WGS84)

EVALSCRIPTS = {
    "RGB": """
        //VERSION=3
        function setup() {
          return {
            input: ["B04", "B03", "B02"],
            output: { bands: 3 }
          };
        }
        function evaluatePixel(sample) {
          return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
        }
    """,
    "NDVI": """
        //VERSION=3
        function setup() {
          return {
            input: ["B04", "B08"],
            output: { bands: 1 }
          };
        }
        function evaluatePixel(sample) {
          let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
          return [ndvi];
        }
    """,
    "NDWI": """
        //VERSION=3
        function setup() {
          return {
            input: ["B03", "B08"],
            output: { bands: 1 }
          };
        }
        function evaluatePixel(sample) {
          let ndwi = (sample.B03 - sample.B08) / (sample.B03 + sample.B08);
          return [ndwi];
        }
    """,
    "MOISTURE": """
        //VERSION=3
        function setup() {
          return {
            input: ["B08", "B11"],
            output: { bands: 1 }
          };
        }
        function evaluatePixel(sample) {
          let ndmi = (sample.B08 - sample.B11) / (sample.B08 + sample.B11);
          return [ndmi];
        }
    """
}

def fetch_exact_image(
    lat: float, 
    lon: float, 
    length_meters: float, 
    target_date: str, 
    index_type: str = "RGB"
) -> Optional[np.ndarray]:
    """
    Fetches the Sentinel-2 image for the exact target date for a specific index.
    target_date format: YYYY-MM-DD
    index_type: RGB, NDVI, NDWI, MOISTURE
    """
    bbox = get_bbox_from_point(lat, lon, length_meters)
    
    print(f"Fetching image for exact date: {target_date} for index {index_type}")
    
    evalscript = EVALSCRIPTS.get(index_type, EVALSCRIPTS["RGB"])
    mime_type = MimeType.PNG if index_type == "RGB" else MimeType.TIFF
    
    request = SentinelHubRequest(
        evalscript=evalscript,
        input_data=[
            SentinelHubRequest.input_data(
                DataCollection.SENTINEL2_L2A,
                time_interval=(target_date, target_date),
            )
        ],
        responses=[
            SentinelHubRequest.output_response("default", mime_type)
        ],
        bbox=bbox,
        size=bbox_to_dimensions(bbox, resolution=10),
        config=config,
    )
    
    data = request.get_data()
    if data:
        return data[0]
    return None

def save_image(data: np.ndarray, filename: str):
    """Saves the numpy array as an image file."""
    if data is None:
        return
        
    if data.shape[-1] == 1:
        # Single band (index) - save as grayscale or heatmap
        import matplotlib.pyplot as plt
        plt.imsave(filename, data.squeeze(), cmap='RdYlGn')
    else:
        # RGB
        import matplotlib.pyplot as plt
        # Clip to [0, 1] if necessary
        data = np.clip(data, 0, 1)
        plt.imsave(filename, data)
    print(f"Saved image to {filename}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Fetch Sentinel-2 data from Sentinel Hub.")
    parser.add_argument("--lat", type=float, required=True, help="Latitude of the center point")
    parser.add_argument("--lon", type=float, required=True, help="Longitude of the center point")
    parser.add_argument("--length", type=float, default=1000, help="Side length of the BBox in meters (default: 1000)")
    parser.add_argument("--date", type=str, required=True, help="Target date (YYYY-MM-DD)")
    parser.add_argument("--index", type=str, default="RGB", choices=["RGB", "NDVI", "NDWI", "MOISTURE"], help="Index to fetch (default: RGB)")
    parser.add_argument("--output", type=str, help="Output filename (e.g., image.png)")
    
    args = parser.parse_args()
    
    if not os.environ.get("SH_CLIENT_ID") or not os.environ.get("SH_CLIENT_SECRET"):
        print("Error: Please set SH_CLIENT_ID and SH_CLIENT_SECRET environment variables.")
        exit(1)
        
    img = fetch_exact_image(args.lat, args.lon, args.length, args.date, index_type=args.index)
    
    if img is not None:
        output_file = args.output if args.output else f"{args.index}_{args.date}.png"
        save_image(img, output_file)
    else:
        print("Failed to fetch image.")

