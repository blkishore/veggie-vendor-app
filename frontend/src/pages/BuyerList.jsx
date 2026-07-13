import { useEffect, useMemo, useState } from "react";
import { api, todayISO } from "../api.js";

export default function BuyerList({ vendorId, buyerId, buyerName, vendorName, onBack }) {
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const tomorrow = todayISO(1);

  useEffect(() => {
    api.getProducts().then(setProducts).catch((e) => setError(e.message));
  }, []);

  const orderItems = useMemo(
    () => Object.entries(quantities).filter(([, qty]) => qty > 0),
    [quantities]
  );

  function adjust(productId, delta, step) {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.round((current + delta * step) * 10) / 10);
      return { ...prev, [productId]: next };
    });
  }

  async function handleSend() {
    setError(null);
    if (orderItems.length === 0) {
      setError("Choose at least one item before sending.");
      return;
    }
    try {
      await Promise.all(
        orderItems.map(([productId, qty]) =>
          api.submitDemand({
            buyer_id: buyerId,
            vendor_id: vendorId,
            product_id: Number(productId),
            quantity: qty,
            requested_for_date: tomorrow,
          })
        )
      );
      setSubmitted(true);
      setQuantities({});
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Hi {buyerName || "Customer"}</h2>
          <p className="helper-text">Order for {vendorName || "your vendor"} on {tomorrow}</p>
        </div>
        <button className="ghost" onClick={onBack}>Back</button>
      </div>

      {submitted ? (
        <div className="card">
          <h3>Order sent!</h3>
          <p className="helper-text">Your list has been shared with {vendorName || "the vendor"}.</p>
          <button className="primary" onClick={() => setSubmitted(false)}>
            Send another list
          </button>
        </div>
      ) : (
        <>
          {error && <div className="card error-box">{error}</div>}

          <div className="card">
            <div className="order-summary">
              <div className="order-summary-title">Your order so far</div>
              {orderItems.length === 0 ? (
                <div className="empty-state">No items selected yet.</div>
              ) : (
                <div className="order-bubbles">
                  {orderItems.map(([productId, qty]) => {
                    const product = products.find((p) => p.id === Number(productId));
                    return (
                      <div key={productId} className="chat-bubble">
                        <strong>{product?.name || "Item"}</strong> · {qty} {product?.unit}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3>Tap to add items</h3>
            <div className="product-grid">
              {products.map((p) => (
                <div key={p.id} className="product-card">
                  <div>
                    <div className="product-name">{p.name}</div>
                    <div className="helper-text">{p.name_ta} · {p.unit}</div>
                  </div>
                  <div className="quantity-controls">
                    <button className="ghost small" onClick={() => adjust(p.id, -1, p.unit === "kg" ? 0.5 : 1)}>
                      −
                    </button>
                    <span>{quantities[p.id] || 0}</span>
                    <button className="ghost small" onClick={() => adjust(p.id, 1, p.unit === "kg" ? 0.5 : 1)}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="primary" onClick={handleSend}>Send order to vendor</button>
          </div>
        </>
      )}
    </div>
  );
}
