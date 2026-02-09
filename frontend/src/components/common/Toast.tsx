import { useEffect, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';
import { ToastContext, ToastMessage } from './ToastContext';

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 left-4 right-4 sm:left-auto z-50 flex flex-col gap-2 sm:max-w-sm"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastProps {
  toast: ToastMessage;
  onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
  const { type, title, message, duration = 5000 } = toast;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const styles = {
    success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
    error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
    info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
  };

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-right-full fade-in duration-300',
        styles[type]
      )}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {message && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-500 dark:hover:bg-gray-700"
        aria-label="閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
