export type CameraMode = 'free' | 'locked' | 'follow';

export interface DragSensitivityCurve {
  yMin: number;
  yMax: number;
  anchors: { nx: number; ny: number }[];
}
