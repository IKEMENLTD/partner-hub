import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, ModalFooter } from './Modal';

describe('Modal', () => {
  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()}>
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should render with a title', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Title">
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render a dialog with aria-modal', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test">
          <p>Content</p>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should set aria-labelledby when title is provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Title">
          <p>Content</p>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should not set aria-labelledby when title is not provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).not.toHaveAttribute('aria-labelledby');
    });
  });

  describe('Close Button', () => {
    it('should render close button when title is provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test">
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByLabelText('閉じる')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test">
          <p>Content</p>
        </Modal>
      );

      await user.click(screen.getByLabelText('閉じる'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Backdrop', () => {
    it('should call onClose when backdrop is clicked', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test">
          <p>Content</p>
        </Modal>
      );

      // The backdrop is the element with aria-hidden="true"
      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).not.toBeNull();
      await user.click(backdrop!);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content is clicked', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test">
          <p>Content</p>
        </Modal>
      );

      await user.click(screen.getByText('Content'));
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Lock', () => {
    it('should set body overflow to hidden when open', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body overflow when closed', () => {
      const { unmount } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );
      unmount();
      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });

  describe('Sizes', () => {
    it('should apply default md size', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );
      const modalContent = document.querySelector('.sm\\:max-w-lg');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply sm size', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="sm">
          <p>Content</p>
        </Modal>
      );
      const modalContent = document.querySelector('.sm\\:max-w-md');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply lg size', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="lg">
          <p>Content</p>
        </Modal>
      );
      const modalContent = document.querySelector('.sm\\:max-w-2xl');
      expect(modalContent).toBeInTheDocument();
    });

    it('should apply xl size', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="xl">
          <p>Content</p>
        </Modal>
      );
      const modalContent = document.querySelector('.sm\\:max-w-4xl');
      expect(modalContent).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} className="custom-modal">
          <p>Content</p>
        </Modal>
      );
      const modalContent = document.querySelector('.custom-modal');
      expect(modalContent).toBeInTheDocument();
    });
  });
});

describe('ModalFooter', () => {
  it('should render children', () => {
    render(
      <ModalFooter>
        <button>OK</button>
        <button>Cancel</button>
      </ModalFooter>
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ModalFooter className="custom-footer">
        <button>OK</button>
      </ModalFooter>
    );
    expect(container.firstChild).toHaveClass('custom-footer');
  });

  it('should have border-t class', () => {
    const { container } = render(
      <ModalFooter>
        <button>OK</button>
      </ModalFooter>
    );
    expect(container.firstChild).toHaveClass('border-t');
  });
});
