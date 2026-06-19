import { createContext, useContext, useState, useCallback } from 'react';
import { API, getStoredAuth, storeAuth, clearAuth } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getStoredAuth());

  const login = useCallback(async (username, password) => {
    const r = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Login gagal');
    storeAuth(data.token, data.username);
    setAuth({ token: data.token, username: data.username });
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuth({ token: null, username: null });
  }, []);

  return (
    <AuthContext.Provider value={{ token: auth.token, username: auth.username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
