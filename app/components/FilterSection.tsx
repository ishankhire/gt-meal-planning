interface FilterOption {
  key: string;
  label: string;
}

interface FilterSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  options: readonly FilterOption[];
  values: Record<string, boolean>;
  onChange: (key: string, checked: boolean) => void;
  loadingMessage?: string;
  className?: string;
}

export function FilterSection({ title, isOpen, onToggle, options, values, onChange, loadingMessage, className = 'mb-4' }: FilterSectionProps) {
  return (
    <div className={className}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left text-sm font-medium text-zinc-700 mb-2"
      >
        <span>{title}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div>
          {loadingMessage && (
            <p className="text-xs text-zinc-500 mb-2">{loadingMessage}</p>
          )}
          <div className="flex flex-wrap gap-4">
            {options.map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values[opt.key] ?? false}
                  onChange={(e) => onChange(opt.key, e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-zinc-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
