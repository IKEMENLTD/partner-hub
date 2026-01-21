import { useMutation, useQuery } from '@tanstack/react-query';
import { authService } from '@/services';
import { useAuthStore } from '@/store';
import type { LoginInput } from '@/types';

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface ForgotPasswordInput {
  email: string;
}

interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export function useLogin() {
  const { login, setLoading, setError } = useAuthStore();

  return useMutation({
    mutationFn: (credentials: LoginInput) => authService.login(credentials),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (response) => {
      const { user, tokens } = response.data;
      login(user, tokens.accessToken, tokens.refreshToken);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : 'ログインに失敗しました');
    },
    onSettled: () => {
      setLoading(false);
    },
  });
}

export function useRegister() {
  const { login, setLoading, setError } = useAuthStore();

  return useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (response) => {
      const { user, tokens } = response.data;
      login(user, tokens.accessToken, tokens.refreshToken);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : '登録に失敗しました');
    },
    onSettled: () => {
      setLoading(false);
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      logout();
    },
    onError: () => {
      // Even if the API call fails, we should still log out locally
      logout();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordInput) => authService.forgotPassword(data),
    onError: (error: Error) => {
      console.error('Forgot password error:', error.message);
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordInput) => authService.resetPassword(data),
    onError: (error: Error) => {
      console.error('Reset password error:', error.message);
    },
  });
}

export function useValidateResetToken(token: string) {
  return useQuery({
    queryKey: ['validateResetToken', token],
    queryFn: () => authService.validateResetToken(token),
    enabled: !!token,
    retry: false,
    staleTime: 0, // Always fetch fresh validation
  });
}
