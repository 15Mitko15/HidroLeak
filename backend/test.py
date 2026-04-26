import requests

class CDSESession(requests.Session):
    def rebuild_auth(self, prepared_request, response):
        """
        Overrides the default behavior of requests.Session to prevent 
        the Authorization header from being stripped during redirects.
        """
        pass

# --- 1. CONFIGURATION ---
USERNAME = "dmstoilov02@gmail.com"
PASSWORD = "Mitko15@Mitko"

# --- 2. GET AUTHENTICATION TOKEN ---
def get_token(username, password):
    print("Authenticating...")
    token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    data = {
        "client_id": "cdse-public",
        "username": username,
        "password": password,
        "grant_type": "password",
    }
    
    response = requests.post(token_url, data=data)
    response.raise_for_status()
    return response.json()["access_token"]

# --- 3. SEARCH FOR SENTINEL-1 DATA ---
def search_sentinel1_data():
    print("Searching the catalog...")
    base_url = "https://sh.dataspace.copernicus.eu/api/v1/statistics"
    
    # Define search parameters: Dates and WKT Polygon
    start_date = "2024-04-01T00:00:00.000Z"
    end_date = "2024-04-10T00:00:00.000Z"
    wkt_polygon = "POLYGON((12.0 41.0, 12.0 42.0, 13.0 42.0, 13.0 41.0, 12.0 41.0))"
    
    # Build the OData query string
    filter_query = (
        f"?$filter=Collection/Name eq 'SENTINEL-1' "
        f"and Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq 'GRD') "
        f"and ContentDate/Start gt {start_date} and ContentDate/Start lt {end_date} "
        f"and OData.CSC.Intersects(area=geography'SRID=4326;{wkt_polygon}')"
        f"&$top=1" # Limits result to the first match
    )
    
    response = requests.get(base_url + filter_query)
    response.raise_for_status()
    return response.json().get("value", [])

# --- 4. DOWNLOAD THE PRODUCT ---
def download_product(product_id, product_name, token):
    print(f"Starting download for {product_name}...")
    download_url = f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products({product_id})/$value"
    
    # --- USE THE CUSTOM SESSION HERE ---
    session = CDSESession() 
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    # Stream = True prevents loading the massive file into memory all at once
    response = session.get(download_url, allow_redirects=True, stream=True)
    response.raise_for_status()
    
    file_name = f"{product_name}.zip"
    with open(file_name, "wb") as file:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                file.write(chunk)
                
    print(f"Download complete: {file_name}")

# --- EXECUTION ---
if __name__ == "__main__":
    try:
        # Step 1: Login
        print("Attempting to get token...")
        token = get_token(USERNAME, PASSWORD)
        print(token)
        print("Token retrieved successfully!")
        
        # Step 2: Search
        products = search_sentinel1_data()
        
        if products:
            first_product = products[0]
            product_id = first_product["Id"]
            product_name = first_product["Name"]
            
            print(f"Found 1 product: {product_name} (ID: {product_id})")
            
            # Step 3: Download
            download_product(product_id, product_name, token)
        else:
            print("No matching Sentinel-1 products found for this criteria.")
            
    except requests.exceptions.HTTPError as err:
        print(f"\n[!] HTTP Error occurred: {err}")
        print(f"[!] Server Response: {err.response.text}") # This will tell you EXACTLY why it failed