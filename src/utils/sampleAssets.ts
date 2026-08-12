import { DEFAULT_FILTER_SETTINGS } from '../types/editor';
import type { MediaAsset, Track, ProjectState } from '../types/editor';

// Create a synthetic audio Blob using Web Audio API to act as stock royalty-free music
export async function generateSynthMusicBlob(type: 'upbeat' | 'chill' | 'sfx'): Promise<Blob> {
  const sampleRate = 44100;
  const duration = type === 'sfx' ? 1.5 : 10;
  const numSamples = sampleRate * duration;
  
  const ctx = new OfflineAudioContext(1, numSamples, sampleRate);
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type === 'upbeat' ? 'triangle' : 'sine';

  if (type === 'upbeat') {
    // Upbeat melody arpeggio
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63];
    notes.forEach((freq, idx) => {
      osc.frequency.setValueAtTime(freq, now + idx * 0.4);
    });
    gain.gain.setValueAtTime(0.2, 0);
    gain.gain.linearRampToValueAtTime(0.01, duration);
  } else if (type === 'chill') {
    osc.frequency.setValueAtTime(220, 0);
    gain.gain.setValueAtTime(0.15, 0);
    gain.gain.exponentialRampToValueAtTime(0.01, duration);
  } else {
    // SFX Pop sound
    osc.frequency.setValueAtTime(600, 0);
    osc.frequency.exponentialRampToValueAtTime(150, 0.15);
    gain.gain.setValueAtTime(0.3, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.2);
  }

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  
  const renderedBuffer = await ctx.startRendering();
  
  // Convert AudioBuffer to WAV Blob
  return audioBufferToWavBlob(renderedBuffer);
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const data = buffer.getChannelData(0);
  const dataLength = data.length * 2;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Generate colored sample Canvas background images
export function createSampleImageBlob(text: string, color1: string, color2: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createLinearGradient(0, 0, 1280, 720);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 720);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 64px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 640, 360);

  return canvas.toDataURL('image/png');
}

export const SAMPLE_TEXT_PRESETS = [
  {
    name: 'Bold Title',
    text: 'STUNNING TITLE',
    fontFamily: 'Inter',
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    strokeColor: '#000000',
    strokeWidth: 4,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 10,
    animation: { entrance: 'zoom', entranceDuration: 0.5, loop: 'none' },
  },
  {
    name: 'Neon Cyber',
    text: 'CYBERPUNK VIBES',
    fontFamily: 'Impact',
    fontSize: 56,
    fontWeight: 'bold',
    color: '#00F0FF',
    backgroundColor: 'rgba(0,0,0,0.6)',
    strokeColor: '#FF007F',
    strokeWidth: 2,
    shadowColor: '#00F0FF',
    shadowBlur: 20,
    animation: { entrance: 'pop', entranceDuration: 0.4, loop: 'pulse' },
  },
  {
    name: 'Lower Third',
    text: 'Jane Doe • Video Creator',
    fontFamily: 'Roboto',
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    strokeColor: 'transparent',
    strokeWidth: 0,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowBlur: 6,
    animation: { entrance: 'slide', entranceDuration: 0.6, exit: 'slide' },
  },
  {
    name: 'Minimal Subtitle',
    text: 'Captivating story caption goes here...',
    fontFamily: 'System-UI',
    fontSize: 36,
    fontWeight: '500',
    color: '#FFE600',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    strokeColor: '#000000',
    strokeWidth: 2,
    shadowColor: 'transparent',
    shadowBlur: 0,
    animation: { entrance: 'fade', entranceDuration: 0.3 },
  },
];

