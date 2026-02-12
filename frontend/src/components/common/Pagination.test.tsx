import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination, PaginationInfo } from './Pagination';

describe('Pagination', () => {
  describe('Rendering', () => {
    it('should not render when totalPages is 1', () => {
      const { container } = render(
        <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should not render when totalPages is 0', () => {
      const { container } = render(
        <Pagination currentPage={1} totalPages={0} onPageChange={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render navigation element', () => {
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
      );
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have aria-label', () => {
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
      );
      expect(screen.getByLabelText('ページネーション')).toBeInTheDocument();
    });
  });

  describe('Page Numbers', () => {
    it('should render all page numbers for 5 or fewer pages', () => {
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
      );
      expect(screen.getByLabelText('ページ 1')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ 2')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ 3')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ 4')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ 5')).toBeInTheDocument();
    });

    it('should mark current page with aria-current', () => {
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />
      );
      expect(screen.getByLabelText('ページ 3')).toHaveAttribute('aria-current', 'page');
    });

    it('should render ellipsis for many pages when on early page', () => {
      render(
        <Pagination currentPage={1} totalPages={20} onPageChange={vi.fn()} />
      );
      // Should show: 1, 2, 3, 4, 5, ..., 20
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ 1')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ 20')).toBeInTheDocument();
    });

    it('should render ellipsis for many pages when on late page', () => {
      render(
        <Pagination currentPage={20} totalPages={20} onPageChange={vi.fn()} />
      );
      // Should show: 1, ..., 16, 17, 18, 19, 20
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ 1')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ 20')).toBeInTheDocument();
    });

    it('should render two ellipses when in the middle of many pages', () => {
      render(
        <Pagination currentPage={10} totalPages={20} onPageChange={vi.fn()} />
      );
      // Should show: 1, ..., 9, 10, 11, ..., 20
      const ellipses = screen.getAllByText('...');
      expect(ellipses).toHaveLength(2);
    });
  });

  describe('Navigation Buttons', () => {
    it('should render previous and next buttons', () => {
      render(
        <Pagination currentPage={2} totalPages={5} onPageChange={vi.fn()} />
      );
      expect(screen.getByLabelText('前のページ')).toBeInTheDocument();
      expect(screen.getByLabelText('次のページ')).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
      );
      expect(screen.getByLabelText('前のページ')).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      render(
        <Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />
      );
      expect(screen.getByLabelText('次のページ')).toBeDisabled();
    });

    it('should enable both buttons on a middle page', () => {
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />
      );
      expect(screen.getByLabelText('前のページ')).not.toBeDisabled();
      expect(screen.getByLabelText('次のページ')).not.toBeDisabled();
    });
  });

  describe('User Interaction', () => {
    it('should call onPageChange with previous page when clicking previous', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={handleChange} />
      );

      await user.click(screen.getByLabelText('前のページ'));
      expect(handleChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange with next page when clicking next', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={handleChange} />
      );

      await user.click(screen.getByLabelText('次のページ'));
      expect(handleChange).toHaveBeenCalledWith(4);
    });

    it('should call onPageChange with page number when clicking a page', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={handleChange} />
      );

      await user.click(screen.getByLabelText('ページ 4'));
      expect(handleChange).toHaveBeenCalledWith(4);
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={vi.fn()}
          className="custom-pagination"
        />
      );
      expect(screen.getByRole('navigation')).toHaveClass('custom-pagination');
    });
  });
});

describe('PaginationInfo', () => {
  it('should render total items count', () => {
    render(
      <PaginationInfo currentPage={1} pageSize={10} totalItems={100} />
    );
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should render correct range for first page', () => {
    render(
      <PaginationInfo currentPage={1} pageSize={10} totalItems={100} />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should render correct range for middle page', () => {
    render(
      <PaginationInfo currentPage={3} pageSize={10} totalItems={100} />
    );
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('should cap end at totalItems for last page', () => {
    render(
      <PaginationInfo currentPage={4} pageSize={10} totalItems={35} />
    );
    expect(screen.getByText('31')).toBeInTheDocument();
    // 35 appears twice: once as totalItems and once as end value
    const thirtyFives = screen.getAllByText('35');
    expect(thirtyFives).toHaveLength(2);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PaginationInfo
        currentPage={1}
        pageSize={10}
        totalItems={100}
        className="custom-info"
      />
    );
    expect(container.firstChild).toHaveClass('custom-info');
  });
});
