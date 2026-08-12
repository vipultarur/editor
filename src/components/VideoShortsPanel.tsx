import { useState, useCallback, useRef, useMemo } from 'react';
import { useSession } from '../state/SessionContext';
import { useFFmpeg, type AspectRatioType, type QualityPresetType } from '../hooks/useFFmpeg';
import VideoUploadZone from './VideoUploadZone';
import ClipCard from './ClipCard';
import ProgressBar from './ProgressBar';
import VideoModal, { type VideoClipInfo } from './VideoModal';
import ClipEditorModal from './ClipEditorModal';
import { generateId, downloadAllAsZip } from '../utils/fileHelpers';
import { extractThumbnail } from '../utils/thumbnails';
import { getVideoDuration } from '../utils/videoHelpers';
import { downloadYouTubeVideo, type YouTubeDownloadProgress } from '../utils/youtubeDownload';

const ASPECT_OPTIONS: Array<{ value: AspectRatioType; label: string; icon: string; note: string }> = [
  { value: 'original', label: 'Original (Instant Cut)', icon: '⚡', note: '0ms Stream Copy' },
  { value: '9:16', label: 'Portrait (9:16)', icon: '📱', note: 'Reels / Shorts (0ms Cut)' },
  { value: '1:1', label: 'Square (1:1)', icon: '⬜', note: 'Instagram Feed (0ms Cut)' },
  { value: '16:9', label: 'Landscape (16:9)', icon: '🖥️', note: 'YouTube (0ms Cut)' },
  { value: '4:5', label: 'Social (4:5)', icon: '📸', note: 'FB / IG Post (0ms Cut)' },
];

const DURATION_PRESETS = [15, 30, 60, 90, 120];
const BATCH_LIMIT_OPTIONS = [
  { value: 5, label: 'First 5 Shorts (Fastest)' },
  { value: 10, label: 'First 10 Shorts' },
  { value: 20, label: 'First 20 Shorts' },
  { value: 0, label: 'Entire Video (All Shorts)' },
];

