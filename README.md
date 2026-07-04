# Smart Vegetable Vendor Assistant — starter codebase

A working MVP scaffold covering:
- Vendor daily purchase/sale entry → auto profit/loss
- **The demand loop**: buyers submit "tomorrow's list" → app aggregates it →
  blended with an AI walk-in-demand prediction → vendor's procurement list
- Product catalog with Tamil/Hindi labels (ready for voice-input integration)

## Structure

```
backend/     Flask + SQLAlchemy API (SQLite by default, MySQL-ready)
  app.py               routes
  models.py            DB schema
  demand_prediction.py weighted-average demand forecast (swap for Prophet/sklearn later)
  seed.py              sample vendor, buyers, products, 30 days of history
frontend/    React (Vite) app
  src/pages/VendorDashboard.jsx   profit/loss, stock entry, procurement list
  src/pages/BuyerList.jsx         tap-to-order buyer screen
```

## Run it locally

**Backend**
```bash
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python seed.py       # creates veggie_app.db with sample data
python app.py         # runs on http://127.0.0.1:5000
```

**Frontend** (separate terminal)
```bash
cd frontend
npm install
npm run dev            # runs on http://127.0.0.1:5173, proxies /api to Flask
```

Open http://127.0.0.1:5173 — switch between "Vendor dashboard" and
"Send tomorrow's list" tabs to see both sides of the loop.

## Switching to MySQL

Set an environment variable before running the backend:
```bash
export DATABASE_URL="mysql+pymysql://user:password@localhost/veggie_app"
pip install pymysql
```
No code changes needed — SQLAlchemy handles the dialect switch.

## What's stubbed vs. real

**Real and working:**
- Profit/loss calculation from purchase + sale entries
- Buyer demand submission and vendor-side aggregation
- Demand prediction (weighted recent average + day-of-week pattern)
- Full REST API tested end-to-end

**Stubbed for you to build next:**
- Auth (vendor/buyer IDs are hardcoded — see `VENDOR_ID` in `App.jsx`)
- Voice input (Tamil/Hindi) — the `Product.name_ta` / `name_hi` fields are
  ready; wire up Whisper or Google Speech-to-Text before the demand-submit call
- WhatsApp bot channel — same `/api/demand` endpoint, just called from a
  WhatsApp Business API webhook instead of the React form
- UPI payment — `payment_status` field and `/api/demand/<id>/confirm` route
  exist; plug in Razorpay/PhonePe checkout before calling confirm
- Push notifications for "order ready" / low-stock alerts
