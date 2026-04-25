import React from 'react';
import { X, Droplets, AlertTriangle, Clock, MapPin } from 'lucide-react';
import type { Leak } from '../data/mockData';

interface LeakDetailsProps {
  leak: Leak | null;
  onClose: () => void;
}

const LeakDetails: React.FC<LeakDetailsProps> = ({ leak, onClose }) => {
  if (!leak) return null;

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 bg-industrial-900/95 border border-industrial-700 shadow-2xl rounded-lg z-[1000] overflow-hidden flex flex-col text-white backdrop-blur-md">
      <div className="p-4 border-b border-industrial-700 flex justify-between items-center bg-industrial-800">
        <h2 className="text-xl font-bold tracking-tight">Leak Details</h2>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-industrial-700 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-industrial-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={14} /> Severity
          </label>
          <div className={`text-lg font-bold px-3 py-1 rounded inline-block ${
            leak.severity === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
            leak.severity === 'Medium' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
          }`}>
            {leak.severity} Priority
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-industrial-800 rounded">
              <MapPin size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-industrial-400 uppercase font-semibold">Location</p>
              <p className="font-medium">Sector {leak.sector}, {leak.regionName}</p>
              <p className="text-sm text-industrial-400">[{leak.coordinates[0].toFixed(4)}, {leak.coordinates[1].toFixed(4)}]</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-industrial-800 rounded">
              <Droplets size={18} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-industrial-400 uppercase font-semibold">Estimated Loss</p>
              <p className="text-2xl font-mono font-bold text-cyan-400">{leak.estimatedLoss}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-industrial-800 rounded">
              <Clock size={18} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-industrial-400 uppercase font-semibold">Detected At</p>
              <p className="font-medium">{new Date(leak.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-industrial-700">
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors shadow-lg active:transform active:scale-95">
            Dispatch Repair Team
          </button>
        </div>
      </div>
      
      <div className="p-4 bg-industrial-800/50 text-[10px] text-industrial-500 text-center italic">
        Sensor ID: {leak.id} | HidroLeak Monitoring System v1.0
      </div>
    </div>
  );
};

export default LeakDetails;
