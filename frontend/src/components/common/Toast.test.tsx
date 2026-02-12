import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from './Toast';
import { useToast } from './ToastContext';

// Helper component to trigger toast actions
function ToastTrigger({ type, title, message, duration }: {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}) {
  const { addToast } = useToast();
  return (
    <button onClick={() => addToast({ type, title, message, duration })}>
      Add Toast
    </button>
  );
}

function RemoveToastTrigger() {
  const { toasts, removeToast } = useToast();
  return (
    <button onClick={() => toasts.length > 0 && removeToast(toasts[0].id)}>
      Remove Toast
    </button>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <p>App content</p>
        </ToastProvider>
      );
      expect(screen.getByText('App content')).toBeInTheDocument();
    });

    it('should render toast container with aria-live', () => {
      render(
        <ToastProvider>
          <p>Content</p>
        </ToastProvider>
      );
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });
  });

  describe('Adding Toasts', () => {
    it('should display a success toast', () => {
      render(
        <ToastProvider>
          <ToastTrigger type="success" title="Saved!" />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });

      expect(screen.getByText('Saved!')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should display an error toast', () => {
      render(
        <ToastProvider>
          <ToastTrigger type="error" title="Failed!" />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });

      expect(screen.getByText('Failed!')).toBeInTheDocument();
    });

    it('should display a warning toast', () => {
      render(
        <ToastProvider>
          <ToastTrigger type="warning" title="Warning!" />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });

      expect(screen.getByText('Warning!')).toBeInTheDocument();
    });

    it('should display an info toast', () => {
      render(
        <ToastProvider>
          <ToastTrigger type="info" title="Info!" />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });

      expect(screen.getByText('Info!')).toBeInTheDocument();
    });

    it('should display toast message when provided', () => {
      render(
        <ToastProvider>
          <ToastTrigger type="success" title="Done" message="Your file was saved" />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });

      expect(screen.getByText('Your file was saved')).toBeInTheDocument();
    });

    it('should display multiple toasts', () => {
      render(
        <ToastProvider>
          <ToastTrigger type="success" title="Toast 1" />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });
      act(() => {
        screen.getByText('Add Toast').click();
      });

      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Removing Toasts', () => {
    it('should remove toast when close button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <ToastProvider>
          <ToastTrigger type="success" title="Closeable" duration={0} />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });

      expect(screen.getByText('Closeable')).toBeInTheDocument();

      await user.click(screen.getByLabelText('閉じる'));

      expect(screen.queryByText('Closeable')).not.toBeInTheDocument();
    });

    it('should remove toast via removeToast function', () => {
      render(
        <ToastProvider>
          <ToastTrigger type="success" title="Removable" duration={0} />
          <RemoveToastTrigger />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });

      expect(screen.getByText('Removable')).toBeInTheDocument();

      act(() => {
        screen.getByText('Remove Toast').click();
      });

      expect(screen.queryByText('Removable')).not.toBeInTheDocument();
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss toast after duration', () => {
      render(
        <ToastProvider>
          <ToastTrigger type="success" title="Auto dismiss" duration={3000} />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });

      expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
    });

    it('should use default 5000ms duration', () => {
      render(
        <ToastProvider>
          <ToastTrigger type="success" title="Default duration" />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });

      expect(screen.getByText('Default duration')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4999);
      });

      expect(screen.getByText('Default duration')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.queryByText('Default duration')).not.toBeInTheDocument();
    });

    it('should not auto-dismiss when duration is 0', () => {
      render(
        <ToastProvider>
          <ToastTrigger type="success" title="Persistent" duration={0} />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Add Toast').click();
      });

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByText('Persistent')).toBeInTheDocument();
    });
  });
});

describe('useToast', () => {
  it('should throw error when used outside ToastProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BadComponent() {
      useToast();
      return null;
    }

    expect(() => {
      render(<BadComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });
});
