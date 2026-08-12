/**
 * Color Filter Presets Utility
 * Maps preset names to CSS video filter strings and descriptions.
 */

export interface ColorFilterPreset {
  id: string;
  name: string;
  icon: string;
  cssFilter: string;
  description: string;
}

export const COLOR_FILTER_PRESETS: ColorFilterPreset[] = [
  {
    id: 'normal',
    name: 'Normal',
    icon: '✨',
    cssFilter: 'none',
    description: 'Original color output',
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    icon: '🌈',
    cssFilter: 'saturate(1.5) contrast(1.15) brightness(1.05)',
    description: 'Rich, vivid colors for social media',
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    icon: '🖤',
    cssFilter: 'grayscale(1) contrast(1.2)',
    description: 'Classic high-contrast black & white',
  },
  {
    id: 'warm',
    name: 'Warm Sun',
    icon: '☀️',
    cssFilter: 'sepia(0.35) saturate(1.3) contrast(1.05) hue-rotate(-10deg)',
    description: 'Golden hour warmth and soft tones',
  },
  {
    id: 'cool',
    name: 'Cool Cyber',
    icon: '❄️',
    cssFilter: 'hue-rotate(180deg) saturate(1.2) contrast(1.1)',
    description: 'Futuristic blue-cyan cinematic vibe',
  },
  {
    id: 'vintage',
    name: 'Vintage Film',
    icon: '🎞️',
    cssFilter: 'sepia(0.4) contrast(0.95) brightness(1.05) saturate(0.85)',
    description: 'Retro 90s aesthetic film look',
  },
];

export function getCssFilter(presetId?: string): string {
  if (!presetId) return 'none';
  const found = COLOR_FILTER_PRESETS.find((p) => p.id === presetId);
  return found ? found.cssFilter : 'none';
}
