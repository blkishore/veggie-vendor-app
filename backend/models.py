"""
Database models for the Smart Vegetable Vendor Assistant.

Uses SQLite by default (zero setup for local dev) but every column here
is plain, portable SQL — switching to MySQL later is just a connection
string change in app.py (see the DATABASE_URL env var).
"""
from datetime import date, datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # vendor or customer
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc))

    buyer_profile = db.relationship("Buyer", backref="user", uselist=False)
    vendor_profile = db.relationship("Vendor", backref="user", uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "role": self.role,
        }


class Vendor(db.Model):
    __tablename__ = "vendors"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    location_lat = db.Column(db.Float)
    location_lng = db.Column(db.Float)
    cart_qr_code = db.Column(db.String(64), unique=True)  # printed on the cart
    # Basic availability and mobile vendor support
    available = db.Column(db.Boolean, default=True)
    is_mobile = db.Column(db.Boolean, default=False)
    # Simple opening hours string like "09:00-21:00" (daily) for MVP
    opening_hours = db.Column(db.String(64), default="09:00-21:00")
    category = db.Column(db.String(40), default="vegetable")
    rating = db.Column(db.Float, default=5.0)
    profile_photo = db.Column(db.String(200))
    trust_score = db.Column(db.Float, default=5.0)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc))

    stock_entries = db.relationship("DailyStock", backref="vendor", lazy=True)
    demand_requests = db.relationship(
        "DemandRequest", backref="vendor", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "cart_qr_code": self.cart_qr_code,
            "location_lat": self.location_lat,
            "location_lng": self.location_lng,
            "available": bool(self.available),
            "is_mobile": bool(self.is_mobile),
            "opening_hours": self.opening_hours,
            "category": self.category,
            "rating": float(self.rating) if self.rating is not None else None,
            "profile_photo": self.profile_photo,
            "trust_score": self.trust_score,
        }


class Buyer(db.Model):
    __tablename__ = "buyers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    preferred_vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"))
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "preferred_vendor_id": self.preferred_vendor_id,
        }


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    name_ta = db.Column(db.String(80))  # Tamil script, for display only
    name_hi = db.Column(db.String(80))  # Hindi script, for display only
    # comma-separated Latin-script
    common_spellings = db.Column(db.String(200))
    # transliterations buyers actually type, e.g. "thakkali,thakkaali,tomato,tamatar"
    # This is what fuzzy text matching runs against — Tamil/Hindi script fields
    # above are for display, not matching, since they share no characters with
    # the Latin script a buyer types on a phone keyboard.
    unit = db.Column(db.String(10), default="kg")  # kg, bunch, piece
    category = db.Column(db.String(40), default="vegetable")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "name_ta": self.name_ta,
            "name_hi": self.name_hi,
            "common_spellings": self.common_spellings,
            "unit": self.unit,
        }


class VendorProduct(db.Model):
    __tablename__ = "vendor_products"

    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey(
        "vendors.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey(
        "products.id"), nullable=False)
    price = db.Column(db.Float, nullable=False, default=0.0)
    available = db.Column(db.Boolean, default=True)
    stock = db.Column(db.Float, default=0)

    product = db.relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "vendor_id": self.vendor_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "price": self.price,
            "available": bool(self.available),
            "stock": self.stock,
        }


class DailyStock(db.Model):
    """One row per vendor+product+day: what was bought, at what cost,
    and how much sold, at what price. This is the source of the
    profit/loss calculation and the training data for demand prediction."""

    __tablename__ = "daily_stock"

    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey(
        "vendors.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey(
        "products.id"), nullable=False)
    stock_date = db.Column(db.Date, nullable=False, default=date.today)

    purchased_qty = db.Column(db.Float, default=0)
    unit_cost = db.Column(db.Float, default=0)   # price vendor paid at mandi
    sold_qty = db.Column(db.Float, default=0)
    unit_price = db.Column(db.Float, default=0)  # price vendor sold at

    product = db.relationship("Product")

    @property
    def cost_total(self):
        return round(self.purchased_qty * self.unit_cost, 2)

    @property
    def revenue_total(self):
        return round(self.sold_qty * self.unit_price, 2)

    @property
    def profit(self):
        return round(self.revenue_total - self.cost_total, 2)

    @property
    def unsold_qty(self):
        return round(max(self.purchased_qty - self.sold_qty, 0), 2)

    def to_dict(self):
        return {
            "id": self.id,
            "vendor_id": self.vendor_id,
            "product": self.product.name if self.product else None,
            "stock_date": self.stock_date.isoformat(),
            "purchased_qty": self.purchased_qty,
            "unit_cost": self.unit_cost,
            "sold_qty": self.sold_qty,
            "unit_price": self.unit_price,
            "cost_total": self.cost_total,
            "revenue_total": self.revenue_total,
            "profit": self.profit,
            "unsold_qty": self.unsold_qty,
        }


class DemandRequest(db.Model):
    """A buyer's pre-order for a future date. This is what powers
    'Tomorrow's list' — the whole point of the demand-aggregation loop."""

    __tablename__ = "demand_requests"

    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey(
        "buyers.id"), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey(
        "vendors.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey(
        "products.id"), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    requested_for_date = db.Column(db.Date, nullable=False)
    # pending, confirmed, fulfilled, cancelled
    status = db.Column(db.String(20), default="pending")
    payment_status = db.Column(
        db.String(20), default="unpaid")  # unpaid, token_paid
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    buyer = db.relationship("Buyer")
    product = db.relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "buyer_name": self.buyer.name if self.buyer else None,
            "vendor_id": self.vendor_id,
            "product": self.product.name if self.product else None,
            "quantity": self.quantity,
            "requested_for_date": self.requested_for_date.isoformat(),
            "status": self.status,
            "payment_status": self.payment_status,
        }


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey(
        "vendors.id"), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey("buyers.id"))
    amount = db.Column(db.Float, nullable=False)
    mode = db.Column(db.String(20), default="upi")  # upi, cash
    timestamp = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "vendor_id": self.vendor_id,
            "buyer_id": self.buyer_id,
            "amount": self.amount,
            "mode": self.mode,
            "timestamp": self.timestamp.isoformat(),
        }


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey(
        "vendors.id"), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey("buyers.id"))
    total_amount = db.Column(db.Float, default=0)
    mode = db.Column(db.String(20), default="pickup")  # pickup, delivery
    # pending, accepted, fulfilled, cancelled
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("OrderItem", backref="order", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "vendor_id": self.vendor_id,
            "buyer_id": self.buyer_id,
            "total_amount": self.total_amount,
            "mode": self.mode,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "items": [it.to_dict() for it in self.items],
        }


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey(
        "orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey(
        "products.id"), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)

    product = db.relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
        }
