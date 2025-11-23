/**
 * @file TrackerOverlay.tsx
 * @description Visual feedback layer overlaid on the video feed.
 * 
 * Renders:
 * - Bounding Box (Green/Cyan/Purple)
 * - Status Labels (LOCKED, LEFT CLICK, RIGHT CLICK)
 * - Virtual Cursor
 * - Debug info (Gesture/Facing)
 */
import React from 'react';
import { BoundingBox, TrackerStatus, HandGesture, HandFacing } from '../types';

interface TrackerOverlayProps {
  box: BoundingBox | null;
  status: TrackerStatus;
  gesture?: HandGesture;
  facing?: HandFacing;
  cursor?: { x: number; y: number } | null;
}

export const TrackerOverlay: React.FC<TrackerOverlayProps> = ({
  box,
  status,
  gesture = 'UNKNOWN',
  facing = 'UNKNOWN',
  cursor
}) => {
  if (status !== TrackerStatus.ACTIVE) return null;

  const isLocked = !!box;
  const isClosed = gesture === 'CLOSED';
  const isFront = facing === 'FRONT';

  // Scanning State: Centered, 50% size
  // Locked State: Actual bounding box
  const top = isLocked ? box.ymin : 25;
  const left = isLocked ? box.xmin : 25;
  const width = isLocked ? (box.xmax - box.xmin) : 50;
  const height = isLocked ? (box.ymax - box.ymin) : 50;

  // Visual styles
  // Green for normal tracking
  // Cyan/Blue for LEFT CLICK (Closed + Front)
  // Purple for RIGHT CLICK (Closed + Back)

  let baseColor = 'border-green-500';
  let shadowStyle = 'shadow-[0_0_20px_rgba(34,197,94,0.5)]';
  let labelColor = 'bg-green-600 text-white';
  let labelText = 'LOCKED';

  if (isClosed) {
    if (isFront) {
      // User Request: Fist close from a front hand -> LEFT CLICK
      baseColor = 'border-cyan-400';
      shadowStyle = 'shadow-[0_0_30px_rgba(34,211,238,0.6)]';
      labelColor = 'bg-cyan-600 text-white';
      labelText = 'LEFT CLICK';
    } else {
      // User Request: Fist close from a back hand -> RIGHT CLICK
      baseColor = 'border-purple-500';
      shadowStyle = 'shadow-[0_0_30px_rgba(168,85,247,0.6)]';
      labelColor = 'bg-purple-600 text-white';
      labelText = 'RIGHT CLICK';
    }
  }

  const borderColor = isLocked ? baseColor : 'border-red-500/60';
  const shadowColor = isLocked ? shadowStyle : 'shadow-[0_0_15px_rgba(239,68,68,0.1)]';
  const animation = isLocked ? '' : 'animate-pulse';

  return (
    <>
      <div
        className={`absolute border-[3px] rounded-xl transition-all duration-200 ease-out pointer-events-none z-20 ${borderColor} ${shadowColor} ${animation}`}
        style={{
          top: `${top}%`,
          left: `${left}%`,
          width: `${width}%`,
          height: `${height}%`,
        }}
      >
        {/* Header Label (Un-mirrored) */}
        <div className="absolute -top-10 left-0 w-full flex justify-between items-center transform scale-x-[-1]">
          <div className="flex gap-2 items-center">
            <div className={`text-xs font-bold px-2 py-1 rounded shadow-sm transition-colors duration-200 ${isLocked ? labelColor : 'bg-red-600 text-white'
              }`}>
              {isLocked ? labelText : 'SCANNING'}
            </div>

            {/* Debug Details Label - Helpful to verify "FRONT" vs "BACK" state */}
            {isLocked && (
              <div className="flex gap-1">
                <div className={`text-[10px] font-bold px-1.5 py-1 rounded bg-black/50 border border-white/10 text-white/80 uppercase`}>
                  {gesture}
                </div>
                <div className={`text-[10px] font-bold px-1.5 py-1 rounded bg-black/50 border border-white/10 text-white/80 uppercase ${isFront ? 'text-cyan-200' : 'text-purple-300'}`}>
                  {facing}
                </div>
              </div>
            )}
          </div>

          {isLocked && box.confidence > 0 && (
            <span className="text-green-400 text-xs font-mono bg-black/60 px-1 rounded border border-green-500/30">
              {Math.round(box.confidence * 100)}%
            </span>
          )}
        </div>

        {/* Center Point: Only show when NOT locked */}
        {!isLocked && (
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg"></div>
        )}

        {/* Click Ripple Effect */}
        {isClosed && isLocked && (
          <div className={`absolute inset-0 border-4 rounded-xl animate-ping ${isFront ? 'border-cyan-400/50' : 'border-purple-500/50'}`}></div>
        )}

        {/* Decorative Corners */}
        <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-sm transition-colors duration-200 ${isLocked ? 'border-white' : 'border-red-400'}`}></div>
        <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-sm transition-colors duration-200 ${isLocked ? 'border-white' : 'border-red-400'}`}></div>
        <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-sm transition-colors duration-200 ${isLocked ? 'border-white' : 'border-red-400'}`}></div>
        <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-sm transition-colors duration-200 ${isLocked ? 'border-white' : 'border-red-400'}`}></div>
      </div>

      {/* Virtual Cursor (Premium Visuals) */}
      {isLocked && cursor && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-75 ease-linear flex items-center justify-center"
          style={{
            top: `${cursor.y}%`,
            left: `${cursor.x}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Outer Glow Ring */}
          <div className="absolute w-12 h-12 rounded-full border border-cyan-400/30 animate-[spin_3s_linear_infinite]"></div>
          <div className="absolute w-8 h-8 rounded-full border border-white/20 animate-[spin_2s_linear_infinite_reverse]"></div>

          {/* Core Glow */}
          <div className="absolute w-6 h-6 bg-cyan-500/20 rounded-full blur-sm"></div>

          {/* Main Dot */}
          <div className="relative w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)] border border-cyan-200"></div>

          {/* Crosshair Accents */}
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent w-8"></div>
          <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent h-8"></div>
        </div>
      )}
    </>
  );
};