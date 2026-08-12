import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import { Upload, Search, Plus, Film, Image as ImageIcon, Music, Trash2 } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { MediaAsset, VideoMediaClip, ImageClip, AudioClip } from '../../../types/editor';
import { createSampleImageBlob } from '../../../utils/sampleAssets';

import { useSession } from '../../../state/SessionContext';

export default function MediaTab() {
  const { project, dispatch } = useEditor();
  const { dispatch: sessionDispatch } = useSession();
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isAudio && !isImage) {
        alert(`Unsupported file format: ${file.name}`);
        return;
      }

      const blobUrl = URL.createObjectURL(file);
      const mediaType = isVideo ? 'video' : isAudio ? 'audio' : 'image';

      if (isVideo || isAudio) {
        const mediaElem = document.createElement(isVideo ? 'video' : 'audio');
        mediaElem.src = blobUrl;
        mediaElem.onloadedmetadata = () => {
          const newAsset: MediaAsset = {
            id: 'media-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: file.name,
            type: mediaType,
            blobUrl,
            file,
            size: file.size,
            duration: mediaElem.duration || 5,
            width: (mediaElem as HTMLVideoElement).videoWidth || 1920,
            height: (mediaElem as HTMLVideoElement).videoHeight || 1080,
            createdAt: Date.now(),
          };
          dispatch({ type: 'ADD_MEDIA_ASSET', payload: newAsset });
        };
      } else {
        const img = new Image();
        img.src = blobUrl;
        img.onload = () => {
          const newAsset: MediaAsset = {
            id: 'media-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: file.name,
            type: 'image',
            blobUrl,
            file,
            size: file.size,
            duration: 0,
            width: img.width || 1080,
            height: img.height || 1080,
            createdAt: Date.now(),
          };
          dispatch({ type: 'ADD_MEDIA_ASSET', payload: newAsset });
        };
      }
    });
  };

  const addAssetToTimeline = (asset: MediaAsset) => {
    const startTime = project.playheadTime;
    const clipId = 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const selectedTrack = project.tracks.find((t) => t.id === project.selectedTrackId);

    if (asset.type === 'video') {
      const targetTrack = (selectedTrack && (selectedTrack.type === 'video' || selectedTrack.type === 'image'))
        ? selectedTrack
        : project.tracks.find((t) => t.type === 'video') || project.tracks[0];
      const videoClip: VideoMediaClip = {
        id: clipId,
        trackId: targetTrack ? targetTrack.id : '',
        type: 'video',
        name: asset.name,
        startTime,
        duration: Math.min(10, asset.duration || 5),
        trimStart: 0,
        trimEnd: Math.min(10, asset.duration || 5),
        layer: 1,
        mediaId: asset.id,
        blobUrl: asset.blobUrl,
        sourceDuration: asset.duration || 5,
        originalWidth: asset.width || 1920,
        originalHeight: asset.height || 1080,
        x: 0,
        y: 0,
        width: project.canvas.width,
        height: project.canvas.height,
        rotation: 0,
        scale: 1,
        opacity: 1,
        flipH: false,
        flipV: false,
        filters: { preset: 'normal', brightness: 100, contrast: 100, saturation: 100, exposure: 0, temperature: 0, tint: 0, blur: 0, opacity: 100 },
        volume: 1,
        muted: false,
        fadeIn: 0,
        fadeOut: 0,
      };
      dispatch({ type: 'ADD_CLIP', payload: { clip: videoClip, trackId: targetTrack?.id } });
    } else if (asset.type === 'image') {
      const targetTrack = (selectedTrack && (selectedTrack.type === 'video' || selectedTrack.type === 'image'))
        ? selectedTrack
        : project.tracks.find((t) => t.type === 'video' || t.type === 'image') || project.tracks[0];
      const imgClip: ImageClip = {
        id: clipId,
        trackId: targetTrack ? targetTrack.id : '',
        type: 'image',
        name: asset.name,
        startTime,
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
        layer: 1,
        mediaId: asset.id,
        blobUrl: asset.blobUrl,
        originalWidth: asset.width || 1080,
        originalHeight: asset.height || 1080,
        x: 0,
        y: 0,
        width: project.canvas.width,
        height: project.canvas.height,
        rotation: 0,
        scale: 1,
        opacity: 1,
        flipH: false,
        flipV: false,
        filters: { preset: 'normal', brightness: 100, contrast: 100, saturation: 100, exposure: 0, temperature: 0, tint: 0, blur: 0, opacity: 100 },
      };
      dispatch({ type: 'ADD_CLIP', payload: { clip: imgClip, trackId: targetTrack?.id } });
    } else if (asset.type === 'audio') {
      const targetTrack = (selectedTrack && selectedTrack.type === 'audio')
        ? selectedTrack
        : project.tracks.find((t) => t.type === 'audio') || project.tracks[0];
      const audioClip: AudioClip = {
        id: clipId,
        trackId: targetTrack ? targetTrack.id : '',
        type: 'audio',
        name: asset.name,
        startTime,
        duration: asset.duration || 5,
        trimStart: 0,
        trimEnd: asset.duration || 5,
        layer: 1,
        mediaId: asset.id,
        blobUrl: asset.blobUrl,
        volume: 1,
        muted: false,
        fadeIn: 0,
        fadeOut: 0,
      };
      dispatch({ type: 'ADD_CLIP', payload: { clip: audioClip, trackId: targetTrack?.id } });
    }
  };

  const addStockSampleImage = (name: string, c1: string, c2: string) => {
    const dataUrl = createSampleImageBlob(name, c1, c2);
    const newAsset: MediaAsset = {
      id: 'media-stock-' + Date.now(),
      name: `${name} Background`,
      type: 'image',
      blobUrl: dataUrl,
      size: 1024 * 50,
      duration: 0,
      width: 1920,
      height: 1080,
      createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_MEDIA_ASSET', payload: newAsset });
    addAssetToTimeline(newAsset);
  };

  const filteredAssets = project.mediaAssets.filter((asset) => {
    if (filterType !== 'all' && asset.type !== filterType) return false;
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Media Library</h3>
        <span className="text-[0.6875rem] text-[var(--color-text-muted)]">{project.mediaAssets.length} items</span>
      </div>

      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e: DragEvent) => e.preventDefault()}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        className="glass rounded-xl p-4 border-2 border-dashed border-[var(--color-accent-primary)]/40 hover:border-[var(--color-accent-primary)] text-center cursor-pointer transition-all mb-2 group"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleFileUpload(e.target.files)}
          className="hidden"
        />
        <Upload className="w-6 h-6 mx-auto text-[var(--color-accent-primary)] mb-1 group-hover:scale-110 transition-transform" />
        <p className="text-xs font-semibold text-[var(--color-text-primary)]">Import Media Files</p>
        <p className="text-[0.625rem] text-[var(--color-text-muted)] mt-0.5">
          MP4, WebM, MOV, MP3, WAV, JPG, PNG, GIF
        </p>
      </div>

      {/* YouTube / Instagram Downloader Shortcut */}
      <button
        onClick={() => sessionDispatch({ type: 'SET_TAB', payload: 'downloader' })}
        className="w-full mb-4 p-2.5 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-pink-500/10 hover:border-red-500/60 text-xs font-bold text-red-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
      >
        <span>📥 Download from YouTube / Instagram</span>
      </button>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field text-xs pl-8 py-1.5 w-full"
          />
        </div>
      </div>

      <div className="flex gap-1 mb-3 bg-black/20 p-1 rounded-lg text-[0.6875rem]">
        {(['all', 'video', 'audio', 'image'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`flex-1 py-1 rounded capitalize font-medium transition-all ${
              filterType === type ? 'bg-[var(--color-accent-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Media Asset List */}
      <div className="flex-1 scrollable-y pr-1 space-y-2">
        {filteredAssets.map((asset) => (
          <div
            key={asset.id}
            onClick={() => addAssetToTimeline(asset)}
            className="glass rounded-xl p-2.5 flex items-center gap-3 cursor-pointer hover:border-[var(--color-accent-primary)]/50 group transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
              {asset.type === 'image' && <img src={asset.blobUrl} alt={asset.name} className="w-full h-full object-cover" />}
              {asset.type === 'video' && (
                <div className="relative w-full h-full flex items-center justify-center bg-indigo-950">
                  <Film className="w-5 h-5 text-indigo-400" />
                </div>
              )}
              {asset.type === 'audio' && (
                <div className="relative w-full h-full flex items-center justify-center bg-emerald-950">
                  <Music className="w-5 h-5 text-emerald-400" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{asset.name}</p>
              <div className="flex items-center gap-2 text-[0.625rem] text-[var(--color-text-muted)] mt-0.5">
                <span className="capitalize">{asset.type}</span>
                {asset.duration > 0 && <span>• {asset.duration.toFixed(1)}s</span>}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'REMOVE_MEDIA_ASSET', payload: asset.id });
              }}
              title="Delete asset"
              className="p-1 rounded text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                addAssetToTimeline(asset);
              }}
              title="Add to timeline"
              className="p-1.5 rounded-lg bg-[var(--color-accent-primary)] text-white hover:scale-105 transition-transform"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {filteredAssets.length === 0 && (
          <div className="text-center py-6 text-xs text-[var(--color-text-muted)]">
            <p>No media files found.</p>
            <p className="mt-1 text-[0.625rem]">Upload your media or click sample presets below!</p>
          </div>
        )}

        {/* Stock Sample Backgrounds section */}
        <div className="mt-6 pt-4 border-t border-[var(--color-glass-border)]">
          <p className="text-[0.6875rem] font-bold text-[var(--color-text-primary)] mb-2">Quick Stock Backgrounds</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => addStockSampleImage('NEON NIGHT', '#1e1b4b', '#ec4899')}
              className="glass p-2 rounded-lg text-left text-[0.625rem] font-semibold text-pink-300 hover:bg-pink-500/10 border-pink-500/30"
            >
              🌌 Neon Night
            </button>
            <button
              onClick={() => addStockSampleImage('SUNSET GLOW', '#f97316', '#db2777')}
              className="glass p-2 rounded-lg text-left text-[0.625rem] font-semibold text-orange-300 hover:bg-orange-500/10 border-orange-500/30"
            >
              🌅 Sunset Glow
            </button>
            <button
              onClick={() => addStockSampleImage('CYBER BLUE', '#0284c7', '#6366f1')}
              className="glass p-2 rounded-lg text-left text-[0.625rem] font-semibold text-sky-300 hover:bg-sky-500/10 border-sky-500/30"
            >
              ⚡ Cyber Blue
            </button>
            <button
              onClick={() => addStockSampleImage('FOREST MIST', '#059669', '#10b981')}
              className="glass p-2 rounded-lg text-left text-[0.625rem] font-semibold text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30"
            >
              🌿 Forest Mist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
