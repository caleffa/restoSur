import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Persistencia TOKEN
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // Persistencia USER
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = async (email, password) => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await loginRequest(email, password);

      // 🔥 Soporte flexible para distintas APIs
      const authToken =
        response?.token ||
        response?.data?.token;

      const authUser =
        response?.user ||
        response?.data?.user || {
          id: response?.id || response?.data?.id,
          name: response?.name || response?.data?.name,
          role: response?.role || response?.data?.role,
          branchId: response?.branchId || response?.data?.branchId,
        };

      if (!authToken) {
        throw new Error('Respuesta inválida del servidor');
      }

      setToken(authToken);
      setUser(authUser);

      return authUser;
    } catch (error) {
      // Limpieza por seguridad
      setToken(null);
      setUser(null);

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.clear(); // 🔥 limpieza completa (opcional)
  };

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      loading,
      isAuthenticated: Boolean(token),
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}