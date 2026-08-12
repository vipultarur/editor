import { useState, useRef } from 'react';
import { Music, Mic, Plus, Upload, Square } from 'lucide-react';
import { useEditor } from '../../../state/EditorContext';
import type { AudioClip, MediaAsset } from '../../../types/editor';
import { generateSynthMusicBlob } from '../../../utils/sampleAssets';

export default function AudioTab() {
  const { project, dispatch } = useEditor();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const addAudioClipToTimeline = (blobUrl: string, name: string, duration: number) => {
    const selectedTrack = project.tracks.find((t) => t.id === project.selectedTrackId);
    const targetTrack = selectedTrack && selectedTrack.type === 'audio'
      ? selectedTrack
      : project.tracks.find((t) => t.type === 'audio');

    const clipId = 'clip-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const audioClip: AudioClip = {
      id: clipId,
      trackId: targetTrack ? targetTrack.id : '',
      type: 'audio',
      name,
      startTime: project.playheadTime,
      duration: Math.max(1, duration),
      trimStart: 0,
      trimEnd: Math.max(1, duration),
      layer: 1,
      mediaId: 'media-' + Date.now(),
      blobUrl,
      volume: 1.0,
      muted: false,
      fadeIn: 0,
      fadeOut: 0,
    };

    dispatch({ type: 'ADD_CLIP', payload: { clip: audioClip, trackId: targetTrack?.id } });
  };

  const handleGenerateSynthMusic = async (type: 'upbeat' | 'chill' | 'sfx') => {
    const blob = await generateSynthMusicBlob(type);
    const url = URL.createObjectURL(blob);
    const name = type === 'upbeat' ? 'Upbeat Grooves' : type === 'chill' ? 'Lofi Chill Vibes' : 'Pop Sound Effect';
    const duration = type === 'sfx' ? 1.5 : 10;

    const newAsset: MediaAsset = {
      id: 'media-audio-' + Date.now(),
      name,
      type: 'audio',
      blobUrl: url,
      size: blob.size,
      duration,
      createdAt: Date.now(),
    };

    dispatch({ type: 'ADD_MEDIA_ASSET', payload: newAsset });
    addAudioClipToTimeline(url, name, duration);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);

    audio.onloadedmetadata = () => {
      const newAsset: MediaAsset = {
        id: 'media-audio-' + Date.now(),
        name: file.name,
        type: 'audio',
        blobUrl: url,
        file,
        size: file.size,
        duration: audio.duration || 5,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_MEDIA_ASSET', payload: newAsset });
      addAudioClipToTimeline(url, file.name, audio.duration || 5);
    };
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        const name = `Voiceover ${new Date().toLocaleTimeString()}`;
        const duration = recordingTime || 3;

        addAudioClipToTimeline(url, name, duration);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone permission required for voice recording.');
      console.error('Recording error:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4">
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">Audio & Music</h3>

      {/* Voice Recorder Tool */}
      <div className="glass rounded-xl p-3.5 mb-4 border border-[var(--color-accent-primary)]/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[var(--color-accent-primary)]" />
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">Record Voiceover</span>
          </div>
          {isRecording && <span className="text-[0.6875rem] font-bold text-red-400 animate-pulse">{recordingTime}s</span>}
        </div>

        {!isRecording ? (
          <button
            onClick={startVoiceRecording}
            className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-2"
          >
            <Mic className="w-3.5 h-3.5" /> Start Recording
          </button>
        ) : (
          <button
            onClick={stopVoiceRecording}
            className="btn-danger w-full text-xs py-2 flex items-center justify-center gap-2"
          >
            <Square className="w-3.5 h-3.5" /> Stop & Save
          </button>
        )}
      </div>

      {/* Custom Audio File Upload */}
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioUpload}
        className="hidden"
      />
      <button
        onClick={() => audioFileInputRef.current?.click()}
        className="glass hover:border-[var(--color-accent-primary)]/50 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--color-text-primary)] mb-4 transition-all"
      >
        <Upload className="w-4 h-4 text-emerald-400" /> Upload Audio File
      </button>

      {/* Preset Music Library */}
      <p className="text-xs font-bold text-[var(--color-text-primary)] mb-2">Stock Royalty-Free Audio</p>

      <div className="space-y-2 scrollable-y flex-1 pr-1">
        <div className="glass rounded-xl p-3 flex items-center justify-between hover:border-indigo-500/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">Upbeat Grooves</p>
              <p className="text-[0.625rem] text-[var(--color-text-muted)]">Energetic background tune (10s)</p>
            </div>
          </div>
          <button
            onClick={() => handleGenerateSynthMusic('upbeat')}
            className="p-1.5 rounded-lg bg-[var(--color-accent-primary)] text-white hover:scale-105 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="glass rounded-xl p-3 flex items-center justify-between hover:border-purple-500/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">Lofi Chill Vibes</p>
              <p className="text-[0.625rem] text-[var(--color-text-muted)]">Calm ambient melody (10s)</p>
            </div>
          </div>
          <button
            onClick={() => handleGenerateSynthMusic('chill')}
            className="p-1.5 rounded-lg bg-[var(--color-accent-primary)] text-white hover:scale-105 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="glass rounded-xl p-3 flex items-center justify-between hover:border-emerald-500/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">Pop Sound Effect</p>
              <p className="text-[0.625rem] text-[var(--color-text-muted)]">Accent transition SFX (1.5s)</p>
            </div>
          </div>
          <button
            onClick={() => handleGenerateSynthMusic('sfx')}
            className="p-1.5 rounded-lg bg-[var(--color-accent-primary)] text-white hover:scale-105 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
