import React, { useState } from 'react';
import type { MatchGroup, MatchItem } from '../../types/matchShort';
import {
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_AUDIO,
  DEFAULT_CHECK_AUDIO,
  DEFAULT_CHECK_PNG,
  DEFAULT_CROSS_AUDIO,
  DEFAULT_CROSS_PNG,
} from '../../utils/matchShortPresets';
import SoundLibraryModal from './SoundLibraryModal';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (group: MatchGroup) => void;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [durationPreset, setDurationPreset] = useState<10 | 15 | 20 | 'custom'>(10);
  const [customDuration, setCustomDuration] = useState<number>(12);
  const [bgType, setBgType] = useState<'preset' | 'custom'>('preset');
  const [bgValue, setBgValue] = useState<string>('sky-grass');

  // The 4 Global Group Images (PNG, GIF, JPG, WEBP)
  const [matchImageUrl, setMatchImageUrl] = useState<string>(
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="30" fill="%2322c55e"/><text x="100" y="110" fill="white" font-size="40" text-anchor="middle" font-family="sans-serif">Match</text></svg>'
  );
  const [matchCheckImageUrl, setMatchCheckImageUrl] = useState<string>(DEFAULT_CHECK_PNG);
  const [noMatchImageUrl, setNoMatchImageUrl] = useState<string>(
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="30" fill="%23ef4444"/><text x="100" y="110" fill="white" font-size="34" text-anchor="middle" font-family="sans-serif">No Match</text></svg>'
  );
  const [crossImageUrl, setCrossImageUrl] = useState<string>(DEFAULT_CROSS_PNG);

  // Global Sounds initialized with default assets
  const [bgSoundUrl, setBgSoundUrl] = useState<string | undefined>(DEFAULT_BACKGROUND_AUDIO);
  const [matchSoundUrl, setMatchSoundUrl] = useState<string | undefined>(DEFAULT_CHECK_AUDIO);
  const [noMatchSoundUrl, setNoMatchSoundUrl] = useState<string | undefined>(DEFAULT_CROSS_AUDIO);
  const [victorySoundUrl, setVictorySoundUrl] = useState<string | undefined>(undefined);

  const [activeSoundPicker, setActiveSoundPicker] = useState<
    'bg' | 'match' | 'nomatch' | 'victory' | null
  >(null);

  const [numRounds, setNumRounds] = useState<3 | 4>(3);

  // Rounds configuration (Match vs No Match)
  const [items, setItems] = useState<MatchItem[]>([
    { id: 'item-1', name: 'Round 1 (Bottom)', isMatch: true, emoji: '😃' },
    { id: 'item-2', name: 'Round 2 (Middle)', isMatch: true, emoji: '🤩' },
    { id: 'item-3', name: 'Round 3 (Top)', isMatch: false, emoji: '🦁' },
  ]);

  const handleNumRoundsChange = (count: 3 | 4) => {
    setNumRounds(count);
    if (count === 4) {
      setItems([
        { id: 'item-1', name: 'Round 1 (Bottom)', isMatch: true, emoji: '😃' },
        { id: 'item-2', name: 'Round 2 (Lower Mid)', isMatch: true, emoji: '🤩' },
        { id: 'item-3', name: 'Round 3 (Upper Mid)', isMatch: true, emoji: '🔥' },
        { id: 'item-4', name: 'Round 4 (Top)', isMatch: false, emoji: '🦁' },
      ]);
    } else {
      setItems([
        { id: 'item-1', name: 'Round 1 (Bottom)', isMatch: true, emoji: '😃' },
        { id: 'item-2', name: 'Round 2 (Middle)', isMatch: true, emoji: '🤩' },
        { id: 'item-3', name: 'Round 3 (Top)', isMatch: false, emoji: '🦁' },
      ]);
    }
  };

  if (!isOpen) return null;

  const handleGlobalImageUpload = (setter: (url: string) => void, file: File) => {
    const url = URL.createObjectURL(file);
    setter(url);
  };

  const handleCustomBgUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setBgType('custom');
    setBgValue(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDuration = durationPreset === 'custom' ? Number(customDuration) || 12 : durationPreset;

    const formattedItems = items.map((item) => ({
      ...item,
      targetImageUrl: item.targetImageUrl || (item.isMatch ? matchImageUrl : matchImageUrl),
      revealImageUrl: item.revealImageUrl || (item.isMatch ? matchImageUrl : noMatchImageUrl),
    })) as [MatchItem, MatchItem, MatchItem];

    const newGroup: MatchGroup = {
      id: `group-${Date.now()}`,
      name: groupName.trim() || 'New Reveal Short Group',
      backgroundType: bgType,
      backgroundValue: bgValue,
      matchImageUrl,
      matchCheckImageUrl,
      noMatchImageUrl,
      crossImageUrl,
      bgSoundUrl,
      matchSoundUrl,
      noMatchSoundUrl,
      victorySoundUrl,
      videoDuration: finalDuration,
      isGenerated: false,
      items: formattedItems,
    };

    onCreateGroup(newGroup);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-3xl rounded-3xl overflow-hidden border border-[var(--color-glass-border)] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">➕</span>
            <div>
              <h3 className="text-lg font-extrabold text-white">Create New Image Group</h3>
              <p className="text-[0.6875rem] text-[var(--color-text-muted)]">
                Upload 4 global assets (Match, Check, No-Match, Cross PNG/GIF) & setup duration and sounds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Group Title & Video Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                Group Title Name *
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. KitKat Chocolate Match"
                className="w-full text-sm font-bold text-white bg-black/20 border border-[var(--color-glass-border)] rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                Video Duration *
              </label>
              <div className="flex items-center gap-2">
                {([10, 15, 20] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurationPreset(d)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      durationPreset === d
                        ? 'bg-indigo-500 text-white shadow-lg'
                        : 'glass text-[var(--color-text-muted)] hover:text-white'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDurationPreset('custom')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    durationPreset === 'custom'
                      ? 'bg-indigo-500 text-white shadow-lg'
                      : 'glass text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  Custom
                </button>
              </div>

              {durationPreset === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Number(e.target.value))}
                    className="w-24 text-xs font-bold text-white bg-black/20 border border-[var(--color-glass-border)] rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-xs text-[var(--color-text-muted)]">seconds</span>
                </div>
              )}
            </div>
          </div>

          {/* Number of Rounds Selector (3 vs 4 Rounds) */}
          <div className="p-4 rounded-2xl glass border border-white/10 space-y-2 bg-black/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                Number of Rounds / Stacked Items
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNumRoundsChange(3)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    numRounds === 3
                      ? 'bg-indigo-500 text-white shadow-lg'
                      : 'glass text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  3 Rounds (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => handleNumRoundsChange(4)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    numRounds === 4
                      ? 'bg-indigo-500 text-white shadow-lg'
                      : 'glass text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  4 Rounds (Extended)
                </button>
              </div>
            </div>
          </div>

          {/* THE 4 GLOBAL GROUP IMAGES (PNG, GIF, JPG, WEBP) */}
          <div className="p-5 rounded-2xl glass border border-indigo-500/30 bg-indigo-500/10 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                <span>🖼️ Upload 4 Global Assets (PNG, GIF, JPG)</span>
              </h4>
              <span className="text-[0.65rem] text-[var(--color-text-muted)] font-semibold">
                Used for all 3 reveal rounds
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* 1. Match Product Image */}
              <div className="p-3 rounded-xl glass border border-white/10 text-center space-y-2 bg-black/30">
                <div className="text-[0.65rem] font-bold text-emerald-400 uppercase">
                  1. Match Product Image
                </div>
                <div className="w-16 h-16 rounded-lg bg-white/10 border border-white/20 p-1 mx-auto flex items-center justify-center overflow-hidden">
                  <img src={matchImageUrl} alt="Match Product" className="max-h-full max-w-full object-contain" />
                </div>
                <label className="btn-secondary text-[0.65rem] py-1 px-2 flex items-center justify-center cursor-pointer font-semibold">
                  <span>Upload (GIF/PNG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleGlobalImageUpload(setMatchImageUrl, e.target.files[0])
                    }
                    className="hidden"
                  />
                </label>
              </div>

              {/* 2. Match Check Image */}
              <div className="p-3 rounded-xl glass border border-white/10 text-center space-y-2 bg-black/30">
                <div className="text-[0.65rem] font-bold text-emerald-400 uppercase">
                  2. Match Check ✅ Sticker/GIF
                </div>
                <div className="w-16 h-16 rounded-lg bg-white/10 border border-white/20 p-1 mx-auto flex items-center justify-center overflow-hidden">
                  <img src={matchCheckImageUrl} alt="Match Check" className="max-h-full max-w-full object-contain" />
                </div>
                <label className="btn-secondary text-[0.65rem] py-1 px-2 flex items-center justify-center cursor-pointer font-semibold">
                  <span>Upload (GIF/PNG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleGlobalImageUpload(setMatchCheckImageUrl, e.target.files[0])
                    }
                    className="hidden"
                  />
                </label>
              </div>

              {/* 3. Not Match Image */}
              <div className="p-3 rounded-xl glass border border-white/10 text-center space-y-2 bg-black/30">
                <div className="text-[0.65rem] font-bold text-rose-400 uppercase">
                  3. Not Match Image / Character
                </div>
                <div className="w-16 h-16 rounded-lg bg-white/10 border border-white/20 p-1 mx-auto flex items-center justify-center overflow-hidden">
                  <img src={noMatchImageUrl} alt="No Match Item" className="max-h-full max-w-full object-contain" />
                </div>
                <label className="btn-secondary text-[0.65rem] py-1 px-2 flex items-center justify-center cursor-pointer font-semibold">
                  <span>Upload (GIF/PNG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleGlobalImageUpload(setNoMatchImageUrl, e.target.files[0])
                    }
                    className="hidden"
                  />
                </label>
              </div>

              {/* 4. Cross Image */}
              <div className="p-3 rounded-xl glass border border-white/10 text-center space-y-2 bg-black/30">
                <div className="text-[0.65rem] font-bold text-rose-400 uppercase">
                  4. Cross ❌ Sticker / GIF
                </div>
                <div className="w-16 h-16 rounded-lg bg-white/10 border border-white/20 p-1 mx-auto flex items-center justify-center overflow-hidden">
                  <img src={crossImageUrl} alt="Cross Item" className="max-h-full max-w-full object-contain" />
                </div>
                <label className="btn-secondary text-[0.65rem] py-1 px-2 flex items-center justify-center cursor-pointer font-semibold">
                  <span>Upload (GIF/PNG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handleGlobalImageUpload(setCrossImageUrl, e.target.files[0])
                    }
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Background Scene Picker */}
          <div className="p-4 rounded-2xl glass border border-white/10 space-y-3 bg-black/20">
            <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
              Background Scene Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BACKGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setBgType('preset');
                    setBgValue(preset.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    bgType === 'preset' && bgValue === preset.id
                      ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-white/10'
                      : 'border-[var(--color-glass-border)] hover:border-white/30'
                  }`}
                >
                  <div className="text-xs font-bold text-white">{preset.name}</div>
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">
                Custom Background Image (Optional):
              </span>
              <label className="btn-secondary text-xs px-3 py-1.5 rounded-lg cursor-pointer">
                <span>📷 Upload Custom BG</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleCustomBgUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Group Audio & Sounds Configuration */}
          <div className="p-4 rounded-2xl glass border border-indigo-500/30 bg-indigo-500/5 space-y-3">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              🎵 Group Sounds & Audio Setup
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Match Sound */}
              <div className="p-3 rounded-xl glass border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-400">Match Sound ✅</div>
                  <div className="text-[0.65rem] text-[var(--color-text-muted)]">
                    {matchSoundUrl ? 'Custom Sound Selected' : 'Default Chime'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSoundPicker('match')}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  Select Sound
                </button>
              </div>

              {/* No Match Sound */}
              <div className="p-3 rounded-xl glass border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-400">No Match Sound ❌</div>
                  <div className="text-[0.65rem] text-[var(--color-text-muted)]">
                    {noMatchSoundUrl ? 'Custom Sound Selected' : 'Default Buzz'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSoundPicker('nomatch')}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  Select Sound
                </button>
              </div>

              {/* Background Music */}
              <div className="p-3 rounded-xl glass border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-indigo-300">Background Music 🎵</div>
                  <div className="text-[0.65rem] text-[var(--color-text-muted)]">
                    {bgSoundUrl ? 'Custom Music Selected' : 'Optional Music'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSoundPicker('bg')}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  Select Music
                </button>
              </div>

              {/* Victory Sound */}
              <div className="p-3 rounded-xl glass border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-400">Victory Fanfare 🏁</div>
                  <div className="text-[0.65rem] text-[var(--color-text-muted)]">
                    {victorySoundUrl ? 'Custom Fanfare Selected' : 'Default Fanfare'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSoundPicker('victory')}
                  className="btn-secondary text-xs py-1 px-2.5"
                >
                  Select Sound
                </button>
              </div>
            </div>
          </div>

          {/* The 3 Reveal Rounds match/no-match toggle list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              📦 Setup 3 Reveal Rounds (Toggle Match vs No Match)
            </h4>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl glass border border-white/10 flex items-center justify-between bg-black/20"
                >
                  <span className="text-xs font-bold text-indigo-300">
                    {idx === 0 ? 'Round 1 (Bottom Slot)' : idx === 1 ? 'Round 2 (Middle Slot)' : 'Round 3 (Top Slot)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...items] as [MatchItem, MatchItem, MatchItem];
                      updated[idx] = { ...updated[idx], isMatch: !item.isMatch };
                      setItems(updated);
                    }}
                    className={`px-4 py-1.5 rounded-full text-xs font-extrabold shadow-md ${
                      item.isMatch
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                        : 'bg-rose-500 text-white shadow-rose-500/30'
                    }`}
                  >
                    {item.isMatch ? '✅ MATCH (Uses Match & Check Image)' : '❌ NO MATCH (Uses No-Match & Cross Image)'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-glass-border)] flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-xs px-5 py-2">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs px-6 py-2.5 rounded-xl font-bold shadow-lg">
              ✨ Create Image Group
            </button>
          </div>
        </form>
      </div>

      {/* Sound Selection Sub-modal */}
      {activeSoundPicker && (
        <SoundLibraryModal
          isOpen={!!activeSoundPicker}
          onClose={() => setActiveSoundPicker(null)}
          targetCategory={
            activeSoundPicker === 'match'
              ? 'match'
              : activeSoundPicker === 'nomatch'
              ? 'nomatch'
              : activeSoundPicker === 'victory'
              ? 'finish'
              : 'background'
          }
          onSelectSound={(soundUrl) => {
            if (activeSoundPicker === 'bg') setBgSoundUrl(soundUrl);
            else if (activeSoundPicker === 'match') setMatchSoundUrl(soundUrl);
            else if (activeSoundPicker === 'nomatch') setNoMatchSoundUrl(soundUrl);
            else if (activeSoundPicker === 'victory') setVictorySoundUrl(soundUrl);
          }}
        />
      )}
    </div>
  );
}
