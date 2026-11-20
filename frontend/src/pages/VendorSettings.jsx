export default function VendorSettings({ profile }) {
  return (
    <div>
      <div className="section-header">
        <div>
          <h3>Business settings</h3>
          <span className="small-note">Your account and business details.</span>
        </div>
      </div>
      <section className="card">
        <div className="profile-grid">
          <div>
            <div className="field-label">Business name</div>
            <div className="profile-value">{profile?.name || "Not provided"}</div>
          </div>
          <div>
            <div className="field-label">Contact phone</div>
            <div className="profile-value">{profile?.phone || "Not provided"}</div>
          </div>
        </div>
      </section>
      <div className="status-message info" role="note">
        Availability controls are not connected yet. Review your product listings to see their current status.
      </div>
    </div>
  );
}
