import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar, AvatarGroup } from './Avatar';

describe('Avatar', () => {
  describe('Image Avatar', () => {
    it('should render an image when src is provided', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="John Doe" />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    it('should set alt text to name', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="John Doe" />);
      const img = screen.getByAltText('John Doe');
      expect(img).toBeInTheDocument();
    });

    it('should have rounded-full class', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="John Doe" />);
      const img = screen.getByRole('img');
      expect(img).toHaveClass('rounded-full');
    });

    it('should have object-cover class', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="John Doe" />);
      const img = screen.getByRole('img');
      expect(img).toHaveClass('object-cover');
    });
  });

  describe('Initials Avatar', () => {
    it('should render initials when no src is provided', () => {
      render(<Avatar name="John Doe" />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should render initials when src is null', () => {
      render(<Avatar src={null} name="John Doe" />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should render first two characters for single name', () => {
      render(<Avatar name="Alice" />);
      expect(screen.getByText('AL')).toBeInTheDocument();
    });

    it('should render first+last initials for multi-word name', () => {
      render(<Avatar name="Jane Mary Smith" />);
      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('should uppercase initials', () => {
      render(<Avatar name="john doe" />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should have aria-label set to name', () => {
      render(<Avatar name="John Doe" />);
      expect(screen.getByLabelText('John Doe')).toBeInTheDocument();
    });

    it('should have rounded-full class', () => {
      render(<Avatar name="John Doe" />);
      const avatar = screen.getByLabelText('John Doe');
      expect(avatar).toHaveClass('rounded-full');
    });

    it('should have a background color class', () => {
      render(<Avatar name="John Doe" />);
      const avatar = screen.getByLabelText('John Doe');
      // Should have one of the bg-*-500 classes
      expect(avatar.className).toMatch(/bg-\w+-500/);
    });
  });

  describe('Sizes', () => {
    it('should apply default md size', () => {
      render(<Avatar name="Test" />);
      const avatar = screen.getByLabelText('Test');
      expect(avatar).toHaveClass('h-10');
      expect(avatar).toHaveClass('w-10');
    });

    it('should apply xs size', () => {
      render(<Avatar name="Test" size="xs" />);
      const avatar = screen.getByLabelText('Test');
      expect(avatar).toHaveClass('h-6');
      expect(avatar).toHaveClass('w-6');
    });

    it('should apply sm size', () => {
      render(<Avatar name="Test" size="sm" />);
      const avatar = screen.getByLabelText('Test');
      expect(avatar).toHaveClass('h-8');
      expect(avatar).toHaveClass('w-8');
    });

    it('should apply lg size', () => {
      render(<Avatar name="Test" size="lg" />);
      const avatar = screen.getByLabelText('Test');
      expect(avatar).toHaveClass('h-12');
      expect(avatar).toHaveClass('w-12');
    });

    it('should apply xl size', () => {
      render(<Avatar name="Test" size="xl" />);
      const avatar = screen.getByLabelText('Test');
      expect(avatar).toHaveClass('h-16');
      expect(avatar).toHaveClass('w-16');
    });

    it('should apply size to image avatar', () => {
      render(<Avatar src="https://example.com/photo.jpg" name="Test" size="lg" />);
      const img = screen.getByRole('img');
      expect(img).toHaveClass('h-12');
      expect(img).toHaveClass('w-12');
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className to initials avatar', () => {
      render(<Avatar name="Test" className="custom-avatar" />);
      const avatar = screen.getByLabelText('Test');
      expect(avatar).toHaveClass('custom-avatar');
    });

    it('should apply custom className to image avatar', () => {
      render(
        <Avatar
          src="https://example.com/photo.jpg"
          name="Test"
          className="custom-avatar"
        />
      );
      const img = screen.getByRole('img');
      expect(img).toHaveClass('custom-avatar');
    });
  });

  describe('Consistent Background Color', () => {
    it('should generate the same color for the same name', () => {
      const { unmount } = render(<Avatar name="Alice" />);
      const avatar1 = screen.getByLabelText('Alice');
      const className1 = avatar1.className;
      unmount();

      render(<Avatar name="Alice" />);
      const avatar2 = screen.getByLabelText('Alice');
      expect(avatar2.className).toBe(className1);
    });
  });
});

describe('AvatarGroup', () => {
  const avatars = [
    { name: 'Alice', src: 'https://example.com/a.jpg' },
    { name: 'Bob' },
    { name: 'Charlie' },
    { name: 'Diana' },
    { name: 'Eve' },
  ];

  describe('Rendering', () => {
    it('should render avatars up to max limit', () => {
      render(<AvatarGroup avatars={avatars} max={3} />);
      const imgs = screen.getAllByRole('img');
      // Only Alice has src, so 1 image
      expect(imgs).toHaveLength(1);
      // Bob and Charlie should show initials
      expect(screen.getByText('BO')).toBeInTheDocument();
      expect(screen.getByText('CH')).toBeInTheDocument();
    });

    it('should render default max of 4 avatars', () => {
      render(<AvatarGroup avatars={avatars} />);
      // Alice (image) + Bob + Charlie + Diana = 4 visible
      expect(screen.getByAltText('Alice')).toBeInTheDocument();
      expect(screen.getByText('BO')).toBeInTheDocument();
      expect(screen.getByText('CH')).toBeInTheDocument();
      expect(screen.getByText('DI')).toBeInTheDocument();
    });

    it('should show remaining count', () => {
      render(<AvatarGroup avatars={avatars} max={3} />);
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should not show remaining count when all avatars fit', () => {
      render(<AvatarGroup avatars={avatars.slice(0, 3)} max={5} />);
      expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument();
    });

    it('should show +1 when one avatar overflows', () => {
      render(<AvatarGroup avatars={avatars} max={4} />);
      expect(screen.getByText('+1')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have overlapping layout with -space-x-2', () => {
      const { container } = render(<AvatarGroup avatars={avatars} />);
      expect(container.firstChild).toHaveClass('-space-x-2');
    });
  });

  describe('Size', () => {
    it('should use default sm size', () => {
      render(<AvatarGroup avatars={[{ name: 'Test' }]} />);
      const avatar = screen.getByLabelText('Test');
      expect(avatar).toHaveClass('h-8');
      expect(avatar).toHaveClass('w-8');
    });

    it('should apply custom size', () => {
      render(<AvatarGroup avatars={[{ name: 'Test' }]} size="lg" />);
      const avatar = screen.getByLabelText('Test');
      expect(avatar).toHaveClass('h-12');
      expect(avatar).toHaveClass('w-12');
    });
  });
});
