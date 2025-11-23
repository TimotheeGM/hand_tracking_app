/**
 * @file MiniView.tsx
 * @description Minimalist popup window component for background monitoring.
 * 
 * Features:
 * - Canvas-based rendering for performance
 * - Draggable header region
 * - Simplified controls
 * - Receives state updates via BroadcastChannel
 */
import React, { useEffect, useRef } from 'react';
import { TrackerStatus, HandGesture, HandFacing, BoundingBox } from '../types';

interface MiniViewProps {
    status: TrackerStatus;
    boundingBox: BoundingBox | null;
    gesture: HandGesture;
    facing: HandFacing;
    onStart: () => void;
    onStop: () => void;
}

export const MiniView: React.FC<MiniViewProps> = ({
    status,
    boundingBox,
    gesture,
    facing,
    onStart,
    onStop,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Draw the visualization
    useEffect(() => {
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;

            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Clear canvas
                    ctx.fillStyle = '#0f172a'; // slate-900
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw overlays if tracking
                    if (boundingBox) {
                        const { xmin, xmax, ymin, ymax } = boundingBox;
                        const w = xmax - xmin;
                        const h = ymax - ymin;

                        // Mirror coordinates for display
                        // xmin is 0-100. 
                        // We want to draw mirrored. 
                        // Normal: x from left. Mirrored: x from right.
                        // xmin_mirror = 100 - xmax
                        // xmax_mirror = 100 - xmin

                        const xmin_m = 100 - xmax;
                        // const xmax_m = 100 - xmin;

                        ctx.strokeStyle = '#4ade80'; // green-400
                        ctx.lineWidth = 4;
                        ctx.strokeRect(
                            xmin_m * canvas.width / 100,
                            ymin * canvas.height / 100,
                            w * canvas.width / 100,
                            h * canvas.height / 100
                        );
                    }
                }
            }
            animationFrameId = requestAnimationFrame(render);
        };

        if (status === TrackerStatus.ACTIVE) {
            render();
        }

        return () => cancelAnimationFrame(animationFrameId);
    }, [status, boundingBox]);

    return (
        <div className="w-screen h-screen bg-slate-900 flex flex-col overflow-hidden">
            {/* Header / Drag Area */}
            <div className="bg-slate-800 p-2 flex justify-between items-center select-none cursor-move app-drag-region">
                <span className="text-xs font-bold text-white">Hand Tracker</span>
                <div className={`w-2 h-2 rounded-full ${status === TrackerStatus.ACTIVE ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>

            {/* Visualization Area */}
            <div className="relative flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={320}
                    height={240}
                    className="w-full h-full object-contain"
                />

                {/* Status Overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] text-white/80 font-mono pointer-events-none">
                    <span>{gesture}</span>
                    <span>{facing}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="p-2 bg-slate-800 flex gap-2 justify-center">
                {status === TrackerStatus.ACTIVE ? (
                    <button
                        onClick={onStop}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded transition-colors"
                    >
                        Stop
                    </button>
                ) : (
                    <button
                        onClick={onStart}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded transition-colors"
                    >
                        Start
                    </button>
                )}
            </div>
        </div>
    );
};
