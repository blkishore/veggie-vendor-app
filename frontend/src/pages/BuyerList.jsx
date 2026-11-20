import { useEffect, useMemo, useState } from "react";
import { api, formatINR } from "../api.js";

export default function BuyerList({ vendorId, buyerId, buyerName }) {
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [currentVendorId, setCurrentVendorId] = useState(vendorId || "");
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [sending, setSending] = useState(false);

  const orderItems = useMemo(
    () => Object.entries(quantities).filter(([, quantity]) => quantity > 0),
    [quantities],
  );
  const currentVendor = vendors.find((vendor) => Number(vendor.id) === Number(currentVendorId));
  const orderTotal = orderItems.reduce((total, [productId, quantity]) => {
    const product = products.find((item) => item.product_id === Number(productId));
    return total + (product ? Number(product.price) * quantity : 0);
  }, 0);

  useEffect(() => {
    let active = true;
    async function loadVendors() {
      try {
        const vendorList = await api.listVendors();
        if (!active) return;
        setVendors(vendorList);
        const preferred = vendorList.find((vendor) => Number(vendor.id) === Number(vendorId));
        setCurrentVendorId(String(preferred?.id || vendorList[0]?.id || ""));
        if (vendorList.length === 0) setError("There are no vendors available to order from yet.");
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoadingVendors(false);
      }
    }
    loadVendors();
    return () => {
      active = false;
    };
  }, [vendorId]);

  useEffect(() => {
    if (!currentVendorId) {
      setProducts([]);
      return undefined;
    }

    let active = true;
    async function loadCatalog() {
      setLoadingCatalog(true);
      setError(null);
      try {
        const [catalog, allProducts] = await Promise.all([
          api.getVendorCatalog(currentVendorId),
          api.getProducts(),
        ]);
        if (!active) return;
        const unitByProductId = new Map(allProducts.map((product) => [product.id, product.unit]));
        setProducts(
          catalog
            .filter((item) => item.available)
            .map((item) => ({
              ...item,
              unit: unitByProductId.get(item.product_id) || "unit",
            })),
        );
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoadingCatalog(false);
      }
    }
    loadCatalog();
    return () => {
      active = false;
    };
  }, [currentVendorId]);

  function chooseVendor(event) {
    setCurrentVendorId(event.target.value);
    setQuantities({});
    setConfirmation(null);
    setError(null);
  }

  function adjust(productId, delta, step) {
    setError(null);
    setQuantities((previous) => {
      const current = previous[productId] || 0;
      const next = Math.max(0, Math.round((current + delta * step) * 10) / 10);
      return { ...previous, [productId]: next };
    });
  }

  async function handleSend() {
    setError(null);
    if (!buyerId) {
      setError("Your customer profile isn't ready. Please sign in again.");
      return;
    }
    if (!currentVendorId) {
      setError("Choose a vendor before placing your order.");
      return;
    }
    if (orderItems.length === 0) {
      setError("Add at least one product to your order.");
      return;
    }

    setSending(true);
    try {
      const order = await api.createOrder({
        buyer_id: buyerId,
        vendor_id: Number(currentVendorId),
        mode: "pickup",
        items: orderItems.map(([productId, quantity]) => ({
          product_id: Number(productId),
          quantity,
        })),
      });
      setConfirmation({
        id: order.id,
        itemCount: orderItems.length,
        vendorName: currentVendor?.name || "your vendor",
      });
      setQuantities({});
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="section-header customer-order-header">
        <div className="section-intro">
          <p className="eyebrow">Fresh from your local market</p>
          <h2>Build your shopping list</h2>
          <p>Hi {buyerName || "there"} — choose a vendor and add what you need.</p>
        </div>
        <div className="field vendor-picker">
          <label htmlFor="order-vendor">Your vendor</label>
          <select
            id="order-vendor"
            value={currentVendorId}
            onChange={chooseVendor}
            disabled={loadingVendors || vendors.length === 0 || sending}
          >
            {vendors.length === 0 && <option value="">No vendors available</option>}
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="status-message info order-date-note">
        <span>This is a pickup order. Your vendor will receive the list as soon as you place it.</span>
      </div>
      {error && <div className="status-message error" role="alert">{error}</div>}

      {confirmation ? (
        <section className="card order-confirmation" aria-live="polite">
          <div className="role-icon" aria-hidden="true">✓</div>
          <p className="eyebrow">Order received</p>
          <h2>Thanks for your order, {buyerName || "there"}.</h2>
          <p>
            Order #{confirmation.id} with {confirmation.vendorName} has been placed
            ({confirmation.itemCount} {confirmation.itemCount === 1 ? "item" : "items"}).
          </p>
          <button className="primary" type="button" onClick={() => setConfirmation(null)}>
            Start another order
          </button>
        </section>
      ) : (
        <div className="customer-order-layout">
          <section className="card" aria-labelledby="produce-heading">
            <div className="section-title-row">
              <div>
                <h3 id="produce-heading">Available produce</h3>
                <span className="small-note">Choose quantities for your pickup order.</span>
              </div>
            </div>

            {loadingVendors || loadingCatalog ? (
              <div className="loading-state" role="status">
                <span className="loading-spinner" aria-hidden="true" />
                Loading this vendor's produce…
              </div>
            ) : products.length === 0 ? (
              <p className="empty-state">
                This vendor has no available products listed right now. Choose another vendor or check back later.
              </p>
            ) : (
              <div className="product-grid">
                {products.map((product) => {
                  const quantity = quantities[product.product_id] || 0;
                  const step = product.unit === "kg" ? 0.5 : 1;
                  return (
                    <article key={product.product_id} className="product-card">
                      <div>
                        <div className="product-name">{product.product_name}</div>
                        <div className="order-meta">{formatINR(product.price)} per {product.unit}</div>
                      </div>
                      <div className="quantity-controls">
                        <button
                          className="ghost small"
                          type="button"
                          aria-label={`Remove ${step} ${product.unit} of ${product.product_name}`}
                          onClick={() => adjust(product.product_id, -1, step)}
                          disabled={quantity === 0 || sending}
                        >
                          −
                        </button>
                        <span className="quantity-value" aria-live="polite">
                          {quantity} {quantity > 0 ? product.unit : ""}
                        </span>
                        <button
                          className="ghost small"
                          type="button"
                          aria-label={`Add ${step} ${product.unit} of ${product.product_name}`}
                          onClick={() => adjust(product.product_id, 1, step)}
                          disabled={sending}
                        >
                          +
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="card order-summary-panel" aria-labelledby="order-summary-heading">
            <div className="section-title-row">
              <h3 id="order-summary-heading">Your order</h3>
              <span className="status-pill">{orderItems.length} {orderItems.length === 1 ? "item" : "items"}</span>
            </div>
            {orderItems.length === 0 ? (
              <p className="empty-state">Your selected produce will appear here.</p>
            ) : (
              <>
                <div className="order-list">
                  {orderItems.map(([productId, quantity]) => {
                    const product = products.find((item) => item.product_id === Number(productId));
                    return (
                      <div className="order-summary-line" key={productId}>
                        <span>{product?.product_name || "Produce"}</span>
                        <strong>{quantity} {product?.unit}</strong>
                      </div>
                    );
                  })}
                </div>
                <div className="order-total">
                  <span>Estimated total</span>
                  <strong>{formatINR(orderTotal)}</strong>
                </div>
              </>
            )}
            <button
              className="primary order-submit"
              type="button"
              onClick={handleSend}
              disabled={sending || loadingVendors || loadingCatalog || orderItems.length === 0}
            >
              {sending ? "Placing your order…" : "Place pickup order"}
            </button>
            <p className="small-note">No payment is collected in the app.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
