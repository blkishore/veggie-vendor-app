import React from "react";

export default function VendorOverview({ summary, lastUpdated }) {
  return (
    <div>
      <div className="section-header">
        <h3>Overview</h3>
        <span className="small-note">Updated {lastUpdated || 'now'}</span>
      </div>
      {summary ? (
        <div className="grid-3">
          <div className="card stat">
            <div className="label">Cost</div>
            <div className="value">₹{summary.total_cost}</div>
          </div>
          <div className="card stat">
            <div className="label">Revenue</div>
            <div className="value">₹{summary.total_revenue}</div>
          </div>
          <div className="card stat">
            <div className="label">Profit</div>
            <div className="value">₹{summary.total_profit}</div>
          </div>
        </div>
      ) : (
        <p className="empty-state">Loading overview…</p>
      )}
    </div>
  );
}
