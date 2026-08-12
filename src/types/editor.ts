export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | 'custom';

export interface CanvasSettings {
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
  aspectRatio: AspectRatio;
}

export type TrackType = 'video' | 'image' | 'audio' | 'text' | 'caption' | 'element' | 'effect';

export interface FilterSettings {
  preset: string; // 'normal' | 'bright' | 'contrast' | 'warm' | 'cool' | 'vintage' | 'cinematic' | 'bw' | 'sepia' | 'dramatic' | 'vibrant'
  brightness: number; // 0 - 200 (100 default)
  contrast: number;   // 0 - 200 (100 default)
  saturation: number; // 0 - 200 (100 default)
  exposure: number;   // -100 - 100 (0 default)
  temperature: number;// -100 - 100 (0 default)
  tint: number;       // -100 - 100 (0 default)
  blur: number;       // 0 - 20 px
  opacity: number;    // 0 - 100%
}

export type TransitionType = 
  | 'none' 
  | 'fade' 
  | 'crossdissolve' 
  | 'diptoblack' 
  | 'diptowhite' 
  | 'slideleft' 
  | 'slideright' 
  | 'slideup' 
  | 'slidedown' 
  | 'push' 
  | 'wipe' 
  | 'zoom' 
  | 'blur';

export interface ElementAnimation {
  entrance?: 'fade' | 'slide' | 'zoom' | 'pop' | 'typewriter' | 'bounce';
  entranceDuration?: number; // seconds
  exit?: 'fade' | 'slide' | 'zoom' | 'pop';
  exitDuration?: number;   // seconds
  loop?: 'none' | 'pulse' | 'bounce' | 'shake' | 'floating';
}

export interface Keyframe {
  id: string;
  time: number; // relative time inside clip duration (seconds)
  property: 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'volume';
  value: number;
}

export interface BaseClip {
  id: string;
  trackId: string;
  name: string;
  startTime: number; // timeline placement in seconds
  duration: number;  // visible timeline clip length in seconds
  trimStart: number; // offset in source media (seconds)
  trimEnd: number;   // end offset in source media (seconds)
  layer: number;     // z-index layer ordering
  locked?: boolean;
  hidden?: boolean;
  speed?: number;    // playback speed (0.25 - 2.0, 1 default)
  reverse?: boolean;
  keyframes?: Keyframe[];
}

export interface ChromaKeySettings {
  enabled: boolean;
  color: string;       // HEX color string (default '#00ff00')
  tolerance: number;   // 0 to 100 (default 40)
  smoothness: number;  // 0 to 100 (default 20)
}

export interface VideoMediaClip extends BaseClip {
  type: 'video';
  mediaId: string;
  blobUrl: string;
  sourceDuration: number;
  originalWidth: number;
  originalHeight: number;
  x: number; // center relative X offset (px)
  y: number; // center relative Y offset (px)
  width: number;
  height: number;
  rotation: number; // degrees
  scale: number;    // multiplier (0.1 - 3.0)
  opacity: number;  // 0 to 1
  flipH: boolean;
  flipV: boolean;
  crop?: { top: number; right: number; bottom: number; left: number };
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  shadowBlur?: number;
  shadowColor?: string;
  filters: FilterSettings;
  chromaKey?: ChromaKeySettings;
  volume: number; // 0 to 1
  muted: boolean;
  fadeIn: number;  // seconds
  fadeOut: number; // seconds
  transitionIn?: TransitionType;
  transitionInDuration?: number;
  transitionOut?: TransitionType;
  transitionOutDuration?: number;
  animation?: ElementAnimation;
}

export interface ImageClip extends BaseClip {
  type: 'image';
  mediaId: string;
  blobUrl: string;
  originalWidth: number;
  originalHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  flipH: boolean;
  flipV: boolean;
  filters: FilterSettings;
  chromaKey?: ChromaKeySettings;
  transitionIn?: TransitionType;
  transitionInDuration?: number;
  transitionOut?: TransitionType;
  transitionOutDuration?: number;
  animation?: ElementAnimation;
}

export interface AudioClip extends BaseClip {
  type: 'audio';
  mediaId: string;
  blobUrl: string;
  volume: number;
  muted: boolean;
  fadeIn: number;
  fadeOut: number;
}

export interface TextClip extends BaseClip {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  align: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
  opacity: number;
  letterSpacing: number;
  lineHeight: number;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  animation?: ElementAnimation;
  presetStyle?: string;
}

export interface CaptionClip extends BaseClip {
  type: 'caption';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: 'top' | 'center' | 'bottom';
  align: 'left' | 'center' | 'right';
  animation?: ElementAnimation;
}

export interface ElementClip extends BaseClip {
  type: 'element';
  elementType: 'shape' | 'sticker' | 'emoji' | 'icon';
  shapeType?: 'rectangle' | 'circle' | 'line' | 'arrow' | 'rounded-rectangle' | 'polygon';
  content?: string; // emoji character or SVG identifier
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  animation?: ElementAnimation;
}

export interface EffectClip extends BaseClip {
  type: 'effect';
  effectType: 'blur' | 'vignette' | 'grain' | 'glitch' | 'pixelate' | 'rgbsplit' | 'vhs' | 'colorshift';
  intensity: number; // 0 to 100
}

export type TimelineClip = 
  | VideoMediaClip 
  | ImageClip 
  | AudioClip 
  | TextClip 
  | CaptionClip 
  | ElementClip 
  | EffectClip;

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  locked: boolean;
  hidden: boolean;
  muted: boolean;
  clips: TimelineClip[];
}

export interface MediaAsset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  blobUrl: string;
  file?: File;
  size: number;
  duration: number; // seconds (0 for images)
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  createdAt: number;
}

export interface ProjectState {
  id: string;
  name: string;
  canvas: CanvasSettings;
  tracks: Track[];
  mediaAssets: MediaAsset[];
  playheadTime: number; // current timestamp in seconds
  zoomLevel: number;    // px per second scale factor (10 - 200)
  selectedClipId: string | null;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  snapEnabled: boolean;
  history: {
    past: Omit<ProjectState, 'history' | 'isPlaying' | 'playheadTime'>[];
    future: Omit<ProjectState, 'history' | 'isPlaying' | 'playheadTime'>[];
  };
}

export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  preset: 'normal',
  brightness: 100,
  contrast: 100,
  saturation: 100,
  exposure: 0,
  temperature: 0,
  tint: 0,
  blur: 0,
  opacity: 100,
};

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  backgroundColor: '#000000',
  aspectRatio: '16:9',
};
