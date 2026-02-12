import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render an input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with a label', () => {
      render(<Input label="Username" name="username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('should render required indicator when required', () => {
      render(<Input label="Email" name="email" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not render required indicator when not required', () => {
      render(<Input label="Email" name="email" />);
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('should render placeholder text', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should use id for htmlFor when id is provided', () => {
      render(<Input label="Test" id="custom-id" name="test-name" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'custom-id');
    });

    it('should fall back to name for id when id is not provided', () => {
      render(<Input label="Test" name="test-name" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'test-name');
    });
  });

  describe('Icons', () => {
    it('should render left icon', () => {
      render(<Input leftIcon={<span data-testid="left-icon">L</span>} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      render(<Input rightIcon={<span data-testid="right-icon">R</span>} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should add left padding class when leftIcon is present', () => {
      render(<Input leftIcon={<span>L</span>} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10');
    });

    it('should add right padding class when rightIcon is present', () => {
      render(<Input rightIcon={<span>R</span>} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pr-10');
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<Input name="test" error="This field is required" />);
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });

    it('should set aria-invalid to true when error is present', () => {
      render(<Input name="test" error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should set aria-invalid to false when no error', () => {
      render(<Input name="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should set aria-describedby to error id when error is present', () => {
      render(<Input name="test" error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-error');
    });

    it('should apply error border styles when error is present', () => {
      render(<Input name="test" error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-300');
    });
  });

  describe('Helper Text', () => {
    it('should display helper text', () => {
      render(<Input name="test" helperText="Enter your name" />);
      expect(screen.getByText('Enter your name')).toBeInTheDocument();
    });

    it('should set aria-describedby to helper id', () => {
      render(<Input name="test" helperText="Help text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-helper');
    });

    it('should not display helper text when error is present', () => {
      render(<Input name="test" error="Error" helperText="Help text" />);
      expect(screen.queryByText('Help text')).not.toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('User Interaction', () => {
    it('should call onChange when typing', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'hello');

      expect(handleChange).toHaveBeenCalledTimes(5);
    });

    it('should update value when typing', async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(input).toHaveValue('test');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = { current: null };
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Custom Props', () => {
    it('should pass through custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('should pass through additional HTML attributes', () => {
      render(<Input data-testid="custom-input" maxLength={10} />);
      const input = screen.getByTestId('custom-input');
      expect(input).toHaveAttribute('maxLength', '10');
    });
  });
});
