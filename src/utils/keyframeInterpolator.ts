import type { Keyframe, TimelineClip } from '../types/editor';

/**
 * Calculates the value of a property at a specific clip time using linear keyframe interpolation.
 * If no keyframes exist for the property, returns the clip's base property value.
 */
export function getInterpolatedProperty(
  clip: TimelineClip,
  property: 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'volume',
  relativeTime: number
): number {
  // Extract base default value from clip based on property
  let baseValue = 0;
  if (property === 'x' && 'x' in clip) baseValue = clip.x;
  else if (property === 'y' && 'y' in clip) baseValue = clip.y;
  else if (property === 'scale' && 'scale' in clip) baseValue = clip.scale;
  else if (property === 'rotation' && 'rotation' in clip) baseValue = clip.rotation;
  else if (property === 'opacity' && 'opacity' in clip) baseValue = clip.opacity;
  else if (property === 'volume' && 'volume' in clip) baseValue = clip.volume;

  const keyframes = clip.keyframes?.filter((k) => k.property === property);
  if (!keyframes || keyframes.length === 0) {
    return baseValue;
  }

  // Sort keyframes by timestamp ascending
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Before first keyframe
  if (relativeTime <= sorted[0].time) {
    return sorted[0].value;
  }

  // After last keyframe
  if (relativeTime >= sorted[sorted.length - 1].time) {
    return sorted[sorted.length - 1].value;
  }

  // Find surrounding keyframe segment
  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];

    if (relativeTime >= k1.time && relativeTime <= k2.time) {
      const range = k2.time - k1.time;
      if (range === 0) return k1.value;
      const progress = (relativeTime - k1.time) / range;
      return k1.value + (k2.value - k1.value) * progress;
    }
  }

  return baseValue;
}
