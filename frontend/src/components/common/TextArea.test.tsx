import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextArea } from './TextArea';

describe('TextArea', () => {
  describe('Rendering', () => {
    it('should render a textarea element', () => {
      render(<TextArea />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with a label', () => {
      render(<TextArea label="Description" name="description" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('should render required indicator when required', () => {
      render(<TextArea label="Notes" name="notes" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not render required indicator when not required', () => {
      render(<TextArea label="Notes" name="notes" />);
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('should render placeholder text', () => {
      render(<TextArea placeholder="Enter description" />);
      expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
    });
  });

  describe('ID Assignment', () => {
    it('should use id when provided', () => {
      render(<TextArea label="Test" id="custom-id" name="test-name" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('id', 'custom-id');
    });

    it('should fall back to name when id is not provided', () => {
      render(<TextArea label="Test" name="test-name" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('id', 'test-name');
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<TextArea name="test" error="This field is required" />);
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });

    it('should set aria-invalid to true when error is present', () => {
      render(<TextArea name="test" error="Error" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('should set aria-invalid to false when no error', () => {
      render(<TextArea name="test" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'false');
    });

    it('should set aria-describedby to error id', () => {
      render(<TextArea name="test" error="Error" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'test-error');
    });

    it('should apply error border styles', () => {
      render(<TextArea name="test" error="Error" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('border-red-300');
    });
  });

  describe('Helper Text', () => {
    it('should display helper text', () => {
      render(<TextArea name="test" helperText="Max 500 characters" />);
      expect(screen.getByText('Max 500 characters')).toBeInTheDocument();
    });

    it('should set aria-describedby to helper id', () => {
      render(<TextArea name="test" helperText="Help" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'test-helper');
    });

    it('should not display helper text when error is present', () => {
      render(<TextArea name="test" error="Error" helperText="Help" />);
      expect(screen.queryByText('Help')).not.toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<TextArea disabled />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });
  });

  describe('User Interaction', () => {
    it('should call onChange when typing', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<TextArea onChange={handleChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'hello');

      expect(handleChange).toHaveBeenCalledTimes(5);
    });

    it('should update value when typing', async () => {
      const user = userEvent.setup();
      render(<TextArea />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'test content');

      expect(textarea).toHaveValue('test content');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to textarea element', () => {
      const ref = { current: null };
      render(<TextArea ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });

  describe('Custom Props', () => {
    it('should pass through custom className', () => {
      render(<TextArea className="custom-class" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('custom-class');
    });

    it('should pass through rows attribute', () => {
      render(<TextArea rows={5} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '5');
    });

    it('should have resize-none class by default', () => {
      render(<TextArea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('resize-none');
    });
  });
});
