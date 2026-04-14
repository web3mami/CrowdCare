import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clearGoogleIdToken,
  getGoogleIdToken,
  pingUserSeenToApi,
} from "../lib/crowdcareApi.js";
import {
  getUser,
  signOut as clearLocalUser,
  ensureShareSlug as sessionEnsureShareSlug,
  updateProfile as sessionUpdateProfile,
} from "../lib/session.js";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUserState] = useState(() => getUser());
  const lastPingSubRef = useRef(null);

  const refresh = useCallback(() => {
    setUserState(getUser());
  }, []);

  useLayoutEffect(() => {
    if (!user?.publicKey) return;
    if (sessionEnsureShareSlug()) {
      refresh();
    }
  }, [user?.publicKey, user?.shareSlug, refresh]);

  /** Count signed-in Google accounts on the server (Neon) — once per sub when a GIS token exists. */
  useLayoutEffect(() => {
    if (!user?.publicKey || !user?.sub) return;
    if (!getGoogleIdToken()) return;
    if (lastPingSubRef.current === user.sub) return;
    lastPingSubRef.current = user.sub;
    void pingUserSeenToApi();
  }, [user?.publicKey, user?.sub]);

  const signOut = useCallback(async () => {
    lastPingSubRef.current = null;
    clearLocalUser();
    clearGoogleIdToken();
    sessionStorage.removeItem("crowdcare_browse_only");
    setUserState(null);
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const ensureShareSlug = useCallback(() => {
    if (sessionEnsureShareSlug()) {
      refresh();
    }
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
