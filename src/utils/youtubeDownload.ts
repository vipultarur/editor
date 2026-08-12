/**
 * YouTube & Instagram Download Utility
 *
 * Uses local proxy endpoint `/api/yt-download` (powered by yt-dlp & Cobalt API fallback)
 * to fetch streams into browser Blobs.
 */

export interface YouTubeDownloadOptions {
  apiUrl?: string;
  quality?: '144' | '240' | '360' | '480' | '720' | '1080' | 'max';
  format?: 'video' | 'audio';
  isAudioOnly?: boolean;
}

export interface YouTubeDownloadResult {
  blob: Blob;
  filename: string;
  mediaType: 'video' | 'audio';
}

export interface YouTubeDownloadProgress {
  stage: 'validating' | 'requesting' | 'downloading' | 'done' | 'error';
  message: string;
  progress?: number; // 0-100 for download stage
}

type ProgressCallback = (progress: YouTubeDownloadProgress) => void;

/**
 * Validates that a string is a valid YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.replace('www.', '');
    return (
      hostname === 'youtube.com' ||
      hostname === 'youtu.be' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com'
    );
  } catch {
    return false;
  }
}

/**
 * Validates that a string is a valid Instagram URL (Reels, Posts, IGTV, Video)
 */
export function isInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.replace('www.', '');
    return (
      hostname === 'instagram.com' ||
      hostname === 'instagr.am'
    );
  } catch {
    return false;
  }
}

/**
 * Check if the URL is supported (YouTube or Instagram)
 */
export function isSupportedMediaUrl(url: string): boolean {
  return isYouTubeUrl(url) || isInstagramUrl(url);
}

/**
 * Detect platform type from URL
 */
export function getMediaPlatform(url: string): 'youtube' | 'instagram' | 'unknown' {
  if (isYouTubeUrl(url)) return 'youtube';
  if (isInstagramUrl(url)) return 'instagram';
  return 'unknown';
}

/**
 * Extracts a video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.replace('www.', '');

    if (hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0].split('?')[0];
      return id || null;
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'music.youtube.com') {
      // /watch?v=ID
      const v = parsed.searchParams.get('v');
      if (v) return v;

      // /shorts/ID or /embed/ID or /v/ID
      const pathMatch = parsed.pathname.match(/^\/(shorts|embed|v)\/([^/?]+)/);
      if (pathMatch) return pathMatch[2];

      // /live/ID
      const liveMatch = parsed.pathname.match(/^\/live\/([^/?]+)/);
      if (liveMatch) return liveMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Downloads a YouTube or Instagram video/audio via local proxy server endpoint
 */
export async function downloadYouTubeVideo(
  url: string,
  options: YouTubeDownloadOptions = {},
  onProgress?: ProgressCallback
): Promise<YouTubeDownloadResult> {
  const platform = getMediaPlatform(url);

  // 1. Validate URL
  onProgress?.({
    stage: 'validating',
    message: `Validating ${platform === 'instagram' ? 'Instagram' : 'YouTube'} URL...`,
  });

  if (platform === 'unknown') {
    throw new Error('Invalid URL. Supported links: YouTube (youtube.com, youtu.be, shorts) & Instagram (reels, posts).');
  }

  let cleanUrl = url.trim();
  let defaultPrefix = platform === 'instagram' ? 'instagram' : 'youtube';

  if (platform === 'youtube') {
    const videoId = extractVideoId(url);
    if (videoId) {
      cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
      defaultPrefix = `youtube_${videoId}`;
    }
  }

  const isAudio = options.format === 'audio' || options.isAudioOnly || options.quality === '144';
  const quality = options.quality || '720';
  const extension = isAudio ? 'mp3' : 'mp4';
  const filename = `${defaultPrefix}_${quality}p.${extension}`;

  // 2. Fetch via local server proxy endpoint (/api/yt-download)
  onProgress?.({
    stage: 'requesting',
    message: `Connecting to ${platform === 'instagram' ? 'Instagram' : 'YouTube'} stream proxy...`,
  });

  const queryParams = new URLSearchParams({
    url: cleanUrl,
    quality: isAudio ? 'audio' : quality,
    audio: isAudio ? 'true' : 'false',
  });

  const proxyUrl = `/api/yt-download?${queryParams.toString()}`;

  try {
    const videoResponse = await fetch(proxyUrl);

    if (!videoResponse.ok) {
      let errorMessage = `HTTP ${videoResponse.status}`;
      try {
        const errorJson = await videoResponse.json();
        if (errorJson?.error) errorMessage = errorJson.error;
      } catch {
        // Ignore
      }
      throw new Error(`Proxy error: ${errorMessage}`);
    }

    onProgress?.({
      stage: 'downloading',
      message: `Downloading ${isAudio ? 'audio' : 'video'} into browser memory...`,
      progress: 0,
    });

    const contentLength = videoResponse.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength) : 0;

    if (totalBytes > 0 && videoResponse.body) {
      const reader = videoResponse.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        const progress = Math.round((receivedBytes / totalBytes) * 100);
        onProgress?.({
          stage: 'downloading',
          message: `Downloading media... ${(receivedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`,
          progress,
        });
      }

      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      const mimeType = isAudio ? 'audio/mp3' : 'video/mp4';
      const blob = new Blob([combined], { type: mimeType });

      onProgress?.({ stage: 'done', message: 'Download complete!' });

      return { blob, filename, mediaType: isAudio ? 'audio' : 'video' };
    } else {
      const blob = await videoResponse.blob();
      onProgress?.({ stage: 'done', message: 'Download complete!' });
      return { blob, filename, mediaType: isAudio ? 'audio' : 'video' };
    }
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to fetch media stream.');
  }
}

