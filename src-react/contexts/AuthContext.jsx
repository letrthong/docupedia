import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setIsAuthenticated(true);
        // Verify token is still valid
        verifyAuth();
      } catch (e) {
        // Invalid saved user
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const verifyAuth = async () => {
    try {
      const response = await authApi.getMe();
      if (response.success) {
        setUser(response.data);
        setIsAuthenticated(true);
      }
    } catch (error) {
      // Token invalid, logout
      logout();
    }
  };

  const login = useCallback(async (username, password) => {
    try {
      const response = await authApi.login(username, password);
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: response.error?.message || 'Đăng nhập thất bại' };
    } catch (error) {
      return { success: false, error: error.message || 'Đăng nhập thất bại' };
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    // Clear saved project selection
    localStorage.removeItem('docupedia_selected_project');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    try {
      const response = await authApi.changePassword(oldPassword, newPassword);
      return { success: response.success, message: response.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  const value = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
