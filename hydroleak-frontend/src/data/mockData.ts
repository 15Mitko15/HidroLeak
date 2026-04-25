export type Severity = 'Low' | 'Medium' | 'High';

export interface Leak {
  id: string;
  regionName: string;
  coordinates: [number, number];
  severity: Severity;
  timestamp: string;
  sector: string;
  estimatedLoss: string;
}

export const REGIONS = [
  "Blagoevgrad", "Burgas", "Dobrich", "Gabrovo", "Haskovo", "Kardzhali", 
  "Kyustendil", "Lovech", "Montana", "Pazardzhik", "Pernik", "Pleven", 
  "Plovdiv", "Razgrad", "Ruse", "Shumen", "Silistra", "Sliven", 
  "Smolyan", "Sofia City", "Sofia Province", "Sofia", "Stara Zagora", "Targovishte", 
  "Varna", "Veliko Tarnovo", "Vidin", "Vratsa", "Yambol"
];

const REGION_CENTERS: Record<string, [number, number]> = {
  "Sofia City": [42.6977, 23.3219],
  "Sofia Province": [42.6977, 23.3219],
  "Sofia": [42.6977, 23.3219],
  "Plovdiv": [42.1354, 24.7453],
  "Varna": [43.2141, 27.9147],
  "Burgas": [42.5048, 27.4626],
  "Ruse": [43.8356, 25.9657],
  "Stara Zagora": [42.4258, 25.6345],
  "Blagoevgrad": [42.0209, 23.0943],
  "Veliko Tarnovo": [43.0757, 25.6172],
  "Pleven": [43.4170, 24.6067],
  "Sliven": [42.6817, 26.3229],
  "Dobrich": [43.5726, 27.8273],
  "Gabrovo": [42.8742, 25.3187],
  "Haskovo": [41.9344, 25.5554],
  "Kardzhali": [41.6338, 25.3777],
  "Kyustendil": [42.2839, 22.6913],
  "Lovech": [43.1370, 24.7142],
  "Montana": [43.4125, 23.2250],
  "Pazardzhik": [42.1928, 24.3333],
  "Pernik": [42.6052, 23.0306],
  "Razgrad": [43.5333, 26.5167],
  "Shumen": [43.2706, 26.9228],
  "Silistra": [44.1167, 27.2667],
  "Smolyan": [41.5747, 24.7120],
  "Targovishte": [43.2500, 26.5667],
  "Vidin": [43.9900, 22.8725],
  "Vratsa": [43.2100, 23.5625],
  "Yambol": [42.4844, 26.5031]
};

const getSectorFromCoords = (lat: number, lng: number): string => {
  const latBase = 41.0;
  const lngBase = 22.0;
  const latIndex = Math.floor((lat - latBase) * 10);
  const lngIndex = Math.floor((lng - lngBase) * 10);
  
  const row = String.fromCharCode(65 + (latIndex % 26));
  const col = lngIndex + 1;
  return `${row}${col}`;
};

const REGION_BOUNDS: Record<string, {minLat: number, maxLat: number, minLng: number, maxLng: number}> = {
  "Vidin": { minLat: 43.6, maxLat: 44.3, minLng: 22.3, maxLng: 23.1 },
  "Silistra": { minLat: 43.8, maxLat: 44.2, minLng: 26.5, maxLng: 27.5 },
  "Burgas": { minLat: 41.9, maxLat: 43.0, minLng: 26.8, maxLng: 28.1 },
  "Blagoevgrad": { minLat: 41.2, maxLat: 42.2, minLng: 22.8, maxLng: 24.0 },
};

const getRegionFromCoords = (lat: number, lng: number): string => {
  // 1. Try Bounding Boxes first for edges
  for (const [region, bounds] of Object.entries(REGION_BOUNDS)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat && 
        lng >= bounds.minLng && lng <= bounds.maxLng) {
      return region;
    }
  }

  // 2. Fallback to closest center
  let closestRegion = REGIONS[0];
  let minDistance = Infinity;

  Object.entries(REGION_CENTERS).forEach(([region, center]) => {
    const distance = Math.pow(lat - center[0], 2) + Math.pow(lng - center[1], 2);
    if (distance < minDistance) {
      minDistance = distance;
      closestRegion = region;
    }
  });

  return closestRegion;
};

const generateLeaks = (): Leak[] => {
  const leaks: Leak[] = [];
  
  // Generate random coordinates across Bulgaria
  // Lat: 41.2 to 44.3, Lng: 22.3 to 28.7
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
