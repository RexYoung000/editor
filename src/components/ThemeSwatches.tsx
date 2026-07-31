import type { CustomAnswerKeyboardTheme } from '../elements/keyboardPresets';

const THEME_OPTIONS: Array<{
  value: CustomAnswerKeyboardTheme;
  label: string;
  color: string;
}> = [
  { value: 'yellow', label: '黄色', color: '#f5c84b' },
  { value: 'blue', label: '蓝色', color: '#55a7e8' },
  { value: 'green', label: '绿色', color: '#69b77d' },
];

interface Props {
  value?: CustomAnswerKeyboardTheme;
  onChange: (theme: CustomAnswerKeyboardTheme) => void;
  labelSuffix?: string;
  disabled?: boolean;
}

export default function ThemeSwatches({ value, onChange, labelSuffix = '皮肤', disabled = false }: Props) {
  return (
    <div className="flex gap-1.5">
      {THEME_OPTIONS.map((option) => {
        const selected = value === option.value;
        const label = `${option.label}${labelSuffix}`;
        return (
          <button
            key={option.value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              selected ? 'border-blue-400 bg-blue-500/20' : 'border-slate-600 bg-slate-800 hover:border-slate-400'
            }`}
          >
            <span
              className="h-4 w-4 rounded-sm border border-white/40"
              style={{ backgroundColor: option.color }}
            />
          </button>
        );
      })}
    </div>
  );
}
