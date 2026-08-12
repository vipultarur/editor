import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type Dispatch,
} from 'react';
import { editorReducer, initialProjectState, type EditorAction } from './editorReducer';
import { useSession } from './SessionContext';
import type { ProjectState, TimelineClip, VideoMediaClip, MediaAsset, AspectRatio } from '../types/editor';
import { saveProjectToDB } from '../utils/projectStorage';

interface EditorContextValue {
  project: ProjectState;
  dispatch: Dispatch<EditorAction>;
  copiedClip: TimelineClip | null;
  setCopiedClip: (clip: TimelineClip | null) => void;
  activeSidebarTab: string;
  setActiveSidebarTab: (tab: string) => void;
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  showShortcutsModal: boolean;
  setShowShortcutsModal: (show: boolean) => void;
  showProjectSettingsModal: boolean;
  setShowProjectSettingsModal: (show: boolean) => void;
  getTotalDuration: () => number;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const { state: sessionState, dispatch: sessionDispatch } = useSession();
  const [project, dispatch] = useReducer(editorReducer, initialProjectState);
  const [copiedClip, setCopiedClip] = useState<TimelineClip | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>('media');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showProjectSettingsModal, setShowProjectSettingsModal] = useState<boolean>(false);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Auto-load pending video clip from session into Pro Video Editor
  useEffect(() => {
    if (sessionState.pendingEditorClip) {
      const pending = sessionState.pendingEditorClip;
      const mediaId = 'media-' + Date.now();
      const clipId = 'clip-' + Date.now();

      let aspect: AspectRatio = '16:9';
      let cWidth = 1920;
      let cHeight = 1080;

      if (pending.aspectRatio === '9:16') {
        aspect = '9:16';
        cWidth = 1080;
        cHeight = 1920;
      } else if (pending.aspectRatio === '1:1') {
        aspect = '1:1';
        cWidth = 1080;
        cHeight = 1080;
      } else if (pending.aspectRatio === '4:5') {
        aspect = '4:5';
        cWidth = 1080;
        cHeight = 1350;
      } else if (pending.aspectRatio === '4:3') {
        aspect = '4:3';
        cWidth = 1440;
        cHeight = 1080;
      }

      const newMediaAsset: MediaAsset = {
        id: mediaId,
        name: pending.fileName,
        type: 'video',
        blobUrl: pending.blobUrl,
        size: 0,
        duration: pending.duration,
        createdAt: Date.now(),
      };

      const videoClip: VideoMediaClip = {
        id: clipId,
        trackId: 'track-v1',
        type: 'video',
        name: pending.fileName,
        startTime: 0,
        duration: pending.duration,
        trimStart: 0,
        trimEnd: pending.duration,
        layer: 1,
        mediaId,
        blobUrl: pending.blobUrl,
        sourceDuration: pending.duration,
        originalWidth: cWidth,
        originalHeight: cHeight,
        x: 0,
        y: 0,
        width: cWidth,
        height: cHeight,
        rotation: 0,
        scale: 1,
        opacity: 1,
        flipH: false,
        flipV: false,
        filters: { preset: 'normal', brightness: 100, contrast: 100, saturation: 100, exposure: 0, temperature: 0, tint: 0, blur: 0, opacity: 100 },
        volume: 1,
        muted: false,
        fadeIn: 0,
        fadeOut: 0,
      };

      const newProject: ProjectState = {
        ...initialProjectState,
        id: 'proj-' + Date.now(),
        name: `Editing ${pending.fileName}`,
        canvas: {
          ...initialProjectState.canvas,
          width: cWidth,
          height: cHeight,
          aspectRatio: aspect,
        },
        mediaAssets: [newMediaAsset],
        tracks: [
          {
            id: 'track-v1',
            name: 'Video Track 1',
            type: 'video',
            locked: false,
            hidden: false,
            muted: false,
            clips: [videoClip],
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
      };

      dispatch({ type: 'LOAD_PROJECT', payload: newProject });
      sessionDispatch({ type: 'CLEAR_PENDING_EDITOR_CLIP' });
    }
  }, [sessionState.pendingEditorClip, sessionDispatch]);

  // Calculate total timeline duration based on clips
  const getTotalDuration = useCallback((): number => {
    let maxTime = 10; // minimum default 10 seconds
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxTime) {
          maxTime = clipEnd;
        }
      }
    }
    return Math.ceil(maxTime);
  }, [project.tracks]);

  // Keep playheadTime ref up to date for playback loop without re-triggering effect
  const playheadTimeRef = useRef(project.playheadTime);
  useEffect(() => {
    playheadTimeRef.current = project.playheadTime;
  }, [project.playheadTime]);

  // Playback timer tick loop
  useEffect(() => {
    if (!project.isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const tick = () => {
      const now = performance.now();
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const totalDur = getTotalDuration();
      const currentPlayhead = playheadTimeRef.current;

      if (currentPlayhead >= totalDur) {
        dispatch({ type: 'SET_IS_PLAYING', payload: false });
        dispatch({ type: 'SET_PLAYHEAD', payload: totalDur });
      } else {
        const nextPlayhead = currentPlayhead + deltaSec;
        if (nextPlayhead >= totalDur) {
          dispatch({ type: 'SET_IS_PLAYING', payload: false });
          dispatch({ type: 'SET_PLAYHEAD', payload: totalDur });
        } else {
          dispatch({ type: 'SET_PLAYHEAD', payload: nextPlayhead });
          animFrameRef.current = requestAnimationFrame(tick);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [project.isPlaying, getTotalDuration]);

  // Autosave project metadata to IndexedDB
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProjectToDB(project);
    }, 3000);
    return () => clearTimeout(timer);
  }, [project]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if user is editing a text input / textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      // Space = Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        if (!project.isPlaying && project.playheadTime >= getTotalDuration()) {
          dispatch({ type: 'SET_PLAYHEAD', payload: 0 });
        }
        dispatch({ type: 'SET_IS_PLAYING', payload: !project.isPlaying });
      }
      // S = Split selected clip at playhead
      else if (e.code === 'KeyS' && !ctrlOrCmd) {
        e.preventDefault();
        if (project.selectedClipId) {
          dispatch({
            type: 'SPLIT_CLIP',
            payload: { clipId: project.selectedClipId, splitTime: project.playheadTime },
          });
        }
      }
      // Delete / Backspace = Delete selected clip
      else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (project.selectedClipId) {
          e.preventDefault();
          dispatch({ type: 'DELETE_CLIP', payload: project.selectedClipId });
        }
      }
      // Ctrl+Z = Undo
      else if (ctrlOrCmd && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      // Ctrl+Y or Ctrl+Shift+Z = Redo
      else if (ctrlOrCmd && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
      // Ctrl+C = Copy clip
      else if (ctrlOrCmd && e.code === 'KeyC') {
        if (project.selectedClipId) {
          e.preventDefault();
          for (const track of project.tracks) {
            const found = track.clips.find((c) => c.id === project.selectedClipId);
            if (found) {
              setCopiedClip(found);
              break;
            }
          }
        }
      }
      // Ctrl+V = Paste clip
      else if (ctrlOrCmd && e.code === 'KeyV') {
        if (copiedClip) {
          e.preventDefault();
          const pastedClip: TimelineClip = {
            ...copiedClip,
            id: 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            startTime: project.playheadTime,
          };
          dispatch({ type: 'ADD_CLIP', payload: { clip: pastedClip } });
        }
      }
      // Ctrl+D = Duplicate clip
      else if (ctrlOrCmd && e.code === 'KeyD') {
        if (project.selectedClipId) {
          e.preventDefault();
          dispatch({ type: 'DUPLICATE_CLIP', payload: project.selectedClipId });
        }
      }
      // Arrow Left = Step back 1 frame (based on project FPS)
      else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const fps = project.canvas?.fps || 30;
        const frameTime = 1 / fps;
        const step = e.shiftKey ? 10 * frameTime : frameTime;
        dispatch({
          type: 'SET_PLAYHEAD',
          payload: Math.max(0, project.playheadTime - step),
        });
      }
      // Arrow Right = Step forward 1 frame (based on project FPS)
      else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const fps = project.canvas?.fps || 30;
        const frameTime = 1 / fps;
        const step = e.shiftKey ? 10 * frameTime : frameTime;
        dispatch({
          type: 'SET_PLAYHEAD',
          payload: Math.min(getTotalDuration(), project.playheadTime + step),
        });
      }
      // Home = Start of timeline
      else if (e.code === 'Home') {
        e.preventDefault();
        dispatch({ type: 'SET_PLAYHEAD', payload: 0 });
      }
      // End = End of timeline
      else if (e.code === 'End') {
        e.preventDefault();
        dispatch({ type: 'SET_PLAYHEAD', payload: getTotalDuration() });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, copiedClip, getTotalDuration]);

  return (
    <EditorContext.Provider
      value={{
        project,
        dispatch,
        copiedClip,
        setCopiedClip,
        activeSidebarTab,
        setActiveSidebarTab,
        showExportModal,
        setShowExportModal,
        showShortcutsModal,
        setShowShortcutsModal,
        showProjectSettingsModal,
        setShowProjectSettingsModal,
        getTotalDuration,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return ctx;
}
