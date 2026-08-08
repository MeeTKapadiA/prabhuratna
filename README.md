# Prabhuratna Metals — Billing & Inventory ERP

POS billing, GST invoices, inventory, purchases, customers (udhaar), cashbook, and a public storefront for Prabhuratna Metals.

## Stack

- **Frontend:** React + Vite + Tailwind (`frontend/`)
- **Backend:** Express + better-sqlite3 (`backend/`)
- **Deploy:** Vercel (static frontend + serverless `/api`)

## Local setup

```bash
# Root (API deps for Vercel + local)
npm install

# Backend
cd backend && npm install
cp ../.env.example ../.env   # optional for local
npm run dev                  # http://localhost:5001

# Frontend (new terminal)
cd frontend && npm install
npm run dev                  # http://localhost:3000 (proxies /api → :5001)
```

### Default logins (seeded)

| User  | Password   | Role  |
|-------|------------|-------|
| admin | Admin@123  | admin |
| staff | Staff@123  | staff |

Public signup is disabled. Create users from **User Management** (admin only).

## Environment variables

See `.env.example`. On Vercel set at least:

| Name | Example |
|------|---------|
| `JWT_SECRET` | strong random (`openssl rand -base64 48`) |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `NODE_ENV` | `production` (optional) |

Do **not** set `VITE_API_URL` when frontend and API share the same Vercel project.

## Security smoke tests

```bash
npm run security:smoke
```

## SonarQube

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
npx @sonar/scan -Dsonar.host.url=http://localhost:9000 -Dsonar.token=YOUR_TOKEN
```

Config: `sonar-project.properties`

## Key modules

- **Billing** — barcode-first POS, custom items, GST (CGST/SGST or IGST), udhaar/partial pay, F2 checkout, offline queue
- **Credit notes** — GST returns / reverse with restock buckets
- **Customers** — B2B GSTIN + receivables
- **Cashbook / Expenses** — day book + expense-aware profit
- **Inventory** — units, HSN, size/gauge, damaged/display/scrap stock, cost history
- **Activity log** — audit trail (admin)

## Notes

- SQLite on Vercel `/tmp` is ephemeral — use for demos; move to Postgres for production shop data.
- Invoice edit/delete is not allowed — cancel + credit note only.
