from models import db, Product


def test_match_products_exact_and_fuzzy_text(client, app):
    with app.app_context():
        db.session.add_all(
            [
                Product(name="Tomato", common_spellings="thakkali,tamatar", unit="kg"),
                Product(name="Onion", common_spellings="vengayam,pyaz", unit="kg"),
                Product(name="Coriander", common_spellings="kothamalli", unit="bunch"),
            ]
        )
        db.session.commit()

    resp = client.post(
        "/api/match-products",
        json={"text": "thakkali 2kg, konjam vengayam, coriender"},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body["matches"]) == 3

    # "thakkali" is a known Latin-script spelling variant for Tomato
    tomato_match = body["matches"][0]
    assert tomato_match["product"]["name"] == "Tomato"
    assert tomato_match["confidence"] > 0

    # "vengayam" is a known spelling variant for Onion
    onion_match = body["matches"][1]
    assert onion_match["product"]["name"] == "Onion"

    # Typo'd English ("coriender") should still match via char n-grams
    coriander_match = body["matches"][2]
    assert coriander_match["product"]["name"] == "Coriander"


def test_match_products_requires_text(client):
    resp = client.post("/api/match-products", json={})
    assert resp.status_code == 400


def test_match_products_no_catalog(client):
    resp = client.post("/api/match-products", json={"text": "tomato"})
    assert resp.status_code == 400
    assert "catalog" in resp.get_json()["error"]
