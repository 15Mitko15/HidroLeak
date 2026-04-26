import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Leak, Severity } from '../data/mockData';

interface NewLeakFormProps {
  coordinates: [number, number];
  onSubmit: (leak: Leak) => void;
  onCancel: () => void;
}

const NewLeakForm: React.FC<NewLeakFormProps> = ({ coordinates, onSubmit, onCancel }) => {
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/accidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: coordinates[0],
          lng: coordinates[1],
          severity,
        }),
      });
      const leak = await res.json();
      onSubmit(leak);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-industrial-900 border border-industrial-600 rounded-xl shadow-2xl w-80 text-white">
        <div className="p-4 border-b border-industrial-700 flex justify-between items-center">
          <h2 className="font-bold text-lg">Report New Leak</h2>
          <button onClick={onCancel} className="p-1 hover:bg-industrial-700 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-industrial-400 uppercase font-semibold tracking-wider">Coordinates</label>
            <p className="text-sm font-mono text-gray-300 mt-1">
              [{coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}]
            </p>
          </div>

          <div>
            <label className="text-xs text-industrial-400 uppercase font-semibold tracking-wider block mb-1">
              Severity
            </label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value as Severity)}
              className="w-full bg-industrial-800 border border-industrial-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 border border-industrial-600 rounded text-sm font-semibold text-gray-400 hover:bg-industrial-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-bold transition-colors"
            >
              {loading ? 'Saving…' : 'Report Leak'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewLeakForm;
