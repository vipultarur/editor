/**
 * YouTube, Instagram & Multi-Platform Media Download Utility
 *
 * Uses local proxy endpoint `/api/yt-download` (powered by yt-dlp, Invidious & Cobalt fallback)
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
 * Normalizes input URL by trimming, removing surrounding quotes,
 * and adding https:// protocol if missing.
 */
export function normalizeUrlInput(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) return '';
  // Remove enclosing quotes
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  // Prepend https:// if missing protocol
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

/**
 * Validates that a string is a valid YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const normalized = normalizeUrlInput(url);
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.replace('www.', '').toLowerCase();
    return (
      hostname === 'youtube.com' ||
      hostname === 'youtu.be' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com' ||
      hostname === 'youtube-nocookie.com'
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
    const normalized = normalizeUrlInput(url);
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.replace('www.', '').toLowerCase();
    return (
      hostname === 'instagram.com' ||
      hostname === 'instagr.am'
    );
  } catch {
    return false;
  }
}

/**
 * Check if the URL is a supported media URL (YouTube, Instagram, TikTok, Twitter/X, Vimeo, direct media links, or any valid HTTP/HTTPS video URL)
 */
export function isSupportedMediaUrl(url: string): boolean {
  if (!url || !url.trim()) return false;
  try {
    const normalized = normalizeUrlInput(url);
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detect platform type from URL
 */
export function getMediaPlatform(url: string): 'youtube' | 'instagram' | 'tiktok' | 'vimeo' | 'twitter' | 'direct' | 'video' | 'unknown' {
  if (!url || !url.trim()) return 'unknown';
  try {
    const normalized = normalizeUrlInput(url);
    if (isYouTubeUrl(normalized)) return 'youtube';
    if (isInstagramUrl(normalized)) return 'instagram';
    
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace('www.', '').toLowerCase();
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('vimeo.com')) return 'vimeo';
    if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
    
    if (/\.(mp4|webm|mov|mkv|avi|flv|m4v|mp3|wav|m4a|aac|ogg)($|\?)/i.test(parsed.pathname)) {
      return 'direct';
    }
    
    return 'video';
  } catch {
    return 'unknown';
  }
}

/**
 * Extracts a video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  try {
    const normalized = normalizeUrlInput(url);
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.replace('www.', '').toLowerCase();

    if (hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0].split('?')[0];
      return id || null;
    }

    if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com' ||
      hostname === 'youtube-nocookie.com'
    ) {
      // /watch?v=ID
      const v = parsed.searchParams.get('v');
      if (v) return v;

      // /shorts/ID or /embed/ID or /v/ID or /clip/ID
      const pathMatch = parsed.pathname.match(/^\/(shorts|embed|v|clip)\/([^/?]+)/);
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
 * Downloads a video or audio stream via local proxy server endpoint
 */
export async function downloadYouTubeVideo(
  url: string,
  options: YouTubeDownloadOptions = {},
  onProgress?: ProgressCallback
): Promise<YouTubeDownloadResult> {
  const normalizedUrl = normalizeUrlInput(url);
  const platform = getMediaPlatform(normalizedUrl);

  // 1. Validate URL
  onProgress?.({
    stage: 'validating',
    message: `Validating ${platform === 'instagram' ? 'Instagram' : platform === 'youtube' ? 'YouTube' : 'media'} link...`,
  });

  if (!isSupportedMediaUrl(normalizedUrl)) {
    throw new Error('Invalid URL format. Please paste a valid YouTube, Instagram, or video link.');
  }

  let cleanUrl = normalizedUrl;
  let defaultPrefix: string = platform;

  if (platform === 'youtube') {
    const videoId = extractVideoId(normalizedUrl);
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
    message: `Connecting to ${platform === 'instagram' ? 'Instagram' : platform === 'youtube' ? 'YouTube' : 'video'} stream proxy...`,
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
      let errorMessage = 'Failed to extract video stream from URL. Please check the link or try another video.';
      try {
        const errorJson = await videoResponse.json();
        if (errorJson?.error && typeof errorJson.error === 'string') {
          // If the error includes JWT or technical proxy details, present a friendly message
          if (errorJson.error.includes('jwt') || errorJson.error.includes('cobalt') || errorJson.error.includes('HTTP 400')) {
            errorMessage = 'Video service unavailable for this specific link. Please verify the URL or try uploading a local video file.';
          } else {
            errorMessage = errorJson.error;
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }

    onProgress?.({
      stage: 'downloading',
      message: `Downloading ${isAudio ? 'audio' : 'video'} into memory...`,
      progress: 0,
    });

    const contentLength = videoResponse.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

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
    throw new Error('Failed to fetch media stream. Please verify the URL or try again.');
  }
}


