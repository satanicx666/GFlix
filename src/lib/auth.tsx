import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  isAdmin: false,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  async function load(u: User | null) {
    setUser(u);
    if (!u) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const { data: admin } = await supabase.rpc("has_role", { _user_id: u.id, _role: "admin" });
    setIsAdmin(!!admin);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setTimeout(() => load(session?.user ?? null), 0);
      router.invalidate();
      if (event !== "SIGNED_OUT") qc.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        isAdmin,
        refresh: async () => {
          const { data } = await supabase.auth.getUser();
          await load(data.user);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
