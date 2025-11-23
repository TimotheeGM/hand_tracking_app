/**
 * @file App.tsx
 * @description Main application entry point. Manages the tracking loop, state, and WebSocket connection.
 * @author TimotheeGM / Antigravity
 * 
 * Responsibilities:
 * - Initializes MediaPipe VisionService
 * - Manages Webcam stream
 * - Runs the main tracking loop (via setTimeout for background persistence)
 * - Handles WebSocket communication with the mouse server
 * - Manages Mini Mode and BroadcastChannel communication
 */
import React, { useEffect, useRef, useState } from 'react';
import { VisionService } from './services/visionService';
import { TrackerOverlay } from './components/TrackerOverlay';
import { ControlPanel } from './components/ControlPanel';
import { MiniView } from './components/MiniView';
import { BoundingBox, TrackerStatus, HandGesture, HandFacing } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<TrackerStatus>(TrackerStatus.IDLE);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [gesture, setGesture] = useState<HandGesture>('UNKNOWN');
  const [facing, setFacing] = useState<HandFacing>('UNKNOWN');
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMouseConnected, setIsMouseConnected] = useState(false);

  // Mini Mode State
  const [isMiniMode, setIsMiniMode] = useState(false);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const visionServiceRef = useRef<VisionService | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);
  const missingFramesRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Use a ref to track status synchronously in the loop
  const statusRef = useRef<TrackerStatus>(TrackerStatus.IDLE);

  // Update statusRef whenever status state changes
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Main tracking loop
  const loop = () => {
    // Check status via ref to avoid stale closures
    if (statusRef.current === TrackerStatus.ERROR || statusRef.current === TrackerStatus.IDLE) return;

    try {
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
              wsRef.current.send(JSON.stringify({
                cursor: result.cursor,
                gesture: result.gesture,
                facing: result.facing
              }));
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
    } catch (e) {
      console.error("Error in tracking loop:", e);
    }

    // Use setTimeout instead of requestAnimationFrame for background execution
    // Target ~30 FPS (33ms)
    requestRef.current = window.setTimeout(loop, 33);
  };

  const startTracking = async () => {
    // If we are mini mode, tell main window to start
    if (isMiniMode) {
      bcRef.current?.postMessage({ type: 'START' });
      return;
    }

    // Start audio loop to prevent background throttling
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play failed", e));
    }

    setErrorMsg(null);
    setStatus(TrackerStatus.CONNECTING);
    statusRef.current = TrackerStatus.CONNECTING;

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
      ws.addEventListener('open', () => {
        console.log('Mouse WS connected');
        setIsMouseConnected(true);
      });
      ws.addEventListener('close', () => {
        console.log('Mouse WS closed');
        setIsMouseConnected(false);
      });
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
      statusRef.current = TrackerStatus.ACTIVE;

      // Start loop
      loop();
    } catch (err) {
      console.error(err);
      handleError('Failed to load MediaPipe or access camera.');
    }
  };

  const stopTracking = () => {
    // If we are mini mode, tell main window to stop
    if (isMiniMode) {
      bcRef.current?.postMessage({ type: 'STOP' });
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (requestRef.current) {
      clearTimeout(requestRef.current);
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
    statusRef.current = TrackerStatus.IDLE;
  };

  const handleError = (msg: string) => {
    setStatus(TrackerStatus.ERROR);
    setErrorMsg(msg);
    stopTracking();
  };

  const openMiniWindow = () => {
    window.open(
      '/?mode=mini',
      'HandTrackerMini',
      'width=320,height=240,menubar=no,toolbar=no,location=no,status=no'
    );
  };

  useEffect(() => {
    // Check if we are in Mini Mode
    const params = new URLSearchParams(window.location.search);
    const mini = params.get('mode') === 'mini';
    setIsMiniMode(mini);

    // Setup BroadcastChannel
    const bc = new BroadcastChannel('hand-tracker-channel');
    bcRef.current = bc;

    bc.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'START') startTracking();
      if (type === 'STOP') stopTracking();
      if (type === 'STATUS_UPDATE' && mini) {
        // If we are the mini window, update our state from the main window
        setStatus(payload.status);
        setBoundingBox(payload.boundingBox);
        setGesture(payload.gesture);
        setFacing(payload.facing);
      }
    };

    return () => {
      bc.close();
    };
  }, []);

  // Broadcast state changes if we are the MAIN window
  useEffect(() => {
    if (!isMiniMode && bcRef.current) {
      bcRef.current.postMessage({
        type: 'STATUS_UPDATE',
        payload: { status, boundingBox, gesture, facing }
      });
    }
  }, [status, boundingBox, gesture, facing, isMiniMode]);

  useEffect(() => {
    return () => stopTracking();
  }, []);

  if (isMiniMode) {
    return (
      <MiniView
        status={status}
        boundingBox={boundingBox}
        gesture={gesture}
        facing={facing}
        onStart={startTracking}
        onStop={stopTracking}
      />
    );
  }

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden p-4">
      {/* Hidden audio for background keep-alive */}
      <audio ref={audioRef} loop>
        <source src="https://github.com/anars/blank-audio/raw/master/1-minute-of-silence.mp3" type="audio/mp3" />
      </audio>

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
      <ControlPanel status={status} isMouseConnected={isMouseConnected} onStart={startTracking} onStop={stopTracking} onMiniMode={openMiniWindow} />
    </div>
  );
};

export default App;