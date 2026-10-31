import { create } from 'zustand';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User | null, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

const getInitialAuth = () => {
  try {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    const rememberedEmail = localStorage.getItem('remembered_email') || 'arul@example.com';

    if (token) {
      const user: User = userStr
        ? JSON.parse(userStr)
        : {
            id: 1,
            email: rememberedEmail,
            name: rememberedEmail.split('@')[0].replace('.', ' ').replace(/^\w/, (c) => c.toUpperCase()),
            role: 'Research Fellow',
          };
      return { isAuthenticated: true, user, token };
    }
  } catch (err) {
    console.error('Failed to parse cached auth credentials', err);
  }
  return { isAuthenticated: false, user: null, token: null };
};

const initial = getInitialAuth();

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: initial.isAuthenticated,
  user: initial.user,
  token: initial.token,
  isLoading: false,
  setAuth: (user, token) => {
    localStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_token', token);
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
      sessionStorage.setItem('auth_user', JSON.stringify(user));
      if (user.email) {
        localStorage.setItem('remembered_email', user.email);
      }
    }
    set({ isAuthenticated: true, user, token, isLoading: false });
  },
  clearAuth: () => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_user');
    // Note: We deliberately preserve 'remembered_email' so the email field stays pre-filled on the login screen
    set({ isAuthenticated: false, user: null, token: null, isLoading: false });
  },
  setLoading: (loading) => set({ isLoading: loading }),
}));
