import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  isLoggedIn: boolean;
  email: string;
  displayName: string;
  userId: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  email: "",
  displayName: "",
  userId: null,
  user: null,
  login: async () => ({}),
  signup: async () => ({}),
  logout: () => {},
  loading: true,
});

function extractName(email: string): string {
  const prefix = email.split("@")[0] || "";
  const clean = prefix.replace(/[^a-zA-Z]/g, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const email = user?.email || "";
  const displayName = email ? extractName(email) : "";
  const isLoggedIn = !!user;
  const userId = user?.id || null;

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signup = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, email, displayName, userId, user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useSupabaseAuth = () => useContext(AuthContext);
