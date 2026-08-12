import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const targetUrl = req.query.url as string;
  const quality = (req.query.quality as string) || '720';
  const isAudioOnly = req.query.audio === 'true' || quality === 'audio';

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const instances = [
    'https://co.wuk.sh',
    'https://api.cobalt.tools',
  ];

  let videoStreamUrl: string | null = null;
  let lastError = 'Could not extract video stream.';

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
    } catch (err: any) {
      lastError = err?.message || 'Network request failed';
    }
  }

  if (!videoStreamUrl) {
    return res.status(502).json({ error: lastError });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  return res.redirect(302, videoStreamUrl);
}
