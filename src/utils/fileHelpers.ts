import JSZip from 'jszip';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const formatTime = formatDuration;

export function generateId(): string {
  return crypto.randomUUID();
}

export function downloadBlob(blobUrl: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadAllAsZip(
  items: Array<{ name: string; blobUrl: string }>,
  zipName: string = 'clips.zip'
): Promise<void> {
  const zip = new JSZip();

  for (const item of items) {
    const response = await fetch(item.blobUrl);
    const blob = await response.blob();
    zip.file(item.name, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  downloadBlob(url, zipName);
  URL.revokeObjectURL(url);
}

export function estimateWordDuration(text: string, wordsPerMinute: number = 150): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return (wordCount / wordsPerMinute) * 60;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
