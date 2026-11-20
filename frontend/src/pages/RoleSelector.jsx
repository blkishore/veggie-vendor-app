import { useNavigate } from "react-router-dom";

export default function RoleSelector({ user }) {
  const navigate = useNavigate();
  const isVendor = user?.role === "vendor";

  if (!user || (!isVendor && user.role !== "customer")) return null;

  return (
    <section>
      <div className="section-intro">
        <p className="eyebrow">Your workspace</p>
        <h2>Good to see you, {user.name}.</h2>
        <p>Everything you need for today's market, all in one place.</p>
      </div>
      <div className="role-grid">
        <section className="role-card">
          <div>
            <div className="role-icon" aria-hidden="true">{isVendor ? "📊" : "🧺"}</div>
            <h3>{isVendor ? "Vendor dashboard" : "Order fresh produce"}</h3>
            <p>
              {isVendor
                ? "Review your day, manage your catalog, and keep orders moving."
                : "Browse a local vendor's produce and send your shopping list."}
            </p>
          </div>
          <button
            className="primary"
            onClick={() => navigate(isVendor ? "/vendor/dashboard" : "/customer")}
          >
            {isVendor ? "Open dashboard" : "Start an order"}
          </button>
        </section>
      </div>
    </section>
  );
}
