import {
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_FILTER_SETTINGS,
} from '../types/editor';
import type {
  ProjectState,
  Track,
  TimelineClip,
  MediaAsset,
  CanvasSettings,
  Keyframe,
  TrackType,
  VideoMediaClip,
  TextClip,
  AudioClip,
  CaptionClip,
  ElementClip,
  ImageClip,
  EffectClip,
} from '../types/editor';
import { getInterpolatedProperty } from '../utils/keyframeInterpolator';

export type EditorAction =
  | { type: 'SET_PLAYHEAD'; payload: number }
  | { type: 'SET_IS_PLAYING'; payload: boolean }
  | { type: 'SET_ZOOM_LEVEL'; payload: number }
  | { type: 'SET_SELECTED_CLIP'; payload: string | null }
  | { type: 'TOGGLE_SELECT_CLIP'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SELECTED_TRACK'; payload: string | null }
  | { type: 'SET_CANVAS_SETTINGS'; payload: Partial<CanvasSettings> }
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'ADD_MEDIA_ASSET'; payload: MediaAsset }
  | { type: 'REMOVE_MEDIA_ASSET'; payload: string }
  | { type: 'ADD_TRACK'; payload: { name: string; type: TrackType } }
  | { type: 'REMOVE_TRACK'; payload: string }
  | { type: 'TOGGLE_TRACK_LOCK'; payload: string }
  | { type: 'TOGGLE_TRACK_HIDE'; payload: string }
  | { type: 'TOGGLE_TRACK_MUTE'; payload: string }
  | { type: 'ADD_CLIP'; payload: { clip: TimelineClip; trackId?: string } }
  | { type: 'MOVE_CLIP'; payload: { clipId: string; newStartTime: number; targetTrackId?: string } }
  | { type: 'RESIZE_CLIP'; payload: { clipId: string; newStartTime?: number; newDuration: number; newTrimStart?: number } }
  | { type: 'SPLIT_CLIP'; payload: { clipId: string; splitTime: number } }
  | { type: 'DELETE_CLIP'; payload: string }
  | { type: 'DUPLICATE_CLIP'; payload: string }
  | { type: 'UPDATE_CLIP'; payload: { id: string; updates: Partial<TimelineClip> } }
  | { type: 'REORDER_CLIP_LAYER'; payload: { clipId: string; action: 'front' | 'back' | 'forward' | 'backward' } }
  | { type: 'ADD_KEYFRAME'; payload: { clipId: string; property: Keyframe['property']; value: number } }
  | { type: 'REMOVE_KEYFRAME'; payload: { clipId: string; keyframeId: string } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD_PROJECT'; payload: ProjectState }
  | { type: 'NEW_PROJECT'; payload?: Partial<CanvasSettings> };

export const initialProjectState: ProjectState = {
  id: 'proj-' + Date.now(),
  name: 'Untitled Project',
  canvas: { ...DEFAULT_CANVAS_SETTINGS },
  tracks: [
    {
      id: 'track-v1',
      name: 'Video Track 1',
      type: 'video',
      locked: false,
      hidden: false,
      muted: false,
      clips: [],
    },
    {
      id: 'track-txt1',
      name: 'Text & Titles',
      type: 'text',
      locked: false,
      hidden: false,
      muted: false,
      clips: [],
    },
    {
      id: 'track-a1',
      name: 'Audio Track 1',
      type: 'audio',
      locked: false,
      hidden: false,
      muted: false,
      clips: [],
    },
  ],
  mediaAssets: [],
  playheadTime: 0,
  zoomLevel: 50, // 50px per second default
  selectedClipId: null,
  selectedClipIds: [],
  selectedTrackId: null,
  isPlaying: false,
  volume: 1.0,
  muted: false,
  snapEnabled: true,
  history: {
    past: [],
    future: [],
  },
};

function pushHistory(state: ProjectState): ProjectState {
  const { history, isPlaying, playheadTime, ...rest } = state;
  return {
    ...state,
    history: {
      past: [...history.past.slice(-30), rest],
      future: [],
    },
  };
}

export function editorReducer(state: ProjectState, action: EditorAction): ProjectState {
  switch (action.type) {
    case 'SET_PLAYHEAD':
      return { ...state, playheadTime: Math.max(0, action.payload) };

    case 'SET_IS_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_ZOOM_LEVEL':
      return { ...state, zoomLevel: Math.max(10, Math.min(300, action.payload)) };

    case 'SET_SELECTED_CLIP':
      return {
        ...state,
        selectedClipId: action.payload,
        selectedClipIds: action.payload ? [action.payload] : [],
      };

    case 'TOGGLE_SELECT_CLIP': {
      const clipId = action.payload;
      const exists = state.selectedClipIds.includes(clipId);
      const newSelectedIds = exists
        ? state.selectedClipIds.filter((id) => id !== clipId)
        : [...state.selectedClipIds, clipId];
      return {
        ...state,
        selectedClipId: newSelectedIds.length > 0 ? newSelectedIds[newSelectedIds.length - 1] : null,
        selectedClipIds: newSelectedIds,
      };
    }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedClipId: null,
        selectedClipIds: [],
      };

    case 'SET_SELECTED_TRACK':
      return { ...state, selectedTrackId: action.payload };

    case 'SET_PROJECT_NAME':
      return { ...state, name: action.payload };

    case 'TOGGLE_SNAP':
      return { ...state, snapEnabled: !state.snapEnabled };

    case 'SET_CANVAS_SETTINGS': {
      const nextCanvas = { ...state.canvas, ...action.payload };
      if (action.payload.aspectRatio) {
        if (action.payload.aspectRatio === '16:9') {
          nextCanvas.width = 1920;
          nextCanvas.height = 1080;
        } else if (action.payload.aspectRatio === '9:16') {
          nextCanvas.width = 1080;
          nextCanvas.height = 1920;
        } else if (action.payload.aspectRatio === '1:1') {
          nextCanvas.width = 1080;
          nextCanvas.height = 1080;
        } else if (action.payload.aspectRatio === '4:5') {
          nextCanvas.width = 1080;
          nextCanvas.height = 1350;
        } else if (action.payload.aspectRatio === '4:3') {
          nextCanvas.width = 1440;
          nextCanvas.height = 1080;
        }
      }
      return pushHistory({ ...state, canvas: nextCanvas });
    }

    case 'ADD_MEDIA_ASSET':
      return pushHistory({
        ...state,
        mediaAssets: [action.payload, ...state.mediaAssets.filter((m) => m.id !== action.payload.id)],
      });

    case 'REMOVE_MEDIA_ASSET':
      return pushHistory({
        ...state,
        mediaAssets: state.mediaAssets.filter((m) => m.id !== action.payload),
      });

    case 'ADD_TRACK': {
      const newTrack: Track = {
        id: 'track-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        name: action.payload.name,
        type: action.payload.type,
        locked: false,
        hidden: false,
        muted: false,
        clips: [],
      };
      return pushHistory({ ...state, tracks: [...state.tracks, newTrack] });
    }

    case 'REMOVE_TRACK':
      return pushHistory({
        ...state,
        tracks: state.tracks.filter((t) => t.id !== action.payload),
        selectedTrackId: state.selectedTrackId === action.payload ? null : state.selectedTrackId,
      });

    case 'TOGGLE_TRACK_LOCK':
      return {
        ...state,
        tracks: state.tracks.map((t) => (t.id === action.payload ? { ...t, locked: !t.locked } : t)),
      };

    case 'TOGGLE_TRACK_HIDE':
      return {
        ...state,
        tracks: state.tracks.map((t) => (t.id === action.payload ? { ...t, hidden: !t.hidden } : t)),
      };

    case 'TOGGLE_TRACK_MUTE':
      return {
        ...state,
        tracks: state.tracks.map((t) => (t.id === action.payload ? { ...t, muted: !t.muted } : t)),
      };

    case 'ADD_CLIP': {
      const { clip, trackId } = action.payload;
      let targetTrack = state.tracks.find((t) => t.id === trackId);
      
      if (!targetTrack && state.selectedTrackId) {
        targetTrack = state.tracks.find((t) => t.id === state.selectedTrackId);
      }

      if (!targetTrack) {
        targetTrack = state.tracks.find((t) => t.type === clip.type);
      }

      if (!targetTrack && (clip.type === 'video' || clip.type === 'image')) {
        targetTrack = state.tracks.find((t) => t.type === 'video' || t.type === 'image');
      }

      let tracksToUpdate = state.tracks;

      if (!targetTrack) {
        const typeName = clip.type.charAt(0).toUpperCase() + clip.type.slice(1);
        const newTrack: Track = {
          id: 'track-' + clip.type + '-' + Date.now(),
          name: `${typeName} Track ${state.tracks.length + 1}`,
          type: clip.type === 'image' ? 'video' : (clip.type as TrackType),
          locked: false,
          hidden: false,
          muted: false,
          clips: [],
        };
        targetTrack = newTrack;
        tracksToUpdate = [...state.tracks, newTrack];
      }

      const updatedTracks = tracksToUpdate.map((t) => {
        if (t.id === targetTrack!.id) {
          return {
            ...t,
            clips: [...t.clips, { ...clip, trackId: targetTrack!.id }],
          };
        }
        return t;
      });

      return pushHistory({
        ...state,
        tracks: updatedTracks,
        selectedClipId: clip.id,
        selectedTrackId: targetTrack.id,
      });
    }

    case 'MOVE_CLIP': {
      const { clipId, newStartTime, targetTrackId } = action.payload;
      const validStartTime = Math.max(0, newStartTime);
      
      let sourceTrack: Track | undefined;
      let targetClip: TimelineClip | undefined;

      for (const track of state.tracks) {
        const found = track.clips.find((c) => c.id === clipId);
        if (found) {
          sourceTrack = track;
          targetClip = found;
          break;
        }
      }

      if (!sourceTrack || !targetClip) return state;

      const destinationTrackId = targetTrackId || sourceTrack.id;

      const updatedTracks = state.tracks.map((track) => {
        if (track.id === sourceTrack!.id && track.id === destinationTrackId) {
          return {
            ...track,
            clips: track.clips.map((c) =>
              c.id === clipId ? { ...c, startTime: validStartTime } : c
            ),
          };
        }
        if (track.id === sourceTrack!.id) {
          return {
            ...track,
            clips: track.clips.filter((c) => c.id !== clipId),
          };
        }
        if (track.id === destinationTrackId) {
          return {
            ...track,
            clips: [...track.clips, { ...targetClip!, startTime: validStartTime, trackId: destinationTrackId }],
          };
        }
        return track;
      });

      return pushHistory({ ...state, tracks: updatedTracks });
    }

    case 'RESIZE_CLIP': {
      const { clipId, newStartTime, newDuration, newTrimStart } = action.payload;
      const updatedTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            return {
              ...clip,
              startTime: newStartTime !== undefined ? Math.max(0, newStartTime) : clip.startTime,
              duration: Math.max(0.1, newDuration),
              trimStart: newTrimStart !== undefined ? Math.max(0, newTrimStart) : clip.trimStart,
            };
          }
          return clip;
        }),
      }));
      return pushHistory({ ...state, tracks: updatedTracks });
    }

    case 'SPLIT_CLIP': {
      const { clipId, splitTime } = action.payload;
      let targetClip: TimelineClip | undefined;
      let clipTrack: Track | undefined;

      for (const track of state.tracks) {
        const found = track.clips.find((c) => c.id === clipId);
        if (found) {
          clipTrack = track;
          targetClip = found;
          break;
        }
      }

      if (!targetClip || !clipTrack) return state;

      // Ensure splitTime falls within clip boundaries
      if (splitTime <= targetClip.startTime || splitTime >= targetClip.startTime + targetClip.duration) {
        return state;
      }

      const offsetInClip = splitTime - targetClip.startTime;
      const duration1 = offsetInClip;
      const duration2 = targetClip.duration - offsetInClip;

      const clip1: TimelineClip = {
        ...targetClip,
        duration: duration1,
        trimEnd: targetClip.trimStart + duration1,
      };

      const clip2: TimelineClip = {
        ...targetClip,
        id: 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        startTime: splitTime,
        duration: duration2,
        trimStart: targetClip.trimStart + duration1,
      };

      const updatedTracks = state.tracks.map((track) => {
        if (track.id === clipTrack!.id) {
          const index = track.clips.findIndex((c) => c.id === clipId);
          const newClips = [...track.clips];
          newClips.splice(index, 1, clip1, clip2);
          return { ...track, clips: newClips };
        }
        return track;
      });

      return pushHistory({
        ...state,
        tracks: updatedTracks,
        selectedClipId: clip2.id,
      });
    }

    case 'DELETE_CLIP': {
      const updatedTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((c) => c.id !== action.payload),
      }));
      return pushHistory({
        ...state,
        tracks: updatedTracks,
        selectedClipId: state.selectedClipId === action.payload ? null : state.selectedClipId,
      });
    }

    case 'DUPLICATE_CLIP': {
      let foundClip: TimelineClip | undefined;
      let foundTrack: Track | undefined;

      for (const track of state.tracks) {
        const c = track.clips.find((clip) => clip.id === action.payload);
        if (c) {
          foundClip = c;
          foundTrack = track;
          break;
        }
      }

      if (!foundClip || !foundTrack) return state;

      const dupClip: TimelineClip = {
        ...foundClip,
        id: 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        startTime: foundClip.startTime + foundClip.duration + 0.1,
      };

      const updatedTracks = state.tracks.map((t) => {
        if (t.id === foundTrack!.id) {
          return { ...t, clips: [...t.clips, dupClip] };
        }
        return t;
      });

      return pushHistory({
        ...state,
        tracks: updatedTracks,
        selectedClipId: dupClip.id,
      });
    }

    case 'UPDATE_CLIP': {
      const { id, updates } = action.payload;
      const updatedTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === id) {
            return { ...clip, ...updates } as TimelineClip;
          }
          return clip;
        }),
      }));
      return { ...state, tracks: updatedTracks };
    }

    case 'REORDER_CLIP_LAYER': {
      const { clipId, action: layerAction } = action.payload;
      const updatedTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            let nextLayer = clip.layer;
            if (layerAction === 'front') nextLayer += 10;
            else if (layerAction === 'forward') nextLayer += 1;
            else if (layerAction === 'backward') nextLayer = Math.max(1, nextLayer - 1);
            else if (layerAction === 'back') nextLayer = 1;
            return { ...clip, layer: nextLayer };
          }
          return clip;
        }),
      }));
      return pushHistory({ ...state, tracks: updatedTracks });
    }

    case 'ADD_KEYFRAME': {
      const { clipId, property, value } = action.payload;
      const updatedTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            const relTime = Math.max(0, state.playheadTime - clip.startTime);
            const newKf: Keyframe = {
              id: 'kf-' + Date.now() + '-' + Math.floor(Math.random() * 100),
              time: relTime,
              property,
              value,
            };
            const existingKfs = clip.keyframes || [];
            const filtered = existingKfs.filter((k) => Math.abs(k.time - relTime) > 0.05 || k.property !== property);
            return { ...clip, keyframes: [...filtered, newKf] };
          }
          return clip;
        }),
      }));
      return pushHistory({ ...state, tracks: updatedTracks });
    }

    case 'REMOVE_KEYFRAME': {
      const { clipId, keyframeId } = action.payload;
      const updatedTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId && clip.keyframes) {
            return {
              ...clip,
              keyframes: clip.keyframes.filter((k) => k.id !== keyframeId),
            };
          }
          return clip;
        }),
      }));
      return pushHistory({ ...state, tracks: updatedTracks });
    }

    case 'UNDO': {
      if (state.history.past.length === 0) return state;
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);
      const { history, isPlaying, playheadTime, ...currentRest } = state;

      return {
        ...state,
        ...previous,
        history: {
          past: newPast,
          future: [currentRest, ...state.history.future],
        },
      };
    }

    case 'REDO': {
      if (state.history.future.length === 0) return state;
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);
      const { history, isPlaying, playheadTime, ...currentRest } = state;

      return {
        ...state,
        ...next,
        history: {
          past: [...state.history.past, currentRest],
          future: newFuture,
        },
      };
    }

    case 'LOAD_PROJECT':
      return {
        ...action.payload,
        isPlaying: false,
        history: { past: [], future: [] },
      };

    case 'NEW_PROJECT':
      return {
        ...initialProjectState,
        id: 'proj-' + Date.now(),
        canvas: { ...DEFAULT_CANVAS_SETTINGS, ...action.payload },
      };

    default:
      return state;
  }
}
