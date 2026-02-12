import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loading, PageLoading, InlineLoading } from './Loading';

describe('Loading', () => {
  describe('Rendering', () => {
    it('should render with role="status"', () => {
      render(<Loading />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have default aria-label', () => {
      render(<Loading />);
      expect(screen.getByLabelText('読み込み中')).toBeInTheDocument();
    });

    it('should use custom text as aria-label', () => {
      render(<Loading text="データ取得中" />);
      expect(screen.getByLabelText('データ取得中')).toBeInTheDocument();
    });

    it('should display text when provided', () => {
      render(<Loading text="Loading data..." />);
      const texts = screen.getAllByText('Loading data...');
      // Visible text in <p> and sr-only <span>
      expect(texts.length).toBeGreaterThanOrEqual(1);
      const visibleText = texts.find(el => !el.classList.contains('sr-only'));
      expect(visibleText).toBeInTheDocument();
    });

    it('should not display text when not provided', () => {
      const { container } = render(<Loading />);
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(0);
    });

    it('should render screen reader text', () => {
      render(<Loading />);
      const srText = screen.getByText('読み込み中');
      expect(srText).toHaveClass('sr-only');
    });

    it('should render screen reader text with custom text', () => {
      render(<Loading text="Processing" />);
      const srTexts = screen.getAllByText('Processing');
      // One visible, one sr-only
      expect(srTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Sizes', () => {
    it('should render with default md size', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-8');
      expect(spinner).toHaveClass('w-8');
    });

    it('should render with sm size', () => {
      const { container } = render(<Loading size="sm" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-4');
      expect(spinner).toHaveClass('w-4');
    });

    it('should render with lg size', () => {
      const { container } = render(<Loading size="lg" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-12');
      expect(spinner).toHaveClass('w-12');
    });
  });

  describe('Spinner', () => {
    it('should render spinning animation', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should have aria-hidden on spinner icon', () => {
      const { container } = render(<Loading />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(<Loading className="custom-loading" />);
      expect(screen.getByRole('status')).toHaveClass('custom-loading');
    });
  });
});

describe('PageLoading', () => {
  it('should render Loading component with lg size', () => {
    const { container } = render(<PageLoading />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-12');
    expect(spinner).toHaveClass('w-12');
  });

  it('should display text', () => {
    render(<PageLoading />);
    const texts = screen.getAllByText('読み込み中...');
    expect(texts.length).toBeGreaterThanOrEqual(1);
    const visibleText = texts.find(el => !el.classList.contains('sr-only'));
    expect(visibleText).toBeInTheDocument();
  });

  it('should have min-height container', () => {
    const { container } = render(<PageLoading />);
    expect(container.firstChild).toHaveClass('min-h-[400px]');
  });
});

describe('InlineLoading', () => {
  it('should render Loading component with sm size', () => {
    const { container } = render(<InlineLoading />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-4');
    expect(spinner).toHaveClass('w-4');
  });

  it('should not display text', () => {
    const { container } = render(<InlineLoading />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(0);
  });
});
