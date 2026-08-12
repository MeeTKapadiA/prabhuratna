import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('prabhuratna_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('prabhuratna_user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('prabhuratna_token') || null);
  const [isLoading, setIsLoading] = useState(false);

  const role = user?.role || 'staff';
  const isSuperAdmin = role === 'superadmin';
  // Shop-owner admin features: admin + superadmin (superadmin inherits admin)
  const isAdmin = role === 'admin' || isSuperAdmin;

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Permission check helper
  const hasPermission = (module, action = 'view') => {
    if (isAdmin) return true; // Admin + superadmin: full business access

    // Staff: counter job only — billing, dashboard view, products view, inventory adjust/logs
    if (role === 'staff') {
      if (module === 'dashboard') return ['view'].includes(action);
      if (module === 'products') return ['view'].includes(action);
      if (module === 'billing' || module === 'invoices') {
        return ['view', 'create', 'print', 'download'].includes(action);
      }
      if (module === 'inventory') return ['view', 'update'].includes(action);
      return false;
    }
    return false;
  };

  const login = async (loginIdentifier, password) => {
    setIsLoading(true);
    try {
      // Support username or email login
      const payload = loginIdentifier.includes('@')
        ? { email: loginIdentifier, password }
        : { username: loginIdentifier, password };

      const res = await apiRequest('/auth/login', 'POST', payload);
      if (res.success) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('prabhuratna_token', res.token);
        localStorage.setItem('prabhuratna_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('prabhuratna_token');
    localStorage.removeItem('prabhuratna_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      role,
      isAdmin,
      isSuperAdmin,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
