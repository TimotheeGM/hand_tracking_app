import React from 'react';
import { TrackerStatus } from '../types';

interface ControlPanelProps {
  status: TrackerStatus;
  onStart: () => void;
  onStop: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ status, onStart, onStop }) => {
  const isTracking = status === TrackerStatus.ACTIVE || status === TrackerStatus.CONNECTING;

  const handleStopServer = async () => {
    if (confirm('Stop the entire application? This will close the app.')) {
      try {
        await fetch('http://localhost:8082/shutdown', { method: 'POST' });
        window.close();
      } catch (e) {
        alert('Server stopped. You can close this window.');
      }
    }
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4 w-full max-w-md px-4">
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status === TrackerStatus.ACTIVE ? 'bg-green-500 animate-pulse' :
              status === TrackerStatus.CONNECTING ? 'bg-yellow-500 animate-bounce' :
                status === TrackerStatus.ERROR ? 'bg-red-500' :
                  'bg-slate-500'
            }`} />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200 uppercase tracking-wider leading-none">
              {status === TrackerStatus.IDLE && "Ready to Track"}
              {status === TrackerStatus.CONNECTING && "Connecting..."}
              {status === TrackerStatus.ACTIVE && "System Active"}
              {status === TrackerStatus.ERROR && "Error"}
            </span>
            {status === TrackerStatus.ACTIVE && (
              <span className="text-[10px] text-slate-400 font-mono mt-1">STREAMING VIDEO...</span>
            )}
          </div>
        </div>

        {!isTracking ? (
          <button
            onClick={onStart}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-600/20"
          >
            Start
          </button>
        ) : (
          <button
            onClick={onStop}
            className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/50 font-semibold rounded-lg transition-colors"
          >
            Stop
          </button>
        )}
      </div>

      {/* Stop Server Button */}
      <button
        onClick={handleStopServer}
        className="px-4 py-2 bg-slate-700/60 hover:bg-slate-600/80 text-slate-300 text-sm font-medium rounded-lg transition-colors border border-slate-600/50"
      >
        🔴 Stop Server
      </button>
    </div>
  );
};