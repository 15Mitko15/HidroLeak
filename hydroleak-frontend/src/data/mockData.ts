import regionsData from './bulgaria-regions.json';

export type Severity = 'Low' | 'Medium' | 'High';
export type Status = 'pending' | 'in_progress' | 'resolved' | 'dismissed' | 'fixed' | 'fake';

export interface Leak {
  id: string;
  regionName: string;
  coordinates: [number, number];
  severity: Severity;
  timestamp: string;
  sector: string;
  estimatedLoss: string;
  status: Status;
}

export const REGIONS = [
  "Blagoevgrad", "Burgas", "Dobrich", "Gabrovo", "Haskovo", "Kardzhali", 
  "Kyustendil", "Lovech", "Montana", "Pazardzhik", "Pernik", "Pleven", 
  "Plovdiv", "Razgrad", "Ruse", "Shumen", "Silistra", "Sliven", 
  "Smolyan", "Sofia City", "Sofia Province", "Sofia", "Stara Zagora", "Targovishte", 
  "Varna", "Veliko Tarnovo", "Vidin", "Vratsa", "Yambol"
];

const getSectorFromCoords = (lat: number, lng: number): string => {
  const latBase = 41.0;
  const lngBase = 22.0;
  const latIndex = Math.floor((lat - latBase) * 10);
  const lngIndex = Math.floor((lng - lngBase) * 10);
  
  const row = String.fromCharCode(65 + (latIndex % 26));
  const col = lngIndex + 1;
  return `${row}${col}`;
};

// Ray-casting algorithm for point-in-polygon
const isPointInPolygon = (point: [number, number], polygon: number[][][]): boolean => {
  const x = point[1]; // Longitude
  const y = point[0]; // Latitude
  let inside = false;

  // Most GeoJSON features have polygon[0] as the outer ring
  const ring = polygon[0];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
};

const getRegionFromCoords = (lat: number, lng: number): string => {
  for (const feature of regionsData.features) {
    const regionName = feature.properties.shapeName;
    const geometry = feature.geometry;

    if (geometry.type === "Polygon") {
      if (isPointInPolygon([lat, lng], geometry.coordinates as any)) {
        return regionName;
      }
    } else if (geometry.type === "MultiPolygon") {
      for (const polygon of (geometry.coordinates as any)) {
        if (isPointInPolygon([lat, lng], polygon)) {
          return regionName;
        }
      }
    }
  }

  return "National"; // Fallback if outside all polygons
};

const generateLeaks = (): Leak[] => {
  const leaks: Leak[] = [];
  
  // Bulgaria rough bounds
  const minLat = 41.2;
  const maxLat = 44.3;
  const minLng = 22.3;
  const maxLng = 28.7;

  for (let i = 0; i < 80; i++) {
    const lat = minLat + Math.random() * (maxLat - minLat);
    const lng = minLng + Math.random() * (maxLng - minLng);
    
    const regionName = getRegionFromCoords(lat, lng);
    const severities: Severity[] = ['Low', 'Medium', 'High'];
    
    leaks.push({
      id: `leak-${i}`,
      regionName: regionName,
      coordinates: [lat, lng],
      severity: severities[Math.floor(Math.random() * severities.length)],
      timestamp: new Date().toISOString(),
      sector: getSectorFromCoords(lat, lng),
      estimatedLoss: `${(Math.random() * 10).toFixed(1)}L/sec`
    });
  }
  
  return leaks;
};

export const MOCK_LEAKS = generateLeaks();
