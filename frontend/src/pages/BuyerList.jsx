import { useEffect, useState } from "react";
import { api, todayISO } from "../api.js";

// In a real build this comes from login/phone-number auth.
const BUYER_ID = 1;
const BUYER_NAME = "Lakshmi";

export default function BuyerList({ vendorId }) {
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const tomorrow = todayISO(1);

  useEffect(() => {
    api.getProducts().then(setProducts).catch((e) => setError(e.message));
  }, []);

  function adjust(productId, delta, step) {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.round((current + delta * step) * 10) / 10);
      return { ...prev, [productId]: next };
    });
  }

  async function handleSend() {
    setError(null);
    const items = Object.entries(quantities).filter(([, qty]) => qty > 0);
    if (items.length === 0) {
      setError("Add at least one item before sending.");
      return;
    }
    try {
      await Promise.all(
        items.map(([productId, qty]) =>
          api.submitDemand({
            buyer_id: BUYER_ID,
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

  if (submitted) {
    return (
      <div className="card">
        <h2>List sent to Murugan Vegetable Stall</h2>
        <p className="helper-text">
          Pickup date: {tomorrow}. You'll get a notification when it's ready.
        </p>
        <button className="ghost" onClick={() => setSubmitted(false)}>Send another list</button>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="card" style={{ borderColor: "var(--tomato)" }}>{error}</div>}

      <div className="card">
        <h2>Hi {BUYER_NAME} — what do you need for {tomorrow}?</h2>
        <p className="helper-text">
          Tap + to add items. This is the same as sending a WhatsApp voice note — just faster to tap.
        </p>

        {products.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>{p.name_ta} · {p.unit}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                className="ghost"
                style={{ padding: "4px 12px" }}
                onClick={() => adjust(p.id, -1, p.unit === "kg" ? 0.5 : 1)}
              >
                −
              </button>
              <span className="qty-tag" style={{ minWidth: 56, textAlign: "center" }}>
                {quantities[p.id] || 0} {p.unit}
              </span>
              <button
                className="ghost"
                style={{ padding: "4px 12px" }}
                onClick={() => adjust(p.id, 1, p.unit === "kg" ? 0.5 : 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 18 }}>
          <button className="primary" onClick={handleSend}>Send list to vendor</button>
        </div>
      </div>
    </div>
  );
}