export const STARTER_PROJECT_TEMPLATES = [
  {
    id: 'template-tiktok-promo',
    name: '📱 TikTok / Reels Promo',
    aspectRatio: '9:16' as const,
    description: 'Dynamic vertical layout with animated headline, subtitle, and energetic background.',
    createTracks: (): Track[] => [
      {
        id: 'track-v1',
        name: 'Background Track',
        type: 'image',
        locked: false,
        hidden: false,
        muted: false,
        clips: [
          {
            id: 'clip-bg-1',
            trackId: 'track-v1',
            type: 'image',
            name: 'Vibrant Gradient BG',
            startTime: 0,
            duration: 8,
            trimStart: 0,
            trimEnd: 8,
            layer: 1,
            mediaId: 'sample-img-1',
            blobUrl: createSampleImageBlob('CLIPVOICE STUDIO', '#4f46e5', '#ec4899'),
            originalWidth: 1080,
            originalHeight: 1920,
            x: 0,
            y: 0,
            width: 1080,
            height: 1920,
            rotation: 0,
            scale: 1.0,
            opacity: 1.0,
            flipH: false,
            flipV: false,
            filters: { ...DEFAULT_FILTER_SETTINGS },
          },
        ],
      },
      {
        id: 'track-txt1',
        name: 'Main Headline',
        type: 'text',
        locked: false,
        hidden: false,
        muted: false,
        clips: [
          {
            id: 'clip-head-1',
            trackId: 'track-txt1',
            type: 'text',
            name: 'Headline Text',
            startTime: 0.5,
            duration: 7,
            trimStart: 0,
            trimEnd: 7,
            layer: 10,
            text: 'CREATE VIRAL SHORTS',
            fontFamily: 'Inter',
            fontSize: 54,
            fontWeight: '900',
            fontStyle: 'normal',
            underline: false,
            align: 'center',
            color: '#FFFFFF',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            opacity: 1,
            letterSpacing: 2,
            lineHeight: 1.2,
            strokeColor: '#000000',
            strokeWidth: 4,
            shadowColor: '#ec4899',
            shadowBlur: 15,
            x: 0,
            y: -150,
            rotation: 0,
            scale: 1.0,
            animation: { entrance: 'zoom', entranceDuration: 0.6, loop: 'pulse' },
          },
          {
            id: 'clip-sub-1',
            trackId: 'track-txt1',
            type: 'text',
            name: 'Sub-caption',
            startTime: 1.2,
            duration: 6.3,
            trimStart: 0,
            trimEnd: 6.3,
            layer: 11,
            text: '100% Free Browser Video Editor ✨',
            fontFamily: 'Roboto',
            fontSize: 32,
            fontWeight: '600',
            fontStyle: 'normal',
            underline: false,
            align: 'center',
            color: '#FACC15',
            backgroundColor: 'transparent',
            opacity: 1,
            letterSpacing: 1,
            lineHeight: 1.2,
            strokeColor: '#000000',
            strokeWidth: 2,
            shadowColor: 'rgba(0,0,0,0.5)',
            shadowBlur: 8,
            x: 0,
            y: 100,
            rotation: 0,
            scale: 1.0,
            animation: { entrance: 'typewriter', entranceDuration: 1.0 },
          },
        ],
      },
    ],
  },
  {
    id: 'template-youtube-intro',
    name: '🎬 YouTube Cinematic Intro',
    aspectRatio: '16:9' as const,
    description: 'Widescreen 16:9 intro template with elegant title fade and lower-third credits.',
    createTracks: (): Track[] => [
      {
        id: 'track-bg-yt',
        name: 'Video Overlay',
        type: 'image',
        locked: false,
        hidden: false,
        muted: false,
        clips: [
          {
            id: 'clip-yt-bg',
            trackId: 'track-bg-yt',
            type: 'image',
            name: 'Cinematic Blue BG',
            startTime: 0,
            duration: 10,
            trimStart: 0,
            trimEnd: 10,
            layer: 1,
            mediaId: 'sample-yt-bg',
            blobUrl: createSampleImageBlob('CINEMATIC SHOW', '#0f172a', '#1e1b4b'),
            originalWidth: 1920,
            originalHeight: 1080,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            rotation: 0,
            scale: 1.0,
            opacity: 1.0,
            flipH: false,
            flipV: false,
            filters: { ...DEFAULT_FILTER_SETTINGS, preset: 'cinematic', contrast: 115 },
          },
        ],
      },
      {
        id: 'track-yt-txt',
        name: 'Title & Badge',
        type: 'text',
        locked: false,
        hidden: false,
        muted: false,
        clips: [
          {
            id: 'clip-yt-title',
            trackId: 'track-yt-txt',
            type: 'text',
            name: 'Main Title',
            startTime: 0.8,
            duration: 8.5,
            trimStart: 0,
            trimEnd: 8.5,
            layer: 10,
            text: 'EPISODE 01',
            fontFamily: 'Inter',
            fontSize: 72,
            fontWeight: '900',
            fontStyle: 'normal',
            underline: false,
            align: 'center',
            color: '#FFFFFF',
            backgroundColor: 'transparent',
            opacity: 1,
            letterSpacing: 6,
            lineHeight: 1.1,
            strokeColor: 'transparent',
            strokeWidth: 0,
            shadowColor: 'rgba(99, 102, 241, 0.8)',
            shadowBlur: 25,
            x: 0,
            y: -40,
            rotation: 0,
            scale: 1.0,
            animation: { entrance: 'fade', entranceDuration: 1.2, exit: 'fade' },
          },
        ],
      },
    ],
  },
];
