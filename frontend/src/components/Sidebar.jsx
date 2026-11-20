const items = [
  ["overview", "Overview"],
  ["orders", "Orders"],
  ["products", "Products"],
  ["gallery", "Gallery"],
  ["settings", "Settings"],
];

export default function Sidebar({ activeTab, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo" aria-hidden="true">🥬</div>
        <div>
          <div className="brand-title">Veggie Vendor</div>
          <div className="brand-sub">Business workspace</div>
        </div>
      </div>

      <nav className="nav" aria-label="Vendor dashboard">
        {items.map(([id, label]) => (
          <button
            key={id}
            className={`nav-item${activeTab === id ? " active" : ""}`}
            type="button"
            aria-current={activeTab === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <small className="small-note">Your local market, organized.</small>
      </div>
    </aside>
  );
}
