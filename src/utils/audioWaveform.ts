const waveformCache = new Map<string, number[]>();

/**
 * Extracts normalized peak data (array of 0..1 values) from an audio/video blob URL.
 */
export async function getAudioPeaks(blobUrl: string, samples = 100): Promise<number[]> {
  if (waveformCache.has(blobUrl)) {
    return waveformCache.get(blobUrl)!;
  }

  try {
    const response = await fetch(blobUrl);
    const arrayBuffer = await response.arrayBuffer();

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    // Close context to free memory
    await audioCtx.close();

    const channelData = audioBuffer.getChannelData(0); // mono channel
    const step = Math.floor(channelData.length / samples);
    const peaks: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * step;
      let max = 0;
      for (let j = 0; j < step; j += 4) { // sample stride for speed
        const val = Math.abs(channelData[start + j] || 0);
        if (val > max) max = val;
      }
      peaks.push(max);
    }

    // Normalize peaks
    const maxPeak = Math.max(...peaks, 0.01);
    const normalized = peaks.map((p) => Math.min(1, p / maxPeak));

    waveformCache.set(blobUrl, normalized);
    return normalized;
  } catch (err) {
    console.warn('Failed to extract audio peaks:', err);
    // Return dummy peaks pattern if decoding fails
    const dummy = Array.from({ length: samples }, (_, i) => 0.2 + (i % 5) * 0.15);
    return dummy;
  }
}

/**
 * Draws audio waveform onto an HTML Canvas context.
 */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  peaks: number[],
  width: number,
  height: number,
  color = 'rgba(99, 102, 241, 0.8)'
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;

  const barWidth = width / peaks.length;
  const centerY = height / 2;

  for (let i = 0; i < peaks.length; i++) {
    const barHeight = Math.max(2, peaks[i] * (height * 0.8));
    const x = i * barWidth;
    const y = centerY - barHeight / 2;
    ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
  }
}
