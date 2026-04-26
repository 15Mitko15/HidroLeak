import os
import csv
import numpy as np
from PIL import Image

def get_average_pixel_value(img_path):
    """Calculates the average pixel value of an image."""
    try:
        # Open image and convert to numpy array
        img = Image.open(img_path)
        img_array = np.array(img)
        # Calculate mean over all pixels (and channels if RGB)
        # This gives a single scalar representing the average brightness/value
        return np.mean(img_array)
    except Exception as e:
        print(f"  Error processing {img_path}: {e}")
        return 0.0

def process_dataset():
    # Detect root dataset directory
    # We look for 'dataset' folder first as seen in the directory listing
    base_dir = 'dataset'
    if not os.path.exists(base_dir):
        base_dir = '.'
    
    # Define sub-paths based on the observed structure
    leakage_base = os.path.join(base_dir, 'leakage_places_images')
    non_leakage_base = os.path.join(base_dir, 'non_leakage')
    
    # Fallback to root if not found in 'dataset' (to be robust)
    if not os.path.exists(leakage_base) and os.path.exists('leakage_places_images'):
        leakage_base = 'leakage_places_images'
    if not os.path.exists(non_leakage_base) and os.path.exists('non_leakage'):
        non_leakage_base = 'non_leakage'

    print(f"Scanning for data in:")
    print(f"  Leakage: {leakage_base}")
    print(f"  Non-Leakage: {non_leakage_base}")

    results = []
    
    # Collect folders to process
    tasks = []
    if os.path.exists(leakage_base):
        for folder in os.listdir(leakage_base):
            path = os.path.join(leakage_base, folder)
            if os.path.isdir(path):
                tasks.append((path, folder, 1))
                
    if os.path.exists(non_leakage_base):
        for folder in os.listdir(non_leakage_base):
            path = os.path.join(non_leakage_base, folder)
            if os.path.isdir(path):
                tasks.append((path, folder, 0))

    if not tasks:
        print("No folders found to process!")
        return

    for folder_path, location_name, leakage_label in tasks:
        print(f"Processing location: {location_name}...")
        files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        # Parse files: extract date and determine type
        parsed_files = []
        for f in files:
            # Date extraction: first 10 characters (YYYY-MM-DD)
            date_part = f[:10]
            
            # Type detection based on filename keywords
            if 'Moisture' in f:
                img_type = 'Moisture'
            elif 'NDVI' in f:
                img_type = 'NDVI'
            elif 'NDWI' in f:
                img_type = 'NDWI'
            else:
                continue # Skip files that don't match the expected types
            
            parsed_files.append({
                'date': date_part,
                'type': img_type,
                'path': os.path.join(folder_path, f)
            })
            
        if not parsed_files:
            print(f"  No valid images found in {location_name}")
            continue
            
        # Determine date ordering: 1 = Latest, 5 = Oldest
        unique_dates = sorted(list(set(p['date'] for p in parsed_files)), reverse=True)
        date_to_rank = {date: i + 1 for i, date in enumerate(unique_dates)}
        
        row = {
            'leakage': leakage_label,
            'location': location_name
        }
        
        # Calculate features for each image
        for p in parsed_files:
            rank = date_to_rank[p['date']]
            # We only care about the latest 5 dates as per requirements
            if rank <= 5:
                field_name = f"{rank}_{p['type']}"
                avg_val = get_average_pixel_value(p['path'])
                row[field_name] = round(avg_val, 4)
                
        results.append(row)

    # Define CSV Header structure
    header = ['leakage', 'location']
    types = ['Moisture', 'NDVI', 'NDWI']
    # 1 is latest, 5 is oldest
    for i in range(1, 6):
        for t in types:
            header.append(f"{i}_{t}")
            
    # Write results to CSV
    output_file = 'dataset_features.csv'
    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        for row in results:
            # Ensure all header fields exist, filling missing with 0.0
            complete_row = {h: row.get(h, 0.0) for h in header}
            writer.writerow(complete_row)
            
    print(f"\nSuccess! Created {output_file} with {len(results)} rows.")

if __name__ == "__main__":
    process_dataset()
