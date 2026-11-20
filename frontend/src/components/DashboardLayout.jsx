import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function DashboardLayout({
  children,
  title,
  user,
  profile,
  activeTab,
  onNavigate,
}) {
  return (
    <div className="dashboard-shell">
      <Sidebar activeTab={activeTab} onNavigate={onNavigate} />
      <div className="dashboard-main">
        <Topbar title={title} user={user} profile={profile} />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
