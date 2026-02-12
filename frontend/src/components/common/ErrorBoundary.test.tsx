import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
}

// Component that conditionally throws
function ConditionalError({ error }: { error: boolean }) {
  if (error) {
    throw new Error('Conditional error');
  }
  return <div>Working content</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render multiple children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>First</div>
          <div>Second</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render fallback UI when an error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();
    });

    it('should render error description', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('画面の表示中に問題が発生しました。再読み込みをお試しください。')).toBeInTheDocument();
    });

    it('should render retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('再試行')).toBeInTheDocument();
    });

    it('should render go-home button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('トップに戻る')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText('予期しないエラーが発生しました')).not.toBeInTheDocument();
    });
  });

  describe('Recovery', () => {
    it('should reset error state when retry button is clicked', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      function MaybeThrow() {
        if (shouldThrow) {
          throw new Error('Error');
        }
        return <div>Recovered</div>;
      }

      render(
        <ErrorBoundary>
          <MaybeThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      await user.click(screen.getByText('再試行'));

      expect(screen.getByText('Recovered')).toBeInTheDocument();
    });
  });

  describe('Go Home Button', () => {
    it('should navigate to home when go-home button is clicked', async () => {
      const user = userEvent.setup();

      // Mock window.location
      const originalLocation = window.location;
      const locationMock = { ...originalLocation, href: '' };
      Object.defineProperty(window, 'location', {
        writable: true,
        value: locationMock,
      });

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      await user.click(screen.getByText('トップに戻る'));

      expect(window.location.href).toBe('/');

      // Restore
      Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation,
      });
    });
  });
});
