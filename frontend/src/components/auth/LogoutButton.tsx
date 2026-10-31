import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../api/authApi';

export const LogoutButton: React.FC = () => {
  const { token, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    if (!token) {
      clearAuth();
      return;
    }
    
    setIsLoading(true);
    try {
      await logout(token);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      clearAuth();
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
      title="Log out"
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <LogOut className="w-5 h-5" />
      )}
      <span className="text-sm font-medium">Log out</span>
    </button>
  );
};
