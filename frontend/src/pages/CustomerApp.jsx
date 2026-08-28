import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AuthPage from "./AuthPage.jsx";
import { api } from "../api.js";

export default function CustomerApp() {
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
    if (payload?.user?.role === "customer") {
      navigate("/customer/main");
    } else {
      // leave AuthPage visible and show message via auth state
    }
  }

  function handleLogout() {
    api.setAuthToken(null);
    setAuth(null);
    navigate("/");
  }

  if (checking) return <div className="app-shell"><p className="empty-state">Checking session…</p></div>;

  // If not authenticated as customer, present the login form (allow re-login even if a vendor token exists)
  if (!auth || !auth.user || auth.user.role !== "customer") {
    return (
      <div className="app-shell">
        {auth?.user && (
          <div className="card error-box">
            <h3>Please sign in as a customer</h3>
            <p className="helper-text">Signed in as <strong>{auth.user.role}</strong>. To continue as a customer, sign in with a customer account.</p>
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
