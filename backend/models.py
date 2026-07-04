"""
Database models for the Smart Vegetable Vendor Assistant.

Uses SQLite by default (zero setup for local dev) but every column here
is plain, portable SQL — switching to MySQL later is just a connection
string change in app.py (see the DATABASE_URL env var).
"""
from datetime import date, datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Vendor(db.Model):
    __tablename__ = "vendors"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    location_lat = db.Column(db.Float)
    location_lng = db.Column(db.Float)
    cart_qr_code = db.Column(db.String(64), unique=True)  # printed on the cart
    trust_score = db.Column(db.Float, default=5.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    stock_entries = db.relationship("DailyStock", backref="vendor", lazy=True)
    demand_requests = db.relationship("DemandRequest", backref="vendor", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "cart_qr_code": self.cart_qr_code,
            "trust_score": self.trust_score,
        }


class Buyer(db.Model):
    __tablename__ = "buyers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    preferred_vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "phone": self.phone}


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    name_ta = db.Column(db.String(80))  # Tamil script, for display only
    name_hi = db.Column(db.String(80))  # Hindi script, for display only
    common_spellings = db.Column(db.String(200))  # comma-separated Latin-script
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


class DailyStock(db.Model):
    """One row per vendor+product+day: what was bought, at what cost,
    and how much sold, at what price. This is the source of the
    profit/loss calculation and the training data for demand prediction."""

    __tablename__ = "daily_stock"

    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
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
    buyer_id = db.Column(db.Integer, db.ForeignKey("buyers.id"), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    requested_for_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending, confirmed, fulfilled, cancelled
    payment_status = db.Column(db.String(20), default="unpaid")  # unpaid, token_paid
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
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey("buyers.id"))
    amount = db.Column(db.Float, nullable=False)
    mode = db.Column(db.String(20), default="upi")  # upi, cash
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "vendor_id": self.vendor_id,
            "buyer_id": self.buyer_id,
            "amount": self.amount,
            "mode": self.mode,
            "timestamp": self.timestamp.isoformat(),
        }
