export default function RoleSelector({ vendors, buyers, onChooseVendor, onChooseBuyer }) {
  return (
    <div>
      <div className="card">
        <h2>Choose how you want to use the app</h2>
        <p className="helper-text">Select vendor mode to manage orders and sales. Select customer mode to send a list to your vendor.</p>
        <div className="product-grid">
          <button className="primary" style={{ width: "100%" }} onClick={() => onChooseVendor(vendors[0] || { id: 1, name: "Vendor" })}>
            Vendor mode
          </button>
          <button className="primary" style={{ width: "100%" }} onClick={() => onChooseBuyer(buyers[0] || { id: 1, name: "Customer" })}>
            Customer mode
          </button>
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
