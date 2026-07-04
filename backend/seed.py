"""Run once to populate sample data: `python seed.py`"""
import random
from datetime import date, timedelta

from app import app
from models import db, Vendor, Buyer, Product, DailyStock

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

        vendor = Vendor(
            name="Murugan Vegetable Stall",
            phone="9840000001",
            location_lat=13.0827,
            location_lng=80.2707,
            cart_qr_code="CART-MURUGAN-01",
        )
        db.session.add(vendor)

        buyers = [
            Buyer(name="Lakshmi", phone="9840000002", preferred_vendor_id=1),
            Buyer(name="Ravi", phone="9840000003", preferred_vendor_id=1),
            Buyer(name="Fathima", phone="9840000004", preferred_vendor_id=1),
        ]
        db.session.add_all(buyers)

        products = [
            Product(name=n, name_ta=ta, name_hi=hi, unit=unit, common_spellings=spellings)
            for n, ta, hi, unit, spellings in PRODUCTS
        ]
        db.session.add_all(products)
        db.session.commit()

        # 30 days of synthetic sales history per product, so the demand
        # predictor and profit/loss screens have something real to show.
        today = date.today()
        for product in products:
            base_qty = random.uniform(8, 20)
            base_cost = random.uniform(15, 40)
            for days_ago in range(30, 0, -1):
                d = today - timedelta(days=days_ago)
                weekday_bump = 1.4 if d.weekday() == 6 else 1.0  # Sunday rush
                purchased = round(base_qty * weekday_bump * random.uniform(0.85, 1.15), 1)
                sold = round(purchased * random.uniform(0.75, 0.98), 1)
                cost = round(base_cost * random.uniform(0.9, 1.1), 2)
                price = round(cost * random.uniform(1.3, 1.6), 2)

                entry = DailyStock(
                    vendor_id=vendor.id,
                    product_id=product.id,
                    stock_date=d,
                    purchased_qty=purchased,
                    unit_cost=cost,
                    sold_qty=sold,
                    unit_price=price,
                )
                db.session.add(entry)

        db.session.commit()
        print("Seeded 1 vendor, 3 buyers, 6 products, 30 days of stock history.")


if __name__ == "__main__":
    run()
