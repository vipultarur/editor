import { createContext, useContext, useReducer, useCallback, type ReactNode, type Dispatch } from 'react';
import { sessionReducer, initialState, type SessionState, type SessionAction } from './sessionReducer';

interface SessionContextValue {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
  clearAll: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  const clearAll = useCallback(() => {
    // Revoke all Blob URLs before clearing state
    if (state.uploadedVideo?.blobUrl) {
      URL.revokeObjectURL(state.uploadedVideo.blobUrl);
    }
    for (const clip of state.shortClips) {
      URL.revokeObjectURL(clip.blobUrl);
      if (clip.thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(clip.thumbnailUrl);
      }
    }
    for (const voice of state.generatedVoices) {
      if (voice.blobUrl) URL.revokeObjectURL(voice.blobUrl);
    }
    for (const merged of state.mergedVideos) {
      URL.revokeObjectURL(merged.blobUrl);
    }
    dispatch({ type: 'CLEAR_ALL' });
  }, [state]);

  return (
    <SessionContext.Provider value={{ state, dispatch, clearAll }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
