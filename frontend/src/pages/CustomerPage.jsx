import { useNavigate, useOutletContext } from "react-router-dom";
import BuyerList from "./BuyerList.jsx";

export default function CustomerPage() {
  const { auth } = useOutletContext() || {};
  const navigate = useNavigate();
  const buyer = auth?.profile;

  if (!buyer?.id) {
    return (
      <main>
        <div className="card">
          <h2>Customer profile unavailable</h2>
          <p className="helper-text">
            We couldn't load the customer profile for this account. Sign in again or contact support.
          </p>
          <button className="primary" type="button" onClick={() => navigate("/")}>Return to home</button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <BuyerList
        vendorId={buyer.preferred_vendor_id}
        buyerId={buyer.id}
        buyerName={buyer.name || auth.user.name}
      />
    </main>
  );
}
