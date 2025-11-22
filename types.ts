export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  confidence: number;
}

export type HandGesture = 'OPEN' | 'CLOSED' | 'UNKNOWN';
export type HandFacing = 'FRONT' | 'BACK' | 'UNKNOWN';

export enum TrackerStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
}

export interface HandCoordinates {
  top: string;
  left: string;
  width: string;
  height: string;
}

export interface CursorPosition {
  x: number;
  y: number;
}