import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accesspass_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate existing token on page refresh
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('accesspass_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        if (response.success && response.user) {
          setUser(response.user);
        } else {
          logout();
        }
      } catch (error) {
        // Token invalid or expired
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login(email, password);
    if (response.success && response.token) {
      localStorage.setItem('accesspass_token', response.token);
      setToken(response.token);
      setUser(response.user);
      return response.user;
    }
    throw new Error(response.message || 'Login failed.');
  };

  const logout = () => {
    localStorage.removeItem('accesspass_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
