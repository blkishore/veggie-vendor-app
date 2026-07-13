import os
from datetime import date, datetime

from flask import Flask, jsonify, request
from flask_cors import CORS
from flasgger import Swagger

from models import db, Vendor, Buyer, Product, DailyStock, DemandRequest, Transaction
from demand_prediction import build_procurement_list
from product_matcher import ProductMatcher

app = Flask(__name__)
CORS(app)

app.config["SWAGGER"] = {
    "title": "Veggie Vendor Assistant API",
    "uiversion": 3,
    "specs_route": "/api/docs/",  # Swagger UI lives here
}
swagger = Swagger(app)

# Default to SQLite for zero-setup local dev.
# For MySQL: set DATABASE_URL="mysql+pymysql://user:pass@host/dbname"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///veggie_app.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


def seed_demo_data():
    """Populate the local SQLite DB with a ready-to-use demo catalog if empty."""
    if Product.query.first() is not None:
        return

    demo_products = [
        ("Tomato", "தக்காளி", "टमाटर", "kg", "thakkali,thakkaali,tamatar,tomatoe"),
        ("Onion", "வெங்காயம்", "प्याज", "kg", "vengayam,ulli,pyaz,pyaaz"),
        ("Potato", "உருளைக்கிழங்கு", "आलू", "kg", "urulaikizhangu,aloo,alu"),
        ("Coriander", "கொத்தமல்லி", "धनिया",
         "bunch", "kothamalli,dhania,coriender"),
        ("Brinjal", "கத்தரிக்காய்", "बैंगन", "kg", "kathirikai,baingan,eggplant"),
        ("Carrot", "கேரட்", "गाजर", "kg", "carat,gajar"),
    ]

    vendor = Vendor(
        name="Murugan Vegetable Stall",
        phone="9840000001",
        location_lat=13.0827,
        location_lng=80.2707,
        cart_qr_code="CART-MURUGAN-01",
    )
    buyer_1 = Buyer(name="Lakshmi", phone="9840000002", preferred_vendor_id=1)
    buyer_2 = Buyer(name="Ravi", phone="9840000003", preferred_vendor_id=1)
    buyer_3 = Buyer(name="Fathima", phone="9840000004", preferred_vendor_id=1)

    db.session.add_all([vendor, buyer_1, buyer_2, buyer_3])
    db.session.flush()

    products = [
        Product(
            name=name,
            name_ta=name_ta,
            name_hi=name_hi,
            unit=unit,
            common_spellings=common_spellings,
        )
        for name, name_ta, name_hi, unit, common_spellings in demo_products
    ]
    db.session.add_all(products)
    db.session.commit()


with app.app_context():
    db.create_all()
    seed_demo_data()


@app.get("/")
def home():
    return jsonify(
        {
            "message": "Veggie Vendor Assistant API",
            "docs_url": "/api/docs/",
            "health_url": "/api/health",
        }
    )


@app.errorhandler(404)
def handle_not_found(_error):
    return jsonify(
        {
            "error": "route_not_found",
            "message": "The requested URL was not found on the server.",
        }
    ), 404


def parse_date(value: str | None) -> date:
    if not value:
        return date.today()
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError("date must be in YYYY-MM-DD format") from exc


# ---------- Products ----------

@app.get("/api/products")
def list_products():
    """List all products in the catalog.
    ---
    tags:
      - Products
    responses:
      200:
        description: List of products
        schema:
          type: array
          items:
            type: object
            properties:
              id: {type: integer}
              name: {type: string}
              name_ta: {type: string}
              name_hi: {type: string}
              unit: {type: string}
    """
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products])


# ---------- Vendors ----------

@app.get("/api/vendors/<int:vendor_id>")
def get_vendor(vendor_id):
    """Get a vendor's profile.
    ---
    tags:
      - Vendors
    parameters:
      - name: vendor_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Vendor profile
      404:
        description: Vendor not found
    """
    vendor = Vendor.query.get_or_404(vendor_id)
    return jsonify(vendor.to_dict())


# ---------- Daily stock (vendor purchase/sale entry) ----------

@app.post("/api/stock")
def add_stock_entry():
    """Log a purchase and/or sale for a product on a given day.
    Called repeatedly through the day as sales happen; upserts the row
    for that vendor+product+date.
    ---
    tags:
      - Stock
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required: [vendor_id, product_id]
          properties:
            vendor_id: {type: integer}
            product_id: {type: integer}
            stock_date: {type: string, example: "2026-07-04"}
            purchased_qty: {type: number}
            unit_cost: {type: number}
            sold_qty: {type: number}
            unit_price: {type: number}
    responses:
      201:
        description: Stock entry created or updated
      400:
        description: Missing required fields
    """
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "JSON body is required"}), 400

    required = ["vendor_id", "product_id"]
    if not all(k in data for k in required):
        return jsonify({"error": "vendor_id and product_id are required"}), 400

    try:
        stock_date = parse_date(data.get("stock_date"))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

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
    """Get a vendor's stock entries for a given date.
    ---
    tags:
      - Stock
    parameters:
      - name: vendor_id
        in: path
        type: integer
        required: true
      - name: date
        in: query
        type: string
        required: false
        description: Defaults to today. Format YYYY-MM-DD.
    responses:
      200:
        description: List of stock entries
    """
    stock_date = parse_date(request.args.get("date"))
    entries = DailyStock.query.filter_by(
        vendor_id=vendor_id, stock_date=stock_date
    ).all()
    return jsonify([e.to_dict() for e in entries])


