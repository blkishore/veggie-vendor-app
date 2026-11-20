import { useCallback, useEffect, useState } from "react";
import { api, formatINR } from "../api.js";

export default function VendorOrders({ vendorId }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setOrders(await api.getVendorOrders(vendorId));
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (vendorId) load();
    else setLoading(false);
  }, [vendorId, load]);

  if (!vendorId) return <p className="empty-state">Choose a vendor to view orders.</p>;

  return (
    <div>
      <div className="section-header">
        <div>
          <h3>Customer orders</h3>
          <span className="small-note">Review recent orders sent to your business.</span>
        </div>
        {!loading && <span className="status-pill confirmed">{orders.length} total</span>}
      </div>
      {error && <div className="status-message error" role="alert">{error}</div>}
      {loading ? (
        <div className="loading-state" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          Loading your orders…
        </div>
      ) : orders.length === 0 ? (
        <p className="empty-state">No orders yet. New customer orders will appear here.</p>
      ) : (
        <div className="order-list">
          {orders.map((order) => {
            const itemCount = order.items?.length || 0;
            const status = (order.status || "pending").toLowerCase();
            return (
              <article key={order.id} className="order-card">
                <div>
                  <div className="order-title">Order #{order.id}</div>
                  <div className="order-meta">
                    {itemCount} {itemCount === 1 ? "item" : "items"} · {formatINR(order.total_amount)}
                  </div>
                </div>
                <span className={`status-pill ${status}`}>{status}</span>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
