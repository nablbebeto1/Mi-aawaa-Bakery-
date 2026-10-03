import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, BranchScope } from '../types';
import { storage } from '../services/storage';
import { verifyPassword } from '../utils/crypto';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  changeInitialPassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  requestLogout: () => void;
  confirmLogout: () => void;
  cancelLogout: () => void;
  showLogoutConfirm: boolean;
  isOwner: boolean;
  isManager: boolean;
  isProduction: boolean;
  isSales: boolean;
  refreshCurrentUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'miaawaa_active_session_user_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  useEffect(() => {
    // Restore session on load
    try {
      const storedId = localStorage.getItem(SESSION_KEY);
      if (storedId) {
        const user = storage.getUserById(storedId);
        if (user && user.status === 'active') {
          setCurrentUser(user);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (e) {
      console.error('Session restore error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCurrentUser = () => {
    if (currentUser) {
      const updated = storage.getUserById(currentUser.id);
      if (updated) {
        setCurrentUser(updated);
      }
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) {
      return { success: false, error: 'auth.invalidCredentials' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'auth.invalidCredentials' };
      }

      if (data.user) {
        const safeUser: User = {
          ...data.user,
          mustChangePassword: Boolean(data.user.mustChangePassword)
        };
        storage.recordLogin(safeUser.id);
        localStorage.setItem(SESSION_KEY, safeUser.id);
        setCurrentUser(safeUser);
        return { success: true };
      }
      return { success: false, error: 'auth.invalidCredentials' };
    } catch (err: any) {
      console.warn('Backend login endpoint unavailable, trying local fallback verification:', err);
      // Offline fallback: verify cryptographic hash only (no hardcoded credentials)
      const user = storage.getUserByUsername(cleanUser);
      if (!user) {
        return { success: false, error: 'auth.invalidCredentials' };
      }
      if (user.status !== 'active') {
        return { success: false, error: 'auth.accountInactive' };
      }
      const matches = await verifyPassword(password, user.passwordHash, user.salt);
      if (!matches) {
        return { success: false, error: 'auth.invalidCredentials' };
      }
      storage.recordLogin(user.id);
      localStorage.setItem(SESSION_KEY, user.id);
      setCurrentUser(user);
      return { success: true };
    }
  };

  const changeInitialPassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'No active session found.' };
    }

    try {
      const data = await storage.changeInitialPassword(
        currentUser.username,
        currentPassword,
        newPassword,
        confirmPassword
      );
      if (data.user) {
        const updated: User = {
          ...data.user,
          mustChangePassword: false
        };
        localStorage.setItem(SESSION_KEY, updated.id);
        setCurrentUser(updated);
      } else {
        refreshCurrentUser();
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update initial password.' };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'No active session found.' };
    }

    try {
      await storage.changePassword(
        currentUser.id,
        currentPassword,
        newPassword,
        confirmPassword
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  };

  const requestLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const isOwner = currentUser?.role === 'owner' || currentUser?.username === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isProduction = currentUser?.role === 'production';
  const isSales = currentUser?.role === 'sales';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        changeInitialPassword,
        changePassword,
        requestLogout,
        confirmLogout,
        cancelLogout,
        showLogoutConfirm,
        isOwner,
        isManager,
        isProduction,
        isSales,
        refreshCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
