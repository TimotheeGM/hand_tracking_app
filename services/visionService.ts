import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { BoundingBox } from "../types";

export interface DetectionResult {
  box: BoundingBox | null;
  processed: boolean;
}

export class VisionService {
  private handLandmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  async initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
      );
      
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      console.log("MediaPipe HandLandmarker loaded");
    } catch (error) {
      console.error("Error initializing MediaPipe:", error);
      throw error;
    }
  }

  detect(video: HTMLVideoElement): DetectionResult {
    if (!this.handLandmarker) return { box: null, processed: false };
    
    // CRITICAL FIX: Only process if the video frame has actually updated.
    // This prevents processing the same frame multiple times (running at 60fps on a 30fps cam),
    // which causes the tracker to flicker between "Found" and "Not Found".
    if (video.currentTime === this.lastVideoTime) {
      return { box: null, processed: false };
    }
    this.lastVideoTime = video.currentTime;

    const results: HandLandmarkerResult = this.handLandmarker.detectForVideo(video, performance.now());

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0]; // Get first hand
      
      // Calculate bounding box from landmarks
      let xmin = 1, ymin = 1, xmax = 0, ymax = 0;
      
      for (const point of landmarks) {
        if (point.x < xmin) xmin = point.x;
        if (point.x > xmax) xmax = point.x;
        if (point.y < ymin) ymin = point.y;
        if (point.y > ymax) ymax = point.y;
      }

      // Add a little padding for visual comfort
      const padding = 0.05;
      xmin = Math.max(0, xmin - padding);
      xmax = Math.min(1, xmax + padding);
      ymin = Math.max(0, ymin - padding);
      ymax = Math.min(1, ymax + padding);

      return {
        box: {
          xmin: xmin * 100,
          xmax: xmax * 100,
          ymin: ymin * 100,
          ymax: ymax * 100,
          confidence: results.handednesses[0][0].score
        },
        processed: true
      };
    }

    // Frame processed, but no hand found
    return { box: null, processed: true };
  }

  close() {
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
  }
}