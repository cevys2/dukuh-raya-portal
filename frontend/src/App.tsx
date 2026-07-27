import { useEffect, useState } from "react";
import { getStoredAuth, isAllowedRedirect, setStoredAuth, touchSession, type AuthUser } from "./lib/api";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

// Other apps (shipyard-pricing, upcoming ones) bounce unauthenticated users
// here with ?redirect=<their URL>. After login we send the token back to
// that URL instead of showing the Portal dashboard.
function getRedirectTarget(): string | null {
  const target = new URLSearchParams(window.location.search).get("redirect");
  return target && isAllowedRedirect(target) ? target : null;
}

export default function App() {
  const [auth, setAuth] = useState<AuthUser | null>(() => getStoredAuth());
  // Read once on mount - the hand-off below strips nothing from the URL, but a
  // logout would otherwise re-arm it against a stale target.
  const [redirectTarget] = useState(getRedirectTarget);
  const handingOff = Boolean(auth && redirectTarget);

  // The hand-off lives here rather than in onLogin because an already-signed-in
  // user never passes through the login form: LoginPage is skipped entirely and
  // ?redirect= would be silently dropped, stranding them on the dashboard.
  useEffect(() => {
    if (!auth || !redirectTarget) return;
    window.location.replace(`${redirectTarget}#token=${encodeURIComponent(auth.token)}`);
  }, [auth, redirectTarget]);

  useEffect(() => {
    if (!auth) return;
    touchSession();
    const interval = setInterval(touchSession, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") touchSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [auth]);

  function onLogin(user: AuthUser) {
    setStoredAuth(user);
    setAuth(user);
  }

  function onLogout() {
    setStoredAuth(null);
    setAuth(null);
  }

  if (!auth) {
    return <LoginPage onLogin={onLogin} />;
  }

  // Navigation is already under way - showing the dashboard would just flash.
  if (handingOff) {
    return null;
  }

  return <DashboardPage auth={auth} onLogout={onLogout} />;
}
