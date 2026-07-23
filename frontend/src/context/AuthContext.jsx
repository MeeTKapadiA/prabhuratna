import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('prabhuratna_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('prabhuratna_token') || null);
  const [isLoading, setIsLoading] = useState(false);

  const role = user?.role || 'staff';
  const isAdmin = role === 'admin';

  // Permission check helper
  const hasPermission = (module, action = 'view') => {
    if (isAdmin) return true; // Admin has full unrestricted access

    // Staff permissions mapping
    if (role === 'staff') {
      if (module === 'products') return ['view', 'add', 'edit'].includes(action);
      if (module === 'billing' || module === 'invoices') return ['view', 'create', 'print', 'download'].includes(action);
      if (module === 'inventory') return ['view', 'update'].includes(action);
      if (module === 'suppliers') return ['view', 'create', 'edit'].includes(action);
      if (module === 'purchases') return ['view', 'create', 'edit'].includes(action);
      if (module === 'returns') return ['view', 'create'].includes(action);
      // Restricted for Staff: reports, users, settings, deletion
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

  const register = async (name, email, password, username, userRole = 'staff') => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/auth/register', 'POST', { name, email, password, username, role: userRole });
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
      isAuthenticated: !!token,
      isLoading,
      login,
      register,
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
