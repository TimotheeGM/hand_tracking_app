import React, { useEffect, useRef, useState } from 'react';
import { VisionService } from './services/visionService';
import { TrackerOverlay } from './components/TrackerOverlay';
import { ControlPanel } from './components/ControlPanel';
import { BoundingBox, TrackerStatus } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<TrackerStatus>(TrackerStatus.IDLE);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const visionServiceRef = useRef<VisionService | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);
  
  // Grace period counter to prevent flickering when hand is lost for just 1-2 frames
  const missingFramesRef = useRef<number>(0);

  // Main Tracking Loop
  const loop = () => {
    if (status === TrackerStatus.ERROR) return;
    
    if (videoRef.current && visionServiceRef.current && videoRef.current.readyState >= 2) {
      const result = visionServiceRef.current.detect(videoRef.current);
      
      // Only update state if a NEW frame was processed.
      // If result.processed is false, it means we are faster than the webcam, so we wait.
      if (result.processed) {
        if (result.box) {
          // Hand Found: Immediately update and reset missing counter
          setBoundingBox(result.box);
          missingFramesRef.current = 0;
        } else {
          // Hand Not Found: Increment missing counter
          missingFramesRef.current++;
          
          // Grace Period: Keep the last known position for 5 frames (~150ms)
          // This prevents the box from snapping back to the center during quick motion blur
          if (missingFramesRef.current > 5) {
            setBoundingBox(null);
          }
        }
      }
    }
    
    requestRef.current = requestAnimationFrame(loop);
  };

  const startTracking = async () => {
    setErrorMsg(null);
    setStatus(TrackerStatus.CONNECTING);
    setBoundingBox(null);
    missingFramesRef.current = 0;

    try {
      // 1. Initialize MediaPipe
      if (!visionServiceRef.current) {
        visionServiceRef.current = new VisionService();
      }
      await visionServiceRef.current.initialize();

      // 2. Setup Webcam
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: false 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
        videoRef.current.play();
      }

      setStatus(TrackerStatus.ACTIVE);

      // 3. Start Animation Loop
      requestRef.current = requestAnimationFrame(loop);

    } catch (err) {
      console.error(err);
      handleError("Failed to load MediaPipe or access camera.");
    }
  };

  const stopTracking = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setBoundingBox(null);
    setStatus(TrackerStatus.IDLE);
  };

  const handleError = (msg: string) => {
    setStatus(TrackerStatus.ERROR);
    setErrorMsg(msg);
    stopTracking();
  };

  useEffect(() => {
    return () => stopTracking();
  }, []);

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden p-4">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-6 z-30 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          MediaPipe <span className="text-green-400">Instant</span> Tracker
        </h1>
        {errorMsg && (
          <div className="mt-2 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg inline-block backdrop-blur-sm">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Video Container */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 inline-flex justify-center items-center bg-slate-900 max-w-full max-h-[80vh]">
        <video
          ref={videoRef}
          className="block max-w-full max-h-[80vh] w-auto h-auto transform -scale-x-100"
          playsInline
          muted
        />
        
        {/* Overlay Container */}
        <div className="absolute inset-0 pointer-events-none transform -scale-x-100">
           <TrackerOverlay box={boundingBox} status={status} />
        </div>

        {status === TrackerStatus.IDLE && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
            <div className="text-slate-500 text-lg">Camera inactive</div>
          </div>
        )}
      </div>

      <ControlPanel 
        status={status} 
        onStart={startTracking} 
        onStop={stopTracking} 
      />
    </div>
  );
};

export default App;