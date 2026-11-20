export default function Topbar({ title, user, profile }) {
  const initials = user?.name
    ?.trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "VV";
  return (
    <header className="topbar">
      <div>
        <h2 className="topbar-title">{title}</h2>
        <div className="small-note">{profile?.name || user?.name || "Your business workspace"}</div>
      </div>
      <div className="topbar-actions">
        <div className="avatar" aria-label={`Signed in as ${user?.name || "user"}`}>{initials}</div>
      </div>
    </header>
  );
}
