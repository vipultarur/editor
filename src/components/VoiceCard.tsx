interface VoiceCardProps {
  voiceName: string;
  voiceLang: string;
  isLocal: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  index: number;
}

export default function VoiceCard({
  voiceName,
  voiceLang,
  isLocal,
  isPlaying,
  onPlay,
  onStop,
  index,
}: VoiceCardProps) {
  // Get a friendly display name
  const displayName = voiceName
    .replace(/Microsoft\s+/i, '')
    .replace(/Google\s+/i, '')
    .replace(/\s+Online.*$/i, '')
    .replace(/\s+Desktop.*$/i, '');

  // Get language flag
  const langPrefix = voiceLang.split('-')[0];
  const flags: Record<string, string> = {
    en: '🇺🇸',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    it: '🇮🇹',
    pt: '🇧🇷',
    ja: '🇯🇵',
    ko: '🇰🇷',
    zh: '🇨🇳',
    hi: '🇮🇳',
    ar: '🇸🇦',
    ru: '🇷🇺',
    nl: '🇳🇱',
    pl: '🇵🇱',
    sv: '🇸🇪',
    da: '🇩🇰',
    fi: '🇫🇮',
    nb: '🇳🇴',
    tr: '🇹🇷',
    th: '🇹🇭',
    vi: '🇻🇳',
    id: '🇮🇩',
  };
  const flag = flags[langPrefix] || '🌐';

  return (
    <div
      className={`
        card flex items-center gap-3 animate-fade-in cursor-pointer
        transition-all duration-200
        ${isPlaying ? 'ring-2 ring-[var(--color-accent-indigo)] bg-[var(--color-accent-indigo)]/5' : ''}
      `}
      style={{ animationDelay: `${index * 0.02}s` }}
      onClick={isPlaying ? onStop : onPlay}
    >
      {/* Play Button */}
      <button
        className={`
          w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0
          transition-all duration-200 border-0 cursor-pointer
          ${
            isPlaying
              ? 'gradient-primary text-white shadow-lg shadow-[var(--color-accent-indigo)]/25'
              : 'glass text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }
        `}
      >
        {isPlaying ? (
          <div className="flex items-center gap-0.5">
            <span className="w-0.5 h-3 bg-white rounded-full animate-[waveform-pulse_0.5s_ease-in-out_infinite]" />
            <span className="w-0.5 h-3 bg-white rounded-full animate-[waveform-pulse_0.5s_ease-in-out_0.15s_infinite]" />
            <span className="w-0.5 h-3 bg-white rounded-full animate-[waveform-pulse_0.5s_ease-in-out_0.3s_infinite]" />
          </div>
        ) : (
          '▶'
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
          {displayName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[0.6875rem] text-[var(--color-text-muted)]">
            {flag} {voiceLang}
          </span>
          {isLocal && (
            <span className="badge badge-success text-[0.5625rem]">Local</span>
          )}
        </div>
      </div>
    </div>
  );
}
