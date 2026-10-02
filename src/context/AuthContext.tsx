import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role, BranchScope } from '../types';
import { storage } from '../services/storage';
import { verifyPassword } from '../utils/crypto';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  quickDemoLogin: (role: Role, branch?: 'coka' | 'mizan') => void;
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

    const user = storage.getUserByUsername(cleanUser);
    if (!user) {
      return { success: false, error: 'auth.invalidCredentials' };
    }

    if (user.status !== 'active') {
      return { success: false, error: 'auth.accountInactive' };
    }

    // Verify password against stored hash and salt
    const matches = await verifyPassword(password, user.passwordHash, user.salt);

    // Fallback for demo convenience: if default seed users are tested with their standard passwords
    const isSeedDefaultMatch = (
      (cleanUser === 'owner' && (password === 'Admin@123' || password === 'admin' || matches)) ||
      (cleanUser === 'manager' && (password === 'Manager@123' || password === 'manager' || matches)) ||
      (cleanUser === 'baker_coka' && (password === 'Baker@123' || password === 'baker' || matches)) ||
      (cleanUser === 'sales_coka' && (password === 'Sales@123' || password === 'sales' || matches)) ||
      (cleanUser === 'sales_mizan' && (password === 'Sales@123' || password === 'sales' || matches))
    );

    if (!matches && !isSeedDefaultMatch) {
      return { success: false, error: 'auth.invalidCredentials' };
    }

    // Record login timestamp
    storage.recordLogin(user.id);
    localStorage.setItem(SESSION_KEY, user.id);
    setCurrentUser(user);

    storage.logAudit({
      actorId: user.id,
      actorName: user.displayName,
      actorRole: user.role,
      action: 'UPDATE_SETTINGS', // general session audit
      targetType: 'AuthSession',
      targetId: user.id,
      details: `User ${user.username} logged in successfully from branch scope: ${user.branch}`
    });

    return { success: true };
  };

  const quickDemoLogin = (role: Role, branch?: 'coka' | 'mizan') => {
    const users = storage.getUsers();
    let target = users.find(u => u.role === role && u.status === 'active');
    if (role === 'sales' && branch) {
      target = users.find(u => u.role === 'sales' && u.branch === branch && u.status === 'active') || target;
    }

    if (target) {
      storage.recordLogin(target.id);
      localStorage.setItem(SESSION_KEY, target.id);
      setCurrentUser(target);
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

  const isOwner = currentUser?.role === 'owner';
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
        quickDemoLogin,
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
