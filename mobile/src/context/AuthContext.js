import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { loginRequest } from '../api/auth';
import { setAuthToken } from '../api/http';

const AuthContext = createContext(null);
const TOKEN_KEY = 'restosur_mobile_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (storedToken && mounted) {
          setToken(storedToken);
          setAuthToken(storedToken);
        }
      } finally {
        if (mounted) setBootstrapping(false);
      }
    }

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await loginRequest(email, password);
    const nextToken = response?.token;

    if (!nextToken) {
      throw new Error('No se recibió token de autenticación');
    }

    await AsyncStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(response?.user || null);
    setAuthToken(nextToken);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, login, logout, bootstrapping }),
    [token, user, login, logout, bootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