export default function VideoShortsPanel() {
  const { state, dispatch } = useSession();
  const ffmpeg = useFFmpeg();

  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('original'); // Default to instant cut for max speed
  const [clipDuration, setClipDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [maxClips, setMaxClips] = useState(5); // Default to 5 for instant fast batching
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ message: string; progress?: number } | undefined>();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [previewClip, setPreviewClip] = useState<VideoClipInfo | null>(null);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [totalVideoClips, setTotalVideoClips] = useState(0);
  const [clipSearch, setClipSearch] = useState('');
  const [ratioFilter, setRatioFilter] = useState<'all' | AspectRatioType>('all');

  const editingClip = state.shortClips.find((c) => c.id === editingClipId) ?? null;

  const filteredClips = useMemo(() => {
    return state.shortClips.filter((clip) => {
      const matchesSearch = !clipSearch.trim() || clip.fileName.toLowerCase().includes(clipSearch.toLowerCase());
      const matchesRatio =
        ratioFilter === 'all' ||
        clip.aspectRatio === ratioFilter ||
        (ratioFilter === 'original' && clip.aspectRatio === 'Original');
      return matchesSearch && matchesRatio;
    });
  }, [state.shortClips, clipSearch, ratioFilter]);

  const cancelRef = useRef(false);

  const handleFileSelected = useCallback(
    (file: File, source: 'local' | 'youtube' = 'local') => {
      const blobUrl = URL.createObjectURL(file);
      dispatch({
        type: 'SET_VIDEO',
        payload: { file, blobUrl, name: file.name, size: file.size, source },
      });
    },
    [dispatch]
  );

  const handleYouTubeUrl = useCallback(
    async (url: string) => {
      setIsDownloading(true);
      setDownloadError(null);
      setDownloadProgress({ message: 'Validating URL...' });

      try {
        const result = await downloadYouTubeVideo(
          url,
          { quality: '720' },
          (progress: YouTubeDownloadProgress) => {
            setDownloadProgress({
              message: progress.message,
              progress: progress.progress,
            });
          }
        );

        const file = new File([result.blob], result.filename, { type: 'video/mp4' });
        handleFileSelected(file, 'youtube');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to download video';
        setDownloadError(message);
      } finally {
        setIsDownloading(false);
        setDownloadProgress(undefined);
      }
    },
    [handleFileSelected]
  );

  const handleCancelSplit = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const handleSplit = useCallback(
    async (isNextBatch = false) => {
      if (!state.uploadedVideo) return;
      cancelRef.current = false;

      if (!ffmpeg.loaded) {
        dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: true, message: 'Loading FFmpeg engine (~30 MB)...' } });
        try {
          await ffmpeg.loadFFmpeg();
        } catch {
          dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false, message: '' } });
          return;
        }
      }

      let totalDuration = 600;
      try {
        totalDuration = await getVideoDuration(state.uploadedVideo.file);
      } catch {
        totalDuration = 600;
      }

      const duration = isCustom && customDuration ? parseInt(customDuration) : clipDuration;
      const calculatedTotal = Math.ceil(totalDuration / duration);
      setTotalVideoClips(calculatedTotal);

      const startIndex = isNextBatch ? state.shortClips.length : 0;
      if (!isNextBatch) {
        dispatch({ type: 'CLEAR_CLIPS' });
      }

      dispatch({
        type: 'SET_PROCESSING',
        payload: {
          isProcessing: true,
          message: isNextBatch ? 'Slicing next batch of shorts...' : 'Starting ultra-fast video slicing...',
        },
      });

      try {
        await ffmpeg.splitVideoProgressive(state.uploadedVideo.file, {
          segmentDuration: duration,
          aspectRatio,
          totalDuration,
          startClipIndex: startIndex,
          maxClips: maxClips > 0 ? maxClips : undefined,
          shouldCancel: () => cancelRef.current,
          onClipGenerated: async (blob, clipIndex, totalClips) => {
            let thumbnailUrl = '';
            let cDuration = duration;

            try {
              thumbnailUrl = await extractThumbnail(blob, 0.5);
            } catch {
              // ignore
            }

            try {
              cDuration = await getVideoDuration(blob);
            } catch {
              // ignore
            }

            const blobUrl = URL.createObjectURL(blob);
            const clip = {
              id: generateId(),
              blobUrl,
              aspectRatio: aspectRatio === 'original' ? 'Original' : aspectRatio,
              duration: cDuration,
              thumbnailUrl,
              fileName: `clip_${String(clipIndex).padStart(3, '0')}_${aspectRatio}.mp4`,
            };

            dispatch({ type: 'ADD_CLIP', payload: clip });

            dispatch({
              type: 'SET_PROCESSING',
              payload: {
                isProcessing: true,
                message: `Cut Short ${clipIndex} of ${totalClips} — slicing next clip...`,
              },
            });
          },
        });
      } catch (err) {
        console.error('Progressive split failed:', err);
      } finally {
        dispatch({ type: 'SET_PROCESSING', payload: { isProcessing: false } });
      }
    },
    [state.uploadedVideo, state.shortClips.length, ffmpeg, aspectRatio, clipDuration, customDuration, isCustom, maxClips, dispatch]
  );

  const handleDeleteClip = useCallback(
    (id: string) => {
      const clip = state.shortClips.find((c) => c.id === id);
      if (clip) {
        URL.revokeObjectURL(clip.blobUrl);
        if (clip.thumbnailUrl.startsWith('blob:')) {
          URL.revokeObjectURL(clip.thumbnailUrl);
        }
      }
      dispatch({ type: 'REMOVE_CLIP', payload: id });
    },
    [state.shortClips, dispatch]
  );

  const handleDownloadAll = useCallback(async () => {
    if (state.shortClips.length === 0) return;
    await downloadAllAsZip(
      state.shortClips.map((c) => ({ name: c.fileName, blobUrl: c.blobUrl })),
      'clipvoice_shorts.zip'
    );
  }, [state.shortClips]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload */}
      <VideoUploadZone
        onFileSelected={(file) => handleFileSelected(file, 'local')}
        onYouTubeUrl={handleYouTubeUrl}
        currentFile={
          state.uploadedVideo
            ? { name: state.uploadedVideo.name, size: state.uploadedVideo.size, source: state.uploadedVideo.source }
            : null
        }
        disabled={state.isProcessing}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
      />

      {/* YouTube Download Error */}
      {downloadError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--color-accent-danger)]/10 border border-[var(--color-accent-danger)]/20 text-xs animate-fade-in">
          <span className="text-[var(--color-accent-danger)] shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-[var(--color-accent-danger)] mb-1">YouTube Download Failed</p>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">{downloadError}</p>
          </div>
          <button
            onClick={() => setDownloadError(null)}
            className="btn-icon text-[var(--color-text-muted)] shrink-0 ml-auto"
          >
            ×
          </button>
        </div>
      )}

      {/* Settings */}
      {state.uploadedVideo && (
        <div className="card space-y-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center text-[0.625rem]">
                ⚙
              </span>
              Fast Slicing Controls
            </h3>
            <span className="badge badge-success text-[0.625rem]">⚡ 0ms Stream Copy (Instant Cut)</span>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] font-medium mb-2 block">
              Aspect Ratio / Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ASPECT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAspectRatio(opt.value)}
                  disabled={state.isProcessing}
                  className={`
                    flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center
                    transition-all duration-200 cursor-pointer font-[inherit]
                    ${
                      aspectRatio === opt.value
                        ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/10 text-[var(--color-text-primary)] ring-2 ring-[var(--color-accent-indigo)]/30'
                        : 'border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-glass-border-hover)]'
                    }
                  `}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-[0.6875rem] font-semibold">{opt.label}</span>
                  <span className="text-[0.5625rem] text-[var(--color-text-muted)]">{opt.note}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clip Duration */}
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] font-medium mb-2 block">
              Clip Duration (seconds)
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  disabled={state.isProcessing}
                  onClick={() => {
                    setClipDuration(d);
                    setIsCustom(false);
                  }}
                  className={`
                    px-4 py-2 rounded-lg text-xs font-semibold border
                    transition-all duration-200 cursor-pointer font-[inherit]
                    ${
                      !isCustom && clipDuration === d
                        ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/10 text-[var(--color-accent-indigo)]'
                        : 'border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-glass-border-hover)]'
                    }
                  `}
                >
                  {d}s
                </button>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Custom"
                  min={5}
                  max={600}
                  disabled={state.isProcessing}
                  value={isCustom ? customDuration : ''}
                  onChange={(e) => {
                    setCustomDuration(e.target.value);
                    setIsCustom(true);
                  }}
                  onFocus={() => setIsCustom(true)}
                  className="input w-24 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Batch Limit / Speed Control */}
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] font-medium mb-2 block">
              Batch Quantity (Generate Shorts first)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BATCH_LIMIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  disabled={state.isProcessing}
                  onClick={() => setMaxClips(opt.value)}
                  className={`
                    py-2 px-3 rounded-lg text-xs font-medium border text-center
                    transition-all duration-200 cursor-pointer font-[inherit]
                    ${
                      maxClips === opt.value
                        ? 'border-[var(--color-accent-purple)] bg-[var(--color-accent-purple)]/10 text-[var(--color-text-primary)] font-semibold'
                        : 'border-[var(--color-glass-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:border-[var(--color-glass-border-hover)]'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSplit(false)}
              disabled={state.isProcessing}
              className="btn-primary flex-1 justify-center py-3 text-sm min-w-[180px]"
            >
              {state.isProcessing ? (
                <>
                  <span className="animate-spin inline-block">⏳</span>
                  Slicing Video Shorts...
                </>
              ) : (
                <>
                  ⚡ {state.shortClips.length > 0 ? 'Slice Fresh (Restart)' : 'Slice Shorts Instantly'}
                </>
              )}
            </button>

            {/* Slice Next Batch Button */}
            {state.uploadedVideo && state.shortClips.length > 0 && !state.isProcessing && (
              <button
                onClick={() => handleSplit(true)}
                className="btn-success py-3 px-4 text-sm font-semibold flex items-center gap-1.5 shadow-lg animate-fade-in cursor-pointer"
              >
                ⚡ Slice Next {maxClips > 0 ? maxClips : 'Batch'} Shorts ({state.shortClips.length + 1}–{totalVideoClips > 0 ? Math.min(totalVideoClips, state.shortClips.length + (maxClips > 0 ? maxClips : 5)) : state.shortClips.length + (maxClips > 0 ? maxClips : 5)}) ➔
              </button>
            )}

            {state.isProcessing && (
              <button
                onClick={handleCancelSplit}
                className="btn-danger text-xs px-4 py-3 shrink-0"
              >
                ⏹ Stop
              </button>
            )}
          </div>

          {/* FFmpeg Loading Info */}
          {ffmpeg.loading && (
            <div className="space-y-2 animate-fade-in">
              <ProgressBar progress={0} label="Loading WebAssembly engine..." indeterminate />
              <p className="text-[0.625rem] text-[var(--color-text-muted)]">
                Downloading video engine (~30 MB). Happens only once per session.
              </p>
            </div>
          )}

          {/* Progressive Processing Status */}
          {state.isProcessing && !ffmpeg.loading && (
            <div className="space-y-2 animate-fade-in">
              <ProgressBar
                progress={ffmpeg.progress}
                label={state.processingMessage}
                indeterminate={ffmpeg.progress === 0}
              />
              <p className="text-[0.6875rem] text-[var(--color-accent-success)]">
                ✨ Shorts appear below in real-time as each clip is sliced!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {state.shortClips.length > 0 && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Generated Shorts
              <span className="ml-2 badge badge-success">{filteredClips.length} of {state.shortClips.length}</span>
            </h3>
            <div className="flex items-center gap-2">
              {!state.isProcessing && (
                <button
                  onClick={() => handleSplit(true)}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  ⚡ Slice Next Batch ➔
                </button>
              )}
              <button onClick={handleDownloadAll} className="btn-success text-xs">
                ↓ Download All (.zip)
              </button>
            </div>
          </div>

          {/* Search & Aspect Ratio Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl glass">
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">🔍</span>
              <input
                type="text"
                placeholder="Search clips..."
                value={clipSearch}
                onChange={(e) => setClipSearch(e.target.value)}
                className="input pl-8 py-1.5 text-xs"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto py-1">
              <span className="text-[0.625rem] text-[var(--color-text-muted)] font-semibold mr-1">Filter:</span>
              {(['all', 'original', '9:16', '1:1', '16:9', '4:5'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRatioFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-[0.625rem] font-semibold transition-all border cursor-pointer ${
                    ratioFilter === r
                      ? 'border-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/15 text-[var(--color-accent-indigo)]'
                      : 'border-[var(--color-glass-border)] text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  {r === 'all' ? 'All' : r === 'original' ? 'Original' : r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredClips.map((clip, i) => (
              <ClipCard
                key={clip.id}
                {...clip}
                index={i}
                onDelete={handleDeleteClip}
                onEdit={(id) => setEditingClipId(id)}
                onOpenProEditor={() =>
                  dispatch({
                    type: 'OPEN_IN_PRO_EDITOR',
                    payload: {
                      blobUrl: clip.blobUrl,
                      fileName: clip.fileName,
                      duration: clip.duration,
                      aspectRatio: clip.aspectRatio,
                    },
                  })
                }
                onOpenModal={() =>
                  setPreviewClip({
                    id: clip.id,
                    blobUrl: clip.blobUrl,
                    fileName: clip.fileName,
                    aspectRatio: clip.aspectRatio,
                    duration: clip.duration,
                    index: i,
                  })
                }
              />
            ))}
          </div>

          {filteredClips.length === 0 && (
            <div className="text-center py-8 glass rounded-xl text-xs text-[var(--color-text-muted)]">
              No clips found matching your search / ratio filter.
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!state.uploadedVideo && state.shortClips.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-4xl mb-4">✂️</div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
            Ultra-Fast Video Shorts Generator
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
            Upload a video file or paste a YouTube URL above. Select <strong>Original (Instant Cut)</strong> for 0.1-second stream copy slicing!
          </p>
        </div>
      )}

      {/* Full-size Video Dialog Modal */}
      <VideoModal clip={previewClip} onClose={() => setPreviewClip(null)} />

      {/* Clip Editor Modal */}
      <ClipEditorModal
        clip={editingClip}
        onClose={() => setEditingClipId(null)}
        onSave={(id, updates) => dispatch({ type: 'UPDATE_CLIP', payload: { id, updates } })}
      />
    </div>
  );
}
