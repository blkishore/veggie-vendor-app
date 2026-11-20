import { Link } from "react-router-dom";

export default function AppHeader({ user, onLogout }) {
  return (
    <header className="app-header">
      <Link className="app-brand" to="/" aria-label="Veggie Vendor home">
        <span className="brand-mark" aria-hidden="true">🥬</span>
        <span>
          <span className="app-title">Veggie Vendor</span>
          <span className="app-subtitle">Local produce. Better everyday business.</span>
        </span>
      </Link>
      {user && (
        <button className="ghost" type="button" onClick={onLogout}>
          Sign out
        </button>
      )}
    </header>
  );
}
