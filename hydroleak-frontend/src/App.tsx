import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, Tooltip, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft, Info, Droplets, Layers, Plus } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import regionsData from './data/bulgaria-regions.json';
import { type Leak, type Status } from './data/mockData';
import LeakMarker from './components/LeakMarker';
import LeakDetails from './components/LeakDetails';
import NewLeakForm from './components/NewLeakForm';

const BULGARIA_CENTER: [number, number] = [42.7339, 25.4858];
const INITIAL_ZOOM = 7;

const SectorGrid = () => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [viewBounds, setViewBounds] = useState(() => {
    try {
      return map.getBounds();
    } catch (e) {
      return L.latLngBounds([41, 22], [45, 29]);
    }
  });

  const latBase = 41.0;
  const lngBase = 22.0;
  const step = 0.1;

  const grid = useMemo(() => {
    const lines = [];
    const latSteps = 40;
    const lngSteps = 80;

    for (let i = 0; i <= latSteps; i++) {
      const lat = latBase + (i * step);
      lines.push([[lat, lngBase], [lat, lngBase + (lngSteps * step)]]);
    }
    for (let j = 0; j <= lngSteps; j++) {
      const lng = lngBase + (j * step);
      lines.push([[latBase, lng], [latBase + (latSteps * step), lng]]);
    }
    return { lines, latSteps, lngSteps };
  }, []);

  useEffect(() => {
    const onViewportChange = () => {
      setZoom(map.getZoom());
      try {
        setViewBounds(map.getBounds());
      } catch (e) {}
    };

    map.on('moveend', onViewportChange);
    map.on('zoomend', onViewportChange);
    
    return () => {
      map.off('moveend', onViewportChange);
      map.off('zoomend', onViewportChange);
    };
  }, [map]);

  const visibleLabels = useMemo(() => {
    if (zoom < 10 || !viewBounds || !viewBounds.getSouth) return [];
    
    const labels = [];
    const sLat = Math.max(0, Math.floor((viewBounds.getSouth() - latBase) / step));
    const nLat = Math.min(grid.latSteps - 1, Math.ceil((viewBounds.getNorth() - latBase) / step));
    const wLng = Math.max(0, Math.floor((viewBounds.getWest() - lngBase) / step));
    const eLng = Math.min(grid.lngSteps - 1, Math.ceil((viewBounds.getEast() - lngBase) / step));

    const maxLabels = 80;
    let count = 0;

    for (let i = sLat; i <= nLat && count < maxLabels; i++) {
      for (let j = wLng; j <= eLng && count < maxLabels; j++) {
        const lat = latBase + (i * step);
        const lng = lngBase + (j * step);
        labels.push({
          id: `${i}-${j}`,
          label: `${String.fromCharCode(65 + (i % 26))}${j + 1}`,
          position: [lat + step/2, lng + step/2] as [number, number]
        });
        count++;
      }
    }
    return labels;
  }, [zoom, viewBounds, grid]);

  return (
    <>
      <Polyline 
        positions={grid.lines as any}
        pathOptions={{ color: '#3b82f6', weight: 0.5, opacity: 0.4, dashArray: '2, 6' }}
        interactive={false}
      />
      
      {visibleLabels.map(l => (
        <Tooltip
          key={l.id}
          position={l.position}
          permanent
          direction="center"
          className="sector-id-label"
          opacity={0.8}
        >
          {l.label}
        </Tooltip>
      ))}
    </>
  );
};

// Component to handle map view changes
const MapViewHandler = ({ bounds }: { bounds: L.LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [20, 20], duration: 1.5 });
    } else {
      map.flyTo(BULGARIA_CENTER, INITIAL_ZOOM, { duration: 1.5 });
    }
  }, [bounds, map]);
  return null;
};

const MapClickHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
};

