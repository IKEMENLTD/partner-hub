import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorMessage, Alert } from './ErrorMessage';

describe('ErrorMessage', () => {
  describe('Rendering', () => {
    it('should render with default title', () => {
      render(<ErrorMessage message="Something went wrong" />);
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<ErrorMessage title="Custom Error" message="Details here" />);
      expect(screen.getByText('Custom Error')).toBeInTheDocument();
    });

    it('should render the error message', () => {
      render(<ErrorMessage message="Connection failed" />);
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('should have role="alert"', () => {
      render(<ErrorMessage message="Error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render error icon', () => {
      const { container } = render(<ErrorMessage message="Error" />);
      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Retry Button', () => {
    it('should render retry button when retry prop is provided', () => {
      render(<ErrorMessage message="Error" retry={vi.fn()} />);
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });

    it('should not render retry button when retry is not provided', () => {
      render(<ErrorMessage message="Error" />);
      expect(screen.queryByText('再試行')).not.toBeInTheDocument();
    });

    it('should call retry when retry button is clicked', async () => {
      const handleRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorMessage message="Error" retry={handleRetry} />);

      await user.click(screen.getByText('再試行'));
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(<ErrorMessage message="Error" className="custom-error" />);
      expect(screen.getByRole('alert')).toHaveClass('custom-error');
    });

    it('should have centered layout', () => {
      render(<ErrorMessage message="Error" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('flex');
      expect(alert).toHaveClass('flex-col');
      expect(alert).toHaveClass('items-center');
      expect(alert).toHaveClass('text-center');
    });
  });
});

describe('Alert', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(<Alert variant="info">Alert content</Alert>);
      expect(screen.getByText('Alert content')).toBeInTheDocument();
    });

    it('should render with role="alert"', () => {
      render(<Alert variant="info">Content</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(
        <Alert variant="info" title="Important">
          Details
        </Alert>
      );
      expect(screen.getByText('Important')).toBeInTheDocument();
    });

    it('should not render title when not provided', () => {
      const { container } = render(<Alert variant="info">Content</Alert>);
      const h4Elements = container.querySelectorAll('h4');
      expect(h4Elements).toHaveLength(0);
    });
  });

  describe('Variants', () => {
    it('should apply info variant styles', () => {
      render(<Alert variant="info">Info</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-blue-50');
      expect(alert).toHaveClass('border-blue-200');
      expect(alert).toHaveClass('text-blue-800');
    });

    it('should apply success variant styles', () => {
      render(<Alert variant="success">Success</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-green-50');
      expect(alert).toHaveClass('border-green-200');
      expect(alert).toHaveClass('text-green-800');
    });

    it('should apply warning variant styles', () => {
      render(<Alert variant="warning">Warning</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-yellow-50');
      expect(alert).toHaveClass('border-yellow-200');
      expect(alert).toHaveClass('text-yellow-800');
    });

    it('should apply error variant styles', () => {
      render(<Alert variant="error">Error</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-red-50');
      expect(alert).toHaveClass('border-red-200');
      expect(alert).toHaveClass('text-red-800');
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(
        <Alert variant="info" className="custom-alert">
          Content
        </Alert>
      );
      expect(screen.getByRole('alert')).toHaveClass('custom-alert');
    });

    it('should have rounded-lg and border classes', () => {
      render(<Alert variant="info">Content</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('rounded-lg');
      expect(alert).toHaveClass('border');
    });
  });
});
