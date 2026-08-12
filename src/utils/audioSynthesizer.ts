/**
 * Web Audio API Synthesizer
 * Generates valid WAV audio Blobs from text/tone parameters in the browser
 * so generated voice tracks can be played, downloaded, and merged with FFmpeg.wasm.
 */

export async function createSpeechAudioBlob(
  text: string,
  durationSeconds: number,
  pitch: number = 1
): Promise<Blob> {
  const sampleRate = 22050;
  const numChannels = 1;
  const totalSamples = Math.max(sampleRate, Math.floor(sampleRate * durationSeconds));

  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
    sampleRate,
  });

  const buffer = audioContext.createBuffer(numChannels, totalSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Generate pleasant harmonic voice tone matching words
  const baseFreq = 180 * pitch;
  const wordCount = Math.max(1, text.trim().split(/\s+/).length);
  const samplesPerWord = totalSamples / wordCount;

  for (let i = 0; i < totalSamples; i++) {
    const wordIndex = Math.floor(i / samplesPerWord);
    const wordProgress = (i % samplesPerWord) / samplesPerWord;

    // Envelope for natural speech cadence (fade in & out per word)
    const envelope = Math.sin(wordProgress * Math.PI);
    const freq = baseFreq + (wordIndex % 5) * 15;

    // Harmonic blend
    const wave1 = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    const wave2 = 0.5 * Math.sin((2 * Math.PI * freq * 1.5 * i) / sampleRate);
    const wave3 = 0.25 * Math.sin((2 * Math.PI * freq * 2 * i) / sampleRate);

    channelData[i] = (wave1 + wave2 + wave3) * envelope * 0.4;
  }

  await audioContext.close();

  // Encode PCM buffer into WAV format
  return bufferToWaveBlob(buffer, totalSamples);
}

function bufferToWaveBlob(buffer: AudioBuffer, numSamples: number): Blob {
  const sampleRate = buffer.sampleRate;
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferLength = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);

  // DATA sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples
  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
