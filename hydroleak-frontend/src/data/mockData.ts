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
  "Smolyan", "Sofia City", "Sofia Province", "Stara Zagora", "Targovishte", 
  "Varna", "Veliko Tarnovo", "Vidin", "Vratsa", "Yambol"
];

const generateLeaks = (): Leak[] => {
  const leaks: Leak[] = [];
  const baseCoords: Record<string, [number, number]> = {
    "Sofia City": [42.6977, 23.3219],
    "Plovdiv": [42.1354, 24.7453],
    "Varna": [43.2141, 27.9147],
    "Burgas": [42.5048, 27.4626],
    "Ruse": [43.8356, 25.9657],
    "Stara Zagora": [42.4258, 25.6345],
    "Blagoevgrad": [42.0209, 23.0943],
    "Veliko Tarnovo": [43.0757, 25.6172],
    "Pleven": [43.4170, 24.6067],
    "Sliven": [42.6817, 26.3229],
  };

  REGIONS.forEach((region) => {
    const base = baseCoords[region] || [42.7, 25.3]; // Default center of BG
    const numLeaks = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numLeaks; i++) {
      const latOffset = (Math.random() - 0.5) * 0.1;
      const lngOffset = (Math.random() - 0.5) * 0.1;
      const severities: Severity[] = ['Low', 'Medium', 'High'];
      
      leaks.push({
        id: `${region}-${i}`,
        regionName: region,
        coordinates: [base[0] + latOffset, base[1] + lngOffset],
        severity: severities[Math.floor(Math.random() * severities.length)],
        timestamp: new Date().toISOString(),
        sector: `${Math.floor(Math.random() * 20)}${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`,
        estimatedLoss: `${(Math.random() * 10).toFixed(1)}L/sec`
      });
    }
  });
  
  return leaks;
};

export const MOCK_LEAKS = generateLeaks();
