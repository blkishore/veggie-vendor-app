"""Run once to populate sample data: `python seed.py`"""
import random
from datetime import date, timedelta

from app import app
from models import db, User, Vendor, Buyer, Product, DailyStock
from werkzeug.security import generate_password_hash

PRODUCTS = [
    ("Tomato", "தக்காளி", "टमाटर", "kg", "thakkali,thakkaali,tamatar,tomatoe"),
    ("Onion", "வெங்காயம்", "प्याज", "kg", "vengayam,ulli,pyaz,pyaaz"),
    ("Potato", "உருளைக்கிழங்கு", "आलू", "kg", "urulaikizhangu,aloo,alu"),
    ("Coriander", "கொத்தமல்லி", "धनिया", "bunch", "kothamalli,dhania,coriender"),
    ("Brinjal", "கத்தரிக்காய்", "बैंगन", "kg", "kathirikai,baingan,eggplant"),
    ("Carrot", "கேரட்", "गाजर", "kg", "carat,gajar"),
]


def run():
    with app.app_context():
        db.drop_all()
        db.create_all()

        # Create several demo vendors around central Chennai coordinates
        demo_vendors = [
            ("Murugan Vegetable Stall", "9840000001", 13.0827, 80.2707),
            ("Kumar Fruits", "9840000010", 13.0800, 80.2700),
            ("Sundar Juice", "9840000020", 13.0850, 80.2750),
            ("Meena Flower Shop", "9840000030", 13.0900, 80.2680),
        ]

        vendors = []
        for i, (name, phone, lat, lng) in enumerate(demo_vendors, start=1):
            v = Vendor(
                name=name,
                phone=phone,
                location_lat=lat,
                location_lng=lng,
                cart_qr_code=f"CART-DEMO-{i:02d}",
                available=True,
                is_mobile=(i % 2 == 0),
                opening_hours="08:00-20:00",
                category="vegetable" if "Vegetable" in name or "Fruits" in name else "other",
                rating=4.5 + (i % 3) * 0.2,
            )
            db.session.add(v)
            db.session.flush()

            user_vendor = User(
                name=name,
                phone=phone,
                password_hash=generate_password_hash("vendorpass"),
                role="vendor",
            )
            db.session.add(user_vendor)
            db.session.flush()
            v.user_id = user_vendor.id
            vendors.append(v)

        # assign buyers to first demo vendor
        buyers = [
            Buyer(name="Lakshmi", phone="9840000002",
                  preferred_vendor_id=vendors[0].id),
            Buyer(name="Ravi", phone="9840000003",
                  preferred_vendor_id=vendors[0].id),
            Buyer(name="Fathima", phone="9840000004",
                  preferred_vendor_id=vendors[0].id),
        ]
        db.session.add_all(buyers)
        db.session.flush()

        user_buyers = [
            User(
                name="Lakshmi",
                phone="9840000002",
                password_hash=generate_password_hash("buyerpass"),
                role="customer",
            ),
            User(
                name="Ravi",
                phone="9840000003",
                password_hash=generate_password_hash("buyerpass"),
                role="customer",
            ),
            User(
                name="Fathima",
                phone="9840000004",
                password_hash=generate_password_hash("buyerpass"),
                role="customer",
            ),
        ]
        db.session.add_all(user_buyers)
        db.session.flush()

        for buyer, user in zip(buyers, user_buyers):
            buyer.user_id = user.id

        products = [
            Product(name=n, name_ta=ta, name_hi=hi,
                    unit=unit, common_spellings=spellings)
            for n, ta, hi, unit, spellings in PRODUCTS
        ]
        db.session.add_all(products)
        db.session.commit()

        # create vendor-specific catalog entries (VendorProduct)
        try:
            from models import VendorProduct
            for v in vendors:
                for p in products[:4]:
                    vp = VendorProduct(vendor_id=v.id, product_id=p.id,
                                       price=round(random.uniform(25, 80), 2),
                                       available=True, stock=50)
                    db.session.add(vp)
            db.session.commit()
        except Exception:
            # VendorProduct may not be available in older schema
            pass

        # 30 days of synthetic sales history per product, so the demand
        # predictor and profit/loss screens have something real to show.
        today = date.today()
        for product in products:
            base_qty = random.uniform(8, 20)
            base_cost = random.uniform(15, 40)
            for days_ago in range(30, 0, -1):
                d = today - timedelta(days=days_ago)
                weekday_bump = 1.4 if d.weekday() == 6 else 1.0  # Sunday rush
                purchased = round(base_qty * weekday_bump *
                                  random.uniform(0.85, 1.15), 1)
                sold = round(purchased * random.uniform(0.75, 0.98), 1)
                cost = round(base_cost * random.uniform(0.9, 1.1), 2)
                price = round(cost * random.uniform(1.3, 1.6), 2)

                entry = DailyStock(
                    vendor_id=vendors[0].id,
                    product_id=product.id,
                    stock_date=d,
                    purchased_qty=purchased,
                    unit_cost=cost,
                    sold_qty=sold,
                    unit_price=price,
                )
                db.session.add(entry)

        db.session.commit()
        print("Seeded demo vendors, buyers, products, and stock history.")


if __name__ == "__main__":
    run()
