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

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/auth/login', 'POST', { email, password });
      if (res.success) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('prabhuratna_token', res.token);
        localStorage.setItem('prabhuratna_user', JSON.stringify(res.user));
        return { success: true };
      }
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('/auth/register', 'POST', { name, email, password });
      if (res.success) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('prabhuratna_token', res.token);
        localStorage.setItem('prabhuratna_user', JSON.stringify(res.user));
        return { success: true };
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
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
