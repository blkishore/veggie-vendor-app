import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BuyerList from "./BuyerList.jsx";
import { api } from "../api.js";

export default function CustomerPage() {
  const [buyer, setBuyer] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    Promise.all([api.listBuyers(), api.listVendors()])
      .then(([buyers, vendors]) => {
        if (!mounted) return;
        setBuyer(buyers[0] || null);
        setVendors(vendors || []);
        setSelectedVendor(vendors[0] || null);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  if (loading) return <div className="app-shell"><p className="empty-state">Loading customer…</p></div>;
  if (!buyer) return (
    <div className="app-shell">
      <div className="card">
        <h3>No buyer found</h3>
        <p className="helper-text">Seed the database or create a buyer first.</p>
        <button className="primary" onClick={() => navigate('/')}>Go home</button>
      </div>
    </div>
  );

  return (
    <div>
      {!selectedVendor ? (
        <div className="card">
          <h3>Choose a vendor</h3>
          <p className="helper-text">Select which vendor you want to order from.</p>
          {vendors.length === 0 ? (
            <p className="empty-state">No vendors available.</p>
          ) : (
            <div className="product-grid">
              {vendors.map((v) => (
                <button key={v.id} className="ghost" style={{ width: '100%', textAlign: 'left' }} onClick={() => setSelectedVendor(v)}>
                  {v.name}
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button className="ghost" onClick={() => navigate('/')}>Cancel</button>
          </div>
        </div>
      ) : (
        <BuyerList
          vendorId={selectedVendor?.id}
          buyerId={buyer.id}
          buyerName={buyer.name}
          vendorName={selectedVendor?.name}
          onBack={() => setSelectedVendor(null)}
        />
      )}
    </div>
  );
}
