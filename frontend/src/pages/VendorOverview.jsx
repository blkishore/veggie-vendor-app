import { formatINR } from "../api.js";

export default function VendorOverview({ summary, lastUpdated }) {
  return (
    <div>
      <div className="section-header">
        <div>
          <h3>Business overview</h3>
          <span className="small-note">
            {lastUpdated ? `Last refreshed at ${lastUpdated}` : "Today's sales and costs"}
          </span>
        </div>
      </div>
      {summary ? (
        <div className="grid-3">
          <div className="card stat">
            <div className="label">Cost</div>
            <div className="value">{formatINR(summary.total_cost)}</div>
          </div>
          <div className="card stat">
            <div className="label">Revenue</div>
            <div className="value">{formatINR(summary.total_revenue)}</div>
          </div>
          <div className={`card stat${summary.total_profit < 0 ? " negative" : " profit"}`}>
            <div className="label">Profit</div>
            <div className="value">{formatINR(summary.total_profit)}</div>
          </div>
        </div>
      ) : (
        <p className="empty-state">Daily figures will appear here once your business data is available.</p>
      )}
    </div>
  );
}
