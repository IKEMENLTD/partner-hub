import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { RoleGuard } from './RoleGuard';

// Mock the auth store
const mockUseAuthStore = vi.fn();

vi.mock('@/store', () => ({
  useAuthStore: (selector: (state: any) => any) => selector(mockUseAuthStore()),
}));

describe('RoleGuard', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReset();
  });

  describe('Access Granted', () => {
    it('should render children when user has an allowed role', () => {
      mockUseAuthStore.mockReturnValue({
        user: { role: 'admin' },
      });

      render(
        <RoleGuard allowedRoles={['admin', 'manager']}>
          <div>Protected content</div>
        </RoleGuard>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should render children for manager role', () => {
      mockUseAuthStore.mockReturnValue({
        user: { role: 'manager' },
      });

      render(
        <RoleGuard allowedRoles={['admin', 'manager']}>
          <div>Manager content</div>
        </RoleGuard>
      );

      expect(screen.getByText('Manager content')).toBeInTheDocument();
    });

    it('should render children for member role', () => {
      mockUseAuthStore.mockReturnValue({
        user: { role: 'member' },
      });

      render(
        <RoleGuard allowedRoles={['member']}>
          <div>Member content</div>
        </RoleGuard>
      );

      expect(screen.getByText('Member content')).toBeInTheDocument();
    });

    it('should render children for partner role', () => {
      mockUseAuthStore.mockReturnValue({
        user: { role: 'partner' },
      });

      render(
        <RoleGuard allowedRoles={['partner']}>
          <div>Partner content</div>
        </RoleGuard>
      );

      expect(screen.getByText('Partner content')).toBeInTheDocument();
    });
  });

  describe('Access Denied', () => {
    it('should redirect when user role is not in allowedRoles', () => {
      mockUseAuthStore.mockReturnValue({
        user: { role: 'member' },
      });

      render(
        <RoleGuard allowedRoles={['admin']}>
          <div>Admin only</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Admin only')).not.toBeInTheDocument();
    });

    it('should redirect when user has no role', () => {
      mockUseAuthStore.mockReturnValue({
        user: { role: undefined },
      });

      render(
        <RoleGuard allowedRoles={['admin']}>
          <div>Protected</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Protected')).not.toBeInTheDocument();
    });

    it('should redirect when user is null', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
      });

      render(
        <RoleGuard allowedRoles={['admin']}>
          <div>Protected</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Protected')).not.toBeInTheDocument();
    });

    it('should redirect when user is undefined', () => {
      mockUseAuthStore.mockReturnValue({
        user: undefined,
      });

      render(
        <RoleGuard allowedRoles={['admin']}>
          <div>Protected</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Protected')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Roles', () => {
    it('should allow access when user has any of the allowed roles', () => {
      mockUseAuthStore.mockReturnValue({
        user: { role: 'manager' },
      });

      render(
        <RoleGuard allowedRoles={['admin', 'manager', 'member']}>
          <div>Multi-role content</div>
        </RoleGuard>
      );

      expect(screen.getByText('Multi-role content')).toBeInTheDocument();
    });

    it('should deny access when user role is not among multiple allowed roles', () => {
      mockUseAuthStore.mockReturnValue({
        user: { role: 'partner' },
      });

      render(
        <RoleGuard allowedRoles={['admin', 'manager']}>
          <div>Internal only</div>
        </RoleGuard>
      );

      expect(screen.queryByText('Internal only')).not.toBeInTheDocument();
    });
  });
});
