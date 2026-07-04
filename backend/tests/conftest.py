import pytest
from datetime import date, timedelta

from app import app as flask_app
from models import db, Vendor, Buyer, Product, DailyStock


@pytest.fixture
def app():
    flask_app.config.update(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        }
    )
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def seeded(app):
    """A vendor, a buyer, one product, and 14 days of sales history —
    just enough for the demand predictor to have signal."""
    vendor = Vendor(name="Test Stall", phone="9000000000")
    buyer = Buyer(name="Test Buyer", phone="9000000001")
    tomato = Product(name="Tomato", unit="kg")
    db.session.add_all([vendor, buyer, tomato])
    db.session.commit()

    today = date.today()
    for days_ago in range(14, 0, -1):
        db.session.add(
            DailyStock(
                vendor_id=vendor.id,
                product_id=tomato.id,
                stock_date=today - timedelta(days=days_ago),
                purchased_qty=10,
                unit_cost=20,
                sold_qty=8,
                unit_price=30,
            )
        )
    db.session.commit()
    return {"vendor_id": vendor.id, "buyer_id": buyer.id, "product_id": tomato.id}
