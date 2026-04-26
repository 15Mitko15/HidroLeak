import React, { useState } from 'react';
import { X, AlertTriangle, Clock, MapPin, Wrench, CheckCircle, Circle, XCircle } from 'lucide-react';
import type { Leak, Status } from '../data/mockData';

interface LeakDetailsProps {
  leak: Leak | null;
  onClose: () => void;
  onStatusChange: (id: string, status: Status) => void;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  pending:     { label: 'Awaiting Response', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  in_progress: { label: 'Working On It',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  resolved:    { label: 'Resolved',           color: 'bg-green-500/20 text-green-400 border-green-500/50' },
  dismissed:   { label: 'Dismissed',          color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
  fixed:       { label: 'Fixed',              color: 'bg-green-500/20 text-green-400 border-green-500/50' },
  fake:        { label: 'Fake Accident',      color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
};

const LeakDetails: React.FC<LeakDetailsProps> = ({ leak, onClose, onStatusChange }) => {
  const [loading, setLoading] = useState(false);

  if (!leak) return null;

  const updateStatus = async (status: Status) => {
    setLoading(true);
    try {
      await fetch(`/api/accidents/${leak.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      onStatusChange(leak.id, status);
    } finally {
      setLoading(false);
    }
  };

  const { label, color } = STATUS_CONFIG[leak.status];

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
        {/* Status */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-industrial-400 uppercase tracking-wider flex items-center gap-2">
            <Circle size={14} /> Status
          </label>
          <div className={`text-sm font-bold px-3 py-1.5 rounded inline-flex items-center gap-2 border ${color}`}>
            {leak.status === 'in_progress' && <Wrench size={14} />}
            {leak.status === 'resolved' && <CheckCircle size={14} />}
            {label}
          </div>
        </div>

        {/* Severity */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-industrial-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={14} /> Severity
          </label>
          <div className={`text-lg font-bold px-3 py-1 rounded inline-block ${
            leak.severity === 'High'   ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
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
              <Clock size={18} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-industrial-400 uppercase font-semibold">Detected At</p>
              <p className="font-medium">{new Date(leak.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-industrial-700 space-y-2">
          {(leak.status === 'pending' || leak.status === 'in_progress') && (
            <>
              {leak.status === 'pending' && (
                <button
                  disabled={loading}
                  onClick={() => updateStatus('in_progress')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <Wrench size={16} />
                  {loading ? 'Saving…' : 'Working On It'}
                </button>
              )}
              {leak.status === 'in_progress' && (
                <button
                  disabled={loading}
                  onClick={() => updateStatus('resolved')}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  {loading ? 'Saving…' : 'Mark as Resolved'}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={() => { updateStatus('fixed'); onClose(); }}
                  className="flex-1 py-2 bg-transparent hover:bg-green-900/30 disabled:opacity-50 text-green-400 hover:text-green-300 font-semibold rounded border border-green-700/50 transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  <CheckCircle size={14} />
                  Fixed
                </button>
                <button
                  disabled={loading}
                  onClick={() => { updateStatus('fake'); onClose(); }}
                  className="flex-1 py-2 bg-transparent hover:bg-industrial-700 disabled:opacity-50 text-gray-400 hover:text-white font-semibold rounded border border-industrial-600 transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  <XCircle size={14} />
                  Fake Accident
                </button>
              </div>
            </>
          )}
          {leak.status === 'resolved' && (
            <div className="w-full py-3 bg-green-900/30 border border-green-700/50 text-green-400 font-bold rounded text-center flex items-center justify-center gap-2">
              <CheckCircle size={16} />
              Leak Resolved
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-industrial-800/50 text-[10px] text-industrial-500 text-center italic">
        Sensor ID: {leak.id} | HidroLeak Monitoring System v1.0
      </div>
    </div>
  );
};

export default LeakDetails;
