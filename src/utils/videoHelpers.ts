export function getVideoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(blob);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };
  });
}

export function getVideoResolution(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(blob);
    video.src = url;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };
  });
}

type AspectRatio = '9:16' | '1:1' | '16:9' | '4:5';

const ASPECT_RATIOS: Record<AspectRatio, number> = {
  '9:16': 9 / 16,
  '1:1': 1,
  '16:9': 16 / 9,
  '4:5': 4 / 5,
};

export function calculateCropFilter(
  originalW: number,
  originalH: number,
  targetRatio: AspectRatio
): string {
  const ratio = ASPECT_RATIOS[targetRatio];
  const currentRatio = originalW / originalH;

  if (Math.abs(currentRatio - ratio) < 0.01) {
    // Already correct ratio, no crop needed
    return '';
  }

  let cropW: number;
  let cropH: number;

  if (currentRatio > ratio) {
    // Wider than target — crop width
    cropH = originalH;
    cropW = Math.floor(originalH * ratio);
  } else {
    // Taller than target — crop height
    cropW = originalW;
    cropH = Math.floor(originalW / ratio);
  }

  // Ensure even dimensions (required by most codecs)
  cropW = cropW - (cropW % 2);
  cropH = cropH - (cropH % 2);

  return `crop=${cropW}:${cropH}`;
}

export function getAspectRatioLabel(ratio: AspectRatio): string {
  const labels: Record<AspectRatio, string> = {
    '9:16': 'Portrait (9:16)',
    '1:1': 'Square (1:1)',
    '16:9': 'Landscape (16:9)',
    '4:5': 'Social (4:5)',
  };
  return labels[ratio];
}

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

export function isVideoFileSupported(file: File): boolean {
  return SUPPORTED_VIDEO_TYPES.includes(file.type) || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);
}
