import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function VendorOrders({ vendorId }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const list = await api.getVendorOrders(vendorId);
      setOrders(list || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!vendorId) return;
    load();
  }, [vendorId]);

  if (!vendorId) return <p className="empty-state">Select a vendor to view orders.</p>;

  return (
    <div>
      <div className="section-header">
        <h3>Orders</h3>
        <span className="small-note">Recent orders</span>
      </div>
      {error && <div className="card error-box">{error}</div>}
      {orders.length === 0 ? (
        <p className="empty-state">No orders yet.</p>
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <div key={o.id} className="order-card">
              <div>
                <div className="order-title">Order #{o.id}</div>
                <div className="order-meta">{o.items.length} items • ₹{o.total_amount}</div>
              </div>
              <div className="order-actions">
                <span className={`status-pill ${o.status}`}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