@app.get("/api/vendors/<int:vendor_id>/summary")
def profit_loss_summary(vendor_id):
    """Daily profit/loss rollup — the core 'how did today go' screen.
    ---
    tags:
      - Stock
    parameters:
      - name: vendor_id
        in: path
        type: integer
        required: true
      - name: date
        in: query
        type: string
        required: false
        description: Defaults to today. Format YYYY-MM-DD.
    responses:
      200:
        description: Profit/loss summary with line items
    """
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
    """Submit one item of a buyer's demand request for a future pickup date.
    The frontend calls this once per item in the buyer's list.
    ---
    tags:
      - Demand
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required: [buyer_id, vendor_id, product_id, quantity, requested_for_date]
          properties:
            buyer_id: {type: integer}
            vendor_id: {type: integer}
            product_id: {type: integer}
            quantity: {type: number}
            requested_for_date: {type: string, example: "2026-07-05"}
    responses:
      201:
        description: Demand request created
      400:
        description: Missing required fields
    """
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
    consolidated procurement list.
    ---
    tags:
      - Demand
    parameters:
      - name: vendor_id
        in: path
        type: integer
        required: true
      - name: date
        in: query
        type: string
        required: false
        description: Pickup date, defaults to today. Format YYYY-MM-DD.
    responses:
      200:
        description: List of buyer demand requests
    """
    target_date = parse_date(request.args.get("date"))
    requests_ = DemandRequest.query.filter_by(
        vendor_id=vendor_id, requested_for_date=target_date
    ).all()
    return jsonify([r.to_dict() for r in requests_])


@app.get("/api/vendors/<int:vendor_id>/procurement-list")
def get_procurement_list(vendor_id):
    """The AI-adjusted consolidated shopping list: pre-orders + predicted
    walk-in demand, combined per product. This is what the vendor takes
    to the wholesale market.
    ---
    tags:
      - Demand
    parameters:
      - name: vendor_id
        in: path
        type: integer
        required: true
      - name: date
        in: query
        type: string
        required: false
        description: Target date, defaults to today. Format YYYY-MM-DD.
    responses:
      200:
        description: Consolidated procurement list
    """
    target_date = parse_date(request.args.get("date"))
    procurement_list = build_procurement_list(vendor_id, target_date)
    return jsonify(
        {"date": target_date.isoformat(), "procurement_list": procurement_list}
    )


@app.patch("/api/demand/<int:request_id>/confirm")
def confirm_demand_request(request_id):
    """Mark a buyer's request as confirmed, optionally recording a
    token UPI payment that locks in the order.
    ---
    tags:
      - Demand
    parameters:
      - name: request_id
        in: path
        type: integer
        required: true
      - name: body
        in: body
        required: false
        schema:
          type: object
          properties:
            token_paid: {type: boolean}
    responses:
      200:
        description: Updated demand request
      404:
        description: Request not found
    """
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "JSON body is required"}), 400

    req_entry = DemandRequest.query.get_or_404(request_id)
    req_entry.status = "confirmed"
    if data.get("token_paid"):
        req_entry.payment_status = "token_paid"
    db.session.commit()
    return jsonify(req_entry.to_dict())


# ---------- Transactions ----------

@app.post("/api/transactions")
def record_transaction():
    """Record a payment transaction (UPI or cash).
    ---
    tags:
      - Transactions
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required: [vendor_id, amount]
          properties:
            vendor_id: {type: integer}
            buyer_id: {type: integer}
            amount: {type: number}
            mode: {type: string, enum: [upi, cash], default: upi}
    responses:
      201:
        description: Transaction recorded
    """
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "JSON body is required"}), 400

    if "vendor_id" not in data or "amount" not in data:
        return jsonify({"error": "vendor_id and amount are required"}), 400

    txn = Transaction(
        vendor_id=data["vendor_id"],
        buyer_id=data.get("buyer_id"),
        amount=data["amount"],
        mode=data.get("mode", "upi"),
    )
    db.session.add(txn)
    db.session.commit()
    return jsonify(txn.to_dict()), 201


@app.post("/api/match-products")
def match_products():
    """Match free-form buyer text against the product catalog using a
    FAISS vector index (character n-gram TF-IDF vectors under the hood).
    Handles messy input like 'thakkali 2kg, ulli konjam' without the
    buyer needing to pick exact names from a dropdown.
    ---
    tags:
      - Demand
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required: [text]
          properties:
            text:
              type: string
              example: "thakkali 2kg, konjam ulli, coriander"
    responses:
      200:
        description: Parsed items with matched product and confidence score
    """
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "JSON body is required"}), 400

    text = data.get("text", "")
    if not text.strip():
        return jsonify({"error": "text is required"}), 400

    products = [p.to_dict() for p in Product.query.all()]
    if not products:
        return jsonify({"error": "no products in catalog yet"}), 400

    matcher = ProductMatcher(products)
    matched = matcher.parse_list(text)
    return jsonify({"input_text": text, "matches": matched})


@app.get("/api/health")
def health():
    """Health check.
    ---
    tags:
      - System
    responses:
      200:
        description: Service is up
    """
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
