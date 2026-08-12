interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  variant?: 'primary' | 'success' | 'secondary';
  indeterminate?: boolean;
}

export default function ProgressBar({
  progress,
  label,
  showPercentage = true,
  variant = 'primary',
  indeterminate = false,
}: ProgressBarProps) {
  const gradients = {
    primary: 'linear-gradient(135deg, var(--color-accent-indigo), var(--color-accent-purple))',
    success: 'linear-gradient(135deg, #059669, var(--color-accent-success))',
    secondary: 'linear-gradient(135deg, var(--color-accent-cyan), var(--color-accent-blue))',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-xs text-[var(--color-text-secondary)] font-medium">
              {label}
            </span>
          )}
          {showPercentage && !indeterminate && (
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 rounded-full bg-[var(--color-bg-primary)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            indeterminate ? 'animate-shimmer' : ''
          }`}
          style={{
            width: indeterminate ? '100%' : `${Math.min(100, Math.max(0, progress))}%`,
            background: indeterminate
              ? 'linear-gradient(90deg, transparent 0%, rgba(108, 99, 255, 0.4) 50%, transparent 100%)'
              : gradients[variant],
            backgroundSize: indeterminate ? '200% 100%' : undefined,
          }}
        />
      </div>
    </div>
  );
}
