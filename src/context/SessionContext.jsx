import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  getUser,
  signOut as clearLocalUser,
  ensureShareSlug as sessionEnsureShareSlug,
  updateProfile as sessionUpdateProfile,
} from "../lib/session.js";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { logout } = usePrivy();
  const [user, setUserState] = useState(() => getUser());

  const refresh = useCallback(() => {
    setUserState(getUser());
  }, []);

  const signOut = useCallback(async () => {
    clearLocalUser();
    sessionStorage.removeItem("crowdcare_browse_only");
    sessionStorage.removeItem("crowdcare_gate_started");
    setUserState(null);
    await logout();
  }, [logout]);

  const ensureShareSlug = useCallback(() => {
    sessionEnsureShareSlug();
    refresh();
  }, [refresh]);

  const updateProfile = useCallback(
    (updates) => {
      sessionUpdateProfile(updates);
      refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      user,
      refresh,
      signOut,
      ensureShareSlug,
      updateProfile,
    }),
    [user, refresh, signOut, ensureShareSlug, updateProfile]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
