export default function ProfilePage({ user, profile, onLogout }) {
  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Welcome back, {user.name}</h2>
          <p className="helper-text">Role: {user.role}</p>
        </div>
        <button className="ghost" onClick={onLogout}>Log out</button>
      </div>

      <div className="card">
        <h3>Your profile</h3>
        <div className="field-row">
          <div className="field">
            <label>Name</label>
            <div>{user.name}</div>
          </div>
          <div className="field">
            <label>Phone</label>
            <div>{user.phone}</div>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Role</label>
            <div>{user.role}</div>
          </div>
          <div className="field">
            <label>ID</label>
            <div>{profile?.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
