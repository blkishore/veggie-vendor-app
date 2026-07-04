"""
Demand prediction — deliberately simple to start.

With only a few weeks of data, a fancy model (Prophet/ARIMA) will overfit
noise. This starts with a transparent heuristic: weighted recent average,
adjusted for day-of-week pattern. Swap in scikit-learn / Prophet once
there are 8-10+ weeks of daily_stock rows per product per vendor.
"""
import pandas as pd
from models import DailyStock


def predict_quantity(vendor_id: int, product_id: int, target_date) -> float:
    """Predict how much of a product a vendor should stock for target_date,
    based on that product's sales history for this vendor."""
    rows = (
        DailyStock.query.filter_by(vendor_id=vendor_id, product_id=product_id)
        .order_by(DailyStock.stock_date.desc())
        .limit(60)
        .all()
    )

    if not rows:
        return 0.0

    df = pd.DataFrame(
        [{"date": r.stock_date, "sold_qty": r.sold_qty} for r in rows]
    )
    df["weekday"] = pd.to_datetime(df["date"]).dt.dayofweek
    target_weekday = pd.to_datetime(target_date).dayofweek

    # Same-weekday average carries the most signal (Sunday market rush etc.)
    same_weekday = df[df["weekday"] == target_weekday]["sold_qty"]
    overall_recent = df["sold_qty"].head(14)  # last 2 weeks, any day

    if len(same_weekday) >= 3:
        prediction = 0.6 * same_weekday.mean() + 0.4 * overall_recent.mean()
    else:
        prediction = overall_recent.mean()

    return round(float(prediction), 2)


def build_procurement_list(vendor_id: int, target_date) -> list[dict]:
    """Combine confirmed buyer pre-orders with the AI-predicted walk-in
    demand to produce the vendor's next-day shopping list."""
    from models import DemandRequest, Product

    pre_orders = (
        DemandRequest.query.filter_by(
            vendor_id=vendor_id, requested_for_date=target_date
        )
        .filter(DemandRequest.status != "cancelled")
        .all()
    )

    pre_order_totals: dict[int, float] = {}
    for req in pre_orders:
        pre_order_totals[req.product_id] = (
            pre_order_totals.get(req.product_id, 0) + req.quantity
        )

    products = Product.query.all()
    procurement_list = []
    for product in products:
        pre_ordered = pre_order_totals.get(product.id, 0)
        predicted_walkin = predict_quantity(vendor_id, product.id, target_date)
        total = round(pre_ordered + predicted_walkin, 2)
        if total > 0:
            procurement_list.append(
                {
                    "product": product.name,
                    "pre_ordered_qty": pre_ordered,
                    "predicted_walkin_qty": predicted_walkin,
                    "recommended_purchase_qty": total,
                    "unit": product.unit,
                }
            )

    return sorted(procurement_list, key=lambda x: -x["recommended_purchase_qty"])
