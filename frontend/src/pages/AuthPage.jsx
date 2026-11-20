import { useState } from "react";
import { api } from "../api.js";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    store_name: "",
    phone: "",
    password: "",
    role: "vendor",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const body = {
        name: form.name.trim(),
        owner_name: form.name.trim(),
        store_name: form.store_name.trim() || form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
      };

      const payload = mode === "login"
        ? await api.login({ phone: form.phone.trim(), password: form.password })
        : await api.register(body);

      api.setAuthToken(payload.token);
      onLogin(payload);
    } catch (err) {
      setError(err.message || "We couldn't sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setError(null);
    setMode(nextMode);
  }

  const isRegistering = mode === "register";

  return (
    <div className="auth-layout">
      <section className="auth-aside" aria-labelledby="welcome-heading">
        <p className="eyebrow">A fresher way to work</p>
        <h2 id="welcome-heading">Your neighborhood market, made simpler.</h2>
        <p>
          Keep your daily business moving with clear orders, easy sales tracking,
          and produce lists that help you plan ahead.
        </p>
        <ul className="feature-list">
          <li><span className="feature-check" aria-hidden="true">✓</span> Keep customer orders in one place</li>
          <li><span className="feature-check" aria-hidden="true">✓</span> Track sales and daily performance</li>
          <li><span className="feature-check" aria-hidden="true">✓</span> Plan tomorrow's produce with confidence</li>
        </ul>
      </section>

      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-heading">
          <h2 id="auth-heading">{isRegistering ? "Create your account" : "Welcome back"}</h2>
          <p>
            {isRegistering
              ? "A few details and you're ready to get started."
              : "Sign in to pick up where you left off."}
          </p>
        </div>

        {error && (
          <div className="status-message error" role="alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} aria-busy={submitting}>
          {isRegistering && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="account-name">Your name</label>
                <input
                  id="account-name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Meena Kumar"
                  required
                />
              </div>
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label htmlFor="account-phone">Phone number</label>
              <input
                id="account-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="e.g. 98400 00000"
                required
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="account-password">Password</label>
              <input
                id="account-password"
                type="password"
                autoComplete={isRegistering ? "new-password" : "current-password"}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
            </div>
          </div>

          {isRegistering && (
            <>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="account-role">I am joining as a</label>
                  <select
                    id="account-role"
                    value={form.role}
                    onChange={(event) => setForm({ ...form, role: event.target.value })}
                  >
                    <option value="vendor">Vendor</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
              </div>
              {form.role === "vendor" && (
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="store-name">Business or stall name <span className="small-note">(optional)</span></label>
                    <input
                      id="store-name"
                      autoComplete="organization"
                      value={form.store_name}
                      onChange={(event) => setForm({ ...form, store_name: event.target.value })}
                      placeholder="e.g. Meena's Fresh Market"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <button className="primary" type="submit" disabled={submitting}>
            {submitting
              ? "Please wait…"
              : isRegistering
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="auth-switch">
          <span>{isRegistering ? "Already have an account?" : "New to Veggie Vendor?"}</span>
          <button
            className="text-button"
            type="button"
            onClick={() => changeMode(isRegistering ? "login" : "register")}
            disabled={submitting}
          >
            {isRegistering ? "Sign in" : "Create account"}
          </button>
        </div>
      </section>
    </div>
  );
}
