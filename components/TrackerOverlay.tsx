import React from 'react';
import { BoundingBox, TrackerStatus } from '../types';

interface TrackerOverlayProps {
  box: BoundingBox | null;
  status: TrackerStatus;
}

export const TrackerOverlay: React.FC<TrackerOverlayProps> = ({ box, status }) => {
  if (status !== TrackerStatus.ACTIVE) return null;

  const isLocked = !!box;
  
  // Scanning State: Centered, 50% size
  // Locked State: Actual bounding box
  const top = isLocked ? box.ymin : 25;
  const left = isLocked ? box.xmin : 25;
  const width = isLocked ? (box.xmax - box.xmin) : 50;
  const height = isLocked ? (box.ymax - box.ymin) : 50;

  // Visual styles
  const borderColor = isLocked ? 'border-green-500' : 'border-red-500/60';
  const shadowColor = isLocked ? 'shadow-[0_0_20px_rgba(34,197,94,0.5)]' : 'shadow-[0_0_15px_rgba(239,68,68,0.1)]';
  
  // When scanning, we pulse slightly. When locked, we are solid.
  const animation = isLocked ? '' : 'animate-pulse';

  return (
    <>
      <div 
        className={`absolute border-[3px] rounded-xl transition-all duration-300 ease-out pointer-events-none z-20 ${borderColor} ${shadowColor} ${animation}`}
        style={{
          top: `${top}%`,
          left: `${left}%`,
          width: `${width}%`,
          height: `${height}%`,
        }}
      >
        {/* Header Label (Un-mirrored) */}
        <div className="absolute -top-9 left-0 w-full flex justify-between items-center transform scale-x-[-1]">
           <div className={`text-xs font-bold px-2 py-1 rounded shadow-sm transition-colors duration-300 ${
             isLocked ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
           }`}>
             {isLocked ? 'LOCKED' : 'SCANNING'}
           </div>
           
           {isLocked && box.confidence > 0 && (
               <span className="text-green-400 text-xs font-mono bg-black/60 px-1 rounded border border-green-500/30">
                 {Math.round(box.confidence * 100)}%
               </span>
           )}
        </div>
        
        {/* Center Point: Only show when NOT locked (Scanning target) */}
        {!isLocked && (
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg"></div>
        )}
        
        {/* Decorative Corners (Cyberpunk style) */}
        <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-sm transition-colors duration-300 ${isLocked ? 'border-white' : 'border-red-400'}`}></div>
        <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-sm transition-colors duration-300 ${isLocked ? 'border-white' : 'border-red-400'}`}></div>
        <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-sm transition-colors duration-300 ${isLocked ? 'border-white' : 'border-red-400'}`}></div>
        <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-sm transition-colors duration-300 ${isLocked ? 'border-white' : 'border-red-400'}`}></div>
      </div>
    </>
  );
};