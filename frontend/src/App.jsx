import { useState } from "react";
import VendorDashboard from "./pages/VendorDashboard.jsx";
import BuyerList from "./pages/BuyerList.jsx";

// Hardcoded IDs matching seed.py — a real build would come from login/QR scan.
const VENDOR_ID = 1;

export default function App() {
  const [tab, setTab] = useState("vendor");

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Murugan Vegetable Stall</h1>
        <span className="stall-tag">CART-MURUGAN-01</span>
      </header>

      <nav className="tabs">
        <button
          className={`tab-button ${tab === "vendor" ? "active" : ""}`}
          onClick={() => setTab("vendor")}
        >
          Vendor dashboard
        </button>
        <button
          className={`tab-button ${tab === "buyer" ? "active" : ""}`}
          onClick={() => setTab("buyer")}
        >
          Send tomorrow's list
        </button>
      </nav>

      {tab === "vendor" ? (
        <VendorDashboard vendorId={VENDOR_ID} />
      ) : (
        <BuyerList vendorId={VENDOR_ID} />
      )}
    </div>
  );
}
