import os
from datetime import date, datetime, timedelta

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from flasgger import Swagger
from functools import wraps
from werkzeug.security import check_password_hash, generate_password_hash
import jwt

from models import db, User, Vendor, Buyer, Product, DailyStock, DemandRequest, Transaction
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
app.config["JWT_SECRET_KEY"] = os.environ.get(
    "JWT_SECRET_KEY", "please-change-this-secret")

if "JWT_SECRET_KEY" not in app.config or not app.config["JWT_SECRET_KEY"]:
    raise RuntimeError("JWT_SECRET_KEY must be configured")

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
    db.session.add(vendor)
    db.session.flush()

    user_vendor = User(
        name="Murugan Vegetable Stall",
        phone="9840000001",
        password_hash=generate_password_hash("vendorpass"),
        role="vendor",
    )
    db.session.add(user_vendor)
    db.session.flush()
    vendor.user_id = user_vendor.id

    buyer_1 = Buyer(name="Lakshmi", phone="9840000002",
                    preferred_vendor_id=vendor.id)
    buyer_2 = Buyer(name="Ravi", phone="9840000003",
                    preferred_vendor_id=vendor.id)
    buyer_3 = Buyer(name="Fathima", phone="9840000004",
                    preferred_vendor_id=vendor.id)
    db.session.add_all([buyer_1, buyer_2, buyer_3])
    db.session.flush()

    user_buyer_1 = User(name="Lakshmi", phone="9840000002",
                        password_hash=generate_password_hash("buyerpass"), role="customer")
    user_buyer_2 = User(name="Ravi", phone="9840000003",
                        password_hash=generate_password_hash("buyerpass"), role="customer")
    user_buyer_3 = User(name="Fathima", phone="9840000004",
                        password_hash=generate_password_hash("buyerpass"), role="customer")
    db.session.add_all([user_buyer_1, user_buyer_2, user_buyer_3])
    db.session.flush()
    buyer_1.user_id = user_buyer_1.id
    buyer_2.user_id = user_buyer_2.id
    buyer_3.user_id = user_buyer_3.id

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


# Do not auto-create or seed the database at import time.
# This allows tests and production to configure the app before the
# database engine is initialized.

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


def get_bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return None


def decode_jwt(token: str) -> dict | None:
    try:
        return jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None


def require_auth(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = get_bearer_token()
        if not token:
            return jsonify({"error": "authorization_required"}), 401

        payload = decode_jwt(token)
        if not payload or "sub" not in payload:
            return jsonify({"error": "invalid_token"}), 401

        user = User.query.get(payload["sub"])
        if not user:
            return jsonify({"error": "user_not_found"}), 401

        g.current_user = user
        return func(*args, **kwargs)

    return wrapper


def require_role(role):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            auth_response = require_auth(lambda *a, **k: None)(*args, **kwargs)
            if isinstance(auth_response, tuple):
                return auth_response

            user = g.current_user
            if user.role != role:
                return jsonify({"error": "forbidden", "message": f"{role} role required"}), 403

            return func(*args, **kwargs)

        return wrapper

    return decorator


def make_token(user: User) -> str:
    payload = {
        "sub": user.id,
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, app.config["JWT_SECRET_KEY"], algorithm="HS256")


@app.post("/api/auth/register")
def register_user():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "JSON body is required"}), 400

    required = ["name", "phone", "password", "role"]
    if not all(field in data for field in required):
        return jsonify({"error": "name, phone, password and role are required"}), 400

    if data["role"] not in {"vendor", "customer"}:
        return jsonify({"error": "role must be vendor or customer"}), 400

    if User.query.filter_by(phone=data["phone"]).first():
        return jsonify({"error": "phone already registered"}), 400

    password_hash = generate_password_hash(data["password"])
    # Support separate owner/store names: owner_name used for User.name,
    # store_name used for Vendor.name when role==vendor. Fall back to data['name'].
    owner_name = data.get("owner_name", data.get("name"))
    store_name = data.get("store_name", data.get("name"))
    user = User(name=owner_name, phone=data["phone"],
                password_hash=password_hash, role=data["role"])
    db.session.add(user)
    db.session.flush()

    profile = None
    if data["role"] == "vendor":
        profile = Vendor(
            user_id=user.id,
            name=store_name,
            phone=data["phone"],
            location_lat=data.get("location_lat"),
            location_lng=data.get("location_lng"),
            cart_qr_code=data.get("cart_qr_code"),
        )
        db.session.add(profile)
    else:
        profile = Buyer(
            user_id=user.id,
            name=data.get("name"),
            phone=data["phone"],
            preferred_vendor_id=data.get("preferred_vendor_id"),
        )
        db.session.add(profile)

    db.session.commit()

    token = make_token(user)
    return jsonify({"token": token, "user": user.to_dict(), "profile": profile.to_dict()}), 201


