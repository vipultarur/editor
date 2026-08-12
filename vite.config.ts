import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Vite plugin to proxy YouTube downloads server-side using yt-dlp & Cobalt API
function youtubeProxyPlugin(): Plugin {
  return {
    name: 'youtube-proxy',
    configureServer(server) {
      server.middlewares.use('/api/yt-download', async (req, res) => {
        const reqUrl = new URL(req.url || '', `http://${req.headers.host}`);
        const targetUrl = reqUrl.searchParams.get('url');
        const quality = reqUrl.searchParams.get('quality') || '720';
        const isAudioOnly = reqUrl.searchParams.get('audio') === 'true' || quality === 'audio';

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        let videoStreamUrl: string | null = null;
        let lastError = 'Could not extract video stream.';

        // Strategy 1: Try local yt-dlp binary (supports YouTube, Instagram, etc.)
        try {
          const ytDlpArgs = [
            '--extractor-args', 'youtube:player_client=ios,android',
          ];

          if (isAudioOnly) {
            ytDlpArgs.push('-f', 'bestaudio/best');
          } else if (quality && quality !== 'max') {
            const h = parseInt(quality, 10);
            if (!isNaN(h)) {
              ytDlpArgs.push('-f', `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/best`);
            } else {
              ytDlpArgs.push('-f', 'bestvideo+bestaudio/best');
            }
          } else {
            ytDlpArgs.push('-f', 'bestvideo+bestaudio/best');
          }

          ytDlpArgs.push('-g', targetUrl);

          const { stdout } = await execFileAsync('yt-dlp', ytDlpArgs);

          const lines = stdout.trim().split(/\r?\n/).filter((l) => l.startsWith('http'));
          if (lines.length > 0) {
            videoStreamUrl = lines[0];
          }
        } catch (err: any) {
          console.warn('yt-dlp extraction warning:', err?.message || err);
        }

        // Strategy 2: Fallback to Cobalt API instances if yt-dlp didn't return a stream
        if (!videoStreamUrl) {
          const instances = [
            'https://co.wuk.sh',
            'https://api.cobalt.tools',
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
                const text = await apiRes.text();
                lastError = `Service ${instanceUrl} returned HTTP ${apiRes.status}: ${text}`;
                continue;
              }

              const data = await apiRes.json();

              if (data.status === 'tunnel' || data.status === 'redirect') {
                videoStreamUrl = data.url;
                break;
              } else if (data.status === 'picker') {
                const item = data.picker?.find((p: any) => p.type === (isAudioOnly ? 'audio' : 'video')) || data.picker?.[0];
                if (item?.url) {
                  videoStreamUrl = item.url;
                  break;
                }
              }
            } catch (err: any) {
              lastError = err?.message || 'Network request failed';
            }
          }
        }

        if (!videoStreamUrl) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: lastError }));
          return;
        }

        // 3. Stream video back to browser with CORS & CORP headers
        try {
          streamRemoteVideo(videoStreamUrl, res);
        } catch (err: any) {
          sendError(res, err?.message || 'Failed to stream video');
        }
      });
    },
  };
}

function streamRemoteVideo(streamUrl: string, res: http.ServerResponse) {
  const client = streamUrl.startsWith('https') ? https : http;
  
  const request = client.get(
    streamUrl,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    },
    (videoRes) => {
      if (
        videoRes.statusCode &&
        videoRes.statusCode >= 300 &&
        videoRes.statusCode < 400 &&
        videoRes.headers.location
      ) {
        // Handle HTTP redirects
        streamRemoteVideo(videoRes.headers.location, res);
        return;
      }

      res.statusCode = videoRes.statusCode || 200;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Content-Type', videoRes.headers['content-type'] || 'video/mp4');

      if (videoRes.headers['content-length']) {
        res.setHeader('Content-Length', videoRes.headers['content-length']);
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
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});
