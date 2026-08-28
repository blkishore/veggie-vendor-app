import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AuthPage from "./AuthPage.jsx";
import { api } from "../api.js";

export default function VendorApp() {
  const [auth, setAuth] = useState(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.me()
      .then((payload) => setAuth(payload))
      .catch(() => setAuth(null))
      .finally(() => setChecking(false));
  }, []);

  function handleLogin(payload) {
    setAuth(payload);
    if (payload?.user?.role === "vendor") {
      navigate("/vendor/main");
    } else {
      // keep showing login so user can sign in with a vendor account
    }
  }

  function handleLogout() {
    api.setAuthToken(null);
    setAuth(null);
    navigate("/");
  }

  if (checking) return <div className="app-shell"><p className="empty-state">Checking session…</p></div>;

  if (!auth || !auth.user || auth.user.role !== "vendor") {
    return (
      <div className="app-shell">
        {auth?.user && (
          <div className="card error-box">
            <h3>Please sign in as a vendor</h3>
            <p className="helper-text">Signed in as <strong>{auth.user.role}</strong>. To continue as a vendor, sign in with a vendor account.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="ghost" onClick={handleLogout}>Log out</button>
              <button className="primary" onClick={() => navigate('/')}>Go home</button>
            </div>
          </div>
        )}
        <AuthPage onLogin={handleLogin} />
      </div>
    );
  }

  return <Outlet context={{ auth }} />;
}
