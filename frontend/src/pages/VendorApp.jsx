import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader.jsx";
import AuthPage from "./AuthPage.jsx";
import { api } from "../api.js";

export default function VendorApp() {
  const [auth, setAuth] = useState(null);
  const [checking, setChecking] = useState(api.hasAuthToken());
  const [sessionError, setSessionError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      if (!api.hasAuthToken()) {
        setChecking(false);
        return;
      }
      try {
        const payload = await api.me();
        if (active) setAuth(payload);
      } catch (error) {
        if (!active) return;
        if (error.status === 401) api.setAuthToken(null);
        else setSessionError(error.message);
      } finally {
        if (active) setChecking(false);
      }
    }
    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  function handleLogin(payload) {
    setAuth(payload);
    setSessionError(null);
    if (payload?.user?.role === "vendor") navigate("/vendor/main");
  }

  function handleLogout() {
    api.setAuthToken(null);
    setAuth(null);
    setSessionError(null);
    navigate("/");
  }

  const canAccess = auth?.user?.role === "vendor";

  return (
    <div className="app-shell">
      <AppHeader user={auth?.user} onLogout={handleLogout} />
      {checking ? (
        <div className="loading-state" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          Checking your account…
        </div>
      ) : canAccess ? (
        <Outlet context={{ auth }} />
      ) : (
        <main>
          {sessionError && <div className="status-message error" role="alert">{sessionError}</div>}
          {auth?.user && (
            <div className="status-message error" role="alert">
              This area is for vendor accounts. You are signed in as a {auth.user.role}.
            </div>
          )}
          <AuthPage onLogin={handleLogin} />
        </main>
      )}
    </div>
  );
}
