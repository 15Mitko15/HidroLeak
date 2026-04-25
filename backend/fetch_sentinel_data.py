import os
import argparse
from datetime import datetime, timedelta
from sentinelhub import (
    SHConfig,
    SentinelHubRequest,
    DataCollection,
    BBox,
    CRS,
    MimeType,
    bbox_to_dimensions,
    SentinelHubCatalog,
)
import numpy as np
from PIL import Image

def get_closest_date(catalog, data_collection, bbox, target_date, search_range_days=30):
    """Search for the closest available date within a range."""
    start_date = target_date - timedelta(days=search_range_days)
    end_date = target_date + timedelta(days=search_range_days)
    
    search_iterator = catalog.search(
        data_collection,
        bbox=bbox,
        time=(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')),
        fields={'properties.datetime'}
    )
    
    results = list(search_iterator)
    if not results:
        return None
    
    # Sort by proximity to target_date
    results.sort(key=lambda x: abs(datetime.fromisoformat(x['properties']['datetime'].replace('Z', '+00:00')).replace(tzinfo=None) - target_date))
    
    return results[0]['properties']['datetime']

def fetch_image(config, data_collection, bbox, date, evalscript, output_path):
    """Fetch image from Sentinel Hub and save it."""
    request = SentinelHubRequest(
        evalscript=evalscript,
        input_data=[
            SentinelHubRequest.input_data(
                data_collection=data_collection,
                time=date,
            ),
        ],
        responses=[
            SentinelHubRequest.output_response('default', MimeType.PNG),
        ],
        bbox=bbox,
        size=bbox_to_dimensions(bbox, resolution=10), # 10m resolution
        config=config
    )
    
    data = request.get_data()
    if data:
        img = Image.fromarray((data[0] * 255).astype(np.uint8))
        img.save(output_path)
        print(f"Saved: {output_path}")
    else:
        print(f"Failed to fetch data for {date}")

def main():
    parser = argparse.ArgumentParser(description='Fetch Sentinel-1 and Sentinel-2 images.')
    parser.add_argument('--lat', type=float, required=True, help='Latitude of the center')
    parser.add_argument('--lon', type=float, required=True, help='Longitude of the center')
    parser.add_argument('--size', type=float, default=1000, help='Size of the image in meters (square)')
    parser.add_argument('--date', type=str, required=True, help='Target date (YYYY-MM-DD)')
    parser.add_argument('--output_dir', type=str, default='data/fetched_images', help='Output directory')
    
    args = parser.parse_args()
    
    # Credentials should be set in environment variables:
    # SH_CLIENT_ID and SH_CLIENT_SECRET
    config = SHConfig()
    if not config.sh_client_id or not config.sh_client_secret:
        print("Error: Sentinel Hub credentials not found.")
        print("Please set SH_CLIENT_ID and SH_CLIENT_SECRET environment variables.")
        return

    os.makedirs(args.output_dir, exist_ok=True)
    target_date = datetime.strptime(args.date, '%Y-%m-%d')
    
    # Calculate BBox
    # Roughly 1 degree = 111,000 meters
    size_deg = args.size / 111000.0
    bbox = BBox(bbox=[
        args.lon - size_deg / 2, 
        args.lat - size_deg / 2, 
        args.lon + size_deg / 2, 
        args.lat + size_deg / 2
    ], crs=CRS.WGS84)

    catalog = SentinelHubCatalog(config=config)

    # Sentinel-2 (L2A) - True Color
    s2_evalscript = """
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
    """
    
    print("Searching for Sentinel-2 image...")
    s2_date = get_closest_date(catalog, DataCollection.SENTINEL2_L2A, bbox, target_date)
    if s2_date:
        print(f"Found closest Sentinel-2 date: {s2_date}")
        output_path = os.path.join(args.output_dir, f"S2_{s2_date[:10]}_{args.lat}_{args.lon}.png")
        fetch_image(config, DataCollection.SENTINEL2_L2A, bbox, s2_date, s2_evalscript, output_path)
    else:
        print("No Sentinel-2 image found in range.")

    # Sentinel-1 (GRD) - VV
    s1_evalscript = """
    //VERSION=3
    function setup() {
      return {
        input: ["VV"],
        output: { bands: 1 }
      };
    }
    function evaluatePixel(sample) {
      return [Math.sqrt(sample.VV) * 2];
    }
    """
    
    print("Searching for Sentinel-1 image...")
    s1_date = get_closest_date(catalog, DataCollection.SENTINEL1_GRD, bbox, target_date)
    if s1_date:
        print(f"Found closest Sentinel-1 date: {s1_date}")
        output_path = os.path.join(args.output_dir, f"S1_{s1_date[:10]}_{args.lat}_{args.lon}.png")
        fetch_image(config, DataCollection.SENTINEL1_GRD, bbox, s1_date, s1_evalscript, output_path)
    else:
        print("No Sentinel-1 image found in range.")

if __name__ == "__main__":
    main()
