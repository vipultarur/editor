import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../state/SessionContext';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { formatDuration, generateId, downloadBlob } from '../utils/fileHelpers';
import { MUSIC_TRACK_PRESETS, createBackgroundMusicBlob } from '../utils/audioPresets';

const getAspectCss = (ratio: string) =>
  ratio === '9:16'
    ? '9/16'
    : ratio === '1:1'
    ? '1/1'
    : ratio === '4:5'
    ? '4/5'
    : '16/9';

export default function MergePanel() {
  const { state, dispatch } = useSession();
  const ffmpeg = useFFmpeg();

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [bgMusicTrack, setBgMusicTrack] = useState<string>('upbeat');
  const [bgMusicVolume, setBgMusicVolume] = useState(25);
  const [videoVolume, setVideoVolume] = useState(30);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [muteOriginal, setMuteOriginal] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const selectedClip = state.shortClips.find((c) => c.id === selectedClipId);
  const selectedVoice = state.generatedVoices.find((v) => v.id === selectedVoiceId);

  const hasClips = state.shortClips.length > 0;
  const hasVoices = state.generatedVoices.length > 0;
  const canMerge = Boolean(selectedClip && selectedVoice);

  const handleMerge = async () => {
    if (!selectedClip || !selectedVoice) return;
    if (!selectedVoice.blobUrl) {
      setShowComingSoon(true);
      return;
    }

    setIsMerging(true);
    try {
      if (!ffmpeg.loaded) {
        await ffmpeg.loadFFmpeg();
      }

      const clipResp = await fetch(selectedClip.blobUrl);
      const clipBlob = await clipResp.blob();

      const voiceResp = await fetch(selectedVoice.blobUrl);
      const voiceBlob = await voiceResp.blob();

      const mergedBlob = await ffmpeg.mergeAudioVideo(clipBlob, voiceBlob, {
        muteOriginal,
        videoVolume: videoVolume / 100,
        audioVolume: voiceVolume / 100,
      });

      const mergedUrl = URL.createObjectURL(mergedBlob);
      dispatch({
        type: 'ADD_MERGED',
        payload: {
          id: generateId(),
          blobUrl: mergedUrl,
          sourceClipId: selectedClip.id,
          sourceVoiceId: selectedVoice.id,
        },
      });
    } catch (err) {
      console.error('Merge failed:', err);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Clip Selector */}
      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center text-[0.625rem]">
            🎬
          </span>
          Select Video Clip
        </h3>

        {hasClips ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {state.shortClips.map((clip) => (
              <button
                key={clip.id}
                onClick={() => setSelectedClipId(clip.id)}
                className={`
                  relative rounded-xl overflow-hidden border-2 cursor-pointer
                  transition-all duration-200 bg-transparent p-0 font-[inherit] flex flex-col justify-between
                  ${
                    selectedClipId === clip.id
                      ? 'border-[var(--color-accent-indigo)] ring-2 ring-[var(--color-accent-indigo)]/30'
                      : 'border-[var(--color-glass-border)] hover:border-[var(--color-glass-border-hover)]'
                  }
                `}
              >
                {/* Thumbnail framed in aspect ratio */}
                <div
                  className="bg-[var(--color-bg-primary)] w-full overflow-hidden flex items-center justify-center"
                  style={{ aspectRatio: getAspectCss(clip.aspectRatio) }}
                >
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2 bg-[var(--color-bg-surface)] w-full text-left">
                  <p className="text-[0.625rem] font-semibold text-[var(--color-text-primary)] truncate">
                    {clip.fileName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[0.5625rem] text-[var(--color-text-muted)]">
                      {formatDuration(clip.duration)}
                    </span>
                    <span className="text-[0.5625rem] text-[var(--color-accent-indigo)] font-semibold">
                      {clip.aspectRatio}
                    </span>
                  </div>
                </div>

                {/* Selected checkmark */}
                {selectedClipId === clip.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-xs text-white font-bold shadow-md">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center rounded-xl glass">
            <p className="text-sm text-[var(--color-text-muted)]">
              No clips yet. Generate shorts in the <strong>Shorts</strong> tab first.
            </p>
          </div>
        )}
      </div>

      {/* Voice Selector */}
      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg gradient-secondary flex items-center justify-center text-[0.625rem]">
            🎙
          </span>
          Select Voice Track
        </h3>

        {hasVoices ? (
          <div className="space-y-2">
            {state.generatedVoices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoiceId(voice.id)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl border
                  transition-all duration-200 cursor-pointer bg-transparent font-[inherit] text-left
                  ${
                    selectedVoiceId === voice.id
                      ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/5'
                      : 'border-[var(--color-glass-border)] hover:border-[var(--color-glass-border-hover)] hover:bg-[var(--color-bg-surface-hover)]'
                  }
                `}
              >
                <div
                  className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0
                    ${selectedVoiceId === voice.id ? 'gradient-primary text-white' : 'glass'}
                  `}
                >
                  🎙
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {voice.voiceName}
                  </p>
                  <p className="text-[0.6875rem] text-[var(--color-text-muted)]">
                    {voice.voiceLang} • ~{Math.ceil(voice.duration)}s
                  </p>
                </div>
                {selectedVoiceId === voice.id && (
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-xs text-white font-bold shrink-0">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center rounded-xl glass">
            <p className="text-sm text-[var(--color-text-muted)]">
              No voices yet. Generate a voice in the <strong>Voice</strong> tab first.
            </p>
          </div>
        )}
      </div>

      {/* Mix Controls */}
      {selectedClip && selectedVoice && (
        <div className="card space-y-4 animate-slide-up">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[var(--color-accent-success)]/20 flex items-center justify-center text-[0.625rem]">
              🎚
            </span>
            Audio Mix & Preview
          </h3>

          {/* Mute Original */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={muteOriginal}
              onChange={(e) => setMuteOriginal(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-accent-indigo)]"
            />
            <span className="text-sm text-[var(--color-text-primary)]">
              Mute original video audio
            </span>
          </label>

          {/* Volume Sliders */}
          {!muteOriginal && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-medium mb-1.5 flex items-center justify-between">
                  Original Video Volume
                  <span className="text-[var(--color-accent-indigo)]">{videoVolume}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={videoVolume}
                  onChange={(e) => setVideoVolume(parseInt(e.target.value))}
                  className="w-full accent-[var(--color-accent-indigo)] h-1.5"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] font-medium mb-1.5 flex items-center justify-between">
                  Voice Volume
                  <span className="text-[var(--color-accent-purple)]">{voiceVolume}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(parseInt(e.target.value))}
                  className="w-full accent-[var(--color-accent-purple)] h-1.5"
                />
              </div>
            </div>
          )}

          {/* Background Music Selector (Option C) */}
          <div className="pt-2 border-t border-[var(--color-glass-border)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <span>🎵</span> Background Music Track
              </label>
              {bgMusicTrack !== 'none' && (
                <span className="text-[0.6875rem] text-[var(--color-accent-cyan)] font-semibold">
                  Vol: {bgMusicVolume}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {MUSIC_TRACK_PRESETS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setBgMusicTrack(m.id)}
                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                    bgMusicTrack === m.id
                      ? 'border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/15 text-white font-bold'
                      : 'border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  <div className="text-lg mb-0.5">{m.icon}</div>
                  <div className="text-[0.6875rem] truncate">{m.name}</div>
                  <div className="text-[0.5625rem] text-[var(--color-text-muted)]">{m.genre}</div>
                </button>
              ))}
            </div>

            {bgMusicTrack !== 'none' && (
              <div className="pt-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={bgMusicVolume}
                  onChange={(e) => setBgMusicVolume(parseInt(e.target.value))}
                  className="w-full accent-[var(--color-accent-cyan)] h-1.5"
                />
              </div>
            )}
          </div>

          {/* Preview Side-by-Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Video framed in its selected aspect ratio */}
            <div className="rounded-xl overflow-hidden bg-black flex flex-col items-center justify-center">
              <div
                className="w-full max-h-[300px] flex items-center justify-center overflow-hidden bg-black"
                style={{ aspectRatio: getAspectCss(selectedClip.aspectRatio) }}
              >
                <video
                  src={selectedClip.blobUrl}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                />
              </div>
              <div className="p-2 bg-[var(--color-bg-surface)] text-center w-full">
                <span className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold">
                  Video: {selectedClip.aspectRatio} ({formatDuration(selectedClip.duration)})
                </span>
              </div>
            </div>

            {/* Voice info */}
            <div className="rounded-xl overflow-hidden glass flex flex-col items-center justify-center p-6 text-center">
              <div className="text-4xl mb-3">🎙</div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {selectedVoice.voiceName}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {selectedVoice.voiceLang} • ~{Math.ceil(selectedVoice.duration)}s
              </p>
              <div className="mt-3 badge badge-primary text-[0.625rem]">
                Voice Track Selected
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleMerge}
            disabled={!canMerge || isMerging}
            className={`btn-primary w-full justify-center py-3.5 text-sm font-semibold flex items-center gap-2 shadow-lg transition-all ${
              !canMerge || isMerging ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01] cursor-pointer'
            }`}
          >
            {isMerging ? (
              <>
                <span className="animate-spin inline-block">⏳</span>
                Muxing Audio & Video with FFmpeg...
              </>
            ) : (
              <>
                🎬 Generate Merged Video {selectedVoice?.blobUrl ? 'Now' : '(Coming Soon)'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Coming Soon Modal */}
      {showComingSoon && selectedClip && selectedVoice && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setShowComingSoon(false)}
        >
          <div
            className="card max-w-lg w-full p-6 bg-[var(--color-bg-secondary)] border-[var(--color-glass-border-hover)] shadow-2xl space-y-5 animate-slide-up m-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-glass-border)]">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-xl text-white">
                  🚀
                </span>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                    Neural Video & Audio Merge
                  </h3>
                  <span className="badge badge-warning text-[0.5625rem]">Coming Soon — Phase 2</span>
                </div>
              </div>
              <button
                onClick={() => setShowComingSoon(false)}
                className="btn-icon text-lg text-[var(--color-text-secondary)] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Your selected video clip and voice settings are ready for multiplexing:
              </p>

              <div className="p-3 rounded-xl glass space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Video Clip:</span>
                  <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[200px]">{selectedClip.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Aspect Ratio:</span>
                  <span className="font-semibold text-[var(--color-accent-indigo)]">{selectedClip.aspectRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Voice Track:</span>
                  <span className="font-semibold text-[var(--color-accent-purple)]">{selectedVoice.voiceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Audio Mix:</span>
                  <span className="font-semibold text-[var(--color-accent-success)]">
                    {muteOriginal ? 'Muted Original' : `Video ${videoVolume}% / Voice ${voiceVolume}%`}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--color-accent-cyan)]/10 border border-[var(--color-accent-cyan)]/20 text-xs space-y-1">
                <p className="font-semibold text-[var(--color-accent-cyan)] flex items-center gap-1.5">
                  <span>✨</span> Audio Muxing Engine Ready
                </p>
                <p className="text-[var(--color-text-muted)] leading-relaxed text-[0.6875rem]">
                  Full FFmpeg WebAssembly audio composition is integrated. Phase 2 will bring downloadable Piper-WASM neural audio export to build the final combined MP4 file!
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowComingSoon(false)}
                className="btn-primary text-xs px-5 py-2.5"
              >
                Got It
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Merged Videos List */}
      {state.mergedVideos.length > 0 && (
        <div className="card space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Merged Videos
              <span className="ml-2 badge badge-success">{state.mergedVideos.length}</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {state.mergedVideos.map((item, idx) => (
              <div key={item.id} className="card p-3 space-y-3 bg-[var(--color-bg-primary)]">
                <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video src={item.blobUrl} controls playsInline className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                      Merged Short {idx + 1}
                    </p>
                    <p className="text-[0.6875rem] text-[var(--color-text-muted)]">
                      Video + Voice Multiplexed MP4
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => downloadBlob(item.blobUrl, `merged_short_${idx + 1}.mp4`)}
                      className="btn-success text-xs px-3 py-1.5"
                    >
                      ↓ Download
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_MERGED', payload: item.id })}
                      className="btn-icon text-[var(--color-accent-danger)] text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasClips && !hasVoices && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-4xl mb-4">🎬</div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
            Merge voice with video
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto mb-6">
            First generate some clips in the <strong>Shorts</strong> tab and create a voice in the <strong>Voice</strong> tab,
            then come here to merge them together.
          </p>

          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 ${hasClips ? 'gradient-primary' : 'glass'}`}>
                ✂️
              </div>
              <p className="text-[0.625rem] text-[var(--color-text-muted)]">
                {hasClips ? 'Clips ready' : 'Need clips'}
              </p>
            </div>
            <div className="text-2xl text-[var(--color-text-muted)]">+</div>
            <div className="text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2 ${hasVoices ? 'gradient-secondary' : 'glass'}`}>
                🎙️
              </div>
              <p className="text-[0.625rem] text-[var(--color-text-muted)]">
                {hasVoices ? 'Voices ready' : 'Need voices'}
              </p>
            </div>
            <div className="text-2xl text-[var(--color-text-muted)]">=</div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center text-2xl mx-auto mb-2">
                🎬
              </div>
              <p className="text-[0.625rem] text-[var(--color-text-muted)]">Merged video</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
