import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from 'react';
import type { User } from '@/types';
// import { MOCK_USERS, DEMO_PASSWORDS } from '@/data/mockData';
import api from '@/services/api';
import { saveToken, clearToken } from '@/utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  sessionWarning: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  keepAlive: () => void;
  updateUser: (data: Partial<User>) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

const SESSION_WARN_MS   = 4 * 60 * 1000;   // 4 min
const SESSION_EXPIRE_MS = 5 * 60 * 1000;   // 5 min

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = sessionStorage.getItem('ics_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [sessionWarning, setSessionWarning] = useState(false);
  const warnTimer    = useRef<ReturnType<typeof setTimeout>>();
  const expireTimer  = useRef<ReturnType<typeof setTimeout>>();

  const clearTimers = useCallback(() => {
    clearTimeout(warnTimer.current);
    clearTimeout(expireTimer.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    if (!user) return;
    warnTimer.current   = setTimeout(() => setSessionWarning(true),  SESSION_WARN_MS);
    expireTimer.current = setTimeout(() => {
      setUser(null);
      setSessionWarning(false);
      clearToken();
    }, SESSION_EXPIRE_MS);
  }, [user, clearTimers]);

  // Restart timers on any activity
  useEffect(() => {
    const ev = () => { setSessionWarning(false); resetTimers(); };
    window.addEventListener('mousemove', ev);
    window.addEventListener('keydown', ev);
    return () => {
      window.removeEventListener('mousemove', ev);
      window.removeEventListener('keydown', ev);
    };
  }, [resetTimers]);

  useEffect(() => { resetTimers(); }, [resetTimers]);

 

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 750));
    // Simulate network delay
    // await new Promise((r) => setTimeout(r, 750));
    // const expectedPwd = DEMO_PASSWORDS[email];
    // const found       = MOCK_USERS.find((u) => u.email === email);
    // if (!found || expectedPwd !== password) return false;
    // const token = generateMockToken(found.id);
    // saveToken(token);
    // setUser(found);
    // return true;

    try{
      console.log("Calling backend...");
      const res = await api.post("/auth/login", {
        email,password,
      });

      console.log("Backend response:", res.data);

      const token = res.data.data.token;

      const backendUser = res.data.data.user;
      
      const ROLE_MAP: Record<string, any> = {
        ADMIN: 'Admin',
        ADJUSTER: 'Claims Adjuster',
        UNDERWRITER: 'Underwriter',
        POLICYHOLDER: 'Policyholder',
        PARTNER: 'Partner/TPA',
        FINANCE: 'Finance',
      };

      const user = {
        id : backendUser.id,
        name : backendUser.fullName,
        email : backendUser.email,
        role : ROLE_MAP[backendUser.role] || backendUser.role,
        phone : backendUser.phone,
        department : backendUser.department,
        address: backendUser.address,
        isActive: backendUser.active,
        createdAt: backendUser.createdAt,
        lastLoginAt: backendUser.lastLoginAt,
        emailNotificationsEnabled: backendUser.emailNotificationsEnabled ?? true,
        smsNotificationsEnabled: backendUser.smsNotificationsEnabled ?? false,
      };

      saveToken(token);
      sessionStorage.setItem('ics_auth_user', JSON.stringify(user));
      setUser(user);
    
      return true;
    }
    catch(error: any){
      console.error("Login failed:", error);
      const msg = error.response?.data?.message || "Invalid email or password. Please try again.";
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(() => {
    clearTimers();
    setUser(null);
    setSessionWarning(false);
    clearToken();
  }, [clearTimers]);

  const keepAlive = useCallback(() => {
    setSessionWarning(false);
    resetTimers();
  }, [resetTimers]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      sessionStorage.setItem('ics_auth_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, sessionWarning, login, logout, keepAlive, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
