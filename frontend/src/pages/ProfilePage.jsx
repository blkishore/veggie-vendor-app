export default function ProfilePage({ user, profile }) {
  const profileName = profile?.name || user.name;

  return (
    <section className="card" aria-labelledby="profile-heading">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Account</p>
          <h2 id="profile-heading" className="profile-heading">{profileName}</h2>
        </div>
        <span className="status-pill confirmed">
          {user.role === "vendor" ? "Vendor account" : "Customer account"}
        </span>
      </div>
      <div className="profile-grid">
        <div>
          <div className="field-label">Account name</div>
          <div className="profile-value">{user.name}</div>
        </div>
        <div>
          <div className="field-label">Phone number</div>
          <div className="profile-value">{user.phone}</div>
        </div>
      </div>
    </section>
  );
}
