/**
 * Background Music Presets Synthesizer
 * Generates client-side background music audio Blobs using Web Audio API oscillators.
 */

export interface MusicTrack {
  id: string;
  name: string;
  genre: string;
  icon: string;
}

export const MUSIC_TRACK_PRESETS: MusicTrack[] = [
  { id: 'none', name: 'No Background Music', genre: 'Mute', icon: '🔇' },
  { id: 'upbeat', name: 'Upbeat Synth Energy', genre: 'Pop / EDM', icon: '⚡' },
  { id: 'lofi', name: 'Lofi Chill Sunset', genre: 'Lofi Hip-Hop', icon: '☕' },
  { id: 'ambient', name: 'Ambient Calm Waves', genre: 'Meditation', icon: '🌊' },
  { id: 'cinematic', name: 'Cinematic Epic Rise', genre: 'Orchestral', icon: '🎻' },
];

export async function createBackgroundMusicBlob(trackId: string, durationSeconds: number): Promise<Blob | null> {
  if (trackId === 'none') return null;

  const sampleRate = 22050;
  const numChannels = 1;
  const totalSamples = Math.max(sampleRate, Math.floor(sampleRate * durationSeconds));

  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
    sampleRate,
  });

  const buffer = audioContext.createBuffer(numChannels, totalSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Note frequency mappings
  const chords: Record<string, number[]> = {
    upbeat: [261.63, 329.63, 392.0, 523.25], // C Major chord
    lofi: [220.0, 261.63, 329.63, 392.0], // A Minor 7
    ambient: [174.61, 220.0, 261.63, 349.23], // F Major
    cinematic: [130.81, 164.81, 196.0, 261.63], // Deep C Low
  };

  const selectedChord = chords[trackId] || chords.upbeat;
  const beatsPerSec = trackId === 'upbeat' ? 2.2 : 1.2;

  for (let i = 0; i < totalSamples; i++) {
    const time = i / sampleRate;
    const beatIndex = Math.floor(time * beatsPerSec);
    const noteFreq = selectedChord[beatIndex % selectedChord.length];

    // Harmonic blend
    const wave1 = Math.sin(2 * Math.PI * noteFreq * time);
    const wave2 = 0.3 * Math.sin(2 * Math.PI * (noteFreq * 0.5) * time);

    // Rhythm envelope
    const beatProgress = (time * beatsPerSec) % 1;
    const rhythmEnv = Math.pow(1 - beatProgress, 2);

    channelData[i] = (wave1 + wave2) * rhythmEnv * 0.15;
  }

  await audioContext.close();

  return bufferToWaveBlob(buffer, totalSamples);
}

function bufferToWaveBlob(buffer: AudioBuffer, numSamples: number): Blob {
  const sampleRate = buffer.sampleRate;
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferLength = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);

  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

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
