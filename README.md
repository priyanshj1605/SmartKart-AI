# SmartKart AI

**AI-Powered Retail Inventory, Billing & Business Insights Platform**

SmartKart AI is a retail management web application designed to help store owners manage inventory, process customer bills, track sales, monitor stock and expiry dates, and receive AI-assisted festival and seasonal business insights.

The application combines a React and Vite frontend with a FastAPI backend and SQLite database. It includes batch-level inventory management, expiry-aware billing, customer purchase history, reporting, and optional AI-generated summaries through OpenRouter.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Application Modules](#application-modules)
- [AI Assistant and Festival Insights](#ai-assistant-and-festival-insights)
- [Inventory Management and FEFO Billing](#inventory-management-and-fefo-billing)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Production Build](#production-build)
- [Deployment Notes](#deployment-notes)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)

---

## Project Overview

Retail stores often need to manage products, stock quantities, expiry dates, customer purchases, invoices, and daily sales using separate tools or manual records.

SmartKart AI brings these workflows into one application.

The system helps store owners:

- Maintain product and batch-level inventory.
- Generate bills and maintain invoice records.
- Track customers and their purchase history.
- Monitor available stock, low-stock products, and expiry risks.
- Review sales performance and business reports.
- Explore festival-based inventory recommendations.
- Use optional AI-generated summaries for retail decision support.

**Important:** AI recommendations are advisory. The application calculates inventory quantities from its store data, and recommendations do not automatically change stock or place purchase orders.

## Key Features

### 1. Dashboard
- Overview of important store metrics.
- Quick navigation to inventory, billing, sales, and other modules.
- Stock and sales information based on application data.

### 2. Inventory Management
- Create and manage products and inventory batches.
- Maintain product categories, suppliers, purchase prices, and selling prices.
- Track batch quantities and expiry dates.
- Identify low-stock and expiry-related risks.
- Discard expired or damaged stock through inventory adjustments.
- Maintain separate stock records for different batches of the same product.

### 3. Billing and Invoices
- Create bills for customer purchases.
- Maintain customer details and invoice records.
- Track paid and pending invoices where supported by the application.
- Allocate sold quantities across eligible inventory batches.
- Preserve batch-specific prices and invoice history.
- Prevent checkout from selling more eligible stock than is available.

### 4. Customer Management
- View customer information and purchase history.
- Search customers using supported customer details.
- Review visit counts, invoices, and purchase totals based on recorded transactions.

### 5. Sales and Reports
- Review sales and transaction information.
- Analyze revenue and purchase costs using recorded data.
- Access sales history for products and customers where supported.
- Use reports to understand store performance.

### 6. AI Assistant
- View upcoming festival and seasonal retail insights.
- Match relevant products from actual store inventory.
- Review eligible stock and expiry-related warnings.
- Access inventory and sales history from relevant recommendations.
- Use optional OpenRouter-generated summaries.
- Fall back to inventory-based recommendations when the AI service is unavailable or not configured.

### 7. Settings and Notifications
- Manage supported application preferences.
- Enable or disable AI suggestions and automatic reorder alerts.
- Receive relevant stock notifications according to configured settings.
- Configure the festival region where supported.

---

## Technology Stack

Component and Technology :-
Frontend :- React
Frontend tooling :- Vite Tailwind
Frontend language :- JavaScript / JSX 
Backend :- Python
Backend framework :- FastAPI 
Database :- SQLite
AI integration :- OpenRouter API (optional)
Festival calendar :- Python `holidays` package
API server :- Uvicorn

The exact package versions and available scripts are defined in the repository's dependency and configuration files.

## Application Architecture

SmartKart AI follows a frontend-backend architecture.

User -> React + Vite Frontend (HTTP API requests) -> FastAPI Backend [SQLite Database (Products and inventory batches, Customers and invoices, Sales and inventory adjustments)] -> Festival Calendar -> Optional OpenRouter API (AI-generated summaries)

The frontend handles the user interface and sends requests to the backend. The backend handles application logic, database operations, inventory calculations, and optional AI integration.

OpenRouter credentials must remain on the backend and must never be exposed in browser code.

## Project Structure

The repository may contain additional files as the project evolves. The following illustrates the main structure:

SmartKart-AI :- 
1. backend (main.py, database.py, security.py, ai_service.py, feature_flags.py, festivals.py, inventory.py)
2. public
3. src (assets/, components/, hooks/, layouts/, lib/, pages/, routes/, services/, store/, types/, utils/, App.jsx, App.css, index.css, main.jsx)
4. .gitignore
5. index.html
6. package.json
7. requirements.txt
8. README.md

**Note:** This is an illustrative structure based on the application's components. Check the actual repository before assuming every listed file exists.

---

## Prerequisites

Install the following before running the application:

- **Git** — to clone and manage the repository.
- **Node.js and npm** — to install and run the frontend.
- **Python 3** — to run the backend.
- **pip** — to install Python dependencies.

Check the installed versions:

```bash
git --version
node --version
npm --version
python --version
```

On some systems, use `python3` instead of `python`.

## Installation and Setup

### Step 1: Clone the repository

Replace the example URL with the actual URL of your GitHub repository.

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

### Step 2: Install frontend dependencies

Run this command from the project root:

```bash
npm install
```

### Step 3: Install backend dependencies

From the project root, run:

```bash
python -m pip install -r requirements.txt
```

If you prefer a virtual environment, create and activate one before installing the backend dependencies.

**Windows PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

**macOS/Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

### Step 4: Configure environment variables

Copy `.env.example` to `.env` and configure the variables required by the application.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Edit `.env` locally. Do not commit it to GitHub.

See [Environment Configuration](#environment-configuration) for details.

### Step 5: Start the backend

From the project root, run:

```bash
python -m uvicorn backend.main:app --reload
```

The backend should be available at:

`http://127.0.0.1:8000`

### Step 6: Start the frontend

Open a second terminal in the project root and run:

```bash
npm run dev
```

Open the local URL printed by Vite in the terminal, commonly:

`http://localhost:5173`

Keep both development servers running while using the application.

---

## Environment Configuration

The `.env.example` file should document the variables required by the backend. Keep the actual `.env` file private.

Example configuration for the optional OpenRouter integration:

```dotenv
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
```

- `OPENROUTER_API_KEY`: Optional private API key for generating AI summaries.
- `OPENROUTER_MODEL`: Optional model identifier. The example is a default and must be supported by OpenRouter at the time of use.


### Without an OpenRouter API key

Festival cards and inventory-based fallback recommendations can work without OpenRouter, according to the existing backend implementation. The live AI summary is supplementary and may be unavailable when the service is not configured or is unreachable.

---

## Running the Application

For local development, use two terminals.

**Terminal 1 — Backend**

```bash
python -m uvicorn backend.main:app --reload
```

**Terminal 2 — Frontend**

```bash
npm run dev
```

Then open the frontend URL shown by Vite.

The frontend is expected to communicate with the backend at:

`http://127.0.0.1:8000`

If the API address is configurable in the frontend, use the appropriate environment setting defined by the existing code.

---

## Application Modules

### Dashboard

The Dashboard provides an overview of important retail metrics and shortcuts to the main application modules. Its values should reflect recorded store data rather than fabricated figures.

### Inventory

Inventory stores product and batch information. Each batch can have its own quantity, expiry date, purchase price, and selling price.

When a batch is discarded, the application records an inventory adjustment. Other batches and historical sales should remain unaffected.

### Billing

Billing creates invoices and updates inventory using eligible batch allocations. The backend must validate stock availability before completing a sale.

### Customers

The Customers module displays customer details and purchase history derived from recorded transactions.

### Sales and Reports

These modules help review recorded transactions, revenue, costs, and other available business metrics.

### AI Assistant

The AI Assistant provides upcoming festival insights, product matching, stock eligibility information, and optional AI-generated summaries.

### Settings

Settings controls supported application preferences, including AI suggestions, reorder alerts, and festival-region configuration.

---

## AI Assistant and Festival Insights

SmartKart AI uses a maintained festival calendar to identify upcoming festivals and associate them with relevant retail products.

### Festival calendar

- Upcoming insights are intended to use a rolling date window.
- Regional coverage depends on the configured festival region and supported calendar data.
- Festival dates may vary by year, region, or lunar-calendar rules.
- The selected festival region can be configured in **Settings → Festival region**, where supported.
- Calendar entries should be verified against an appropriate source before being treated as definitive.

The `holidays` package provides the calendar data used by the current backend implementation. Coverage depends on the package's supported countries, regions, and holiday definitions.

### Matching inventory

Matching inventory should use actual products, stored categories, relevant product aliases, and festival-specific mappings.

For example, sweets or mithai may be relevant to Diwali even if a product is stored under a category such as Fresh Items or Dairy & Bakery.

The system should also consider:

- Active, sellable stock.
- Batch expiry dates.
- Discarded stock.
- The festival preparation window.
- Available store sales history.

Expired, discarded, or otherwise ineligible quantities must not be counted as available sellable inventory.

### AI-generated summaries

When configured, OpenRouter can generate supplementary natural-language summaries.

The backend computes stock matches and quantities from store data. AI-generated text should not replace those calculations or invent inventory figures.

If the AI service is unavailable, the application can use its fallback recommendation logic.

### Demand and reorder estimates

Demand and reorder recommendations are estimates, not guaranteed sales forecasts. Where store-specific sales history is insufficient, recommendations should be clearly identified as general guidance.

The AI Assistant does not automatically modify inventory or place orders.

---

## Inventory Management and FEFO Billing

SmartKart AI uses **FEFO (First Expiry, First Out)** allocation for eligible inventory batches.

### How FEFO works

1. The backend identifies eligible batches for the product.
2. Expired or otherwise ineligible stock is excluded.
3. Eligible batches are ordered by earliest expiry date.
4. Batch ID provides a deterministic tie-breaker where required.
5. Batches without an expiry date are placed after dated batches.
6. The requested quantity is allocated across batches until fulfilled or the eligible stock is exhausted.

If the requested quantity exceeds eligible stock, checkout should report the available eligible quantity rather than overselling.

### Batch-level prices

Each allocated invoice item and sale preserves the applicable batch's selling price and purchase price. This supports more accurate revenue and cost calculations when the same product has multiple batches with different prices.

### Transaction safety

Invoice creation uses an immediate SQLite transaction to reduce the risk of concurrent checkouts overselling the same batch.

### Discarding a batch

Discarding a batch is a transactional inventory adjustment.

According to the current implementation:

- Only the selected batch's remaining quantity is zeroed.
- The adjustment records the quantity, reason, optional note, and timestamp in `inventory_adjustments`.
- Other batches remain unchanged.
- Existing sales and invoice history is retained.
- A discarded batch cannot be sold or counted as available stock.
- Product deletion is prevented when adjustment history exists.

A zeroed batch may remain visible in inventory history or in the current interface, depending on the implemented display rules. Its presence must not cause it to be treated as sellable stock.

---

## API Documentation

The backend is built with FastAPI.

When the backend is running locally, interactive API documentation is available at:

- **Swagger UI:** http://127.0.0.1:8000/docs
- **ReDoc:** http://127.0.0.1:8000/redoc

Use these pages to inspect the actual endpoints, request schemas, response formats, and authentication requirements.

The AI festival-insights endpoint is:

`/ai/festival-insights`

When AI suggestions are disabled, this endpoint is expected to return HTTP `403`.

When automatic reorder alerts are disabled, the `/products/reorder` endpoint is expected to return HTTP `403`.

Check the current backend source and Swagger documentation for the complete endpoint list and supported request methods.

---

## Testing

### Backend tests

Run the focused backend test suite from the project root:

```bash
python -m unittest discover -s backend/tests
```

### Frontend lint

```bash
npm run lint
```

### Frontend production build

```bash
npm run build
```

The frontend commands depend on the scripts defined in `package.json`. If a script is missing, inspect the available scripts and update this documentation to match the actual project configuration.

### Manual feature checks

#### AI suggestions

1. Open Settings.
2. Disable AI suggestions.
3. Confirm the AI Assistant indicates that suggestions are disabled.
4. Verify that `/ai/festival-insights` returns HTTP `403`.
5. Enable AI suggestions again.
6. Refresh insights and verify the results.

#### Automatic reorder alerts

1. Disable Auto reorder alerts in Settings.
2. Verify that reorder alerts are disabled.
3. Confirm `/products/reorder` returns HTTP `403`.
4. Enable the feature again.
5. Check that low-stock suggestions and notifications resume.
6. Open a reorder action and verify that the stock-entry form is prefilled with the suggested quantity.
7. Confirm that no stock changes occur until the form is reviewed and submitted.

#### FEFO billing

1. Add two batches of the same product with different expiry dates and prices.
2. Ensure both batches have eligible stock.
3. Create a bill with a quantity that requires stock from both batches.
4. Verify that the earlier-expiring eligible batch is consumed first.
5. Check the quoted prices and final invoice allocations.
6. Verify Inventory, invoice details, Sales, and Reports.
7. Confirm that the application prevents sales beyond the eligible stock quantity.

#### Batch discard

1. Discard an expired or damaged batch.
2. Verify that the selected batch's stock is adjusted correctly.
3. Verify that other batches remain unchanged.
4. Refresh the application and verify the persisted adjustment.
5. Confirm that discarded stock is not available for billing.
6. Verify that historical invoices and sales remain intact.

---

## Production Build

Build the frontend using:

```bash
npm run build
```

Vite normally generates production frontend files in the `dist/` directory.

To preview the production frontend locally, use:

```bash
npm run preview
```

The preview server serves the frontend build. It does not automatically start or deploy the FastAPI backend.

For a working production deployment, configure the frontend to use the deployed backend URL and ensure the backend has its required environment variables, database access, CORS configuration, and persistent storage.

---

## Deployment Notes

SmartKart AI contains both a frontend and a backend. Deploying the frontend alone does not deploy the FastAPI API or its SQLite database.

### Frontend deployment

Platforms such as Vercel can host the Vite frontend.

Typical settings are:

- **Build command:** `npm run build`
- **Output directory:** `dist`

Confirm that these settings match the actual Vite configuration.

### Backend deployment

Deploy the FastAPI backend to a Python-compatible hosting environment.

The backend requires:

- Python dependencies from `requirements.txt`.
- Required environment variables.
- Correct frontend/API URL configuration.
- Appropriate CORS settings.
- Persistent storage for SQLite if SQLite is used in production.
- A deployment command compatible with the hosting platform.

The local command is:

```bash
python -m uvicorn backend.main:app --reload
```

For production, use the hosting platform's configured start command and do not use the development reload option.

### SQLite persistence

SQLite stores data in a database file. Ensure the deployment environment provides persistent storage and that the application has permission to read and write the database.

A temporary or ephemeral filesystem may cause data loss after a restart or redeployment. Confirm the storage behavior of your chosen hosting platform before deploying.

### Environment variables

Set secrets in the backend hosting platform's environment-variable settings. Never expose backend credentials in frontend build variables or public repository files.

---

## Security

Follow these practices when developing or deploying SmartKart AI:

- Never commit `.env` or private API keys.
- Keep OpenRouter credentials exclusively on the backend.
- Never place private keys in `VITE_` environment variables.
- Exclude `node_modules/`, `.venv/`, and generated build output from Git where appropriate.
- Do not publish a database containing real customer information or private store data.
- Use appropriate authentication and authorization for protected endpoints.
- Configure CORS for trusted frontend origins in production.
- Use HTTPS in production.
- Review logs to ensure they do not expose credentials or sensitive customer information.
- Rotate any API key that has been exposed publicly or committed to a repository.

Check `.gitignore` before pushing changes to GitHub.

---

## Troubleshooting

### Frontend cannot connect to the backend

- Confirm that the FastAPI server is running.
- Open http://127.0.0.1:8000/docs.
- Verify the API URL configured in the frontend.
- Check browser developer tools for failed requests and CORS errors.

### `requirements.txt` is missing

Run the installation command only after confirming the dependency file exists. If the project uses another dependency-management file, follow the repository's actual setup.

### OpenRouter summaries are unavailable

- Check the backend's `OPENROUTER_API_KEY` configuration.
- Confirm that the selected model is supported.
- Inspect backend logs for API errors.
- Remember that festival cards and fallback recommendations do not necessarily require OpenRouter.

### Database changes are not persisting

- Verify the database path used by the backend.
- Check filesystem permissions.
- Confirm that the deployment environment provides persistent storage.
- Inspect transaction errors in the backend logs.

### Frontend build fails

Run:

```bash
npm install
npm run lint
npm run build
```

Review the first meaningful error message and verify that the required packages and environment settings are available.

---

## Future Improvements

Potential future enhancements include:

- More comprehensive verified regional festival calendars.
- Better historical-sales-based demand forecasting.
- Improved product category and festival matching.
- Advanced supplier and purchase-order workflows.
- Additional analytics and reporting.
- Automated test coverage for inventory and billing edge cases.

These are potential improvements, not claims that the features are already implemented.

---

## Contributing

Contributions and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement and test your changes.
4. Ensure unrelated functionality is not broken.
5. Submit a pull request describing the changes.

Keep credentials, private customer data, local databases, virtual environments, and generated dependencies out of commits.

---

## License

No license is specified here. Add a `LICENSE` file and update this section once the project license has been decided.

---

**SmartKart AI — Smarter Inventory. Simpler Billing. Better Retail Decisions.**