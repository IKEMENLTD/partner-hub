import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, CardHeader, CardContent, CardFooter } from './Card';

describe('Card', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render as a div element', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('should have border and shadow styles', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild).toHaveClass('rounded-lg');
      expect(container.firstChild).toHaveClass('border');
      expect(container.firstChild).toHaveClass('shadow-sm');
    });
  });

  describe('Padding', () => {
    it('should apply default md padding', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild).toHaveClass('p-3');
    });

    it('should apply no padding', () => {
      const { container } = render(<Card padding="none">Content</Card>);
      expect(container.firstChild).not.toHaveClass('p-3');
      expect(container.firstChild).not.toHaveClass('p-2');
      expect(container.firstChild).not.toHaveClass('p-4');
    });

    it('should apply sm padding', () => {
      const { container } = render(<Card padding="sm">Content</Card>);
      expect(container.firstChild).toHaveClass('p-2');
    });

    it('should apply lg padding', () => {
      const { container } = render(<Card padding="lg">Content</Card>);
      expect(container.firstChild).toHaveClass('p-4');
    });
  });

  describe('Hoverable', () => {
    it('should not have hover styles by default', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild).not.toHaveClass('hover:shadow-md');
    });

    it('should have hover styles when hoverable is true', () => {
      const { container } = render(<Card hoverable>Content</Card>);
      expect(container.firstChild).toHaveClass('hover:shadow-md');
      expect(container.firstChild).toHaveClass('transition-shadow');
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-card">Content</Card>);
      expect(container.firstChild).toHaveClass('custom-card');
    });

    it('should pass through onClick handler', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Card onClick={handleClick}>Content</Card>);

      await user.click(screen.getByText('Content'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should pass through data attributes', () => {
      render(<Card data-testid="my-card">Content</Card>);
      expect(screen.getByTestId('my-card')).toBeInTheDocument();
    });
  });
});

describe('CardHeader', () => {
  it('should render children', () => {
    render(<CardHeader>Header Title</CardHeader>);
    expect(screen.getByText('Header Title')).toBeInTheDocument();
  });

  it('should have border-b class', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    expect(container.firstChild).toHaveClass('border-b');
  });

  it('should render action element', () => {
    render(
      <CardHeader action={<button>Action</button>}>
        Header
      </CardHeader>
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('should not render action container when no action', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    // Only the header text div should be present
    expect(container.firstChild?.childNodes).toHaveLength(1);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CardHeader className="custom-header">Header</CardHeader>
    );
    expect(container.firstChild).toHaveClass('custom-header');
  });
});

describe('CardContent', () => {
  it('should render children', () => {
    render(<CardContent>Content body</CardContent>);
    expect(screen.getByText('Content body')).toBeInTheDocument();
  });

  it('should have pt-4 class', () => {
    const { container } = render(<CardContent>Content</CardContent>);
    expect(container.firstChild).toHaveClass('pt-4');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CardContent className="custom-content">Content</CardContent>
    );
    expect(container.firstChild).toHaveClass('custom-content');
  });
});

describe('CardFooter', () => {
  it('should render children', () => {
    render(
      <CardFooter>
        <button>Save</button>
      </CardFooter>
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should have border-t class', () => {
    const { container } = render(
      <CardFooter>
        <button>Save</button>
      </CardFooter>
    );
    expect(container.firstChild).toHaveClass('border-t');
  });

  it('should have flex layout', () => {
    const { container } = render(
      <CardFooter>
        <button>Save</button>
      </CardFooter>
    );
    expect(container.firstChild).toHaveClass('flex');
    expect(container.firstChild).toHaveClass('justify-end');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CardFooter className="custom-footer">
        <button>Save</button>
      </CardFooter>
    );
    expect(container.firstChild).toHaveClass('custom-footer');
  });
});

describe('Card Integration', () => {
  it('should render a complete card with header, content, and footer', () => {
    render(
      <Card>
        <CardHeader action={<button>Edit</button>}>
          Title
        </CardHeader>
        <CardContent>Body text</CardContent>
        <CardFooter>
          <button>Save</button>
          <button>Cancel</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Body text')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
