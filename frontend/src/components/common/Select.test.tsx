import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const defaultOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  describe('Rendering', () => {
    it('should render a select element', () => {
      render(<Select options={defaultOptions} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<Select options={defaultOptions} />);
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('should render option labels correctly', () => {
      render(<Select options={defaultOptions} />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('should render with a label', () => {
      render(<Select label="Choose" name="choice" options={defaultOptions} />);
      expect(screen.getByLabelText('Choose')).toBeInTheDocument();
    });

    it('should render required indicator when required', () => {
      render(<Select label="Choice" name="choice" options={defaultOptions} required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render placeholder option', () => {
      render(<Select options={defaultOptions} placeholder="Select an option" />);
      const placeholderOption = screen.getByText('Select an option');
      expect(placeholderOption).toBeInTheDocument();
      expect(placeholderOption).toBeDisabled();
    });
  });

  describe('ID Assignment', () => {
    it('should use id when provided', () => {
      render(<Select id="custom-id" name="test" options={defaultOptions} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('id', 'custom-id');
    });

    it('should fall back to name when id is not provided', () => {
      render(<Select name="test-name" options={defaultOptions} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('id', 'test-name');
    });
  });

  describe('Disabled Options', () => {
    it('should render disabled options', () => {
      const optionsWithDisabled = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', disabled: true },
      ];
      render(<Select options={optionsWithDisabled} />);
      const options = screen.getAllByRole('option');
      expect(options[1]).toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<Select name="test" options={defaultOptions} error="Required field" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Required field');
    });

    it('should set aria-invalid to true when error is present', () => {
      render(<Select name="test" options={defaultOptions} error="Error" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });

    it('should set aria-invalid to false when no error', () => {
      render(<Select name="test" options={defaultOptions} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'false');
    });

    it('should set aria-describedby to error id', () => {
      render(<Select name="test" options={defaultOptions} error="Error" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-describedby', 'test-error');
    });

    it('should apply error border styles', () => {
      render(<Select name="test" options={defaultOptions} error="Error" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('border-red-300');
    });
  });

  describe('Helper Text', () => {
    it('should display helper text', () => {
      render(<Select name="test" options={defaultOptions} helperText="Select one" />);
      expect(screen.getByText('Select one')).toBeInTheDocument();
    });

    it('should set aria-describedby to helper id', () => {
      render(<Select name="test" options={defaultOptions} helperText="Help" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-describedby', 'test-helper');
    });

    it('should not display helper text when error is present', () => {
      render(<Select name="test" options={defaultOptions} error="Error" helperText="Help" />);
      expect(screen.queryByText('Help')).not.toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Select options={defaultOptions} disabled />);
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });
  });

  describe('User Interaction', () => {
    it('should call onChange when selection changes', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<Select options={defaultOptions} onChange={handleChange} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option2');
      expect(handleChange).toHaveBeenCalled();
    });

    it('should update selected value', async () => {
      const user = userEvent.setup();
      render(<Select options={defaultOptions} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option2');
      expect(select).toHaveValue('option2');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to select element', () => {
      const ref = { current: null };
      render(<Select ref={ref} options={defaultOptions} />);
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    });
  });

  describe('Custom Props', () => {
    it('should pass through custom className', () => {
      render(<Select options={defaultOptions} className="custom-class" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('custom-class');
    });
  });
});
