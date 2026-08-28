export default function RoleSelector({ vendors, buyers, onChooseVendor, onChooseBuyer }) {
  return (
    <div>
      <div className="card">
        <h2>Choose how you want to use the app</h2>
        <p className="helper-text">Select vendor mode to manage orders and sales. Select customer mode to send a list to your vendor.</p>
        <div className="product-grid">
          <div style={{ display: 'grid', gap: 8 }}>
            <button
              className="primary"
              onClick={() => {
                // navigate to vendor app route
                const target = `${window.location.origin}/vendor`;
                window.location.href = target;
              }}
            >
              Vendor mode
            </button>
            <button
              className="primary"
              onClick={() => {
                // navigate to vendor-customer customer route (vcustomer)
                const target = `${window.location.origin}/vcustomer`;
                window.location.href = target;
              }}
            >
              Customer mode
            </button>
          </div>
          <div style={{ padding: 8 }}>
            <img src="/hero.svg" alt="hero" style={{ width: '100%', borderRadius: 10 }} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Choose a vendor</h3>
        {vendors.length === 0 ? (
          <p className="empty-state">Loading vendors…</p>
        ) : (
          <div className="product-grid">
            {vendors.map((vendor) => (
              <button
                key={vendor.id}
                className="ghost"
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => onChooseVendor(vendor)}
              >
                {vendor.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Choose a customer</h3>
        {buyers.length === 0 ? (
          <p className="empty-state">Loading buyers…</p>
        ) : (
          <div className="product-grid">
            {buyers.map((buyer) => (
              <button
                key={buyer.id}
                className="ghost"
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => onChooseBuyer(buyer)}
              >
                {buyer.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
