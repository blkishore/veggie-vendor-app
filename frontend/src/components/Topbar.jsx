export default function Topbar({ title, user, profile }) {
  const initials = user?.name?.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "VV";
  return (
    <header className="topbar">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 className="topbar-title">{title}</h2>
        {profile?.name && <div className="small-note">{profile.name}</div>}
      </div>
      <div className="topbar-actions">
        <input className="search" placeholder="Search products, orders…" />
        <div className="avatar">{initials}</div>
      </div>
    </header>
  );
}
