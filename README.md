# Telecom Demo Admin Portal

[![CI](https://github.com/tylerbeller/telecom-admin-portal/actions/workflows/ci.yml/badge.svg)](https://github.com/tylerbeller/telecom-admin-portal/actions/workflows/ci.yml)

A telecom user administration system built with Next.js and Spring Boot.

> **Demo use only:** This project uses generated sample data and an unauthenticated local API.
> Do not use real customer data or expose the application to the public internet.

## Features

- **Dashboard** - KPI cards and charts showing business metrics
- **Customer Management** - CRUD operations for subscriber accounts
- **Plan Management** - Service plan catalog (Basic, Standard, Premium, Unlimited, Family)
- **Device Inventory** - Track devices and SIM cards with assignment status
- **Usage Records** - View call, data, and SMS usage history
- **Support Tickets** - Customer service ticket management

## Tech Stack

**Frontend:**

- Next.js 16 with App Router
- React 19
- Tailwind CSS 4
- shadcn/ui components
- Recharts (via shadcn/ui)
- TypeScript

**Backend:**

- Spring Boot 4.0
- Java 21
- Gradle
- SQLite (auto-seeded with demo data)

## Getting Started

### Prerequisites

- Node.js 22+
- Java 21+
- pnpm

### Setup

```bash
pnpm setup    # Install deps + seed database with production-like data
```

Or install without seeding:

```bash
pnpm install
```

### Database Seeding

The Python seeder (`scripts/seed-database.py`) generates production-like data:

| Entity          | Count    |
| --------------- | -------- |
| Plans           | 8        |
| Customers       | 500      |
| Devices         | 600      |
| Usage Records   | ~220,000 |
| Support Tickets | 250      |

```bash
pnpm setup:db   # Run seeder
pnpm reset:db   # Delete DB + re-seed
```

Create a Python virtual environment and install the pinned seeder dependency:

```bash
python3 -m venv .venv          # Windows: py -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r scripts/requirements.txt
```

The seeder scripts locate the interpreter themselves (repo `.venv` first, then
`python3`/`python`/`py`), so `pnpm setup:db` and `pnpm reset:db` work on Windows
as well. The schema itself lives in the Flyway migration
(`backend/src/main/resources/db/migration/V1__init.sql`) and the seeder executes
that file, so the app and the seeder can never drift apart.

### Development

Run both frontend and backend:

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080

> The backend resolves its SQLite database from `TELECOM_DB_PATH` (default: `app.db` inside the `backend` directory when launched through the package scripts). All package scripts run on Windows, macOS, and Linux.

Or run separately:

```bash
pnpm dev:frontend   # Frontend only
pnpm dev:backend    # Backend only
```

The backend launcher uses the configured `JAVA_HOME` or resolves a local
Windows JDK installation without stopping other Java processes. When multiple
projects are running, verify this project’s services independently:

```powershell
Invoke-WebRequest http://localhost:8080/api/health
Invoke-WebRequest http://localhost:3000/api/health
```

### Testing

```bash
pnpm test           # All tests
pnpm test:frontend  # Vitest
pnpm test:backend   # Gradle test
pnpm test:e2e       # Full Playwright browser suite
```

### Linting

```bash
pnpm lint
```

## Repository conventions

`AGENTS.md` is the working contract for anyone (human or agent) changing this
repo: setup, gates, and the non-negotiables learned from past defects. The API
contract is checked in at `docs/api/openapi.json` with a drift test keeping it
honest, and operational runbooks live in `docs/runbooks/`.

## Application Pages

| Page      | URL          | Description           |
| --------- | ------------ | --------------------- |
| Dashboard | `/dashboard` | KPIs and charts       |
| Customers | `/customers` | Subscriber management |
| Plans     | `/plans`     | Service plan catalog  |
| Devices   | `/devices`   | Device/SIM inventory  |
| Usage     | `/usage`     | Usage records         |
| Tickets   | `/tickets`   | Support tickets       |

## API Endpoints

| Endpoint           | Methods                | Description          |
| ------------------ | ---------------------- | -------------------- |
| `/api/health`      | GET                    | Health check         |
| `/api/customers`   | GET, POST, PUT, DELETE | Customer CRUD        |
| `/api/plans`       | GET, POST, PUT, DELETE | Plan CRUD            |
| `/api/devices`     | GET, POST, PUT, DELETE | Device CRUD          |
| `/api/usage`       | GET                    | Usage records        |
| `/api/tickets`     | GET, POST, PUT, DELETE | Ticket CRUD          |
| `/api/dashboard/*` | GET                    | Dashboard statistics |

### Paginated collections

`/api/customers`, `/api/devices`, `/api/tickets`, and `/api/usage` are paginated
rather than returning whole tables. They accept `page` (0-based) and `size`
(clamped server-side), plus per-resource filters — `search` and `status` on
customers and devices. Customers also accept `sort`: `NAME_ASC`, `NAME_DESC`,
`PLAN_ASC`, `PLAN_DESC`, `STATUS_ASC`, `STATUS_DESC`, `BALANCE_ASC`, or
`BALANCE_DESC` (default `NAME_ASC`). Tickets accept `priority`, `status`,
`customerId`, customer-name `search`, and inclusive `dateFrom`/`dateTo`
(`YYYY-MM-DD`) filters. They respond with:

The Support Tickets page also provides separate read-only lookups for Customer ID
and Ticket ID. Customer lookup displays the account summary; Ticket ID lookup
displays the matching ticket summary and never opens the edit form. Both fields
support the Look up button and Enter key, and show validation or not-found
messages without changing data.

```json
{ "content": [], "page": 0, "totalPages": 25, "totalElements": 500, "hasNext": true }
```

Errors use a single envelope from the global exception handler, so validation
failures come back as `400` with the offending fields:

```json
{
  "error": "Validation failed",
  "message": "Some fields are missing or invalid",
  "fields": { "email": "must not be blank" }
}
```

Note the deliberate asymmetry in field naming: responses use `snake_case`
(`plan_name`, `sim_number`) while request bodies use `camelCase` (`planId`,
`simNumber`). Both sides are typed in `hooks/*.ts`, so keep new endpoints
consistent with that convention instead of mixing styles per resource.

## API Documentation

Start the backend, then open the Swagger UI at
`http://localhost:8080/swagger-ui.html`.

## Project Structure

```
├── app/                    # Next.js pages
│   ├── dashboard/          # Dashboard with KPIs/charts
│   ├── customers/          # Customer management
│   ├── plans/              # Plan management
│   ├── devices/            # Device inventory
│   ├── usage/              # Usage records
│   └── tickets/            # Support tickets
├── backend/                # Spring Boot backend
│   └── src/main/java/com/example/telecom/
│       ├── model/          # JPA entities
│       ├── repository/     # Spring Data repos
│       └── controller/     # REST controllers
├── scripts/                # Utility scripts
│   ├── seed-database.py    # Production-like data seeder
│   └── requirements.txt    # Python dependencies
├── components/             # React components
│   └── ui/                 # shadcn/ui components
├── hooks/                  # Custom React hooks
└── lib/                    # Utilities
```

## License

No open-source license is granted. See `LICENSE`.
