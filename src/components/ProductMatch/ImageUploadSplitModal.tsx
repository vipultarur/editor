import React, { useState, useRef } from 'react';

interface ImageUploadSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundIndex: number;
  roundName: string;
  onApply: (targetImgUrl: string, revealImgUrl: string) => void;
}

export default function ImageUploadSplitModal({
  isOpen,
  onClose,
  roundName,
  onApply,
}: ImageUploadSplitModalProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'preview'>('upload');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [leftHalfUrl, setLeftHalfUrl] = useState<string | null>(null);
  const [rightHalfUrl, setRightHalfUrl] = useState<string | null>(null);
  const [bgRemoveSensitivity, setBgRemoveSensitivity] = useState<number>(40);
  const [enableAutoBgRemove, setEnableAutoBgRemove] = useState<boolean>(true);
  const [mode, setMode] = useState<'split' | 'whole'>('split');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMsg, setProcessingMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setOriginalImage(url);
    processImagePipeline(url, bgRemoveSensitivity, enableAutoBgRemove);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // High-precision Multi-Pass Flood-Fill & Color Clustering Background Removal Engine
  const processImagePipeline = (imgUrl: string, sensitivity: number, removeBg: boolean) => {
    setStep('processing');
    setIsProcessing(true);
    setProcessingMsg('Removing full background & creating clean PNG cutout...');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgUrl;
    img.onload = () => {
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const w = canvas.width;
        const h = canvas.height;
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        if (removeBg) {
          // Check if image already has transparent pixels
          let hasTransparency = false;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 200) {
              hasTransparency = true;
              break;
            }
          }

          if (!hasTransparency) {
            // Sample perimeter background colors (4 corners + 4 edge centers)
            const sampleIndices = [
              0, // Top-Left
              (w - 1) * 4, // Top-Right
              (h - 1) * w * 4, // Bottom-Left
              ((h - 1) * w + (w - 1)) * 4, // Bottom-Right
              Math.floor(w / 2) * 4, // Top-Center
              ((h - 1) * w + Math.floor(w / 2)) * 4, // Bottom-Center
            ];

            const bgColors = sampleIndices.map((idx) => ({
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2],
            }));

            // BFS Flood-Fill starting from perimeter points
            const visited = new Uint8Array(w * h);
            const queue: number[] = [];

            // Add all perimeter pixels to BFS queue
            for (let x = 0; x < w; x++) {
              queue.push(x);
              queue.push((h - 1) * w + x);
            }
            for (let y = 1; y < h - 1; y++) {
              queue.push(y * w);
              queue.push(y * w + (w - 1));
            }

            const thresholdSq = sensitivity * sensitivity * 4;

            while (queue.length > 0) {
              const pixelIdx = queue.pop()!;
              if (visited[pixelIdx]) continue;
              visited[pixelIdx] = 1;

              const dataIdx = pixelIdx * 4;
              const r = data[dataIdx];
              const g = data[dataIdx + 1];
              const b = data[dataIdx + 2];

              // Check if pixel color matches any perimeter background color or is white/light backdrop
              let isBg = false;
              for (const bg of bgColors) {
                const dr = r - bg.r;
                const dg = g - bg.g;
                const db = b - bg.b;
                if (dr * dr + dg * dg + db * db < thresholdSq) {
                  isBg = true;
                  break;
                }
              }

              // Also check for pure white / light studio backdrop
              if (!isBg) {
                const distWhite = (r - 255) * (r - 255) + (g - 255) * (g - 255) + (b - 255) * (b - 255);
                if (distWhite < thresholdSq) {
                  isBg = true;
                }
              }

              if (isBg) {
                data[dataIdx + 3] = 0; // Make 100% transparent!

                // Push adjacent neighbors to queue
                const x = pixelIdx % w;
                const y = Math.floor(pixelIdx / w);

                if (x > 0) queue.push(pixelIdx - 1);
                if (x < w - 1) queue.push(pixelIdx + 1);
                if (y > 0) queue.push(pixelIdx - w);
                if (y < h - 1) queue.push(pixelIdx + w);
              }
            }

            // Alpha Edge Feathering pass (smooth edges)
            for (let y = 1; y < h - 1; y++) {
              for (let x = 1; x < w - 1; x++) {
                const i = (y * w + x) * 4;
                if (data[i + 3] > 0) {
                  // If adjacent to a transparent pixel, feather alpha
                  const leftA = data[i - 4 + 3];
                  const rightA = data[i + 4 + 3];
                  const topA = data[i - w * 4 + 3];
                  const bottomA = data[i + w * 4 + 3];
                  if (leftA === 0 || rightA === 0 || topA === 0 || bottomA === 0) {
                    data[i + 3] = 160; // Soft edge anti-aliasing
                  }
                }
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const bgRemovedUrl = canvas.toDataURL('image/png');
        setProcessedImage(bgRemovedUrl);

        // Slice into 2 halves (Left half & Right half)
        const halfWidth = Math.floor(w / 2);

        // Left Half Canvas
        const leftCanvas = document.createElement('canvas');
        leftCanvas.width = halfWidth;
        leftCanvas.height = h;
        const leftCtx = leftCanvas.getContext('2d');
        if (leftCtx) {
          leftCtx.drawImage(canvas, 0, 0, halfWidth, h, 0, 0, halfWidth, h);
          setLeftHalfUrl(leftCanvas.toDataURL('image/png'));
        }

        // Right Half Canvas
        const rightCanvas = document.createElement('canvas');
        rightCanvas.width = halfWidth;
        rightCanvas.height = h;
        const rightCtx = rightCanvas.getContext('2d');
        if (rightCtx) {
          rightCtx.drawImage(canvas, halfWidth, 0, w - halfWidth, h, 0, 0, halfWidth, h);
          setRightHalfUrl(rightCanvas.toDataURL('image/png'));
        }

        setIsProcessing(false);
        setStep('preview');
      }, 400);
    };
  };

  const handleSensitivityChange = (newSens: number) => {
    setBgRemoveSensitivity(newSens);
    if (originalImage) {
      processImagePipeline(originalImage, newSens, enableAutoBgRemove);
    }
  };

  const handleToggleAutoBg = (enabled: boolean) => {
    setEnableAutoBgRemove(enabled);
    if (originalImage) {
      processImagePipeline(originalImage, bgRemoveSensitivity, enabled);
    }
  };

  const handleConfirmApply = () => {
    if (mode === 'split' && leftHalfUrl && rightHalfUrl) {
      onApply(leftHalfUrl, rightHalfUrl);
    } else if (processedImage) {
      onApply(processedImage, processedImage);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden border border-[var(--color-glass-border)] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-surface)]">
          <div className="flex items-center gap-2">
            <span className="text-xl">✂️</span>
            <div>
              <h3 className="text-base font-bold text-white">
                Full Background Remover & Image Splitter
              </h3>
              <p className="text-[0.6875rem] text-[var(--color-text-muted)]">
                {roundName} — Clean transparent PNG cutout & 2-piece slice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Step 1: Drag & Drop Zone */}
          {step === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 rounded-2xl p-10 text-center bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer transition-all space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 text-3xl mx-auto flex items-center justify-center">
                📁
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Drop Product Photo or Image Here
                </h4>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Supports JPG, PNG, WEBP. Automatically strips full background into a transparent cutout!
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>
          )}

          {/* Step 2: Processing Progress Indicator */}
          {isProcessing && (
            <div className="py-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto" />
              <div className="text-sm font-bold text-white animate-pulse">
                {processingMsg}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                Removing background colors & isolating main product item...
              </div>
            </div>
          )}

          {/* Step 3: Live Clean Cutout & Halves Preview */}
          {step === 'preview' && !isProcessing && (
            <div className="space-y-6">
              {/* Background Removal Controls */}
              <div className="p-4 rounded-2xl glass border border-indigo-500/30 bg-indigo-500/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">✨</span>
                    <span className="text-xs font-bold text-white">Full Background Remover:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAutoBg(!enableAutoBgRemove)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      enableAutoBgRemove
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {enableAutoBgRemove ? '✅ AUTO REMOVE BG (ON)' : '⚪ ORIGINAL BG (OFF)'}
                  </button>
                </div>

                {enableAutoBgRemove && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[0.6875rem] text-indigo-300 font-semibold">
                      <span>Cutout Precision / Cleaning Strength</span>
                      <span>{bgRemoveSensitivity}</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="90"
                      value={bgRemoveSensitivity}
                      onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Mode Switch: 2 Halves vs Whole Object */}
              <div className="p-3 rounded-2xl glass border border-[var(--color-glass-border)] flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-white">Result Placement:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMode('split')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      mode === 'split'
                        ? 'bg-indigo-500 text-white shadow-lg'
                        : 'text-[var(--color-text-muted)] hover:text-white'
                    }`}
                  >
                    ✂️ Slice into 2 Halves (Left + Right)
                  </button>
                  <button
                    onClick={() => setMode('whole')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      mode === 'whole'
                        ? 'bg-indigo-500 text-white shadow-lg'
                        : 'text-[var(--color-text-muted)] hover:text-white'
                    }`}
                  >
                    🖼️ Use Whole Cutout
                  </button>
                </div>
              </div>

              {/* Visual Result Preview */}
              {mode === 'split' ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Half Piece */}
                  <div className="p-4 rounded-2xl glass border border-emerald-500/40 bg-emerald-500/10 text-center space-y-2">
                    <div className="text-xs font-bold text-emerald-400">
                      🧩 Left Piece (Placed on Target Box)
                    </div>
                    <div
                      className="h-36 rounded-xl border border-white/10 flex items-center justify-center p-2 overflow-hidden shadow-inner"
                      style={{
                        backgroundImage:
                          'radial-gradient(#ffffff22 1px, transparent 0)',
                        backgroundSize: '12px 12px',
                        backgroundColor: '#18181b',
                      }}
                    >
                      {leftHalfUrl && (
                        <img
                          src={leftHalfUrl}
                          alt="Left Half"
                          className="max-h-full max-w-full object-contain"
                        />
                      )}
                    </div>
                  </div>

                  {/* Right Half Piece */}
                  <div className="p-4 rounded-2xl glass border border-indigo-500/40 bg-indigo-500/10 text-center space-y-2">
                    <div className="text-xs font-bold text-indigo-300">
                      ✈️ Right Piece (Slides in to Match)
                    </div>
                    <div
                      className="h-36 rounded-xl border border-white/10 flex items-center justify-center p-2 overflow-hidden shadow-inner"
                      style={{
                        backgroundImage:
                          'radial-gradient(#ffffff22 1px, transparent 0)',
                        backgroundSize: '12px 12px',
                        backgroundColor: '#18181b',
                      }}
                    >
                      {rightHalfUrl && (
                        <img
                          src={rightHalfUrl}
                          alt="Right Half"
                          className="max-h-full max-w-full object-contain"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl glass border border-indigo-500/40 text-center space-y-2 bg-black/20">
                  <div className="text-xs font-bold text-indigo-300">
                    🖼️ Clean Transparent PNG Cutout (Only Object Shows)
                  </div>
                  <div
                    className="h-44 rounded-xl border border-white/10 flex items-center justify-center p-2 overflow-hidden shadow-inner"
                    style={{
                      backgroundImage:
                        'radial-gradient(#ffffff22 1px, transparent 0)',
                      backgroundSize: '12px 12px',
                      backgroundColor: '#18181b',
                    }}
                  >
                    {processedImage && (
                      <img
                        src={processedImage}
                        alt="Processed Cutout"
                        className="max-h-full max-w-full object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-glass-border)] bg-[var(--color-bg-surface)] flex items-center justify-between">
          {step === 'preview' ? (
            <button
              onClick={() => {
                setStep('upload');
                setOriginalImage(null);
              }}
              className="btn-secondary text-xs px-4 py-2"
            >
              🔄 Pick Another File
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">
              Cancel
            </button>

            {step === 'preview' && (
              <button
                onClick={handleConfirmApply}
                className="btn-primary text-xs px-6 py-2 rounded-xl font-bold shadow-lg"
              >
                ✅ Apply Cutout to {roundName.split(' ')[0]}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
