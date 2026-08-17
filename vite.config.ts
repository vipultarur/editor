import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Stream URL cache to avoid re-resolving URLs via yt-dlp within 10 minutes
const streamUrlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCachedStreamUrl(key: string): string | null {
  const cached = streamUrlCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.url;
  }
  streamUrlCache.delete(key);
  return null;
}

function setCachedStreamUrl(key: string, url: string) {
  streamUrlCache.set(key, { url, timestamp: Date.now() });
}

// Vite plugin to proxy YouTube/Instagram downloads server-side using yt-dlp & Cobalt API
function youtubeProxyPlugin(): Plugin {
  return {
    name: 'youtube-proxy',
    configureServer(server) {
      server.middlewares.use('/api/yt-download', async (req, res) => {
        const reqUrl = new URL(req.url || '', `http://${req.headers.host}`);
        let targetUrl = reqUrl.searchParams.get('url') || '';
        const quality = reqUrl.searchParams.get('quality') || '720';
        const isAudioOnly = reqUrl.searchParams.get('audio') === 'true' || quality === 'audio';

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        // Normalize URL (add protocol if missing)
        targetUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = 'https://' + targetUrl;
        }

        const cacheKey = `${targetUrl}_${quality}_${isAudioOnly}`;
        let videoStreamUrl: string | null = getCachedStreamUrl(cacheKey);

        // Strategy 1: Local yt-dlp binary with speed flags
        if (!videoStreamUrl) {
          try {
            const ytDlpArgs = [
              '--no-playlist',
              '--no-warnings',
              '--no-call-home',
              '--geo-bypass',
              '--socket-timeout', '5',
              '--extractor-args', 'youtube:player_client=android,web;formats=missing_pot',
            ];

            if (isAudioOnly) {
              ytDlpArgs.push('-f', 'bestaudio/best');
            } else if (quality && quality !== 'max') {
              const h = parseInt(quality, 10);
              if (!isNaN(h)) {
                ytDlpArgs.push('-f', `b[height<=${h}]/best[height<=${h}]/best[ext=mp4]/bestvideo+bestaudio/best`);
              } else {
                ytDlpArgs.push('-f', 'b/best[ext=mp4]/bestvideo+bestaudio/best');
              }
            } else {
              ytDlpArgs.push('-f', 'b/best[ext=mp4]/bestvideo+bestaudio/best');
            }

            ytDlpArgs.push('-g', targetUrl);

            const { stdout } = await execFileAsync('yt-dlp', ytDlpArgs);

            const lines = stdout.trim().split(/\r?\n/).filter((l) => l.startsWith('http'));
            if (lines.length > 0) {
              videoStreamUrl = lines[0];
              setCachedStreamUrl(cacheKey, videoStreamUrl);
            }
          } catch (err: any) {
            console.warn('yt-dlp extraction warning:', err?.message || err);
          }
        }

        // Strategy 2: Fallback to Cobalt API instances if yt-dlp didn't return a stream
        if (!videoStreamUrl) {
          const instances = [
            'https://co.wuk.sh',
            'https://api.cobalt.tools',
            'https://cobalt.stream',
            'https://cobalt.api.scouts.org',
          ];

          for (const instanceUrl of instances) {
            try {
              const cobaltBody: Record<string, any> = {
                url: targetUrl,
                vQuality: quality === 'max' ? 'max' : (quality === 'audio' ? '720' : quality),
              };
              if (isAudioOnly) {
                cobaltBody.downloadMode = 'audio';
                cobaltBody.audioFormat = 'mp3';
              }

              const apiRes = await fetch(instanceUrl, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                body: JSON.stringify(cobaltBody),
              });

              if (!apiRes.ok) {
                continue;
              }

              const data: any = await apiRes.json();

              if (data.status === 'tunnel' || data.status === 'redirect') {
                videoStreamUrl = data.url;
                setCachedStreamUrl(cacheKey, videoStreamUrl);
                break;
              } else if (data.status === 'picker') {
                const item = data.picker?.find((p: any) => p.type === (isAudioOnly ? 'audio' : 'video')) || data.picker?.[0];
                if (item?.url) {
                  videoStreamUrl = item.url;
                  setCachedStreamUrl(cacheKey, videoStreamUrl);
                  break;
                }
              }
            } catch {
              // Ignore network errors on fallback instances
            }
          }
        }

        if (!videoStreamUrl) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Unable to extract video stream from this link. Please verify the URL or try another video.' }));
          return;
        }

        // Stream video back to browser with Range support & CORP headers
        try {
          streamRemoteVideo(videoStreamUrl, req, res);
        } catch (err: any) {
          sendError(res, err?.message || 'Failed to stream video');
        }
      });
    },
  };
}

function streamRemoteVideo(streamUrl: string, req: http.IncomingMessage, res: http.ServerResponse) {
  const client = streamUrl.startsWith('https') ? https : http;
  
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  if (req.headers.range) {
    headers['Range'] = req.headers.range;
  }

  const request = client.get(
    streamUrl,
    { headers },
    (videoRes) => {
      if (
        videoRes.statusCode &&
        videoRes.statusCode >= 300 &&
        videoRes.statusCode < 400 &&
        videoRes.headers.location
      ) {
        // Handle HTTP redirects
        streamRemoteVideo(videoRes.headers.location, req, res);
        return;
      }

      res.statusCode = videoRes.statusCode || 200;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      
      if (videoRes.headers['content-type']) {
        res.setHeader('Content-Type', videoRes.headers['content-type']);
      } else {
        res.setHeader('Content-Type', 'video/mp4');
      }

      if (videoRes.headers['content-length']) {
        res.setHeader('Content-Length', videoRes.headers['content-length']);
      }

      if (videoRes.headers['content-range']) {
        res.setHeader('Content-Range', videoRes.headers['content-range']);
      }

      if (videoRes.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', videoRes.headers['accept-ranges']);
      }

      videoRes.pipe(res);
    }
  );

  request.on('error', (err) => {
    sendError(res, err.message);
  });
}

function sendError(res: http.ServerResponse, message: string) {
  if (!res.headersSent) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), youtubeProxyPlugin()],
  assetsInclude: ['**/*.wasm'],
  server: {
    // No COOP/COEP headers needed — single-threaded FFmpeg core doesn't require
    // SharedArrayBuffer, so YouTube iframe embeds load without issues.
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});
