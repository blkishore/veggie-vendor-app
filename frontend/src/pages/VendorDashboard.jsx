import { useEffect, useState } from "react";
import { api, todayISO } from "../api.js";

export default function VendorDashboard({ vendorId, vendorName, onBack }) {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [procurement, setProcurement] = useState([]);
  const [rawDemand, setRawDemand] = useState([]);
  const [form, setForm] = useState({
    product_id: "",
    purchased_qty: "",
    unit_cost: "",
    sold_qty: "",
    unit_price: "",
  });
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const today = todayISO();
  const tomorrow = todayISO(1);

  async function loadAll() {
    try {
      const [prods, summaryData, procurementData, demandData] = await Promise.all([
        api.getProducts(),
        api.getSummary(vendorId, today),
        api.getProcurementList(vendorId, tomorrow),
        api.getVendorDemand(vendorId, tomorrow),
      ]);
      setProducts(prods);
      setSummary(summaryData);
      setProcurement(procurementData.procurement_list);
      setRawDemand(demandData);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!vendorId) return;
    loadAll();
    const intervalId = setInterval(loadAll, 5000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  async function handleSubmitStock(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.addStockEntry({
        vendor_id: vendorId,
        product_id: Number(form.product_id),
        stock_date: today,
        ...(form.purchased_qty && { purchased_qty: Number(form.purchased_qty) }),
        ...(form.unit_cost && { unit_cost: Number(form.unit_cost) }),
        ...(form.sold_qty && { sold_qty: Number(form.sold_qty) }),
        ...(form.unit_price && { unit_price: Number(form.unit_price) }),
      });
      setForm({ product_id: "", purchased_qty: "", unit_cost: "", sold_qty: "", unit_price: "" });
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleConfirmRequest(requestId) {
    try {
      await api.confirmDemand(requestId, true);
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>{vendorName || "Vendor Dashboard"}</h2>
          <p className="helper-text">Vendor mode — live sales, orders, and procurement.</p>
        </div>
        <button className="ghost" onClick={onBack}>Back</button>
      </div>

      {error && <div className="card error-box">{error}</div>}

      <div className="card">
        <div className="section-title-row">
          <h3>Today's summary</h3>
          <span className="small-note">Updated {lastUpdated || "now"}</span>
        </div>
        {summary ? (
          <div className="summary-strip">
            <div className="stat-tag">
              <span className="label">Cost</span>₹{summary.total_cost}
            </div>
            <div className="stat-tag">
              <span className="label">Revenue</span>₹{summary.total_revenue}
            </div>
            <div className="stat-tag profit">
              <span className="label">Profit</span>₹{summary.total_profit}
            </div>
          </div>
        ) : (
          <p className="empty-state">Loading summary…</p>
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h3>Incoming orders for {tomorrow}</h3>
          <span className="small-note">Confirm orders once you accept them.</span>
        </div>
        {rawDemand.length === 0 ? (
          <p className="empty-state">No buyer requests yet.</p>
        ) : (
          <div className="order-list">
            {rawDemand.map((req) => (
              <div key={req.id} className="order-card">
                <div>
                  <div className="order-title">{req.product}</div>
                  <div className="order-meta">{req.buyer_name} • {req.quantity}</div>
                </div>
                <div className="order-actions">
                  <span className={`status-pill ${req.status}`}>{req.status}</span>
                  {req.status === "pending" && (
                    <button className="confirm-button" onClick={() => handleConfirmRequest(req.id)}>
                      Confirm
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Quick entry</h3>
        <p className="helper-text">Log a purchase or sale in one tap. Leave purchase fields blank if you only update sold quantity.</p>
        <form onSubmit={handleSubmitStock}>
          <div className="field-row">
            <div className="field">
              <label>Product</label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                required
              >
                <option value="" disabled>Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Purchased qty</label>
              <input
                type="number"
                step="0.1"
                value={form.purchased_qty}
                onChange={(e) => setForm({ ...form, purchased_qty: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Cost / unit</label>
              <input
                type="number"
                step="0.1"
                value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Sold qty</label>
              <input
                type="number"
                step="0.1"
                value={form.sold_qty}
                onChange={(e) => setForm({ ...form, sold_qty: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Sale price</label>
              <input
                type="number"
                step="0.1"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
              />
            </div>
          </div>
          <button className="primary" type="submit">Save entry</button>
        </form>
      </div>

      <div className="card">
        <h3>Tomorrow's procurement list</h3>
        {procurement.length === 0 ? (
          <p className="empty-state">No prediction available yet.</p>
        ) : (
          <div className="order-list">
            {procurement.map((row) => (
              <div key={row.product} className="order-card small">
                <div>
                  <div className="order-title">{row.product}</div>
                  <div className="order-meta">Pre-order {row.pre_ordered_qty} • Walk-in {row.predicted_walkin_qty}</div>
                </div>
                <div className="qty-tag">Buy {row.recommended_purchase_qty} {row.unit}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
