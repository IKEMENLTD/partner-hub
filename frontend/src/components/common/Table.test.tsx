import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';

describe('Table', () => {
  describe('Table Component', () => {
    it('should render a table element', () => {
      render(
        <Table>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </Table>
      );
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Table className="custom-table">
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </Table>
      );
      expect(container.firstChild).toHaveClass('custom-table');
    });

    it('should have overflow-x-auto class', () => {
      const { container } = render(
        <Table>
          <tbody>
            <tr>
              <td>Cell</td>
            </tr>
          </tbody>
        </Table>
      );
      expect(container.firstChild).toHaveClass('overflow-x-auto');
    });
  });

  describe('TableHeader', () => {
    it('should render a thead element', () => {
      render(
        <table>
          <TableHeader>
            <tr>
              <th>Header</th>
            </tr>
          </TableHeader>
        </table>
      );
      const thead = screen.getByRole('rowgroup');
      expect(thead.tagName).toBe('THEAD');
    });
  });

  describe('TableBody', () => {
    it('should render a tbody element', () => {
      render(
        <table>
          <TableBody>
            <tr>
              <td>Body</td>
            </tr>
          </TableBody>
        </table>
      );
      const tbody = screen.getByRole('rowgroup');
      expect(tbody.tagName).toBe('TBODY');
    });
  });

  describe('TableRow', () => {
    it('should render a tr element', () => {
      render(
        <table>
          <tbody>
            <TableRow>
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );
      expect(screen.getByRole('row')).toBeInTheDocument();
    });

    it('should be clickable when onClick is provided', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <table>
          <tbody>
            <TableRow onClick={handleClick}>
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );

      await user.click(screen.getByRole('row'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have cursor-pointer class when clickable', () => {
      render(
        <table>
          <tbody>
            <TableRow onClick={vi.fn()}>
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );
      expect(screen.getByRole('row')).toHaveClass('cursor-pointer');
    });

    it('should not have cursor-pointer class when not clickable', () => {
      render(
        <table>
          <tbody>
            <TableRow>
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );
      expect(screen.getByRole('row')).not.toHaveClass('cursor-pointer');
    });

    it('should apply custom className', () => {
      render(
        <table>
          <tbody>
            <TableRow className="custom-row">
              <td>Cell</td>
            </TableRow>
          </tbody>
        </table>
      );
      expect(screen.getByRole('row')).toHaveClass('custom-row');
    });
  });

  describe('TableHead', () => {
    it('should render a th element', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead>Header</TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByRole('columnheader')).toBeInTheDocument();
      expect(screen.getByText('Header')).toBeInTheDocument();
    });

    it('should apply default left alignment', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead>Header</TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByRole('columnheader')).toHaveClass('text-left');
    });

    it('should apply center alignment', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead align="center">Header</TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByRole('columnheader')).toHaveClass('text-center');
    });

    it('should apply right alignment', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead align="right">Header</TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByRole('columnheader')).toHaveClass('text-right');
    });

    it('should be sortable when sortable prop is true', async () => {
      const handleSort = vi.fn();
      const user = userEvent.setup();
      render(
        <table>
          <thead>
            <tr>
              <TableHead sortable onSort={handleSort}>
                Sortable
              </TableHead>
            </tr>
          </thead>
        </table>
      );

      await user.click(screen.getByRole('columnheader'));
      expect(handleSort).toHaveBeenCalledTimes(1);
    });

    it('should not call onSort when not sortable', async () => {
      const handleSort = vi.fn();
      const user = userEvent.setup();
      render(
        <table>
          <thead>
            <tr>
              <TableHead onSort={handleSort}>
                Not Sortable
              </TableHead>
            </tr>
          </thead>
        </table>
      );

      await user.click(screen.getByRole('columnheader'));
      expect(handleSort).not.toHaveBeenCalled();
    });

    it('should have cursor-pointer class when sortable', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead sortable>Header</TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByRole('columnheader')).toHaveClass('cursor-pointer');
    });

    it('should set aria-sort to ascending when sortOrder is asc', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead sortable sortOrder="asc">
                Header
              </TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending');
    });

    it('should set aria-sort to descending when sortOrder is desc', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead sortable sortOrder="desc">
                Header
              </TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending');
    });

    it('should not set aria-sort when sortOrder is null', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead sortable sortOrder={null}>
                Header
              </TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByRole('columnheader')).not.toHaveAttribute('aria-sort');
    });

    it('should apply custom className', () => {
      render(
        <table>
          <thead>
            <tr>
              <TableHead className="custom-head">Header</TableHead>
            </tr>
          </thead>
        </table>
      );
      expect(screen.getByRole('columnheader')).toHaveClass('custom-head');
    });
  });

  describe('TableCell', () => {
    it('should render a td element', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell>Cell content</TableCell>
            </tr>
          </tbody>
        </table>
      );
      expect(screen.getByRole('cell')).toBeInTheDocument();
      expect(screen.getByText('Cell content')).toBeInTheDocument();
    });

    it('should apply default left alignment', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell>Cell</TableCell>
            </tr>
          </tbody>
        </table>
      );
      expect(screen.getByRole('cell')).toHaveClass('text-left');
    });

    it('should apply center alignment', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell align="center">Cell</TableCell>
            </tr>
          </tbody>
        </table>
      );
      expect(screen.getByRole('cell')).toHaveClass('text-center');
    });

    it('should apply right alignment', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell align="right">Cell</TableCell>
            </tr>
          </tbody>
        </table>
      );
      expect(screen.getByRole('cell')).toHaveClass('text-right');
    });

    it('should apply custom className', () => {
      render(
        <table>
          <tbody>
            <tr>
              <TableCell className="custom-cell">Cell</TableCell>
            </tr>
          </tbody>
        </table>
      );
      expect(screen.getByRole('cell')).toHaveClass('custom-cell');
    });
  });

  describe('Full Table Integration', () => {
    it('should render a complete table', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Alice</TableCell>
              <TableCell>30</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Bob</TableCell>
              <TableCell>25</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getAllByRole('row')).toHaveLength(3);
    });
  });
});
