import clsx from 'clsx';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  description?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  description,
}: ToggleSwitchProps) {
  const sizeStyles = {
    sm: { button: 'h-5 w-9', toggle: 'h-4 w-4', translate: 'translate-x-4' },
    md: { button: 'h-6 w-11', toggle: 'h-5 w-5', translate: 'translate-x-5' },
  };
  const styles = sizeStyles[size];

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        styles.button,
        checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-slate-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={clsx(
          'pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          styles.toggle,
          checked ? styles.translate : 'translate-x-0'
        )}
      />
    </button>
  );

  if (!label) return toggle;

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {toggle}
    </div>
  );
}
