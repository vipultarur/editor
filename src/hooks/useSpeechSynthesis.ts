import { useState, useEffect, useCallback, useRef } from 'react';

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  isLocal: boolean;
}

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const synth = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    synth.current = window.speechSynthesis;

    const loadVoices = () => {
      const availableVoices = synth.current!.getVoices();
      const mapped: VoiceOption[] = availableVoices.map((voice) => ({
        voice,
        name: voice.name,
        lang: voice.lang,
        isLocal: voice.localService,
      }));
      // Sort: English first, then by name
      mapped.sort((a, b) => {
        const aEn = a.lang.startsWith('en');
        const bEn = b.lang.startsWith('en');
        if (aEn && !bEn) return -1;
        if (!aEn && bEn) return 1;
        return a.name.localeCompare(b.name);
      });
      setVoices(mapped);
    };

    loadVoices();
    synth.current.addEventListener('voiceschanged', loadVoices);

    return () => {
      synth.current?.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const speak = useCallback(
    (
      text: string,
      voice: SpeechSynthesisVoice,
      options?: { rate?: number; pitch?: number; volume?: number }
    ) => {
      if (!synth.current) return;

      // Cancel any current speech
      synth.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.rate = options?.rate ?? 1;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentUtterance(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentUtterance(null);
      };

      setCurrentUtterance(utterance);
      synth.current.speak(utterance);
    },
    []
  );

  const stop = useCallback(() => {
    if (!synth.current) return;
    synth.current.cancel();
    setIsSpeaking(false);
    setCurrentUtterance(null);
  }, []);

  const previewVoice = useCallback(
    (voice: SpeechSynthesisVoice) => {
      const sampleText = 'Hello! This is a preview of how this voice sounds. Welcome to ClipVoice Studio.';
      speak(sampleText, voice);
    },
    [speak]
  );

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return {
    voices,
    isSpeaking,
    currentUtterance,
    speak,
    stop,
    previewVoice,
    isSupported,
  };
}
