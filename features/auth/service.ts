import { useAuthStore, type User } from '@/features/auth/store';
import { login as loginRequest, logout as logoutRequest } from '@/features/auth/api';
import { mockApi } from '@/features/elections/service';
import { setTokenAsync, deleteTokenAsync } from '@/core/utils/secureStorage';
import type { MappedProfile } from '@/features/auth/schemas';

function toUser(profile: MappedProfile): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    organizationId: profile.organizationId,
    organizationName: profile.organizationName,
    ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
  };
}

export const login = async (email: string, password: string) => {
  const profile = await loginRequest(email, password);
  useAuthStore.getState().login(toUser(profile));
};

// Keeps the one-tap demo roles on synthetic data so a presentation never
// depends on the live backend.
export const loginDemo = async (email: string, password: string, organizationId: string, organizationName: string) => {
  const user = await mockApi.login(email, password, organizationId, organizationName);
  useAuthStore.getState().login(user);
  if (user.token) {
    try {
      await setTokenAsync(user.token);
    } catch (e) {
      if (__DEV__) console.warn('[auth] demo token persist failed (non-fatal)', e);
    }
  }
};

export const logout = async () => {
  // clear Zustand first so the UI navigates even if the network call fails
  useAuthStore.getState().logout();
  try {
    await logoutRequest();
  } catch (e) {
    if (__DEV__) console.warn('[auth] logout request failed', e);
  }
  try {
    await deleteTokenAsync();
  } catch (e) {
    if (__DEV__) console.warn('[auth] deleteTokenAsync failed (non-fatal)', e);
  }
};
