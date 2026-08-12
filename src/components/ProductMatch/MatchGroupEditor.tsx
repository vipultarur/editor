import React, { useState } from 'react';
import type { MatchGroup, MatchItem } from '../../types/matchShort';
import { BACKGROUND_PRESETS } from '../../utils/matchShortPresets';
import SoundLibraryModal from './SoundLibraryModal';
import ImageUploadSplitModal from './ImageUploadSplitModal';

interface MatchGroupEditorProps {
  group: MatchGroup;
  onUpdateGroup: (updates: Partial<MatchGroup>) => void;
}

export default function MatchGroupEditor({ group, onUpdateGroup }: MatchGroupEditorProps) {
  const [activeSoundSlot, setActiveSoundSlot] = useState<{
    type: 'item' | 'background';
    itemIndex?: number;
    category?: 'match' | 'nomatch' | 'background' | 'finish';
  } | null>(null);

  const [activeSplitModal, setActiveSplitModal] = useState<{
    roundIndex: number;
    roundName: string;
  } | null>(null);

  const handleItemChange = (index: number, updates: Partial<MatchItem>) => {
    const newItems = [...group.items] as [MatchItem, MatchItem, MatchItem];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdateGroup({ items: newItems });
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: 'targetImageUrl' | 'revealImageUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    handleItemChange(index, { [field]: imageUrl });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Group Name & Background Scene Selector */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-[var(--color-glass-border)] space-y-4">
        <div>
          <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
            Group Title Name
          </label>
          <input
            type="text"
            value={group.name}
            onChange={(e) => onUpdateGroup({ name: e.target.value })}
            className="w-full text-lg font-bold text-white bg-black/20 border border-[var(--color-glass-border)] rounded-xl px-4 py-2 focus:border-indigo-500 focus:outline-none"
            placeholder="e.g. KitKat Chocolate Match"
          />
        </div>

        {/* Scene Background Picker */}
        <div>
          <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-2">
            Choose Background Scene
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {BACKGROUND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() =>
                  onUpdateGroup({
                    backgroundType: 'preset',
                    backgroundValue: preset.id,
                  })
                }
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  group.backgroundType === 'preset' && group.backgroundValue === preset.id
                    ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-white/10'
                    : 'border-[var(--color-glass-border)] hover:border-white/30'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white">{preset.name}</div>
                </div>
                {group.backgroundType === 'preset' && group.backgroundValue === preset.id && (
                  <span className="text-xs">✅</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Video Duration Settings */}
        <div className="pt-3 border-t border-[var(--color-glass-border)] space-y-2">
          <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
            ⏱️ Video Duration (Seconds)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {[10, 15, 20].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onUpdateGroup({ videoDuration: sec })}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  group.videoDuration === sec
                    ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-lg ring-2 ring-indigo-500/30'
                    : 'border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-white hover:bg-white/5'
                }`}
              >
                {sec} Seconds
              </button>
            ))}

            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-xl border border-[var(--color-glass-border)]">
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">Custom:</span>
              <input
                type="number"
                min="3"
                max="120"
                step="1"
                value={group.videoDuration || 10}
                onChange={(e) => {
                  const val = Math.max(3, Math.min(120, parseInt(e.target.value) || 10));
                  onUpdateGroup({ videoDuration: val });
                }}
                className="w-16 bg-transparent text-xs font-mono font-bold text-white text-center focus:outline-none"
              />
              <span className="text-xs text-[var(--color-text-muted)] font-bold">sec</span>
            </div>
          </div>
          <p className="text-[0.6875rem] text-[var(--color-text-muted)]">
            Total length: <strong className="text-indigo-300">{group.videoDuration || 10}s</strong> • Each round plays for ~
            <strong className="text-indigo-300">
              {(((group.videoDuration || 10) / (group.items.length || 3))).toFixed(1)}s
            </strong>
          </p>
        </div>

        {/* Optional Custom Background Music */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-glass-border)]">
          <div className="text-xs text-[var(--color-text-muted)] font-medium">
            Continuous Background Music Track:
          </div>
          <button
            onClick={() => setActiveSoundSlot({ type: 'background', category: 'background' })}
            className="btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-2"
          >
            <span>🎵 {group.bgSoundUrl ? 'Background Music Set' : 'Select Background Music'}</span>
          </button>
        </div>
      </div>

      {/* 4 Global Group Images (GIF, PNG, JPG) */}
      <div className="glass-panel p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            <span>🖼️ 4 Global Group Assets (GIF, PNG, JPG)</span>
          </h3>
          <span className="text-[0.65rem] text-[var(--color-text-muted)] font-semibold">
            Applied to all 3 reveal rounds
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Match Product Image */}
          <div className="p-3 rounded-xl glass border border-white/10 text-center space-y-2 bg-black/30">
            <div className="text-[0.65rem] font-bold text-emerald-400 uppercase">
              1. Match Product Image
            </div>
            <div className="w-16 h-16 rounded-lg bg-white/10 border border-white/20 p-1 mx-auto flex items-center justify-center overflow-hidden">
              <img src={group.matchImageUrl} alt="Match Product" className="max-h-full max-w-full object-contain" />
            </div>
            <label className="btn-secondary text-[0.65rem] py-1 px-2 flex items-center justify-center cursor-pointer font-semibold">
              <span>Change (GIF/PNG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpdateGroup({ matchImageUrl: URL.createObjectURL(file) });
                }}
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
              <img src={group.matchCheckImageUrl} alt="Match Check" className="max-h-full max-w-full object-contain" />
            </div>
            <label className="btn-secondary text-[0.65rem] py-1 px-2 flex items-center justify-center cursor-pointer font-semibold">
              <span>Change (GIF/PNG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpdateGroup({ matchCheckImageUrl: URL.createObjectURL(file) });
                }}
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
              <img src={group.noMatchImageUrl} alt="No Match Item" className="max-h-full max-w-full object-contain" />
            </div>
            <label className="btn-secondary text-[0.65rem] py-1 px-2 flex items-center justify-center cursor-pointer font-semibold">
              <span>Change (GIF/PNG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpdateGroup({ noMatchImageUrl: URL.createObjectURL(file) });
                }}
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
              <img src={group.crossImageUrl} alt="Cross Item" className="max-h-full max-w-full object-contain" />
            </div>
            <label className="btn-secondary text-[0.65rem] py-1 px-2 flex items-center justify-center cursor-pointer font-semibold">
              <span>Change (GIF/PNG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpdateGroup({ crossImageUrl: URL.createObjectURL(file) });
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 2. The 3 Rounds Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>📦 Customize 3 Reveal Rounds (Plays Bottom → Top)</span>
          </h3>
        </div>

        <div className="space-y-4">
          {group.items.map((item, index) => {
            const roundTitle =
              index === 0
                ? 'Round 1 (Bottom Slot)'
                : index === 1
                ? 'Round 2 (Middle Slot)'
                : 'Round 3 (Top Slot)';

            return (
              <div
                key={item.id || index}
                className="glass-panel p-5 rounded-2xl border border-[var(--color-glass-border)] space-y-4 bg-gradient-to-r from-white/5 to-transparent"
              >
                {/* Round Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-glass-border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/40">
                      {index + 1}
                    </div>
                    <span className="text-sm font-bold text-white">{roundTitle}</span>
                  </div>

                  {/* Auto-Split Upload Helper Button & Match Toggle */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSplitModal({
                          roundIndex: index,
                          roundName: roundTitle,
                        })
                      }
                      className="btn-primary text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md"
                    >
                      <span>✂️ Auto-Upload & Split 2 Halves</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleItemChange(index, { isMatch: !item.isMatch })}
                      className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all shadow-md ${
                        item.isMatch
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-400'
                          : 'bg-rose-500 text-white shadow-rose-500/30 hover:bg-rose-400'
                      }`}
                    >
                      {item.isMatch ? '✅ MATCH' : '❌ NO MATCH'}
                    </button>
                  </div>
                </div>

                {/* 2 Image Cards: Left Base vs Right Sliding Match */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Base Image Card */}
                  <div className="p-4 rounded-xl glass border border-white/10 space-y-2 bg-black/20">
                    <div className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                      <span>🖼️ Left Target Image</span>
                      <span className="text-[0.65rem] text-[var(--color-text-muted)]">Fixed Stack</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/20 p-2 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={item.targetImageUrl}
                          alt="Target"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, { name: e.target.value })}
                          className="w-full text-xs font-semibold text-white bg-transparent border-b border-white/20 focus:border-indigo-500 py-1 focus:outline-none"
                          placeholder="Item Name (e.g. KitKat Red)"
                        />
                        <label className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center cursor-pointer font-semibold">
                          <span>📷 Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, index, 'targetImageUrl')}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right Sliding Image Card */}
                  <div className="p-4 rounded-xl glass border border-white/10 space-y-2 bg-black/20">
                    <div className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                      <span>✈️ Sliding Match Image</span>
                      <span className="text-[0.65rem] text-[var(--color-text-muted)]">Top-Right Entry</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/20 p-2 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={item.revealImageUrl}
                          alt="Reveal"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-[0.6875rem] text-[var(--color-text-muted)]">
                          Slides from top-right down to line up with left item.
                        </p>
                        <label className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center cursor-pointer font-semibold">
                          <span>📷 Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, index, 'revealImageUrl')}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sound Option */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-glass-border)]">
                  {/* Sound Selector */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSoundSlot({
                        type: 'item',
                        itemIndex: index,
                        category: item.isMatch ? 'match' : 'nomatch',
                      })
                    }
                    className="btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  >
                    <span>🔊 {item.matchSoundUrl ? 'Custom Sound Set' : 'Choose SFX Sound'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-Split Upload Helper Modal */}
      {activeSplitModal && (
        <ImageUploadSplitModal
          isOpen={!!activeSplitModal}
          onClose={() => setActiveSplitModal(null)}
          roundIndex={activeSplitModal.roundIndex}
          roundName={activeSplitModal.roundName}
          onApply={(targetImgUrl, revealImgUrl) => {
            handleItemChange(activeSplitModal.roundIndex, {
              targetImageUrl: targetImgUrl,
              revealImageUrl: revealImgUrl,
            });
          }}
        />
      )}

      {/* Shared Sound Selector Modal */}
      {activeSoundSlot && (
        <SoundLibraryModal
          isOpen={!!activeSoundSlot}
          onClose={() => setActiveSoundSlot(null)}
          targetCategory={activeSoundSlot.category}
          onSelectSound={(soundUrl) => {
            if (activeSoundSlot.type === 'background') {
              onUpdateGroup({ bgSoundUrl: soundUrl });
            } else if (activeSoundSlot.type === 'item' && activeSoundSlot.itemIndex !== undefined) {
              handleItemChange(activeSoundSlot.itemIndex, { matchSoundUrl: soundUrl });
            }
          }}
        />
      )}
    </div>
  );
}
