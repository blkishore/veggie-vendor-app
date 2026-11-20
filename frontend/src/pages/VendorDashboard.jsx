import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api, formatINR, todayISO } from "../api.js";
import DashboardLayout from "../components/DashboardLayout.jsx";
import ImageGallery from "../components/ImageGallery.jsx";
import VendorOverview from "./VendorOverview.jsx";
import VendorOrders from "./VendorOrders.jsx";
import VendorProducts from "./VendorProducts.jsx";
import VendorGalleryPage from "./VendorGalleryPage.jsx";
import VendorSettings from "./VendorSettings.jsx";

const emptyForm = {
  product_id: "",
  purchased_qty: "",
  unit_cost: "",
  sold_qty: "",
  unit_price: "",
};

export default function VendorDashboard({ vendorId, vendorName, onBack, user, profile }) {
  const outlet = useOutletContext() || {};
  const auth = outlet.auth || { user, profile };
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [procurement, setProcurement] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStock, setSavingStock] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const today = todayISO();
  const tomorrow = todayISO(1);

  const loadAll = useCallback(async () => {
    try {
      const [productList, summaryData, procurementData] = await Promise.all([
        api.getProducts(),
        api.getSummary(vendorId, today),
        api.getProcurementList(vendorId, tomorrow),
      ]);
      setProducts(productList);
      setSummary(summaryData);
      setProcurement(procurementData.procurement_list || []);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [vendorId, today, tomorrow]);

  useEffect(() => {
    if (!vendorId) {
      setLoading(false);
      return undefined;
    }
    loadAll();
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") loadAll();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [vendorId, loadAll]);

  async function handleSubmitStock(event) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!form.purchased_qty && !form.sold_qty) {
      setError("Enter a purchased quantity or a sold quantity before saving.");
      return;
    }
    setSavingStock(true);
    try {
      await api.addStockEntry({
        vendor_id: vendorId,
        product_id: Number(form.product_id),
        stock_date: today,
        ...(form.purchased_qty !== "" && { purchased_qty: Number(form.purchased_qty) }),
        ...(form.unit_cost !== "" && { unit_cost: Number(form.unit_cost) }),
        ...(form.sold_qty !== "" && { sold_qty: Number(form.sold_qty) }),
        ...(form.unit_price !== "" && { unit_price: Number(form.unit_price) }),
      });
      setForm(emptyForm);
      setNotice("Today's stock entry has been saved.");
      await loadAll();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingStock(false);
    }
  }

  return (
    <DashboardLayout
      title={vendorName || "Vendor dashboard"}
      user={auth?.user}
      profile={auth?.profile}
      activeTab={activeTab}
      onNavigate={(tab) => {
        setActiveTab(tab);
        setError(null);
        setNotice(null);
      }}
    >
      <div className="section-header">
        <div>
          <h3 className="muted-title">A clear view of today's sales and tomorrow's plan.</h3>
        </div>
        {onBack && <button className="ghost" type="button" onClick={onBack}>Back to workspace</button>}
      </div>

      {error && <div className="status-message error" role="alert">{error}</div>}
      {notice && <div className="status-message success" role="status">{notice}</div>}

      <div className="grid-2">
        <section className="card" aria-labelledby="daily-summary-heading">
          <div className="section-title-row">
            <h3 id="daily-summary-heading">Today's performance</h3>
            <span className="small-note">
              {lastUpdated ? `Updated ${lastUpdated}` : "Today's summary"}
            </span>
          </div>
          {loading && !summary ? (
            <div className="loading-state" role="status">
              <span className="loading-spinner" aria-hidden="true" />
              Loading your business summary…
            </div>
          ) : summary ? (
            <div className="summary-strip">
              <div className="stat-tag">
                <span className="label">Cost</span>{formatINR(summary.total_cost)}
              </div>
              <div className="stat-tag">
                <span className="label">Revenue</span>{formatINR(summary.total_revenue)}
              </div>
              <div className="stat-tag profit">
                <span className="label">Profit</span>{formatINR(summary.total_profit)}
              </div>
            </div>
          ) : (
            <p className="empty-state">Your sales summary will appear here once the service is connected.</p>
          )}
        </section>

        <section className="card" aria-labelledby="gallery-preview-heading">
          <h3 id="gallery-preview-heading">Image previews</h3>
          <p className="small-note">Preview a product photo before sharing it elsewhere.</p>
          <ImageGallery />
        </section>
      </div>

      <section className="card">
        {activeTab === "overview" && <VendorOverview summary={summary} lastUpdated={lastUpdated} />}
        {activeTab === "orders" && <VendorOrders vendorId={vendorId} />}
        {activeTab === "products" && <VendorProducts vendorId={vendorId} />}
        {activeTab === "gallery" && <VendorGalleryPage />}
        {activeTab === "settings" && <VendorSettings vendorId={vendorId} profile={profile} />}
      </section>

      <section className="card" aria-labelledby="stock-entry-heading">
        <div className="section-title-row">
          <div>
            <h3 id="stock-entry-heading">Record today's stock</h3>
            <p className="helper-text">Add a purchase, a sale, or both. Quantities use the product's listed unit.</p>
          </div>
        </div>
        <form onSubmit={handleSubmitStock} aria-busy={savingStock}>
          <div className="field-row">
            <div className="field">
              <label htmlFor="stock-product">Product</label>
              <select
                id="stock-product"
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
              <label htmlFor="stock-purchased">Purchased quantity</label>
              <input
                id="stock-purchased"
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={form.purchased_qty}
                onChange={(event) => setForm({ ...form, purchased_qty: event.target.value })}
                placeholder="e.g. 10"
              />
            </div>
            <div className="field">
              <label htmlFor="stock-cost">Cost per unit (₹)</label>
              <input
                id="stock-cost"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.unit_cost}
                onChange={(event) => setForm({ ...form, unit_cost: event.target.value })}
                placeholder="e.g. 24.00"
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="stock-sold">Sold quantity</label>
              <input
                id="stock-sold"
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={form.sold_qty}
                onChange={(event) => setForm({ ...form, sold_qty: event.target.value })}
                placeholder="e.g. 7"
              />
            </div>
            <div className="field">
              <label htmlFor="stock-price">Selling price per unit (₹)</label>
              <input
                id="stock-price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.unit_price}
                onChange={(event) => setForm({ ...form, unit_price: event.target.value })}
                placeholder="e.g. 32.00"
              />
            </div>
          </div>
          <button className="primary" type="submit" disabled={savingStock || loading || products.length === 0}>
            {savingStock ? "Saving entry…" : "Save stock entry"}
          </button>
        </form>
      </section>

      <section className="card" aria-labelledby="procurement-heading">
        <div className="section-title-row">
          <div>
            <h3 id="procurement-heading">Suggested purchases for tomorrow</h3>
            <p className="helper-text">A guide based on customer pre-orders and estimated walk-in demand.</p>
          </div>
        </div>
        {loading && procurement.length === 0 ? (
          <div className="loading-state" role="status">
            <span className="loading-spinner" aria-hidden="true" />
            Preparing your list…
          </div>
        ) : procurement.length === 0 ? (
          <p className="empty-state">No purchase suggestions yet. Add today's sales to help build a forecast.</p>
        ) : (
          <div className="order-list">
            {procurement.map((row) => (
              <div key={row.product} className="order-card small">
                <div>
                  <div className="order-title">{row.product}</div>
                  <div className="order-meta">
                    Pre-orders {row.pre_ordered_qty} · Estimated walk-ins {row.predicted_walkin_qty}
                  </div>
                </div>
                <div className="qty-tag">Plan for {row.recommended_purchase_qty} {row.unit}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
