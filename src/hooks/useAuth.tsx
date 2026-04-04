import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthState {
  isLoggedIn: boolean;
  email: string;
  displayName: string;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  email: "",
  displayName: "",
  login: () => {},
  logout: () => {},
});

function extractName(email: string): string {
  const prefix = email.split("@")[0] || "";
  // Remove numbers/special chars, capitalize first letter
  const clean = prefix.replace(/[^a-zA-Z]/g, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState(() => localStorage.getItem("civiceye_email") || "");
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("civiceye_email"));

  const displayName = email ? extractName(email) : "";

  const login = (userEmail: string) => {
    setEmail(userEmail);
    setIsLoggedIn(true);
    localStorage.setItem("civiceye_email", userEmail);
  };

  const logout = () => {
    setEmail("");
    setIsLoggedIn(false);
    localStorage.removeItem("civiceye_email");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, email, displayName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
