import { useNavigate, useOutletContext } from "react-router-dom";
import VendorDashboard from "./VendorDashboard.jsx";

export default function VendorPage() {
  const { auth } = useOutletContext() || {};
  const navigate = useNavigate();
  const vendor = auth?.profile;

  if (!vendor?.id) {
    return (
      <main>
        <div className="card">
          <h2>Business profile unavailable</h2>
          <p className="helper-text">
            We couldn't load a business profile for this account. Sign in again or contact support.
          </p>
          <button className="primary" type="button" onClick={() => navigate("/")}>Return to home</button>
        </div>
      </main>
    );
  }

  return (
    <VendorDashboard
      vendorId={vendor.id}
      vendorName={vendor.name}
      user={auth.user}
      profile={vendor}
      onBack={() => navigate("/")}
    />
  );
}
