import React, { useEffect, useRef, useState } from 'react';
import { VisionService } from './services/visionService';
import { TrackerOverlay } from './components/TrackerOverlay';
import { ControlPanel } from './components/ControlPanel';
import { BoundingBox, TrackerStatus, HandGesture, HandFacing } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<TrackerStatus>(TrackerStatus.IDLE);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [gesture, setGesture] = useState<HandGesture>('UNKNOWN');
  const [facing, setFacing] = useState<HandFacing>('UNKNOWN');
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const visionServiceRef = useRef<VisionService | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);
  const missingFramesRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const prevGestureRef = useRef<HandGesture>('UNKNOWN');

  // Main tracking loop
  const loop = () => {
    if (status === TrackerStatus.ERROR) return;
    if (videoRef.current && visionServiceRef.current && videoRef.current.readyState >= 2) {
      const result = visionServiceRef.current.detect(videoRef.current);
      if (result.processed) {
        if (result.box) {
          setBoundingBox(result.box);
          setGesture(result.gesture);
          setFacing(result.facing);
          setCursor(result.cursor);
          missingFramesRef.current = 0;
          // Send to mouse service via WebSocket
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ cursor: result.cursor, gesture: result.gesture }));
          }
        } else {
          missingFramesRef.current++;
          if (missingFramesRef.current > 5) {
            setBoundingBox(null);
            setGesture('UNKNOWN');
            setFacing('UNKNOWN');
            setCursor(null);
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
    setGesture('UNKNOWN');
    setFacing('UNKNOWN');
    setCursor(null);
    missingFramesRef.current = 0;
    try {
      if (!visionServiceRef.current) {
        visionServiceRef.current = new VisionService();
      }
      await visionServiceRef.current.initialize();
      // Setup WebSocket connection to mouse server
      const ws = new WebSocket('ws://localhost:8081');
      wsRef.current = ws;
      ws.addEventListener('open', () => console.log('Mouse WS connected'));
      ws.addEventListener('close', () => console.log('Mouse WS closed'));
      // Setup webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) videoRef.current.onloadedmetadata = resolve;
        });
        videoRef.current.play();
      }
      setStatus(TrackerStatus.ACTIVE);
      requestRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error(err);
      handleError('Failed to load MediaPipe or access camera.');
    }
  };

  const stopTracking = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setBoundingBox(null);
    setGesture('UNKNOWN');
    setFacing('UNKNOWN');
    setCursor(null);
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
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 inline-flex justify-center items-center bg-slate-900 max-w-full max-h-[80vh]">
        <video ref={videoRef} className="block max-w-full max-h-[80vh] w-auto h-auto transform -scale-x-100" playsInline muted />
        <div className="absolute inset-0 pointer-events-none transform -scale-x-100">
          <TrackerOverlay box={boundingBox} status={status} gesture={gesture} facing={facing} cursor={cursor} />
        </div>
        {status === TrackerStatus.IDLE && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
            <div className="text-slate-500 text-lg">Camera inactive</div>
          </div>
        )}
      </div>
      <ControlPanel status={status} onStart={startTracking} onStop={stopTracking} />
    </div>
  );
};

export default App;