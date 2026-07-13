import { useState } from "react";
import { api } from "../api.js";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", phone: "", password: "", role: "vendor" });
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setError(null);

    try {
      const body = {
        name: form.name,
        phone: form.phone,
        password: form.password,
        role: form.role,
      };

      const payload = mode === "login"
        ? await api.login({ phone: form.phone, password: form.password })
        : await api.register(body);

      api.setAuthToken(payload.token);
      onLogin(payload);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="card">
        <div className="section-title-row">
          <div>
            <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
            <p className="helper-text">
              {mode === "login"
                ? "Use your vendor or customer credentials to continue."
                : "Register as a vendor or customer with separate credentials."
              }
            </p>
          </div>
          <button className="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}> 
            {mode === "login" ? "New account" : "Already have one?"}
          </button>
        </div>

        {error && <div className="card error-box">{error}</div>}

        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="field-row">
              <div className="field">
                <label>Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. 9840000001"
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>

          {mode === "register" && (
            <div className="field-row">
              <label style={{ width: "100%" }}>
                Role
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={{ width: "100%", marginTop: "6px" }}
                >
                  <option value="vendor">Vendor</option>
                  <option value="customer">Customer</option>
                </select>
              </label>
            </div>
          )}

          <button className="primary" type="submit">
            {mode === "login" ? "Sign in" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
