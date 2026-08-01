from datetime import date, timedelta


def login(client, phone, password):
    resp = client.post(
        "/api/auth/login",
        json={"phone": phone, "password": password},
    )
    assert resp.status_code == 200
    token = resp.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_list_products_empty(client):
    resp = client.get("/api/products")
    assert resp.status_code == 200
    assert resp.get_json() == []


def test_add_stock_entry_and_summary(client, seeded):
    today = date.today().isoformat()
    headers = login(client, "9000000000", "vendorpass")

    resp = client.post(
        "/api/stock",
        headers=headers,
        json={
            "vendor_id": seeded["vendor_id"],
            "product_id": seeded["product_id"],
            "stock_date": today,
            "purchased_qty": 10,
            "unit_cost": 20,
            "sold_qty": 7,
            "unit_price": 30,
        },
    )
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["cost_total"] == 200
    assert body["revenue_total"] == 210
    assert body["profit"] == 10

    summary = client.get(
        f"/api/vendors/{seeded['vendor_id']}/summary?date={today}"
    ).get_json()
    assert summary["total_profit"] == 10
    assert len(summary["items"]) == 1


def test_stock_entry_missing_required_fields(client, seeded):
    headers = login(client, "9000000000", "vendorpass")
    resp = client.post("/api/stock", headers=headers, json={"vendor_id": 1})
    assert resp.status_code == 400
    assert "error" in resp.get_json()


def test_buyer_demand_submission_appears_in_vendor_view(client, seeded):
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    buyer_headers = login(client, "9000000001", "buyerpass")
    vendor_headers = login(client, "9000000000", "vendorpass")

    resp = client.post(
        "/api/demand",
        headers=buyer_headers,
        json={
            "buyer_id": seeded["buyer_id"],
            "vendor_id": seeded["vendor_id"],
            "product_id": seeded["product_id"],
            "quantity": 2.5,
            "requested_for_date": tomorrow,
        },
    )
    assert resp.status_code == 201
    assert resp.get_json()["status"] == "pending"

    vendor_view = client.get(
        f"/api/vendors/{seeded['vendor_id']}/demand?date={tomorrow}",
        headers=vendor_headers,
    ).get_json()
    assert len(vendor_view) == 1
    assert vendor_view[0]["quantity"] == 2.5
    assert vendor_view[0]["product"] == "Tomato"


def test_procurement_list_blends_preorders_and_prediction(client, seeded):
    """The core business logic: recommended_purchase_qty should equal
    pre-ordered quantity plus the AI-predicted walk-in quantity."""
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    buyer_headers = login(client, "9000000001", "buyerpass")
    vendor_headers = login(client, "9000000000", "vendorpass")

    client.post(
        "/api/demand",
        headers=buyer_headers,
        json={
            "buyer_id": seeded["buyer_id"],
            "vendor_id": seeded["vendor_id"],
            "product_id": seeded["product_id"],
            "quantity": 3,
            "requested_for_date": tomorrow,
        },
    )

    result = client.get(
        f"/api/vendors/{seeded['vendor_id']}/procurement-list?date={tomorrow}",
        headers=vendor_headers,
    ).get_json()

    tomato_row = next(
        row for row in result["procurement_list"] if row["product"] == "Tomato"
    )
    assert tomato_row["pre_ordered_qty"] == 3
    assert tomato_row["predicted_walkin_qty"] > 0
    expected_total = round(
        tomato_row["pre_ordered_qty"] + tomato_row["predicted_walkin_qty"], 2
    )
    assert tomato_row["recommended_purchase_qty"] == expected_total


def test_confirm_demand_with_token_payment(client, seeded):
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    buyer_headers = login(client, "9000000001", "buyerpass")
    vendor_headers = login(client, "9000000000", "vendorpass")

    created = client.post(
        "/api/demand",
        headers=buyer_headers,
        json={
            "buyer_id": seeded["buyer_id"],
            "vendor_id": seeded["vendor_id"],
            "product_id": seeded["product_id"],
            "quantity": 1,
            "requested_for_date": tomorrow,
        },
    ).get_json()

    resp = client.patch(
        f"/api/demand/{created['id']}/confirm",
        headers=vendor_headers,
        json={"token_paid": True},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "confirmed"
    assert body["payment_status"] == "token_paid"


def test_list_vendors_and_buyers(client, seeded):
    resp = client.get("/api/vendors")
    assert resp.status_code == 200
    vendors = resp.get_json()
    assert isinstance(vendors, list)
    assert any(v["id"] == seeded["vendor_id"] for v in vendors)

    resp = client.get("/api/buyers")
    assert resp.status_code == 200
    buyers = resp.get_json()
    assert isinstance(buyers, list)
    assert any(b["id"] == seeded["buyer_id"] for b in buyers)


def test_vendor_not_found_returns_404(client):
    resp = client.get("/api/vendors/999")
    assert resp.status_code == 404
