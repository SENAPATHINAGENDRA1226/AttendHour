import { createContext, useContext, useState, ReactNode } from "react";
import { AuthState } from "../types";

interface OperatorInfo {
  id: number;
  name: string;
}

interface AuthContextValue {
  auth: AuthState | null;
  operator: OperatorInfo | null;
  login: (auth: AuthState) => void;
  logout: () => void;
  setOperator: (op: OperatorInfo) => void;
  clearOperator: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "attendance_auth";
const OPERATOR_ID_KEY = "operator_faculty_id";
const OPERATOR_NAME_KEY = "operator_faculty_name";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const [operator, setOperatorState] = useState<OperatorInfo | null>(() => {
    const id = localStorage.getItem(OPERATOR_ID_KEY);
    const name = localStorage.getItem(OPERATOR_NAME_KEY);
    return id && name ? { id: Number(id), name } : null;
  });

  function login(newAuth: AuthState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
    setAuth(newAuth);
  }

  function setOperator(op: OperatorInfo) {
    localStorage.setItem(OPERATOR_ID_KEY, String(op.id));
    localStorage.setItem(OPERATOR_NAME_KEY, op.name);
    setOperatorState(op);
  }

  function clearOperator() {
    localStorage.removeItem(OPERATOR_ID_KEY);
    localStorage.removeItem(OPERATOR_NAME_KEY);
    setOperatorState(null);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    clearOperator();
    setAuth(null);
  }

  return (
    <AuthContext.Provider value={{ auth, operator, login, logout, setOperator, clearOperator }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
