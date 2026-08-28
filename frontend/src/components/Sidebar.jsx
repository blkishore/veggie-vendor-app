export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">🥕</div>
        <div>
          <div className="brand-title">Veggie Vendor</div>
          <div className="brand-sub">Dashboard</div>
        </div>
      </div>

      <nav className="nav">
        <button className="nav-item" onClick={() => window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: 'overview' }))}>Overview</button>
        <button className="nav-item" onClick={() => window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: 'orders' }))}>Orders</button>
        <button className="nav-item" onClick={() => window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: 'products' }))}>Products</button>
        <button className="nav-item" onClick={() => window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: 'gallery' }))}>Gallery</button>
        <button className="nav-item" onClick={() => window.dispatchEvent(new CustomEvent('dashboard:navigate', { detail: 'settings' }))}>Settings</button>
      </nav>

      <div className="sidebar-footer">
        <small className="small-note">v1.0 • Local</small>
      </div>
    </aside>
  );
}
