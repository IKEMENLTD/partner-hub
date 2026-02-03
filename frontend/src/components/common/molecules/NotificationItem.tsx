import type { ReactNode } from 'react';
import { ToggleSwitch } from '../atoms/ToggleSwitch';

interface NotificationItemProps {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function NotificationItem({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: NotificationItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-gray-400">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
