import React from 'react';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onRedirect: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onRedirect }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    onRedirect();
    return null;
  }

  return <>{children}</>;
};
