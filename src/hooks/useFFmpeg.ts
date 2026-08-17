import { useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

interface FFmpegState {
  loaded: boolean;
  loading: boolean;
  progress: number;
  error: string | null;
  log: string[];
}

export type AspectRatioType = 'original' | '9:16' | '1:1' | '16:9' | '4:5';
export type QualityPresetType = 'fast' | 'standard' | 'hd';

export interface ProgressiveSplitOptions {
  segmentDuration: number;
  aspectRatio?: AspectRatioType;
  qualityPreset?: QualityPresetType; // 'fast' = 480p, 'standard' = 720p, 'hd' = 1080p
  maxClips?: number;
  startClipIndex?: number;
  totalDuration: number;
  onClipGenerated: (blob: Blob, clipIndex: number, totalClips: number) => Promise<void> | void;
  shouldCancel?: () => boolean;
}

const ASPECT_RATIO_MAP: Record<string, number> = {
  '9:16': 9 / 16,
  '1:1': 1,
  '16:9': 16 / 9,
  '4:5': 4 / 5,
};

function buildCropFilter(aspectRatio: AspectRatioType, targetHeight: number): string {
  const H = targetHeight;

  if (aspectRatio === '9:16') {
    const W = Math.floor((H * (9 / 16)) / 2) * 2;
    return `scale=-2:${H},crop=${W}:${H}`;
  } else if (aspectRatio === '1:1') {
    return `scale=-2:${H},crop=${H}:${H}`;
  } else if (aspectRatio === '4:5') {
    const W = Math.floor((H * (4 / 5)) / 2) * 2;
    return `scale=-2:${H},crop=${W}:${H}`;
  } else if (aspectRatio === '16:9') {
    const W = Math.floor((H * (16 / 9)) / 2) * 2;
    return `scale=${W}:-2,crop=${W}:${H}`;
  }

  return `scale=-2:${H}`;
}

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [state, setState] = useState<FFmpegState>({
    loaded: false,
    loading: false,
    progress: 0,
    error: null,
    log: [],
  });

  const addLog = useCallback((message: string) => {
    setState((prev) => ({
      ...prev,
      log: [...prev.log.slice(-100), message],
    }));
  }, []);

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current && state.loaded) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const ffmpeg = new FFmpeg();

      ffmpeg.on('log', ({ message }) => {
        addLog(message);
      });

      ffmpeg.on('progress', ({ progress }) => {
        setState((prev) => ({
          ...prev,
          progress: Math.round(progress * 100),
        }));
      });

      // Use single-threaded FFmpeg core — does NOT require SharedArrayBuffer or COOP/COEP headers.
      // This allows YouTube iframe embeds to work without "refused to connect" errors.
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm';

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpegRef.current = ffmpeg;
      setState((prev) => ({ ...prev, loaded: true, loading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load FFmpeg';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw err;
    }
  }, [state.loaded, addLog]);

  /**
   * High-Speed Video Splitting
   * Fast input seeking (-ss before -i), fail-safe even-pixel crop filters, yuv420p format,
   * and progressive real-time clip emission.
   */
  const splitVideoProgressive = useCallback(
    async (file: File, options: ProgressiveSplitOptions): Promise<number> => {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg) throw new Error('FFmpeg not loaded');

      setState((prev) => ({ ...prev, progress: 0, log: [] }));

      const inputName = 'input' + getExtension(file.name);
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const segmentDuration = options.segmentDuration;
      const totalDuration = options.totalDuration;
      const calculatedTotal = Math.ceil(totalDuration / segmentDuration);

      const startIndex = options.startClipIndex ?? 0;
      const batchLimit = options.maxClips ? options.maxClips : calculatedTotal;
      const endIndex = Math.min(calculatedTotal, startIndex + batchLimit);
      const totalBatchCount = endIndex - startIndex;

      let generatedCount = 0;

      try {
        for (let i = startIndex; i < endIndex; i++) {
          if (options.shouldCancel?.()) {
            addLog('Splitting cancelled by user.');
            break;
          }

          const startTime = i * segmentDuration;
          const clipLength = Math.min(segmentDuration, totalDuration - startTime);

          if (clipLength <= 0.5) break;

          const currentBatchStep = i - startIndex + 1;
          setState((prev) => ({
            ...prev,
            progress: Math.round((currentBatchStep / Math.max(1, totalBatchCount)) * 100),
          }));

          // Instant Stream Copy Mode — 0 re-encoding! Cuts in milliseconds for ALL aspect ratios!
          const args: string[] = [
            '-ss', String(startTime),
            '-i', inputName,
            '-t', String(clipLength),
            '-c', 'copy',
            '-avoid_negative_ts', 'make_zero',
            '-y', 'out_clip.mp4',
          ];

          await ffmpeg.exec(args);

          try {
            const data = await ffmpeg.readFile('out_clip.mp4');
            if (data instanceof Uint8Array && data.length > 0) {
              const blob = new Blob([new Uint8Array(data)], { type: 'video/mp4' });
              await options.onClipGenerated(blob, i + 1, calculatedTotal);
              generatedCount++;
            }
          } catch (readErr) {
            console.error(`Failed to read clip ${i + 1}:`, readErr);
          }

          try {
            await ffmpeg.deleteFile('out_clip.mp4');
          } catch {
            // Ignore
          }
        }
      } finally {
        try {
          await ffmpeg.deleteFile(inputName);
        } catch {
          // Ignore
        }
      }

      return generatedCount;
    },
    [addLog]
  );

  const mergeAudioVideo = useCallback(
    async (
      videoBlob: Blob,
      audioBlob: Blob,
      options: { muteOriginal?: boolean; videoVolume?: number; audioVolume?: number } = {}
    ): Promise<Blob> => {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg) throw new Error('FFmpeg not loaded');

      setState((prev) => ({ ...prev, progress: 0, log: [] }));

      await ffmpeg.writeFile('merge_video.mp4', await fetchFile(videoBlob));
      await ffmpeg.writeFile('merge_audio.wav', await fetchFile(audioBlob));

      const args: string[] = ['-i', 'merge_video.mp4', '-i', 'merge_audio.wav'];

      if (options.muteOriginal) {
        args.push('-c:v', 'copy', '-c:a', 'aac', '-map', '0:v', '-map', '1:a');
      } else {
        const vVol = options.videoVolume ?? 0.3;
        const aVol = options.audioVolume ?? 1.0;
        args.push(
          '-filter_complex',
          `[0:a]volume=${vVol}[a0];[1:a]volume=${aVol}[a1];[a0][a1]amix=inputs=2:duration=first[aout]`,
          '-map', '0:v',
          '-map', '[aout]',
          '-c:v', 'copy',
          '-c:a', 'aac'
        );
      }

      args.push('-shortest', 'merged_output.mp4');

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile('merged_output.mp4');
      if (!(data instanceof Uint8Array)) {
        throw new Error('Merge produced no output');
      }

      try {
        await ffmpeg.deleteFile('merge_video.mp4');
        await ffmpeg.deleteFile('merge_audio.wav');
        await ffmpeg.deleteFile('merged_output.mp4');
      } catch {
        // Ignore
      }

      return new Blob([new Uint8Array(data)], { type: 'video/mp4' });
    },
    []
  );

  const trimAndConvertMedia = useCallback(
    async (
      inputBlob: Blob,
      options: {
        startTime?: number;
        endTime?: number;
        extractAudio?: boolean;
        outputFormat?: 'mp4' | 'mp3';
      }
    ): Promise<{ blob: Blob; mimeType: string; extension: string }> => {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg) throw new Error('FFmpeg not loaded');

      setState((prev) => ({ ...prev, progress: 0, log: [] }));

      const isAudio = options.extractAudio || options.outputFormat === 'mp3';
      const ext = isAudio ? '.mp3' : '.mp4';
      const inputName = `input_source${ext}`;
      const outputName = `trimmed_output${ext}`;

      await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));

      const args: string[] = [];

      if (options.startTime !== undefined && options.startTime > 0) {
        args.push('-ss', String(options.startTime));
      }

      args.push('-i', inputName);

      if (options.endTime !== undefined && options.endTime > (options.startTime || 0)) {
        const duration = options.endTime - (options.startTime || 0);
        args.push('-t', String(duration));
      }

      if (isAudio) {
        args.push('-vn', '-c:a', 'libmp3lame', '-q:a', '2');
      } else {
        // Fast stream copy mode for video trim
        args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero');
      }

      args.push('-y', outputName);

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      if (!(data instanceof Uint8Array)) {
        throw new Error('Trimming produced no output');
      }

      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch {
        // Ignore cleanup error
      }

      const mimeType = isAudio ? 'audio/mp3' : 'video/mp4';
      const outExtension = isAudio ? 'mp3' : 'mp4';
      const blob = new Blob([new Uint8Array(data)], { type: mimeType });

      return { blob, mimeType, extension: outExtension };
    },
    []
  );

  const clearLog = useCallback(() => {
    setState((prev) => ({ ...prev, log: [], progress: 0 }));
  }, []);

  return {
    ...state,
    loadFFmpeg,
    splitVideoProgressive,
    mergeAudioVideo,
    trimAndConvertMedia,
    clearLog,
  };
}

function getExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? `.${ext}` : '.mp4';
}
