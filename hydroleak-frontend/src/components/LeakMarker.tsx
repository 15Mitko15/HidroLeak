import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Leak } from '../data/mockData';

interface LeakMarkerProps {
  leak: Leak;
  onClick: (leak: Leak) => void;
}

const LeakMarker: React.FC<LeakMarkerProps> = ({ leak, onClick }) => {
  const customIcon = L.divIcon({
    className: 'custom-leak-icon',
    html: `<div class="leak-marker-pulse ${leak.severity.toLowerCase()}" style="width: 20px; height: 20px;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return (
    <Marker 
      position={leak.coordinates} 
      icon={customIcon}
      eventHandlers={{
        click: () => onClick(leak),
      }}
    >
      <Popup className="industrial-popup">
        <div className="p-1">
          <h3 className="font-bold text-industrial-900">Sector {leak.sector}</h3>
          <p className="text-sm">Severity: <span className={`font-semibold ${leak.severity === 'High' ? 'text-red-600' : leak.severity === 'Medium' ? 'text-orange-600' : 'text-yellow-600'}`}>{leak.severity}</span></p>
        </div>
      </Popup>
    </Marker>
  );
};

export default LeakMarker;
