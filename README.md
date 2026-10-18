# SmartKart AI

SmartKart AI is a React/Vite retail inventory and billing application backed by FastAPI and SQLite.

## Local development

1. Install frontend packages with `npm install`.
2. Install backend packages with `python -m pip install -r requirements.txt`.
3. Copy `.env.example` to `.env` and, if live OpenRouter summaries are needed, set a private server-side API key and model in `.env`. Never put the key in a `VITE_` variable or browser code.
4. Start the API with `python -m uvicorn backend.main:app --reload`.
5. Start the frontend with `npm run dev`.

The frontend expects the API at `http://127.0.0.1:8000`. The API docs are available at `http://127.0.0.1:8000/docs`.

## Festival insights and OpenRouter

`OPENROUTER_API_KEY` is read only by the Python backend. `OPENROUTER_MODEL` is optional and defaults to `openai/gpt-4o-mini`. The key is not required to use festival cards: the backend uses the maintained `holidays` calendar dataset for dates and supplies safe inventory-based fallback recommendations when OpenRouter is not configured or unavailable. The AI summary is only supplementary; stock matches and quantities are computed from the authenticated store's inventory and sales, and recommendations never write to inventory.

Choose a state or union territory in **Settings → Festival region** to include supported regional holidays, or leave **General India** selected. Dates roll forward from the backend's current local date using the calendar package. Demand and reorder figures are estimates, and products with stock expiring during the preparation window are flagged.

## FEFO billing and test commands

Billing consumes eligible batches by earliest expiry date, with batch ID as a deterministic tie-breaker and batches without an expiry date last. Expired stock is not eligible. Invoice items and sales preserve each allocated batch's own selling and purchase prices. Invoice creation uses an immediate SQLite transaction so concurrent checkouts cannot oversell a batch; shortages return the available eligible quantity. Existing invoice and batch data are retained. On startup, the database adds the optional `region` preference column if needed.

Inventory batch discard is also transactional. Confirming a discard zeroes only the selected batch's remaining quantity and writes the quantity, reason, optional note, and timestamp to `inventory_adjustments`; other batches and sales/invoice history are unchanged. A zeroed batch remains visible with its prices and expiry details, but cannot be sold or counted as available stock. Product deletion is prevented when adjustment history exists.

Run the focused backend tests with:

```powershell
python -m unittest discover -s backend\tests
```

Run frontend checks with `npm run lint` and `npm run build`.

## Manual feature checks

- In **Settings**, toggle **AI suggestions** off and confirm the Assistant explains that it is disabled; the `/ai/festival-insights` endpoint should return HTTP 403. Toggle it on and refresh the page to reload date-based recommendations.
- Toggle **Auto reorder alerts** off and confirm reorder alerts disappear and `/products/reorder` returns HTTP 403. Turn it on and low-stock suggestions/notifications resume. Selecting a reorder action opens a stock-entry form with its quantity prefilled; no stock changes until the form is reviewed and submitted.
- Add two batches of one product with different expiry dates and prices. In Billing, set a quantity that spans both batches: the displayed quote should reflect both batch prices. Complete the bill and check Inventory, invoice details, Sales, and Reports for batch-level quantities and revenue/cost; the earlier-expiry batch should be depleted first.
