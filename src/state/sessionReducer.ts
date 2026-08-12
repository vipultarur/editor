import type { MatchGroup, SoundLibraryItem } from '../types/matchShort';
import { DEFAULT_MATCH_GROUPS, DEFAULT_SOUND_LIBRARY } from '../utils/matchShortPresets';

export interface UploadedVideo {
  file: File;
  blobUrl: string;
  name: string;
  size: number;
  source?: 'local' | 'youtube';
}

export interface ShortClip {
  id: string;
  blobUrl: string;
  aspectRatio: string;
  duration: number;
  thumbnailUrl: string;
  fileName: string;
  speed?: number;
  filterPreset?: string;
  captionText?: string;
  captionPosition?: 'top' | 'center' | 'bottom';
  captionColor?: string;
  captionBg?: string;
  captionAnim?: 'pop' | 'fade' | 'bounce' | 'static';
  trimStart?: number;
  trimEnd?: number;
}

export interface GeneratedVoice {
  id: string;
  voiceName: string;
  voiceLang: string;
  duration: number;
  blobUrl: string | null;
}

export interface MergedVideo {
  id: string;
  blobUrl: string;
  sourceClipId: string;
  sourceVoiceId: string;
}

export type ActiveTab = 'editor' | 'shorts' | 'voice' | 'merge' | 'match-short' | 'downloader';

export interface SessionState {
  uploadedVideo: UploadedVideo | null;
  shortClips: ShortClip[];
  script: string;
  generatedVoices: GeneratedVoice[];
  mergedVideos: MergedVideo[];
  matchGroups: MatchGroup[];
  soundLibrary: SoundLibraryItem[];
  activeTab: ActiveTab;
  pendingEditorClip: { blobUrl: string; fileName: string; duration: number; aspectRatio: string } | null;
  ffmpegLoaded: boolean;
  ffmpegProgress: number;
  isProcessing: boolean;
  processingMessage: string;
}

export type SessionAction =
  | { type: 'SET_VIDEO'; payload: UploadedVideo }
  | { type: 'CLEAR_VIDEO' }
  | { type: 'ADD_CLIP'; payload: ShortClip }
  | { type: 'ADD_CLIPS'; payload: ShortClip[] }
  | { type: 'REMOVE_CLIP'; payload: string }
  | { type: 'UPDATE_CLIP'; payload: { id: string; updates: Partial<ShortClip> } }
  | { type: 'CLEAR_CLIPS' }
  | { type: 'SET_SCRIPT'; payload: string }
  | { type: 'ADD_VOICE'; payload: GeneratedVoice }
  | { type: 'REMOVE_VOICE'; payload: string }
  | { type: 'ADD_MERGED'; payload: MergedVideo }
  | { type: 'REMOVE_MERGED'; payload: string }
  | { type: 'ADD_MATCH_GROUP'; payload: MatchGroup }
  | { type: 'UPDATE_MATCH_GROUP'; payload: { id: string; updates: Partial<MatchGroup> } }
  | { type: 'DELETE_MATCH_GROUP'; payload: string }
  | { type: 'ADD_SOUND_LIBRARY_ITEM'; payload: SoundLibraryItem }
  | { type: 'REMOVE_SOUND_LIBRARY_ITEM'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_TAB'; payload: ActiveTab }
  | { type: 'OPEN_IN_PRO_EDITOR'; payload: { blobUrl: string; fileName: string; duration: number; aspectRatio: string } }
  | { type: 'CLEAR_PENDING_EDITOR_CLIP' }
  | { type: 'SET_FFMPEG_LOADED'; payload: boolean }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_PROCESSING'; payload: { isProcessing: boolean; message?: string } };

export const initialState: SessionState = {
  uploadedVideo: null,
  shortClips: [],
  script: '',
  generatedVoices: [],
  mergedVideos: [],
  matchGroups: DEFAULT_MATCH_GROUPS,
  soundLibrary: DEFAULT_SOUND_LIBRARY,
  activeTab: 'match-short',
  pendingEditorClip: null,
  ffmpegLoaded: false,
  ffmpegProgress: 0,
  isProcessing: false,
  processingMessage: '',
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_VIDEO':
      return { ...state, uploadedVideo: action.payload };

    case 'CLEAR_VIDEO':
      return { ...state, uploadedVideo: null };

    case 'ADD_CLIP':
      return { ...state, shortClips: [...state.shortClips, action.payload] };

    case 'ADD_CLIPS':
      return { ...state, shortClips: [...state.shortClips, ...action.payload] };

    case 'REMOVE_CLIP':
      return {
        ...state,
        shortClips: state.shortClips.filter((c) => c.id !== action.payload),
      };

    case 'UPDATE_CLIP':
      return {
        ...state,
        shortClips: state.shortClips.map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        ),
      };

    case 'CLEAR_CLIPS':
      return {
        ...state,
        shortClips: [],
      };

    case 'SET_SCRIPT':
      return { ...state, script: action.payload };

    case 'ADD_VOICE':
      return { ...state, generatedVoices: [...state.generatedVoices, action.payload] };

    case 'REMOVE_VOICE':
      return {
        ...state,
        generatedVoices: state.generatedVoices.filter((v) => v.id !== action.payload),
      };

    case 'ADD_MERGED':
      return { ...state, mergedVideos: [...state.mergedVideos, action.payload] };

    case 'REMOVE_MERGED':
      return {
        ...state,
        mergedVideos: state.mergedVideos.filter((m) => m.id !== action.payload),
      };

    case 'ADD_MATCH_GROUP':
      return { ...state, matchGroups: [...state.matchGroups, action.payload] };

    case 'UPDATE_MATCH_GROUP':
      return {
        ...state,
        matchGroups: state.matchGroups.map((g) =>
          g.id === action.payload.id ? { ...g, ...action.payload.updates } : g
        ),
      };

    case 'DELETE_MATCH_GROUP':
      return {
        ...state,
        matchGroups: state.matchGroups.filter((g) => g.id !== action.payload),
      };

    case 'ADD_SOUND_LIBRARY_ITEM':
      return { ...state, soundLibrary: [...state.soundLibrary, action.payload] };

    case 'REMOVE_SOUND_LIBRARY_ITEM':
      return {
        ...state,
        soundLibrary: state.soundLibrary.filter((s) => s.id !== action.payload),
      };

    case 'CLEAR_ALL':
      return { ...initialState, ffmpegLoaded: state.ffmpegLoaded, activeTab: state.activeTab };

    case 'SET_TAB':
      return { ...state, activeTab: action.payload };

    case 'OPEN_IN_PRO_EDITOR':
      return {
        ...state,
        pendingEditorClip: action.payload,
        activeTab: 'editor',
      };

    case 'CLEAR_PENDING_EDITOR_CLIP':
      return {
        ...state,
        pendingEditorClip: null,
      };

    case 'SET_FFMPEG_LOADED':
      return { ...state, ffmpegLoaded: action.payload };

    case 'SET_PROGRESS':
      return { ...state, ffmpegProgress: action.payload };

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload.isProcessing,
        processingMessage: action.payload.message ?? '',
        ffmpegProgress: action.payload.isProcessing ? state.ffmpegProgress : 0,
      };

    default:
      return state;
  }
}

