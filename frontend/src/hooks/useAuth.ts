import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services';
import { useAuthStore } from '@/store';
import type { LoginInput } from '@/types';

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
