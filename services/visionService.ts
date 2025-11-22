import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { BoundingBox, HandGesture, HandFacing, CursorPosition } from "../types";

export interface DetectionResult {
  box: BoundingBox | null;
  gesture: HandGesture;
  facing: HandFacing;
  cursor: CursorPosition | null;
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
    if (!this.handLandmarker) return { box: null, gesture: 'UNKNOWN', facing: 'UNKNOWN', cursor: null, processed: false };

    // Only process if the video frame has actually updated.
    if (video.currentTime === this.lastVideoTime) {
      return { box: null, gesture: 'UNKNOWN', facing: 'UNKNOWN', cursor: null, processed: false };
    }
    this.lastVideoTime = video.currentTime;

    const results: HandLandmarkerResult = this.handLandmarker.detectForVideo(video, performance.now());

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0]; // Get first hand
      const handedness = results.handednesses[0][0].categoryName; // "Left" or "Right"

      // 1. Calculate Bounding Box
      let xmin = 1, ymin = 1, xmax = 0, ymax = 0;

      for (const point of landmarks) {
        if (point.x < xmin) xmin = point.x;
        if (point.x > xmax) xmax = point.x;
        if (point.y < ymin) ymin = point.y;
        if (point.y > ymax) ymax = point.y;
      }

      // Add a little padding
      const padding = 0.05;
      xmin = Math.max(0, xmin - padding);
      xmax = Math.min(1, xmax + padding);
      ymin = Math.max(0, ymin - padding);
      ymax = Math.min(1, ymax + padding);

      // 2. Detect Gesture (Open vs Closed Fist)
      const gesture = this.detectGesture(landmarks);

      // 3. Detect Facing (Front/Palm vs Back)
      const facing = this.detectFacing(landmarks, handedness);

      // 4. Extract Cursor (Wrist - Landmark 0) with Vertical Offset
      // User requested "wrist only" for stability, but offset "higher" (screen-space up).
      // We apply a fixed negative Y offset to move the cursor up from the wrist.
      const wrist = landmarks[0];
      const yOffset = -0.25; // Move up by 25% of screen height (approx "one hand" length)

      const cursor = {
        x: wrist.x * 100,
        y: (wrist.y + yOffset) * 100
      };

      return {
        box: {
          xmin: xmin * 100,
          xmax: xmax * 100,
          ymin: ymin * 100,
          ymax: ymax * 100,
          confidence: results.handednesses[0][0].score
        },
        gesture,
        facing,
        cursor,
        processed: true
      };
    }

    // Frame processed, but no hand found
    return { box: null, gesture: 'UNKNOWN', facing: 'UNKNOWN', cursor: null, processed: true };
  }

  private detectGesture(landmarks: any[]): HandGesture {
    // Landmark indices: 0=wrist
    // Fingers:
    // Index: Tip 8, PIP 6
    // Middle: Tip 12, PIP 10
    // Ring: Tip 16, PIP 14
    // Pinky: Tip 20, PIP 18
    // We use PIP (Proximal Interphalangeal Joint) as the reference because
    // in a fist, the PIP is effectively the furthest point from the wrist in the curl,
    // while the Tip is tucked in close to the wrist/palm.
    // This works better for "Back of Hand" detection than comparing Tip vs Base(MCP).

    const wrist = landmarks[0];
    const fingers = [
      { tip: 8, pip: 6 },   // Index
      { tip: 12, pip: 10 },  // Middle
      { tip: 16, pip: 14 }, // Ring
      { tip: 20, pip: 18 }  // Pinky
    ];

    let curledCount = 0;

    for (const finger of fingers) {
      const tip = landmarks[finger.tip];
      const pip = landmarks[finger.pip];

      // Calculate Euclidean distance to wrist
      const distTip = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
      const distPip = Math.sqrt(Math.pow(pip.x - wrist.x, 2) + Math.pow(pip.y - wrist.y, 2));

      // If tip is closer to wrist than the middle joint (PIP) is, it's definitely curled.
      if (distTip < distPip) {
        curledCount++;
      }
    }

    // If 3 or more fingers are curled, we consider it a fist
    return curledCount >= 3 ? 'CLOSED' : 'OPEN';
  }

  private detectFacing(landmarks: any[], handedness: string): HandFacing {
    // Robust facing detection using Cross Product (Z-direction).
    // Works regardless of hand rotation (vertical or horizontal).

    // 0: Wrist, 5: IndexMCP, 17: PinkyMCP
    const wrist = landmarks[0];
    const index = landmarks[5];
    const pinky = landmarks[17];

    // Vector 1: Wrist -> Index
    const v1 = { x: index.x - wrist.x, y: index.y - wrist.y };
    // Vector 2: Wrist -> Pinky
    const v2 = { x: pinky.x - wrist.x, y: pinky.y - wrist.y };

    // Cross Product Z-component: (x1 * y2) - (y1 * x2)
    // This tells us the winding order/direction of the plane.
    const crossZ = (v1.x * v2.y) - (v1.y * v2.x);

    // In Web Coordinate system (Y is down):
    // For a RIGHT hand:
    // - Palm Facing Camera: CrossZ is NEGATIVE
    // - Back Facing Camera: CrossZ is POSITIVE
    // For a LEFT hand (or mirrored Right appearing as Left):
    // - Palm Facing Camera: CrossZ is POSITIVE
    // - Back Facing Camera: CrossZ is NEGATIVE

    if (handedness === 'Right') {
      return crossZ < 0 ? 'FRONT' : 'BACK';
    } else {
      // Left hand
      return crossZ > 0 ? 'FRONT' : 'BACK';
    }
  }

  close() {
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
  }
}