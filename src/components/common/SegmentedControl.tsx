import React from 'react';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex(opt => opt.value === value);

  return (
    <div className="relative p-1 bg-zinc-200/80 dark:bg-zinc-800/90 rounded-xl flex items-center border border-black/5 dark:border-white/5 backdrop-blur-md">
      {/* Sliding Active Pill Background */}
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-zinc-700 shadow-sm transition-all duration-200 ease-out"
        style={{
          width: `calc(${100 / options.length}% - 2px)`,
          left: `calc(${(100 / options.length) * (activeIndex >= 0 ? activeIndex : 0)}% + 1px)`,
        }}
      />

      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex-1 text-center font-medium transition-colors duration-150 ios-active ${
              size === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-xs sm:text-sm'
            } ${
              isSelected
                ? 'text-zinc-900 dark:text-zinc-50 font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
