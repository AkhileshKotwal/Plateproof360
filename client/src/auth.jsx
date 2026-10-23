import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from './api';

const AuthContext = createContext(null);
const STORAGE_KEY = 'plateproof-session';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
  });

  useEffect(() => {
    const logout = () => setSession(null);
    window.addEventListener('plateproof:unauthorized', logout);
    return () => window.removeEventListener('plateproof:unauthorized', logout);
  }, []);

  async function login(name, role) {
    const result = await apiFetch('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ name, role })
    });
    const next = { token: result.token, name: result.name, role: result.role };
    setSession(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function logout() {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo(() => ({ session, login, logout }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