@app.post("/api/auth/login")
def login_user():
    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict):
        return jsonify({"error": "JSON body is required"}), 400

    phone = data.get("phone")
    password = data.get("password")
    if not phone or not password:
        return jsonify({"error": "phone and password are required"}), 400

    user = User.query.filter_by(phone=phone).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "invalid_credentials"}), 401

    token = make_token(user)
    profile = None
    if user.role == "vendor" and user.vendor_profile:
        profile = user.vendor_profile.to_dict()
    elif user.role == "customer" and user.buyer_profile:
        profile = user.buyer_profile.to_dict()

    return jsonify({"token": token, "user": user.to_dict(), "profile": profile})


@app.get("/api/auth/me")
@require_auth
def auth_me():
    user = g.current_user
    profile = None
    if user.role == "vendor" and user.vendor_profile:
        profile = user.vendor_profile.to_dict()
    elif user.role == "customer" and user.buyer_profile:
        profile = user.buyer_profile.to_dict()
    return jsonify({"user": user.to_dict(), "profile": profile})


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


@app.get("/api/vendors")
def list_vendors():
    """List all vendors."""
    vendors = Vendor.query.all()
    return jsonify([vendor.to_dict() for vendor in vendors])


@app.get("/api/vendors/nearby")
def nearby_vendors():
    """Find vendors near a latitude/longitude.

    Query params: lat, lng, radius_km (default 5)
    """
    try:
        lat = float(request.args.get("lat", ""))
        lng = float(request.args.get("lng", ""))
    except (ValueError, TypeError):
        return jsonify({"error": "lat and lng query parameters are required (numbers)"}), 400

    radius_km = float(request.args.get("radius_km", 5))

    # Haversine formula in Python; small dataset so pull into memory
    from math import radians, sin, cos, asin, sqrt

    def haversine_km(lat1, lon1, lat2, lon2):
        # convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        return 6371 * c

    vendors = []
    for v in Vendor.query.filter(Vendor.location_lat.isnot(None), Vendor.location_lng.isnot(None)).all():
        dist = haversine_km(lat, lng, v.location_lat, v.location_lng)
        if dist <= radius_km:
            d = v.to_dict()
            d["distance_km"] = round(dist, 3)
            # compute open_now from opening_hours simple string
            try:
                if v.opening_hours and '-' in v.opening_hours:
                    start_s, end_s = v.opening_hours.split('-', 1)
                else:
                    start_s, end_s = "09:00", "21:00"
                now_t = datetime.utcnow().time()
                from datetime import time as dtime

                def parse_hm(s):
                    h, m = map(int, s.split(':'))
                    return dtime(h, m)
                open_now = parse_hm(start_s) <= now_t <= parse_hm(end_s)
            except Exception:
                open_now = True
            d["open_now"] = open_now and bool(v.available)
            vendors.append(d)

    # sort by distance
    vendors.sort(key=lambda x: x.get("distance_km", 9999))
    return jsonify(vendors)


@app.get("/api/buyers")
def list_buyers():
    """List all buyers."""
    buyers = Buyer.query.all()
    return jsonify([buyer.to_dict() for buyer in buyers])


# ---------- Daily stock (vendor purchase/sale entry) ----------

@app.post("/api/stock")
@require_auth
@require_role("vendor")
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

    if g.current_user.vendor_profile is None or g.current_user.vendor_profile.id != data["vendor_id"]:
        return jsonify({"error": "forbidden", "message": "vendor access only for your own profile"}), 403

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
@require_auth
@require_role("customer")
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
@require_auth
@require_role("vendor")
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
    if g.current_user.vendor_profile is None or g.current_user.vendor_profile.id != vendor_id:
        return jsonify({"error": "forbidden", "message": "vendor access only for your own profile"}), 403

    requests_ = DemandRequest.query.filter_by(
        vendor_id=vendor_id, requested_for_date=target_date
    ).all()
    return jsonify([r.to_dict() for r in requests_])


# ---------- Vendor catalog (vendor-specific product listings) ----------


@app.get("/api/vendors/<int:vendor_id>/catalog")
def get_vendor_catalog(vendor_id):
    vendor = Vendor.query.get_or_404(vendor_id)
    # list vendor products
    try:
        from models import VendorProduct
        items = VendorProduct.query.filter_by(vendor_id=vendor_id).all()
        return jsonify([i.to_dict() for i in items])
    except Exception:
        return jsonify({"error": "vendor catalog not available"}), 500


