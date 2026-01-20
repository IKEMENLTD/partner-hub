import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('should render with default variant (primary)', () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600');
    });

    it('should render with secondary variant', () => {
      render(<Button variant="secondary">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100');
    });

    it('should render with outline variant', () => {
      render(<Button variant="outline">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('border-gray-300');
    });

    it('should render with ghost variant', () => {
      render(<Button variant="ghost">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-gray-700');
    });

    it('should render with danger variant', () => {
      render(<Button variant="danger">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });
  });

  describe('Sizes', () => {
    it('should render with default size (md)', () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2');
    });

    it('should render with small size', () => {
      render(<Button size="sm">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('py-1.5');
    });

    it('should render with large size', () => {
      render(<Button size="lg">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6');
      expect(button).toHaveClass('py-3');
    });
  });

  describe('Icons', () => {
    it('should render with left icon', () => {
      const Icon = () => <span data-testid="left-icon">Icon</span>;
      render(<Button leftIcon={<Icon />}>Button</Button>);

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render with right icon', () => {
      const Icon = () => <span data-testid="right-icon">Icon</span>;
      render(<Button rightIcon={<Icon />}>Button</Button>);

      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should render with both left and right icons', () => {
      const LeftIcon = () => <span data-testid="left-icon">Left</span>;
      const RightIcon = () => <span data-testid="right-icon">Right</span>;
      render(
        <Button leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
          Button
        </Button>
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should hide right icon when loading', () => {
      const Icon = () => <span data-testid="right-icon">Icon</span>;
      render(
        <Button isLoading rightIcon={<Icon />}>
          Button
        </Button>
      );

      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<Button isLoading>Button</Button>);

      // Check for loader animation class
      const button = screen.getByRole('button');
      const loader = button.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      render(<Button isLoading>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should replace left icon with spinner when loading', () => {
      const Icon = () => <span data-testid="left-icon">Icon</span>;
      render(
        <Button isLoading leftIcon={<Icon />}>
          Button
        </Button>
      );

      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      const button = screen.getByRole('button');
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should have disabled opacity class', () => {
      render(<Button disabled>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-60');
    });

    it('should not be clickable when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button disabled onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Full Width', () => {
    it('should render full width when fullWidth is true', () => {
      render(<Button fullWidth>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });

    it('should not render full width by default', () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });
  });

  describe('Click Handler', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button disabled onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button isLoading onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom Props', () => {
    it('should pass through custom className', () => {
      render(<Button className="custom-class">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should support type attribute', () => {
      render(<Button type="submit">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should support data attributes', () => {
      render(<Button data-testid="custom-button">Button</Button>);

      expect(screen.getByTestId('custom-button')).toBeInTheDocument();
    });

    it('should support aria attributes', () => {
      render(<Button aria-label="Custom Label">Button</Button>);

      expect(screen.getByRole('button', { name: 'Custom Label' })).toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = { current: null };
      render(<Button ref={ref}>Button</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button></Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle multiple child nodes', () => {
      render(
        <Button>
          <span>Part 1</span>
          <span>Part 2</span>
        </Button>
      );

      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Part 2')).toBeInTheDocument();
    });

    it('should handle rapid clicks', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role', () => {
      render(<Button>Button</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalled();
    });

    it('should have focus styles', () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
    });
  });

  describe('Variant Combinations', () => {
    it('should combine variant and size classes correctly', () => {
      render(<Button variant="secondary" size="lg">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100');
      expect(button).toHaveClass('px-6');
    });

    it('should combine all props correctly', () => {
      const Icon = () => <span>Icon</span>;
      render(
        <Button
          variant="primary"
          size="md"
          fullWidth
          leftIcon={<Icon />}
          className="custom-class"
        >
          Button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600');
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('w-full');
      expect(button).toHaveClass('custom-class');
    });
  });
});
