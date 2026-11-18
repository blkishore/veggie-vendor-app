import { useNavigate } from "react-router-dom";

export default function RoleSelector({ user }) {
  const navigate = useNavigate();

  if (user?.role === "vendor") {
    return (
      <div className="card">
        <h2>Vendor dashboard</h2>
        <button className="primary" onClick={() => navigate("/vendor/dashboard")}>
          Open my dashboard
        </button>
      </div>
    );
  }

  if (user?.role === "customer") {
    return (
      <div className="card">
        <h2>Customer ordering</h2>
        <button className="primary" onClick={() => navigate("/customer")}>
          Open my orders
        </button>
      </div>
    );
  }

  return null;
}
