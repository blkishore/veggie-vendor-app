import os
from datetime import date, datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

from models import db, Vendor, Buyer, Product, DailyStock, DemandRequest, Transaction
from demand_prediction import build_procurement_list

app = Flask(__name__)
CORS(app)

# Default to SQLite for zero-setup local dev.
# For MySQL: set DATABASE_URL="mysql+pymysql://user:pass@host/dbname"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///veggie_app.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


@app.get("/")
def home():
    return jsonify({
        "message": "Veggie Vendor API Running",
        "health": "/api/health"
    })


def parse_date(value: str | None) -> date:
    if not value:
        return date.today()
    return datetime.strptime(value, "%Y-%m-%d").date()


# ---------- Products ----------

@app.get("/api/products")
def list_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products])


# ---------- Vendors ----------

@app.get("/api/vendors/<int:vendor_id>")
def get_vendor(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)
    return jsonify(vendor.to_dict())


# ---------- Daily stock (vendor purchase/sale entry) ----------

@app.post("/api/stock")
def add_stock_entry():
    """Vendor logs a purchase and/or sale for a product on a given day.
    Called repeatedly through the day as sales happen; upserts the row
    for that vendor+product+date."""
    data = request.get_json()

    required = ["vendor_id", "product_id"]
    if not all(k in data for k in required):
        return jsonify({"error": "vendor_id and product_id are required"}), 400

    stock_date = parse_date(data.get("stock_date"))

    entry = DailyStock.query.filter_by(
        vendor_id=data["vendor_id"],
        product_id=data["product_id"],
        stock_date=stock_date,
    ).first()

    if not entry:
        entry = DailyStock(
            vendor_id=data["vendor_id"],
            product_id=data["product_id"],
            stock_date=stock_date,
        )
        db.session.add(entry)

    if "purchased_qty" in data:
        entry.purchased_qty = data["purchased_qty"]
    if "unit_cost" in data:
        entry.unit_cost = data["unit_cost"]
    if "sold_qty" in data:
        entry.sold_qty = data["sold_qty"]
    if "unit_price" in data:
        entry.unit_price = data["unit_price"]

    db.session.commit()
    return jsonify(entry.to_dict()), 201


@app.get("/api/vendors/<int:vendor_id>/stock")
def get_stock(vendor_id):
    stock_date = parse_date(request.args.get("date"))
    entries = DailyStock.query.filter_by(
        vendor_id=vendor_id, stock_date=stock_date
    ).all()
    return jsonify([e.to_dict() for e in entries])


@app.get("/api/vendors/<int:vendor_id>/summary")
def profit_loss_summary(vendor_id):
    """Daily profit/loss rollup — the core 'how did today go' screen."""
    stock_date = parse_date(request.args.get("date"))
    entries = DailyStock.query.filter_by(
        vendor_id=vendor_id, stock_date=stock_date
    ).all()

    total_cost = sum(e.cost_total for e in entries)
    total_revenue = sum(e.revenue_total for e in entries)

    return jsonify(
        {
            "date": stock_date.isoformat(),
            "total_cost": round(total_cost, 2),
            "total_revenue": round(total_revenue, 2),
            "total_profit": round(total_revenue - total_cost, 2),
            "items": [e.to_dict() for e in entries],
        }
    )


# ---------- Buyer demand requests ("Tomorrow's list") ----------

@app.post("/api/demand")
def submit_demand_request():
    """Buyer submits one item for a future pickup date. The frontend
    calls this once per item in the buyer's list."""
    data = request.get_json()
    required = ["buyer_id", "vendor_id", "product_id",
                "quantity", "requested_for_date"]
    if not all(k in data for k in required):
        return jsonify({"error": f"required fields: {required}"}), 400

    req_entry = DemandRequest(
        buyer_id=data["buyer_id"],
        vendor_id=data["vendor_id"],
        product_id=data["product_id"],
        quantity=data["quantity"],
        requested_for_date=parse_date(data["requested_for_date"]),
        status="pending",
    )
    db.session.add(req_entry)
    db.session.commit()
    return jsonify(req_entry.to_dict()), 201


@app.get("/api/vendors/<int:vendor_id>/demand")
def get_vendor_demand(vendor_id):
    """Raw list of buyer requests for a given pickup date — what the
    vendor sees as incoming orders before they're turned into a
    consolidated procurement list."""
    target_date = parse_date(request.args.get("date"))
    requests_ = DemandRequest.query.filter_by(
        vendor_id=vendor_id, requested_for_date=target_date
    ).all()
    return jsonify([r.to_dict() for r in requests_])


@app.get("/api/vendors/<int:vendor_id>/procurement-list")
def get_procurement_list(vendor_id):
    """The AI-adjusted consolidated shopping list: pre-orders + predicted
    walk-in demand, combined per product. This is what the vendor takes
    to the wholesale market."""
    target_date = parse_date(request.args.get("date"))
    procurement_list = build_procurement_list(vendor_id, target_date)
    return jsonify(
        {"date": target_date.isoformat(), "procurement_list": procurement_list}
    )


@app.patch("/api/demand/<int:request_id>/confirm")
def confirm_demand_request(request_id):
    """Mark a buyer's request as confirmed, optionally recording a
    token UPI payment that locks in the order."""
    data = request.get_json(silent=True) or {}
    req_entry = DemandRequest.query.get_or_404(request_id)
    req_entry.status = "confirmed"
    if data.get("token_paid"):
        req_entry.payment_status = "token_paid"
    db.session.commit()
    return jsonify(req_entry.to_dict())


# ---------- Transactions ----------

@app.post("/api/transactions")
def record_transaction():
    data = request.get_json()
    txn = Transaction(
        vendor_id=data["vendor_id"],
        buyer_id=data.get("buyer_id"),
        amount=data["amount"],
        mode=data.get("mode", "upi"),
    )
    db.session.add(txn)
    db.session.commit()
    return jsonify(txn.to_dict()), 201


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
