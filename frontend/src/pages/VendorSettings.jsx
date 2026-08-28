import { useState } from "react";
import { api } from "../api.js";

export default function VendorSettings({ vendorId, profile }) {
  const [available, setAvailable] = useState(profile?.available ?? true);

  async function toggleAvailable() {
    try {
      // Quick local toggle; backend vendor update endpoint not implemented yet
      setAvailable(!available);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div>
      <div className="section-header">
        <h3>Settings</h3>
        <span className="small-note">Business settings</span>
      </div>
      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label className="helper-text">Available for customers</label>
          <button className="ghost" onClick={toggleAvailable}>{available ? 'Yes' : 'No'}</button>
        </div>
      </div>
    </div>
  );
}
