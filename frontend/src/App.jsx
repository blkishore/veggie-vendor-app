import { useEffect, useState } from "react";
import RoleSelector from "./pages/RoleSelector.jsx";
import VendorDashboard from "./pages/VendorDashboard.jsx";
import BuyerList from "./pages/BuyerList.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { api } from "./api.js";

export default function App() {
  const [auth, setAuth] = useState(null);
  const [mode, setMode] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState(null);

  useEffect(() => {
    async function loadPeople() {
      try {
        const vendorList = await api.listVendors();
        setVendors(vendorList);
      } catch (error) {
        console.error("Failed to load vendor list", error);
      }
    }
    loadPeople();
  }, []);

  useEffect(() => {
    async function restoreSession() {
      try {
        const payload = await api.me();
        setAuth(payload);
      } catch (_err) {
        api.setAuthToken(null);
        setAuth(null);
      }
    }
    restoreSession();
  }, []);

  const buyerPreferredVendor = selectedBuyer
    ? vendors.find((v) => v.id === selectedBuyer.preferred_vendor_id)
    : null;

  const activeVendor =
    mode === "vendor"
      ? selectedVendor
      : buyerPreferredVendor || selectedVendor;

  const activeVendorId = activeVendor?.id;
  const activeVendorName = activeVendor?.name;

  function handleLogout() {
    api.setAuthToken(null);
    setAuth(null);
    setMode(null);
    setSelectedVendor(null);
    setSelectedBuyer(null);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Veggie Vendor App</h1>
          <p className="app-subtitle">Simple vendor + customer ordering for local carts</p>
        </div>
        {auth && (
          <button className="ghost" onClick={handleLogout}>
            Log out
          </button>
        )}
      </header>

      {!auth ? (
        <AuthPage onLogin={(payload) => setAuth(payload)} />
      ) : auth?.user ? (
        <>
          <ProfilePage user={auth.user} profile={auth.profile} onLogout={handleLogout} />
          {mode === null ? (
            <RoleSelector
              user={auth.user}
            />
          ) : mode === "vendor" ? (
            <VendorDashboard
              vendorId={activeVendorId}
              vendorName={activeVendorName || selectedVendor?.name || "Vendor"}
              user={auth.user}
              profile={auth.profile}
              onBack={() => setMode(null)}
            />
          ) : (
            <BuyerList
              vendorId={activeVendorId}
              buyerId={selectedBuyer?.id}
              buyerName={selectedBuyer?.name}
              vendorName={activeVendorName || selectedVendor?.name}
              onBack={() => setMode(null)}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
