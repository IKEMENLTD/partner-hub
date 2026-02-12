import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render children text', () => {
      render(<Badge>Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render as an inline-flex span', () => {
      render(<Badge>Test</Badge>);
      const badge = screen.getByText('Test');
      expect(badge.tagName).toBe('SPAN');
      expect(badge).toHaveClass('inline-flex');
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-gray-100');
    });

    it('should apply primary variant styles', () => {
      render(<Badge variant="primary">Primary</Badge>);
      const badge = screen.getByText('Primary');
      expect(badge).toHaveClass('bg-primary-100');
    });

    it('should apply success variant styles', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should apply warning variant styles', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-yellow-100');
    });

    it('should apply danger variant styles', () => {
      render(<Badge variant="danger">Danger</Badge>);
      const badge = screen.getByText('Danger');
      expect(badge).toHaveClass('bg-red-100');
    });

    it('should apply info variant styles', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-blue-100');
    });
  });

  describe('Sizes', () => {
    it('should apply default sm size', () => {
      render(<Badge>Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('text-xs');
    });

    it('should apply md size', () => {
      render(<Badge size="md">Medium</Badge>);
      const badge = screen.getByText('Medium');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('text-sm');
    });
  });

  describe('Dot', () => {
    it('should not render dot by default', () => {
      const { container } = render(<Badge>No Dot</Badge>);
      const dotElements = container.querySelectorAll('.h-1\\.5.w-1\\.5');
      expect(dotElements).toHaveLength(0);
    });

    it('should render dot when dot prop is true', () => {
      const { container } = render(<Badge dot>With Dot</Badge>);
      const dotElement = container.querySelector('.h-1\\.5.w-1\\.5');
      expect(dotElement).toBeInTheDocument();
    });

    it('should render dot with correct variant color', () => {
      const { container } = render(
        <Badge variant="success" dot>
          Success
        </Badge>
      );
      const dotElement = container.querySelector('.h-1\\.5.w-1\\.5');
      expect(dotElement).toHaveClass('bg-green-500');
    });

    it('should render dot with danger variant color', () => {
      const { container } = render(
        <Badge variant="danger" dot>
          Danger
        </Badge>
      );
      const dotElement = container.querySelector('.h-1\\.5.w-1\\.5');
      expect(dotElement).toHaveClass('bg-red-500');
    });

    it('should have aria-hidden on dot element', () => {
      const { container } = render(<Badge dot>Dot</Badge>);
      const dotElement = container.querySelector('.h-1\\.5.w-1\\.5');
      expect(dotElement).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(<Badge className="custom-badge">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-badge');
    });

    it('should have rounded-full class', () => {
      render(<Badge>Rounded</Badge>);
      const badge = screen.getByText('Rounded');
      expect(badge).toHaveClass('rounded-full');
    });

    it('should have font-medium class', () => {
      render(<Badge>Bold</Badge>);
      const badge = screen.getByText('Bold');
      expect(badge).toHaveClass('font-medium');
    });
  });
});
