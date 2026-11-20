import { useCallback, useEffect, useState } from "react";
import { api, formatINR } from "../api.js";

const initialForm = { product_id: "", price: "", stock: "" };

export default function VendorProducts({ vendorId }) {
  const [catalog, setCatalog] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const load = useCallback(async () => {
    try {
      const [catalogItems, productList] = await Promise.all([
        api.getVendorCatalog(vendorId),
        api.getProducts(),
      ]);
      setCatalog(catalogItems);
      setProducts(productList);
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (vendorId) load();
  }, [vendorId, load]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await api.upsertVendorProduct(vendorId, {
        product_id: Number(form.product_id),
        price: Number(form.price),
        available: true,
        ...(form.stock !== "" && { stock: Number(form.stock) }),
      });
      setForm(initialForm);
      setNotice("Your product listing has been saved.");
      await load();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h3>Product catalog</h3>
          <span className="small-note">Set the price and availability customers see.</span>
        </div>
      </div>
      {error && <div className="status-message error" role="alert">{error}</div>}
      {notice && <div className="status-message success" role="status">{notice}</div>}

      <section className="card">
        <h4>Add or update a listing</h4>
        {products.length === 0 && !loading ? (
          <p className="empty-state">The product catalog is unavailable. Try again when the service is connected.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="catalog-product">Product</label>
                <select
                  id="catalog-product"
                  value={form.product_id}
                  onChange={(event) => setForm({ ...form, product_id: event.target.value })}
                  required
                >
                  <option value="" disabled>Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="catalog-price">Price per unit (₹)</label>
                <input
                  id="catalog-price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  placeholder="e.g. 32.00"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="catalog-stock">Available stock</label>
                <input
                  id="catalog-stock"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={form.stock}
                  onChange={(event) => setForm({ ...form, stock: event.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <button className="primary" type="submit" disabled={saving || loading}>
              {saving ? "Saving listing…" : "Save listing"}
            </button>
          </form>
        )}
      </section>

      <section>
        <div className="section-title-row">
          <h4>Your listings</h4>
          <span className="small-note">{catalog.length} {catalog.length === 1 ? "product" : "products"}</span>
        </div>
        {loading ? (
          <div className="loading-state" role="status">
            <span className="loading-spinner" aria-hidden="true" />
            Loading your catalog…
          </div>
        ) : catalog.length === 0 ? (
          <p className="empty-state">Your catalog is empty. Add a listing above to get started.</p>
        ) : (
          <div className="product-grid">
            {catalog.map((item) => (
              <article key={item.id} className="product-card">
                <div>
                  <div className="product-name">{item.product_name}</div>
                  <div className="order-meta">{formatINR(item.price)} per unit</div>
                </div>
                <div className="quantity-controls">
                  <span className="small-note">Stock: {item.stock ?? 0}</span>
                  <span className={`status-pill${item.available ? " confirmed" : " cancelled"}`}>
                    {item.available ? "Available" : "Unavailable"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
