import { useEffect, useState } from "react";
import AuthPage from "./pages/AuthPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import RoleSelector from "./pages/RoleSelector.jsx";
import AppHeader from "./components/AppHeader.jsx";
import { api } from "./api.js";

export default function App() {
  const [auth, setAuth] = useState(null);
  const [checkingSession, setCheckingSession] = useState(api.hasAuthToken());
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      if (!api.hasAuthToken()) {
        setCheckingSession(false);
        return;
      }

      try {
        const payload = await api.me();
        if (active) setAuth(payload);
      } catch (error) {
        if (!active) return;
        if (error.status === 401) {
          api.setAuthToken(null);
        } else {
          setSessionError(error.message);
        }
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  function handleLogout() {
    api.setAuthToken(null);
    setAuth(null);
    setSessionError(null);
  }

  return (
    <div className="app-shell">
      <AppHeader user={auth?.user} onLogout={handleLogout} />
      {checkingSession ? (
        <div className="loading-state" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          Restoring your session…
        </div>
      ) : !auth ? (
        <main>
          {sessionError && (
            <div className="status-message error" role="alert">
              <span>{sessionError} You can still sign in once the service is available.</span>
            </div>
          )}
          <AuthPage
            onLogin={(payload) => {
              setSessionError(null);
              setAuth(payload);
            }}
          />
        </main>
      ) : (
        <main>
          <ProfilePage user={auth.user} profile={auth.profile} />
          <RoleSelector user={auth.user} />
        </main>
      )}
    </div>
  );
}
