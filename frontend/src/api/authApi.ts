import axios from 'axios';
import type { User } from '../store/authStore';

const API_BASE = '/api/auth';

export const login = async (email: string, password: string, remember_me = false) => {
  return axios.post<{ success: boolean; user: User; token: string; expires_at: string }>(
    `${API_BASE}/login`,
    { email, password, remember_me }
  );
};

export const registerDirect = async (email: string, password: string, name: string) => {
  return axios.post<{ success: boolean; user: User; token: string; expires_at: string }>(
    `${API_BASE}/register`,
    { email, password, name }
  );
};

export const enterDemoMode = async () => {
  return axios.post<{ success: boolean; user: User; token: string; is_demo: boolean }>(
    `${API_BASE}/demo`
  );
};

export const requestOtp = async (email: string) => {
  return axios.post<{ success: boolean; masked_email: string; dev_otp?: string; message: string }>(
    `${API_BASE}/request-otp`,
    { email }
  );
};

export const verifyOtp = async (email: string, otp: string) => {
  return axios.post<{ success: boolean; user: User; token: string; message?: string }>(
    `${API_BASE}/verify-otp`,
    { email, otp }
  );
};

export const resendOtp = async (email: string) => {
  return axios.post(`${API_BASE}/resend-otp`, { email });
};

export const forgotPassword = async (email: string) => {
  return axios.post<{ success: boolean; message: string; dev_otp?: string }>(
    `${API_BASE}/forgot-password`,
    { email }
  );
};

export const resetPassword = async (email: string, otp: string, new_password: string) => {
  return axios.post<{ success: boolean; message: string }>(
    `${API_BASE}/reset-password`,
    { email, otp, new_password }
  );
};

export const getMe = async (token: string) => {
  return axios.get<{ user: User }>(`${API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const updateProfile = async (name: string, role: string, token: string) => {
  return axios.put<{ success: boolean; user: User }>(
    `${API_BASE}/profile`,
    { name, role },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

export const logout = async (token: string) => {
  return axios.post(`${API_BASE}/logout`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
