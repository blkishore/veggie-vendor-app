# Veggie Vendor

A vendor and customer application for local produce businesses. It includes:
- Vendor daily purchase/sale entry → auto profit/loss
- **The demand loop**: buyers submit "tomorrow's list" → app aggregates it →
  blended with an AI walk-in-demand prediction → vendor's procurement list
- Fuzzy product matching (difflib) so buyers can type free-form text instead
  of picking from an exact dropdown
- Swagger/OpenAPI docs for the whole API
- Dockerized (Postgres + Flask + React), with a pytest suite

## Structure

```
backend/
  app.py                 routes + Swagger UI at /api/docs/
  models.py               DB schema (SQLite locally, Postgres in Docker)
  demand_prediction.py     weighted-average demand forecast
  product_matcher.py       character n-gram and common-spelling fuzzy matching
  seed.py                  sample vendor, buyers, products, 30 days of history
  tests/                   pytest suite (run with `pytest`)
  Dockerfile
frontend/    React (Vite) app
  src/pages/VendorDashboard.jsx
  src/pages/BuyerList.jsx
  Dockerfile
docker-compose.yml         wires Postgres + backend + frontend together
```

## Run locally (no Docker)

Start the backend in one PowerShell terminal:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Direct local runs generate a temporary JWT key automatically, so no additional
configuration is required to try the app. Sessions expire when the backend
restarts. To keep sessions across restarts, create a root `.env` from
`.env.example`, replace its `JWT_SECRET_KEY` placeholder with a private local
secret, and save it. The backend loads this file automatically; `.env` is
ignored by Git and should never be committed.

The backend is available at `http://127.0.0.1:5000`; API documentation is at
`http://127.0.0.1:5000/api/docs/`. On an empty database, the app creates a
small demo catalog automatically. For the larger sample dataset, see the
seed warning below.

Start the frontend in a second terminal:
```powershell
cd frontend
npm ci
npm run dev
```
Open `http://localhost:5173/`. Vite proxies `/api` requests to the local
backend at `127.0.0.1:5000`.

The built-in demo account credentials are intended for local development
only: vendor `9840000001` / `vendorpass`; customer `9840000002` / `buyerpass`.

> **Warning:** `python seed.py` drops and recreates all database tables before
> inserting sample vendors, buyers, and sales. Run it only against a disposable
> local database. Do not run it against data you need to keep.

## Run it with Docker (Postgres instead of SQLite)

```bash
docker compose up --build
```
This starts Postgres, runs the backend against it (`DATABASE_URL` is set in
`docker-compose.yml`), and serves the built frontend. To populate the database
with the larger sample dataset on a fresh setup, run the seed command once.
It is destructive if the database already contains data.

```bash
docker compose exec backend python seed.py
```

## Run the tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

## Try the fuzzy product matcher

```bash
curl -X POST http://127.0.0.1:5000/api/match-products \
  -H "Content-Type: application/json" \
  -d '{"text":"thakkali 2kg, konjam vengayam, kothamalli"}'
```
Note the real constraint documented in `product_matcher.py`: character
n-gram matching only works within the same script. It correctly matches
"thakkali" → Tomato because that Latin-script spelling is registered in
`common_spellings`, but it cannot bridge native Tamil Unicode text to
English on its own — that needs either a transliteration table or a
multilingual embedding model.

## Hands-on skill map for this codebase

| Skill | Where it lives here | Status |
|---|---|---|
| Docker | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` | Built, YAML-validated (Docker itself needs to run on your machine to fully verify) |
| PostgreSQL | `docker-compose.yml` db service + `DATABASE_URL` env var | Built — swap is a connection string, no code changes |
| Pytest | `backend/tests/` | Built, 12 tests passing |
| Fuzzy matching | `backend/product_matcher.py` | Built, tested, live-verified |
| LangGraph | Not yet built — see below | Next step |
| PyTorch | Not yet built — see below | Next step |
| Databricks | Not yet built — see below | Next step |
| AWS free tier | Not yet built — see below | Next step |

### LangGraph — next step (free, ~1 week)
Build a small agent with tools that call your own API:
- Tool 1: `get_procurement_list(vendor_id, date)` → calls `/api/vendors/<id>/procurement-list`
- Tool 2: `get_profit_summary(vendor_id, date)` → calls `/api/vendors/<id>/summary`
- Graph: a single ReAct-style node that decides which tool(s) to call based
  on a vendor's natural-language question ("why should I buy more onions
  tomorrow than usual?"), then composes an answer from the tool results.
- Runs entirely locally against your own Flask API — no paid LLM API
  required if you point it at a local model via Ollama, or use a free-tier
  API key from any provider that offers one.

### PyTorch — next step (free, ~2-3 weeks)
Replace `demand_prediction.py`'s heuristic with a small regression model:
- Features: day-of-week (one-hot), rolling 7-day average, days since last
  purchase of that product
- Target: `sold_qty`
- A 2-layer `nn.Linear` model trained on the same `daily_stock` table is
  enough to practice the training loop, loss function, and optimizer —
  the point is the workflow, not model complexity.
- Keep the existing pandas heuristic as a fallback for cold-start vendors
  with no history yet (this is a legitimate production pattern, not a cop-out).

### Databricks Community Edition — next step (free, ~2-3 weeks)
- Export `daily_stock` as CSV (`sqlite3 veggie_app.db ".mode csv" ".output stock.csv" "SELECT * FROM daily_stock;"`)
- Sign up for Databricks Community Edition (free, no card)
- Load the CSV, practice PySpark `groupBy`/`window` operations computing
  the same profit/loss and demand aggregations you already built in
  Flask/pandas — same logic, different engine, which is exactly the
  transferable skill interviewers are checking for.

### AWS free tier — next step (free tier only, ~3-4 weeks)
- **S3** (free tier, 12 months): store buyer-uploaded photos of handwritten
  lists (an alternate submission channel beyond WhatsApp/app)
- **Lambda** (always-free tier): host the WhatsApp Business API webhook
  that receives buyer messages and calls your `/api/demand` endpoint —
  this is genuinely how you'd deploy that integration in production anyway
- Stay strictly within free-tier limits: S3 free tier is 5GB, Lambda's
  always-free tier is 1M requests/month — nowhere close to what a learning
  project generates

## What's stubbed vs. real

**Working:** account registration and sign-in, vendor and customer workspaces,
vendor product listings, pickup orders, profit/loss, the demand loop,
procurement suggestions, fuzzy product matching, Swagger docs, pytest suite,
and Docker/Postgres config.

**Not implemented yet:** persistent photo uploads, vendor availability
controls, voice input (Whisper/Google STT), WhatsApp integration, UPI payments,
push notifications, LangGraph agent, PyTorch forecasting model, Databricks
pipeline, and AWS deployment.
