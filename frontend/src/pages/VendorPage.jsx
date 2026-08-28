import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import VendorDashboard from "./VendorDashboard.jsx";
import { api } from "../api.js";

export default function VendorPage() {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { auth } = useOutletContext() || {};

  useEffect(() => {
    let mounted = true;
    api.listVendors().then((list) => {
      if (!mounted) return;
      // prefer vendor tied to auth.profile when available
      if (auth?.profile && auth.user?.role === "vendor") {
        const own = list.find((v) => v.id === auth.profile.id);
        setVendor(own || list[0] || null);
      } else {
        setVendor(list[0] || null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => (mounted = false);
  }, [auth]);

  if (loading) return <div className="app-shell"><p className="empty-state">Loading vendor…</p></div>;
  if (!vendor) return (
    <div className="app-shell">
      <div className="card">
        <h3>No vendor found</h3>
        <p className="helper-text">Seed the database or create a vendor first.</p>
        <button className="primary" onClick={() => navigate('/')}>Go home</button>
      </div>
    </div>
  );

  return <VendorDashboard vendorId={vendor.id} vendorName={vendor.name} onBack={() => navigate('/')} />;
}
