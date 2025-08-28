# Restaurant Order Trends – Full-Stack (React + PHP)

This repo contains a **React (Vite)** frontend and a **PHP** backend that reads `restaurants.json` and `orders.json` and exposes APIs with filtering, aggregation, caching and pagination.

## Features
- List/search/sort/filter restaurants with pagination.
- Per-restaurant dashboard with:
  - Daily Orders count
  - Daily Revenue
  - Average Order Value
  - Peak Order Hour per day
- Top 3 Restaurants by Revenue for the current filters/date range.
- Query filters: **restaurant, date range, amount range, hour range**.
- Simple **file cache** (5 min TTL) for metrics endpoints.
- CORS enabled.
- Local proxy to avoid CORS during dev.

## API
### `GET /api/restaurants`
Query params: `q, cuisine, location, sort=name|location|cuisine, page, limit`

### `GET /api/metrics`
Query params: `restaurant_id (optional), start_date, end_date, amount_min, amount_max, hour_min, hour_max`  
Returns:
```json
{ "daily": [ { "date": "YYYY-MM-DD", "orders": 0, "revenue": 0, "avg_order_value": 0, "peak_order_hour": 13 } ], "top3": [ { "restaurant_id": 101, "revenue": 12345 } ] }
```

## Run locally
### Backend (PHP built-in server)
```bash
cd backend
php -S localhost:8000 -t .
```
This serves the API at `http://localhost:8000` (e.g., `http://localhost:8000/api/health`).

### Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
```
The Vite dev server is at `http://localhost:5173` and proxies `/api` to `http://localhost:8000`.

## Production build
```bash
cd frontend
npm run build
npm run preview
```

## Notes
- Datasets are under `backend/`. You can replace them with larger ones; the code aggregates on the fly and caches results for 5 minutes.
- For Apache/Nginx, point `/api/*` to `backend/index.php` or configure a reverse proxy to the PHP service.
- If you previously saw **Failed to fetch**, ensure the PHP server runs on `8000` and that the Vite proxy is active.
