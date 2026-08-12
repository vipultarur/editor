import React, { useState } from 'react';
import { useSession } from '../../state/SessionContext';
import type { SoundLibraryItem } from '../../types/matchShort';
import { playSynthSound } from '../../utils/matchShortPresets';

interface SoundLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSound: (soundUrl: string, soundName: string) => void;
  targetCategory?: 'match' | 'nomatch' | 'background' | 'finish';
}

export default function SoundLibraryModal({
  isOpen,
  onClose,
  onSelectSound,
  targetCategory = 'match',
}: SoundLibraryModalProps) {
  const { state, dispatch } = useSession();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'match' | 'nomatch' | 'background' | 'finish'>(targetCategory);

  if (!isOpen) return null;

  const playSoundPreview = (sound: SoundLibraryItem) => {
    setPlayingId(sound.id);
    if (sound.url.startsWith('synth:')) {
      const type = sound.url.replace('synth:', '') as any;
      playSynthSound(type);
      setTimeout(() => setPlayingId(null), 800);
    } else {
      const audio = new Audio(sound.url);
      audio.play().catch((err) => console.warn('Audio play error:', err));
      audio.onended = () => setPlayingId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const newItem: SoundLibraryItem = {
      id: `snd-custom-${Date.now()}`,
      name: uploadName.trim() || file.name.replace(/\.[^/.]+$/, ''),
      url,
      category: uploadCategory,
      isPreset: false,
    };

    dispatch({ type: 'ADD_SOUND_LIBRARY_ITEM', payload: newItem });
    setUploadName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden border border-[var(--color-glass-border)] shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎵</span>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
              Sound & Audio Library
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Upload New Sound Section */}
          <div className="p-4 rounded-xl glass border border-indigo-500/20 bg-indigo-500/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
              ➕ Upload Custom Sound to Library
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Sound Label Name..."
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as any)}
                className="px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-glass-border)] text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="match">Match Sound ✅</option>
                <option value="nomatch">No Match Sound ❌</option>
                <option value="background">Background Music 🎵</option>
                <option value="finish">Victory Sound 🏁</option>
              </select>
              <label className="btn-primary text-xs flex items-center justify-center gap-1.5 cursor-pointer py-2">
                <span>Upload File</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Existing Sound List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
              Available Audio Clips
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {state.soundLibrary.map((sound) => {
                const isSelected = sound.category === targetCategory;
                return (
                  <div
                    key={sound.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => playSoundPreview(sound)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform active:scale-95 ${
                          playingId === sound.id
                            ? 'bg-indigo-500 text-white animate-pulse'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {playingId === sound.id ? '🔊' : '▶️'}
                      </button>
                      <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          {sound.name}
                          {sound.isPreset && (
                            <span className="badge badge-primary text-[0.6rem] py-0.5">
                              Preset Synth
                            </span>
                          )}
                        </div>
                        <div className="text-[0.6875rem] text-[var(--color-text-muted)] capitalize">
                          Category: {sound.category}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onSelectSound(sound.url, sound.name);
                          onClose();
                        }}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Select Sound
                      </button>
                      {!sound.isPreset && (
                        <button
                          onClick={() => dispatch({ type: 'REMOVE_SOUND_LIBRARY_ITEM', payload: sound.id })}
                          className="text-red-400 hover:text-red-300 p-1.5"
                          title="Delete Sound"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs px-5 py-2">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
