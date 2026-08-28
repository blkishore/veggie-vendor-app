import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function VendorProducts({ vendorId }) {
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ product_id: "", price: "", available: true, stock: "" });

  async function load() {
    try {
      const list = await api.getVendorCatalog(vendorId);
      setCatalog(list || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!vendorId) return;
    load();
  }, [vendorId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.upsertVendorProduct(vendorId, {
        product_id: Number(form.product_id),
        price: Number(form.price),
        available: !!form.available,
        stock: form.stock ? Number(form.stock) : undefined,
      });
      setForm({ product_id: "", price: "", available: true, stock: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="section-header">
        <h3>Products</h3>
        <span className="small-note">Manage your catalog</span>
      </div>
      {error && <div className="card error-box">{error}</div>}

      <div className="card">
        <h4>Add / Update product</h4>
        <form onSubmit={handleSubmit} className="field-row">
          <div className="field">
            <label>Product ID</label>
            <input value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} />
          </div>
          <div className="field">
            <label>Price</label>
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="field">
            <label>Stock</label>
            <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button className="primary" type="submit">Save</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h4>Catalog</h4>
        {catalog.length === 0 ? (
          <p className="empty-state">No products in your catalog yet.</p>
        ) : (
          <div className="product-grid">
            {catalog.map((c) => (
              <div key={c.id} className="product-card">
                <div>
                  <div className="product-name">{c.product_name}</div>
                  <div className="helper-text">₹{c.price} · {c.available ? 'Available' : 'Unavailable'}</div>
                </div>
                <div className="quantity-controls">
                  <div>{c.stock}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
