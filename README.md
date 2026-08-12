# Prabhuratna Metals — Billing & Inventory ERP

POS billing, GST invoices, inventory, purchases, customers (udhaar), cashbook, and a public storefront for Prabhuratna Metals.

## Stack

- **Frontend:** React + Vite + Tailwind (`frontend/`)
- **Backend:** Express + better-sqlite3 (`backend/`)
- **Deploy:** Frontend on Vercel/custom domain; **API on Render with a persistent disk** (SQLite survives redeploys)

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

See `.env.example`.

### Production API (Render — keeps client data)

| Name | Example |
|------|---------|
| `DB_PATH` | `/var/data/database.sqlite` (persistent disk mount) |
| `JWT_SECRET` | strong random (`openssl rand -base64 48`) |
| `ALLOWED_ORIGINS` | `https://prabhuratna.in,https://www.prabhuratna.in` |
| `NODE_ENV` | `production` |

Attach a **Persistent Disk** on Render (mount `/var/data`). Without `DB_PATH`, data can be wiped on redeploy.

Frontend: set `VITE_API_URL` to your Render API URL + `/api`, then rebuild.

### Vercel-only /tmp (demos)

SQLite on Vercel `/tmp` is **ephemeral** — do not use for a live shop.

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

- **Never run the live shop API on Vercel serverless `/tmp`** — products and invoices will disappear. Use Render (or any VPS) with `DB_PATH` on a persistent disk (`render.yaml` included).
- Invoice edit/delete is not allowed — cancel + credit note only.
