import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import type { UserRole } from '@/types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);

  if (!user?.role || !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to="/today" replace />;
  }

  return <>{children}</>;
}