@app.post("/api/vendors/<int:vendor_id>/catalog")
@require_auth
@require_role("vendor")
def upsert_vendor_product(vendor_id):
    data = request.get_json(silent=True) or {}
    if g.current_user.vendor_profile is None or g.current_user.vendor_profile.id != vendor_id:
        return jsonify({"error": "forbidden", "message": "vendor access only for your own profile"}), 403
    product_id = data.get("product_id")
    price = data.get("price")
    if not product_id or price is None:
        return jsonify({"error": "product_id and price are required"}), 400
    from models import VendorProduct
    vp = VendorProduct.query.filter_by(
        vendor_id=vendor_id, product_id=product_id).first()
    if not vp:
        vp = VendorProduct(vendor_id=vendor_id,
                           product_id=product_id, price=price)
        db.session.add(vp)
    else:
        vp.price = price
    if "available" in data:
        vp.available = bool(data.get("available"))
    if "stock" in data:
        vp.stock = data.get("stock")
    db.session.commit()
    return jsonify(vp.to_dict()), 201


# ---------- Orders ----------


@app.post("/api/orders")
def create_order():
    """Create a customer order for a vendor.
    body: { buyer_id, vendor_id, mode: pickup|delivery, items: [{product_id, quantity}] }
    """
    data = request.get_json(silent=True) or {}
    required = ["vendor_id", "items"]
    if not all(k in data for k in required):
        return jsonify({"error": f"required fields: {required}"}), 400
    vendor_id = data["vendor_id"]
    buyer_id = data.get("buyer_id")
    mode = data.get("mode", "pickup")
    items = data["items"]
    if not isinstance(items, list) or len(items) == 0:
        return jsonify({"error": "items must be a non-empty list"}), 400

    from models import VendorProduct, Order, OrderItem

    total = 0.0
    order_items = []
    for it in items:
        pid = it.get("product_id")
        qty = float(it.get("quantity", 0))
        vp = VendorProduct.query.filter_by(
            vendor_id=vendor_id, product_id=pid).first()
        if not vp or not vp.available:
            return jsonify({"error": "product_unavailable", "product_id": pid}), 400
        unit_price = float(vp.price)
        total += unit_price * qty
        order_items.append(
            {"product_id": pid, "quantity": qty, "unit_price": unit_price})

    order = Order(vendor_id=vendor_id, buyer_id=buyer_id,
                  total_amount=round(total, 2), mode=mode, status="pending")
    db.session.add(order)
    db.session.flush()

    for oi in order_items:
        oitem = OrderItem(
            order_id=order.id, product_id=oi["product_id"], quantity=oi["quantity"], unit_price=oi["unit_price"])
        db.session.add(oitem)

    db.session.commit()
    return jsonify(order.to_dict()), 201


@app.get("/api/vendors/<int:vendor_id>/orders")
@require_auth
@require_role("vendor")
def list_vendor_orders(vendor_id):
    if g.current_user.vendor_profile is None or g.current_user.vendor_profile.id != vendor_id:
        return jsonify({"error": "forbidden", "message": "vendor access only for your own profile"}), 403
    from models import Order
    orders = Order.query.filter_by(vendor_id=vendor_id).order_by(
        Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@app.patch("/api/orders/<int:order_id>/status")
@require_auth
def update_order_status(order_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if not new_status:
        return jsonify({"error": "status is required"}), 400
    order = Order.query.get_or_404(order_id)
    # allow vendor to accept/fulfill, or buyer to cancel
    user = g.current_user if hasattr(g, "current_user") else None
    if user and user.role == "vendor":
        if user.vendor_profile is None or user.vendor_profile.id != order.vendor_id:
            return jsonify({"error": "forbidden"}), 403
        order.status = new_status
    elif user and user.role == "customer":
        # buyers can cancel their own orders
        if order.buyer_id is None:
            return jsonify({"error": "buyer_not_set"}), 403
        buyer = order.buyer
        # buyer is a Buyer model, map to user via buyer.user_id
        if buyer and buyer.user_id == user.id and new_status == "cancelled":
            order.status = "cancelled"
        else:
            return jsonify({"error": "forbidden"}), 403
    else:
        return jsonify({"error": "authorization_required"}), 401

    db.session.commit()
    return jsonify(order.to_dict())


@app.get("/api/vendors/<int:vendor_id>/procurement-list")
@require_auth
@require_role("vendor")
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
    if g.current_user.vendor_profile is None or g.current_user.vendor_profile.id != vendor_id:
        return jsonify({"error": "forbidden", "message": "vendor access only for your own profile"}), 403

    procurement_list = build_procurement_list(vendor_id, target_date)
    return jsonify(
        {"date": target_date.isoformat(), "procurement_list": procurement_list}
    )


@app.patch("/api/demand/<int:request_id>/confirm")
@require_auth
@require_role("vendor")
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
    if g.current_user.vendor_profile is None or g.current_user.vendor_profile.id != req_entry.vendor_id:
        return jsonify({"error": "forbidden", "message": "vendor access only for your own orders"}), 403

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
        seed_demo_data()
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
