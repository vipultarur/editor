import type { VercelRequest, VercelResponse } from '@vercel/node';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let targetUrl = (req.query.url as string) || '';
  const quality = (req.query.quality as string) || '720';
  const isAudioOnly = req.query.audio === 'true' || quality === 'audio';

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Normalize URL
  targetUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  let videoStreamUrl: string | null = null;

  // Strategy 1: Attempt local yt-dlp if installed on environment
  try {
    const ytDlpArgs = [
      '--no-warnings',
      '--no-call-home',
      '--geo-bypass',
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
    }
  } catch {
    // Ignore yt-dlp failure on serverless if binary not present
  }

  // Strategy 2: Cobalt API fallback
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
          break;
        } else if (data.status === 'picker') {
          const item = data.picker?.find((p: any) => p.type === (isAudioOnly ? 'audio' : 'video')) || data.picker?.[0];
          if (item?.url) {
            videoStreamUrl = item.url;
            break;
          }
        }
      } catch {
        // Continue to next instance
      }
    }
  }

  if (!videoStreamUrl) {
    return res.status(502).json({ error: 'Unable to extract video stream from this link. Please verify the URL or try another video.' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  return res.redirect(302, videoStreamUrl);
}

