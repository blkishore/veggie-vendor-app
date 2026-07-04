import { useEffect, useState } from "react";
import { api, todayISO } from "../api.js";

export default function VendorDashboard({ vendorId }) {
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
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div>
      {error && <div className="card" style={{ borderColor: "var(--tomato)" }}>{error}</div>}

      <div className="card">
        <h2>Today's profit &amp; loss — {today}</h2>
        {summary ? (
          <>
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
            {summary.items.length === 0 ? (
              <p className="empty-state">No stock entries logged for today yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Purchased</th>
                    <th>Sold</th>
                    <th>Unsold</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.items.map((item) => (
                    <tr key={item.id}>
                      <td className="product-name">{item.product}</td>
                      <td>{item.purchased_qty}</td>
                      <td>{item.sold_qty}</td>
                      <td>{item.unsold_qty}</td>
                      <td>₹{item.profit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <p className="empty-state">Loading…</p>
        )}
      </div>

      <div className="card">
        <h2>Log a purchase or sale</h2>
        <p className="helper-text">Leave fields blank if you're only updating one side (e.g. just sold_qty).</p>
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
              <input type="number" step="0.1" value={form.purchased_qty}
                onChange={(e) => setForm({ ...form, purchased_qty: e.target.value })} />
            </div>
            <div className="field">
              <label>Cost / unit (₹)</label>
              <input type="number" step="0.1" value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
            </div>
            <div className="field">
              <label>Sold qty</label>
              <input type="number" step="0.1" value={form.sold_qty}
                onChange={(e) => setForm({ ...form, sold_qty: e.target.value })} />
            </div>
            <div className="field">
              <label>Sale price / unit (₹)</label>
              <input type="number" step="0.1" value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
            </div>
          </div>
          <button className="primary" type="submit">Save entry</button>
        </form>
      </div>

      <div className="card">
        <h2>Tomorrow's procurement list — {tomorrow}</h2>
        <p className="helper-text">
          Pre-orders from buyers blended with AI-predicted walk-in demand. This is what to buy at the mandi.
        </p>
        {procurement.length === 0 ? (
          <p className="empty-state">No prediction yet — needs at least one day of sales history.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Pre-ordered</th>
                <th>Predicted walk-in</th>
                <th>Buy this much</th>
              </tr>
            </thead>
            <tbody>
              {procurement.map((row) => (
                <tr key={row.product}>
                  <td className="product-name">{row.product}</td>
                  <td>{row.pre_ordered_qty} {row.unit}</td>
                  <td>{row.predicted_walkin_qty} {row.unit}</td>
                  <td><span className="qty-tag">{row.recommended_purchase_qty} {row.unit}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Incoming buyer requests for tomorrow</h2>
        {rawDemand.length === 0 ? (
          <p className="empty-state">No buyer requests yet for {tomorrow}.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rawDemand.map((req) => (
                <tr key={req.id}>
                  <td className="product-name">{req.buyer_name}</td>
                  <td>{req.product}</td>
                  <td>{req.quantity}</td>
                  <td><span className={`status-pill ${req.status}`}>{req.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
