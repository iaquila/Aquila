import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login as loginApi, loginDemo, logout as logoutApi } from '@/features/auth/service';

type LoginInput = { email: string; password: string };
type DemoLoginInput = LoginInput & { organizationId?: string; organizationName?: string };

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, LoginInput>({
    mutationFn: ({ email, password }) => loginApi(email, password),
    onSettled: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useDemoLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, DemoLoginInput>({
    mutationFn: ({ email, password, organizationId = 'org-iaquila', organizationName = 'iAQUILA Situation Room' }) =>
      loginDemo(email, password, organizationId, organizationName),
    onSettled: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await queryClient.cancelQueries();
      await logoutApi();
    },
    onSettled: () => {
      // RN 0.86 InteractionManager deprecated — use idle callback to defer clear after transitions
      const run = () => queryClient.clear();
      if (typeof globalThis.requestIdleCallback === 'function') {
        globalThis.requestIdleCallback(run);
      } else {
        setTimeout(run, 0);
      }
    },
  });
}
