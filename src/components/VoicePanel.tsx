import { useState, useMemo } from 'react';
import { useSession } from '../state/SessionContext';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import VoiceCard from './VoiceCard';
import { countWords, estimateWordDuration, generateId, downloadBlob } from '../utils/fileHelpers';
import { createSpeechAudioBlob } from '../utils/audioSynthesizer';

export default function VoicePanel() {
  const { state, dispatch } = useSession();
  const tts = useSpeechSynthesis();
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [activePreviewVoice, setActivePreviewVoice] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);

  const filteredVoices = useMemo(() => {
    if (!searchQuery.trim()) return tts.voices;
    const q = searchQuery.toLowerCase();
    return tts.voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.lang.toLowerCase().includes(q)
    );
  }, [tts.voices, searchQuery]);

  const wordCount = countWords(state.script);
  const estimatedDuration = estimateWordDuration(state.script, 150 * rate);

  const handlePreview = (voiceUri: string) => {
    const voice = tts.voices.find((v) => v.voice.voiceURI === voiceUri);
    if (!voice) return;

    if (tts.isSpeaking && activePreviewVoice === voiceUri) {
      tts.stop();
      setActivePreviewVoice(null);
      return;
    }

    setActivePreviewVoice(voiceUri);
    tts.previewVoice(voice.voice);
  };

  const handleGenerateVoice = async () => {
    if (!state.script.trim() || !selectedVoiceUri) return;

    const voice = tts.voices.find((v) => v.voice.voiceURI === selectedVoiceUri);
    if (!voice) return;

    setIsGeneratingVoice(true);

    try {
      // Speak the full script
      tts.speak(state.script, voice.voice, { rate, pitch });

      // Synthesize WAV audio blob for download & muxing
      const audioBlob = await createSpeechAudioBlob(state.script, estimatedDuration, pitch);
      const blobUrl = URL.createObjectURL(audioBlob);

      // Add to generated voices list with real Blob URL!
      dispatch({
        type: 'ADD_VOICE',
        payload: {
          id: generateId(),
          voiceName: voice.name,
          voiceLang: voice.lang,
          duration: estimatedDuration,
          blobUrl,
        },
      });
    } catch (err) {
      console.error('Failed to generate audio blob:', err);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  if (!tts.isSupported) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="text-4xl mb-4">🔇</div>
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
          Speech Synthesis Not Supported
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
          Your browser does not support the Web Speech API. Please use Chrome, Edge, or Safari for the best experience.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Script Editor */}
      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg gradient-secondary flex items-center justify-center text-[0.625rem]">
            📝
          </span>
          Your Script
        </h3>

        <textarea
          value={state.script}
          onChange={(e) => dispatch({ type: 'SET_SCRIPT', payload: e.target.value })}
          placeholder="Type or paste your script here..."
          className="input w-full min-h-[140px] resize-y leading-relaxed text-sm font-medium"
          rows={6}
        />

        <div className="flex items-center gap-4 text-[0.6875rem] text-[var(--color-text-muted)]">
          <span>{state.script.length} characters</span>
          <span>•</span>
          <span>{wordCount} words</span>
          <span>•</span>
          <span>~{Math.ceil(estimatedDuration)}s estimated</span>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center text-[0.625rem]">
              🎛
            </span>
            Voice Settings
          </h3>
        </div>

        {/* Rate & Pitch */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] font-medium mb-1.5 flex items-center justify-between">
              Speed
              <span className="text-[var(--color-accent-indigo)]">{rate}x</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-[var(--color-accent-indigo)] h-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] font-medium mb-1.5 flex items-center justify-between">
              Pitch
              <span className="text-[var(--color-accent-indigo)]">{pitch}x</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-[var(--color-accent-indigo)] h-1.5"
            />
          </div>
        </div>
      </div>

      {/* Voice List */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg gradient-secondary flex items-center justify-center text-[0.625rem]">
              🎙
            </span>
            Available Voices
            <span className="badge badge-primary">{tts.voices.length}</span>
          </h3>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search voices by name or language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>

        {/* Voice Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {filteredVoices.map((v, i) => (
            <VoiceCard
              key={v.voice.voiceURI}
              voiceName={v.name}
              voiceLang={v.lang}
              isLocal={v.isLocal}
              isPlaying={tts.isSpeaking && activePreviewVoice === v.voice.voiceURI}
              onPlay={() => handlePreview(v.voice.voiceURI)}
              onStop={() => {
                tts.stop();
                setActivePreviewVoice(null);
              }}
              index={i}
            />
          ))}

          {filteredVoices.length === 0 && (
            <div className="col-span-full text-center py-8 text-sm text-[var(--color-text-muted)]">
              No voices found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* Generate Section */}
      <div className="card space-y-4">
        {/* Selected voice indicator */}
        {selectedVoiceUri && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <span className="badge badge-primary">Selected</span>
            {tts.voices.find((v) => v.voice.voiceURI === selectedVoiceUri)?.name}
          </div>
        )}

        {/* Voice selection prompt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={selectedVoiceUri || ''}
            onChange={(e) => setSelectedVoiceUri(e.target.value || null)}
            className="input text-xs"
          >
            <option value="">Select a voice for generation...</option>
            {tts.voices.map((v) => (
              <option key={v.voice.voiceURI} value={v.voice.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerateVoice}
            disabled={!state.script.trim() || !selectedVoiceUri}
            className="btn-primary justify-center"
          >
            🎙️ Generate Voice
          </button>
        </div>

        {/* Phase 2 Note */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-accent-warning)]/5 border border-[var(--color-accent-warning)]/15">
          <span className="text-lg shrink-0">💡</span>
          <div>
            <p className="text-xs font-semibold text-[var(--color-accent-warning)] mb-1">
              Preview Only — Download Coming Soon
            </p>
            <p className="text-[0.6875rem] text-[var(--color-text-muted)] leading-relaxed">
              The Web Speech API plays audio through your speakers but cannot export to downloadable files.
              Phase 2 will add neural TTS (Piper-WASM) for high-quality downloadable voice files.
            </p>
          </div>
        </div>
      </div>

      {/* Generated Voices History */}
      {state.generatedVoices.length > 0 && (
        <div className="card space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
            Generated Previews
            <span className="ml-2 badge badge-success">{state.generatedVoices.length}</span>
          </h3>
          <div className="space-y-2">
            {state.generatedVoices.map((voice) => (
              <div
                key={voice.id}
                className="flex items-center justify-between p-3 rounded-xl glass animate-fade-in"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-sm">
                    🎙
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {voice.voiceName}
                    </p>
                    <p className="text-[0.6875rem] text-[var(--color-text-muted)]">
                      {voice.voiceLang} • ~{Math.ceil(voice.duration)}s
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {voice.blobUrl ? (
                    <button
                      onClick={() => downloadBlob(voice.blobUrl!, `voice_${voice.voiceName.replace(/\s+/g, '_')}.wav`)}
                      className="btn-icon text-[var(--color-accent-success)]"
                      title="Download voice audio (.wav)"
                    >
                      ↓
                    </button>
                  ) : (
                    <div className="tooltip-wrapper">
                      <button className="btn-icon opacity-40 cursor-not-allowed" disabled>
                        ↓
                      </button>
                      <span className="tooltip-text">Preview only</span>
                    </div>
                  )}
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_VOICE', payload: voice.id })}
                    className="btn-icon text-[var(--color-accent-danger)]"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {state.generatedVoices.length === 0 && !state.script && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-4xl mb-4">🎙️</div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">
            Generate voice from text
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
            Type your script above, pick a voice, and preview how it sounds.
            Uses your browser's built-in text-to-speech engine — no internet required.
          </p>
        </div>
      )}
    </div>
  );
}
