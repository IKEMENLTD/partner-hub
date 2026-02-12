import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('should render title', () => {
      render(<EmptyState title="No data" />);
      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('should render title as h3 element', () => {
      render(<EmptyState title="No data" />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('No data');
    });
  });

  describe('Description', () => {
    it('should render description when provided', () => {
      render(
        <EmptyState
          title="No results"
          description="Try changing your search criteria"
        />
      );
      expect(screen.getByText('Try changing your search criteria')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const { container } = render(<EmptyState title="No data" />);
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(0);
    });
  });

  describe('Icon', () => {
    it('should render default InboxIcon when no custom icon is provided', () => {
      const { container } = render(<EmptyState title="No data" />);
      // The default icon container should be present
      const iconContainer = container.querySelector('.mb-4.text-gray-400');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should render custom icon when provided', () => {
      render(
        <EmptyState
          title="No data"
          icon={<span data-testid="custom-icon">Custom</span>}
        />
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('Action', () => {
    it('should render action when provided', () => {
      render(
        <EmptyState
          title="No data"
          action={<button>Create New</button>}
        />
      );
      expect(screen.getByText('Create New')).toBeInTheDocument();
    });

    it('should not render action container when action is not provided', () => {
      const { container } = render(<EmptyState title="No data" />);
      // Count the child divs - should not have an action wrapper
      const mainDiv = container.firstChild;
      const children = Array.from(mainDiv?.childNodes || []);
      // Should have: icon div, h3 (no description, no action)
      expect(children).toHaveLength(2);
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <EmptyState title="No data" className="custom-empty" />
      );
      expect(container.firstChild).toHaveClass('custom-empty');
    });

    it('should have centered layout', () => {
      const { container } = render(<EmptyState title="No data" />);
      expect(container.firstChild).toHaveClass('flex');
      expect(container.firstChild).toHaveClass('flex-col');
      expect(container.firstChild).toHaveClass('items-center');
      expect(container.firstChild).toHaveClass('text-center');
    });
  });

  describe('Full EmptyState', () => {
    it('should render all elements together', () => {
      render(
        <EmptyState
          title="No projects found"
          description="Create your first project to get started"
          icon={<span data-testid="project-icon">P</span>}
          action={<button>New Project</button>}
        />
      );

      expect(screen.getByTestId('project-icon')).toBeInTheDocument();
      expect(screen.getByText('No projects found')).toBeInTheDocument();
      expect(screen.getByText('Create your first project to get started')).toBeInTheDocument();
      expect(screen.getByText('New Project')).toBeInTheDocument();
    });
  });
});