const App: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedLeak, setSelectedLeak] = useState<Leak | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [showSectors, setShowSectors] = useState(false);
  const [leaks, setLeaks] = useState<Leak[]>([]);
  const [sofiaPipes, setSofiaPipes] = useState<any>(null);
  const [reportMode, setReportMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<[number, number] | null>(null);
  const reportModeRef = useRef(false);
  useEffect(() => { reportModeRef.current = reportMode; }, [reportMode]);

  useEffect(() => {
    fetch('/api/accidents')
      .then(res => res.json())
      .then(setLeaks)
      .catch(err => console.error('Failed to fetch accidents:', err));
  }, []);

  useEffect(() => {
    if (selectedRegion === 'Sofia City' && !sofiaPipes) {
      fetch('/sofia-pipes.geojson')
        .then(res => res.json())
        .then(setSofiaPipes)
        .catch(err => console.error('Failed to load Sofia pipes:', err));
    }
  }, [selectedRegion, sofiaPipes]);

  const filteredLeaks = useMemo(() => {
    if (!selectedRegion) return [];
    return leaks.filter(leak => leak.regionName === selectedRegion && !['dismissed', 'fixed', 'fake'].includes(leak.status));
  }, [selectedRegion, leaks]);

  const handleStatusChange = useCallback((id: string, status: Status) => {
    setLeaks(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    setSelectedLeak(prev => prev?.id === id ? { ...prev, status } : prev);
  }, []);

  const handleNewLeak = useCallback((leak: Leak) => {
    setLeaks(prev => [...prev, leak]);
    setPendingCoords(null);
    setReportMode(false);
  }, []);

  const handleInference = useCallback(async () => {
    console.log('--- STARTING SAR INFERENCE ---');
    try {
      const response = await fetch('/api/inference');
      const data = await response.json();
      console.log('Inference Results:', data);
      if (data.success) {
        console.log(`Successfully predicted ${data.predictions.length} leak points from image: ${data.sample_image}`);
        data.predictions.forEach((p: number[], i: number) => {
          console.log(`Point ${i + 1}: [${p[0].toFixed(6)}, ${p[1].toFixed(6)}]`);
        });
      }
    } catch (error) {
      console.error('Inference request failed:', error);
    }
    console.log('--- INFERENCE COMPLETE ---');
  }, []);

  const onRegionClick = useCallback((event: any) => {
    if (reportModeRef.current) return;
    const feature = event.target.feature;
    const regionName = feature.properties.shapeName;
    
    setSelectedRegion(regionName);
    setSelectedLeak(null);
    
    // Calculate bounds of the clicked region
    const bounds = event.target.getBounds();
    setMapBounds(bounds);
  }, []);

  const resetView = useCallback(() => {
    setSelectedRegion(null);
    setSelectedLeak(null);
    setMapBounds(null);
  }, []);

  const regionStyle = (feature: any) => {
    const isSelected = selectedRegion === feature.properties.shapeName;
    return {
      fillColor: isSelected ? '#3b82f6' : '#2d2d2d',
      weight: 1.5,
      opacity: 1,
      color: '#4d4d4d',
      fillOpacity: isSelected ? 0.3 : 0.6,
    };
  };

  const onEachRegion = (feature: any, layer: L.Layer) => {
    layer.on({
      click: onRegionClick,
      mouseover: (e) => {
        const l = e.target;
        if (selectedRegion !== feature.properties.shapeName) {
          l.setStyle({ fillOpacity: 0.8, fillColor: '#4d4d4d' });
        }
      },
      mouseout: (e) => {
        const l = e.target;
        if (selectedRegion !== feature.properties.shapeName) {
          l.setStyle(regionStyle(feature));
        }
      }
    });
    layer.bindTooltip(feature.properties.shapeName, { 
      permanent: true, 
      direction: 'center',
      className: 'region-label'
    });
  };

  return (
    <div className="relative w-full h-screen bg-industrial-900 overflow-hidden flex flex-col font-sans">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-[1001] p-4 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3 bg-industrial-900/80 backdrop-blur-md p-3 rounded-lg border border-industrial-700 pointer-events-auto shadow-xl">
          <div className="p-2 bg-blue-600 rounded">
            <Droplets className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">HidroLeak <span className="text-blue-500">Monitor</span></h1>
            <p className="text-[10px] text-industrial-400 font-bold uppercase tracking-[0.2em]">National Infrastructure Safety</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {selectedRegion && (
            <button
              onClick={resetView}
              className="flex items-center gap-2 bg-industrial-800 hover:bg-industrial-700 text-white px-4 py-2 rounded-lg border border-industrial-600 transition-all shadow-lg"
            >
              <ChevronLeft size={20} />
              <span className="font-bold uppercase text-xs tracking-wider">Back to National Map</span>
            </button>
          )}
          <button
            onClick={handleInference}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg border border-blue-500 transition-all shadow-lg font-bold uppercase text-xs tracking-wider"
          >
            <Layers size={16} />
            Run SAR Inference
          </button>
          <button
            onClick={() => { setReportMode(r => !r); setPendingCoords(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all shadow-lg font-bold uppercase text-xs tracking-wider ${
              reportMode
                ? 'bg-red-600 hover:bg-red-500 border-red-500 text-white'
                : 'bg-industrial-800 hover:bg-industrial-700 border-industrial-600 text-white'
            }`}
          >
            <Plus size={16} />
            {reportMode ? 'Cancel' : 'Report Leak'}
          </button>
        </div>
      </div>

      {/* Info Stats Overlay */}
      <div className="absolute bottom-6 left-6 z-[1001] space-y-3 pointer-events-none">
        {/* Map Controls */}
        <div className="bg-industrial-900/80 backdrop-blur-md p-4 rounded-lg border border-industrial-700 pointer-events-auto shadow-xl w-64">
          <h3 className="text-industrial-400 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <Layers size={12} /> Map Controls
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300 font-medium">Sector Grid</span>
            <button 
              onClick={() => setShowSectors(!showSectors)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showSectors ? 'bg-blue-600' : 'bg-industrial-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showSectors ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="bg-industrial-900/80 backdrop-blur-md p-4 rounded-lg border border-industrial-700 pointer-events-auto shadow-xl w-64">
          <h3 className="text-industrial-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <Info size={12} /> System Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Active Leaks</span>
              <span className="text-sm font-mono font-bold text-red-500">{leaks.filter(l => !['dismissed', 'fixed', 'fake'].includes(l.status)).length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Selected Region</span>
              <span className="text-sm font-bold text-blue-400">{selectedRegion || 'National'}</span>
            </div>
            {selectedRegion && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Regional Leaks</span>
                <span className="text-sm font-mono font-bold text-orange-500">{filteredLeaks.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className={`flex-1 w-full h-full${reportMode ? ' map-report-mode' : ''}`}>
        <MapContainer 
          center={BULGARIA_CENTER} 
          zoom={INITIAL_ZOOM} 
          zoomControl={false}
          className="w-full h-full"
          preferCanvas={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          <MapViewHandler bounds={mapBounds} />

          {reportMode && !pendingCoords && (
            <MapClickHandler onMapClick={(lat, lng) => setPendingCoords([lat, lng])} />
          )}
          
          <GeoJSON 
            data={regionsData as any} 
            style={regionStyle}
            onEachFeature={onEachRegion}
          />

          {showSectors && (
            <SectorGrid />
          )}

          {sofiaPipes && selectedRegion === 'Sofia City' && (
            <GeoJSON
              key="sofia-pipes"
              data={sofiaPipes}
              style={{ color: '#38bdf8', weight: 1.5, opacity: 0.7 }}
              interactive={false}
            />
          )}

          {selectedRegion && filteredLeaks.map(leak => (
            <LeakMarker 
              key={leak.id} 
              leak={leak} 
              onClick={setSelectedLeak}
            />
          ))}
        </MapContainer>
      </div>

      {/* Side Details Panel */}
      <LeakDetails
        leak={selectedLeak}
        onClose={() => setSelectedLeak(null)}
        onStatusChange={handleStatusChange}
      />

      {pendingCoords && (
        <NewLeakForm
          coordinates={pendingCoords}
          onSubmit={handleNewLeak}
          onCancel={() => setPendingCoords(null)}
        />
      )}
    </div>
  );
};

export default App;
