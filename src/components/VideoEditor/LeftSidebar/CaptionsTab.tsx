import { useState } from 'react';
import { Subtitles, Plus, Download, Upload, Mic, Trash2 } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { CaptionClip } from '../../../types/editor';

export default function CaptionsTab() {
  const { project, dispatch } = useEditor();
  const [newCaptionText, setNewCaptionText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const addManualCaption = () => {
    if (!newCaptionText.trim()) return;
    const targetTrack = project.tracks.find((t) => t.type === 'caption') || project.tracks[0];
    const clipId = 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const captionClip: CaptionClip = {
      id: clipId,
      trackId: targetTrack.id,
      type: 'caption',
      name: `Caption: ${newCaptionText.slice(0, 15)}...`,
      startTime: project.playheadTime,
      duration: 3,
      trimStart: 0,
      trimEnd: 3,
      layer: 20,
      text: newCaptionText.trim(),
      fontFamily: 'Inter',
      fontSize: 32,
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      position: 'bottom',
      align: 'center',
    };

    dispatch({ type: 'ADD_CLIP', payload: { clip: captionClip, trackId: targetTrack.id } });
    setNewCaptionText('');
  };

  const handleSRTUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsedCaptions = parseSRT(text);
      const targetTrack = project.tracks.find((t) => t.type === 'caption') || project.tracks[0];

      parsedCaptions.forEach((cap, idx) => {
        const clipId = `clip-srt-${Date.now()}-${idx}`;
        const duration = Math.max(1, cap.end - cap.start);
        const captionClip: CaptionClip = {
          id: clipId,
          trackId: targetTrack.id,
          type: 'caption',
          name: `Subtitle ${idx + 1}`,
          startTime: cap.start,
          duration,
          trimStart: 0,
          trimEnd: duration,
          layer: 20,
          text: cap.text,
          fontFamily: 'Inter',
          fontSize: 32,
          color: '#FFFFFF',
          backgroundColor: 'rgba(0,0,0,0.75)',
          position: 'bottom',
          align: 'center',
        };
        dispatch({ type: 'ADD_CLIP', payload: { clip: captionClip, trackId: targetTrack.id } });
      });
    };
    reader.readAsText(file);
  };

  const exportSRTFile = () => {
    let srtContent = '';
    let counter = 1;

    project.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        if (clip.type === 'caption') {
          const start = formatSRTTime(clip.startTime);
          const end = formatSRTTime(clip.startTime + clip.duration);
          srtContent += `${counter}\n${start} --> ${end}\n${clip.text}\n\n`;
          counter++;
        }
      });
    });

    if (!srtContent) {
      alert('No captions found on timeline to export.');
      return;
    }

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'captions.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setIsTranscribing(true);
    recognition.onend = () => setIsTranscribing(false);
    recognition.onerror = () => setIsTranscribing(false);

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      if (transcript) {
        setNewCaptionText(transcript);
      }
    };

    recognition.start();
  };

  // Collect all active timeline caption clips
  const captionClips: CaptionClip[] = [];
  project.tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      if (clip.type === 'caption') captionClips.push(clip);
    });
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">Captions & Subtitles</h3>

      {/* Manual Add Input */}
      <div className="glass rounded-xl p-3 mb-4 space-y-2">
        <textarea
          rows={2}
          placeholder="Type caption line..."
          value={newCaptionText}
          onChange={(e) => setNewCaptionText(e.target.value)}
          className="input-field text-xs w-full resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={addManualCaption}
            disabled={!newCaptionText.trim()}
            className="btn-primary flex-1 text-xs py-1.5 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add at {project.playheadTime.toFixed(1)}s
          </button>

          <button
            onClick={startSpeechRecognition}
            title="Auto Speech-to-Text"
            className={`glass p-2 rounded-lg ${isTranscribing ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`}
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Import / Export SRT */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <label className="glass hover:border-indigo-500/50 rounded-xl p-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)] cursor-pointer">
          <Upload className="w-3.5 h-3.5 text-indigo-400" /> Import SRT
          <input type="file" accept=".srt,.vtt" onChange={handleSRTUpload} className="hidden" />
        </label>

        <button
          onClick={exportSRTFile}
          className="glass hover:border-emerald-500/50 rounded-xl p-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" /> Export SRT
        </button>
      </div>

      {/* Subtitle Line List */}
      <p className="text-xs font-bold text-[var(--color-text-primary)] mb-2">Timeline Subtitles ({captionClips.length})</p>

      <div className="space-y-2 scrollable-y flex-1 pr-1">
        {captionClips.map((cap) => (
          <div
            key={cap.id}
            onClick={() => dispatch({ type: 'SET_SELECTED_CLIP', payload: cap.id })}
            className={`glass rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all ${
              project.selectedClipId === cap.id ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10' : 'hover:bg-white/5'
            }`}
          >
            <div className="min-w-0 flex-1 pr-2">
              <span className="text-[0.625rem] font-mono text-indigo-300 block">
                {cap.startTime.toFixed(1)}s - {(cap.startTime + cap.duration).toFixed(1)}s
              </span>
              <p className="text-xs text-[var(--color-text-primary)] truncate font-medium">{cap.text}</p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'DELETE_CLIP', payload: cap.id });
              }}
              className="p-1 text-red-400 hover:bg-red-500/20 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {captionClips.length === 0 && (
          <div className="text-center py-6 text-xs text-[var(--color-text-muted)]">
            No caption segments added yet.
          </div>
        )}
      </div>
    </div>
  );
}

function parseSRT(data: string): { start: number; end: number; text: string }[] {
  const items: { start: number; end: number; text: string }[] = [];
  const blocks = data.replace(/\r/g, '').split('\n\n');

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length >= 2) {
      const timeLine = lines.find((l) => l.includes('-->'));
      if (timeLine) {
        const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
        const textLines = lines.slice(lines.indexOf(timeLine) + 1).join(' ');
        items.push({
          start: parseSRTTime(startStr),
          end: parseSRTTime(endStr),
          text: textLines,
        });
      }
    }
  }
  return items;
}

function parseSRTTime(str: string): number {
  const parts = str.replace(',', '.').split(':');
  if (parts.length < 3) return 0;
  const h = parseFloat(parts[0]);
  const m = parseFloat(parts[1]);
  const s = parseFloat(parts[2]);
  return h * 3600 + m * 60 + s;
}

function formatSRTTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function pad(num: number, len = 2): string {
  return String(num).padStart(len, '0');
}
