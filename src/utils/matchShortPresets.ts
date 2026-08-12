import type { MatchGroup, SoundLibraryItem } from '../types/matchShort';
import backgroundAudio from '../assets/background.mp3';
import checkAudio from '../assets/check.mp3';
import checkPng from '../assets/check.png';
import crossAudio from '../assets/cross.mp3';
import imagesPng from '../assets/images.png';
import defaultVideoBgImage from '../assets/images (3).jpeg';

export const DEFAULT_VIDEO_BACKGROUND = defaultVideoBgImage;
export const DEFAULT_BACKGROUND_AUDIO = backgroundAudio;
export const DEFAULT_CHECK_AUDIO = checkAudio;
export const DEFAULT_CHECK_PNG = checkPng;
export const DEFAULT_CROSS_AUDIO = crossAudio;
export const DEFAULT_CROSS_PNG = imagesPng;

// Helper to generate a colored SVG item as Data URL for default demo assets
function createSvgDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

// Built-in Background Presets
export const BACKGROUND_PRESETS = [
  {
    id: 'sky-grass',
    name: 'Sky & Grass (Classic Lawn)',
    type: 'preset',
    imageUrl: defaultVideoBgImage,
    gradient: 'linear-gradient(to bottom, #38bdf8 0%, #7dd3fc 45%, #a3e635 45%, #15803d 100%)',
    drawCanvas: (ctx: CanvasRenderingContext2D, width: number, height: number, bgImg?: HTMLImageElement) => {
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, width, height);
        return;
      }

      // Fallback Sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.52);
      skyGradient.addColorStop(0, '#0ea5e9');
      skyGradient.addColorStop(0.7, '#7dd3fc');
      skyGradient.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height * 0.52);

      // Distant clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(width * 0.2, height * 0.15, 60, 0, Math.PI * 2);
      ctx.arc(width * 0.3, height * 0.13, 80, 0, Math.PI * 2);
      ctx.arc(width * 0.4, height * 0.16, 50, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(width * 0.75, height * 0.25, 70, 0, Math.PI * 2);
      ctx.arc(width * 0.85, height * 0.23, 90, 0, Math.PI * 2);
      ctx.fill();

      // Grass hill horizon
      const grassGradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
      grassGradient.addColorStop(0, '#4ade80');
      grassGradient.addColorStop(0.2, '#22c55e');
      grassGradient.addColorStop(1, '#15803d');
      ctx.fillStyle = grassGradient;

      ctx.beginPath();
      ctx.moveTo(0, height * 0.52);
      ctx.quadraticCurveTo(width * 0.5, height * 0.48, width, height * 0.52);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: 'studio-dark',
    name: 'Studio Dark Glow',
    type: 'preset',
    gradient: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)',
    drawCanvas: (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        50,
        width / 2,
        height / 2,
        height * 0.75
      );
      grad.addColorStop(0, '#312e81');
      grad.addColorStop(0.6, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    },
  },
  {
    id: 'candy-pink',
    name: 'Candy Pastel Pop',
    type: 'preset',
    gradient: 'linear-gradient(to bottom, #f472b6 0%, #c084fc 100%)',
    drawCanvas: (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#fb7185');
      grad.addColorStop(0.5, '#e879f9');
      grad.addColorStop(1, '#818cf8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    },
  },
];

// SVGs for Default Sample Items
const kitkatRedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <rect x="10" y="10" width="380" height="180" rx="20" fill="#dc2626" stroke="#991b1b" stroke-width="8"/>
  <rect x="25" y="25" width="350" height="150" rx="14" fill="#ef4444"/>
  <ellipse cx="200" cy="100" rx="140" ry="60" fill="#ffffff" opacity="0.95"/>
  <text x="200" y="115" font-family="Impact, Arial Black, sans-serif" font-size="52" font-style="italic" fill="#dc2626" text-anchor="middle" font-weight="bold">KitKat</text>
  <rect x="40" y="145" width="50" height="20" rx="4" fill="#991b1b"/>
  <text x="65" y="159" font-family="sans-serif" font-size="10" fill="#ffffff" text-anchor="middle" font-weight="bold">RED</text>
</svg>`;

const kitkatBlackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <rect x="10" y="10" width="380" height="180" rx="20" fill="#18181b" stroke="#09090b" stroke-width="8"/>
  <rect x="25" y="25" width="350" height="150" rx="14" fill="#27272a"/>
  <ellipse cx="200" cy="100" rx="140" ry="60" fill="#ffffff" opacity="0.95"/>
  <text x="200" y="115" font-family="Impact, Arial Black, sans-serif" font-size="52" font-style="italic" fill="#18181b" text-anchor="middle" font-weight="bold">KitKat</text>
  <rect x="40" y="145" width="60" height="20" rx="4" fill="#eab308"/>
  <text x="70" y="159" font-family="sans-serif" font-size="10" fill="#000000" text-anchor="middle" font-weight="bold">DARK</text>
</svg>`;

const kitkatGreenSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  <rect x="10" y="10" width="380" height="180" rx="20" fill="#15803d" stroke="#166534" stroke-width="8"/>
  <rect x="25" y="25" width="350" height="150" rx="14" fill="#22c55e"/>
  <ellipse cx="200" cy="100" rx="140" ry="60" fill="#ffffff" opacity="0.95"/>
  <text x="200" y="115" font-family="Impact, Arial Black, sans-serif" font-size="52" font-style="italic" fill="#15803d" text-anchor="middle" font-weight="bold">KitKat</text>
  <rect x="40" y="145" width="60" height="20" rx="4" fill="#14532d"/>
  <text x="70" y="159" font-family="sans-serif" font-size="10" fill="#ffffff" text-anchor="middle" font-weight="bold">MATCHA</text>
</svg>`;

const lionCharacterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
  <!-- Cute Lion Head -->
  <circle cx="150" cy="150" r="110" fill="#f59e0b"/>
  <!-- Mane details -->
  <circle cx="150" cy="150" r="85" fill="#fef3c7"/>
  <!-- Ears -->
  <circle cx="85" cy="85" r="25" fill="#f59e0b"/>
  <circle cx="85" cy="85" r="14" fill="#fef3c7"/>
  <circle cx="215" cy="85" r="25" fill="#f59e0b"/>
  <circle cx="215" cy="85" r="14" fill="#fef3c7"/>
  <!-- Eyes -->
  <circle cx="115" cy="135" r="16" fill="#1e293b"/>
  <circle cx="185" cy="135" r="16" fill="#1e293b"/>
  <circle cx="110" cy="130" r="6" fill="#ffffff"/>
  <circle cx="180" cy="130" r="6" fill="#ffffff"/>
  <!-- Nose & Mouth -->
  <polygon points="150,155 138,170 162,170" fill="#b45309"/>
  <path d="M138 175 Q150 190 162 175" stroke="#b45309" stroke-width="4" fill="none"/>
  <!-- Cheeks -->
  <ellipse cx="100" cy="160" rx="12" ry="8" fill="#f43f5e" opacity="0.4"/>
  <ellipse cx="200" cy="160" rx="12" ry="8" fill="#f43f5e" opacity="0.4"/>
</svg>`;

const matchCheckSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <path d="M 35 105 L 85 160 L 175 40" fill="none" stroke="#ef4444" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const crossSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <path d="M 45 45 L 155 155 M 155 45 L 45 155" fill="none" stroke="#ef4444" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Default Sample Groups
export const DEFAULT_MATCH_GROUPS: MatchGroup[] = [
  {
    id: 'group-kitkat-classic',
    name: 'KitKat Flavor Match',
    description: '3 rounds of KitKat chocolate reveals with cute reactions',
    backgroundType: 'preset',
    backgroundValue: 'sky-grass',
    videoDuration: 10,
    isGenerated: true,
    matchImageUrl: createSvgDataUrl(kitkatGreenSvg),
    matchCheckImageUrl: checkPng,
    noMatchImageUrl: createSvgDataUrl(kitkatRedSvg),
    crossImageUrl: imagesPng,
    bgSoundUrl: backgroundAudio,
    matchSoundUrl: checkAudio,
    noMatchSoundUrl: crossAudio,
    items: [
      {
        id: 'item-bottom-1',
        name: 'Round 1 (Bottom Slot)',
        targetImageUrl: createSvgDataUrl(kitkatGreenSvg),
        revealImageUrl: createSvgDataUrl(kitkatGreenSvg),
        isMatch: true,
        emoji: '😃',
      },
      {
        id: 'item-middle-2',
        name: 'Round 2 (Middle Slot)',
        targetImageUrl: createSvgDataUrl(kitkatBlackSvg),
        revealImageUrl: createSvgDataUrl(kitkatBlackSvg),
        isMatch: true,
        emoji: '🤩',
      },
      {
        id: 'item-top-3',
        name: 'Round 3 (Top Slot)',
        targetImageUrl: createSvgDataUrl(kitkatGreenSvg),
        revealImageUrl: createSvgDataUrl(kitkatRedSvg),
        isMatch: false,
        emoji: '😭',
      },
    ],
  },
];

// Presets for Sound Library
export const DEFAULT_SOUND_LIBRARY: SoundLibraryItem[] = [
  { id: 'snd-default-check', name: 'Match Check Sound (check.mp3)', url: checkAudio, category: 'match', isPreset: true },
  { id: 'snd-default-cross', name: 'No Match Cross Sound (cross.mp3)', url: crossAudio, category: 'nomatch', isPreset: true },
  { id: 'snd-default-bg', name: 'Background Track (background.mp3)', url: backgroundAudio, category: 'background', isPreset: true },
  { id: 'snd-chime-success', name: 'Match Chime ✅ (Synth)', url: 'synth:match', category: 'match', isPreset: true },
  { id: 'snd-buzz-error', name: 'No Match Buzz ❌ (Synth)', url: 'synth:nomatch', category: 'nomatch', isPreset: true },
  { id: 'snd-finish-fanfare', name: 'Victory Fanfare 🏁 (Synth)', url: 'synth:finish', category: 'finish', isPreset: true },
  { id: 'snd-bgm-upbeat', name: 'Upbeat Playful BGM 🎵 (Synth)', url: 'synth:background', category: 'background', isPreset: true },
];

// Web Audio Sound Synthesizer Engine
export function playSynthSound(
  type: 'match' | 'nomatch' | 'finish' | 'pop' | 'background',
  audioCtx?: AudioContext
) {
  try {
    const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === 'match' || type === 'pop') {
      // Pleasant bright ding chime (E5 -> G5 -> C6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15); // C6

      osc2.frequency.setValueAtTime(1318.5, now); // E6
      osc2.frequency.exponentialRampToValueAtTime(2093.0, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } else if (type === 'nomatch') {
      // Classic comical low buzzer (Sawtooth)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.35);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'finish') {
      // Triumph fanfare chords (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    }
  } catch (err) {
    console.warn('Audio Synth playback notice:', err);
  }
}

// Audio Nodes helper for live Web Audio destination mixing during video recording
export function createSynthAudioSourceNode(
  audioCtx: AudioContext,
  destinationNode: MediaStreamAudioDestinationNode,
  type: 'match' | 'nomatch' | 'finish'
) {
  try {
    const now = audioCtx.currentTime;
    if (type === 'match') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(destinationNode);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'nomatch') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.35);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(destinationNode);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'finish') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const startTime = now + i * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        osc.connect(gain);
        gain.connect(destinationNode);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    }
  } catch (e) {
    console.error('Synth Audio Node error:', e);
  }
}
