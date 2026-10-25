# YardPulse backend

Versioned Express and PostgreSQL API for container search, container history,
holds, and gate appointments.

## Requirements

- Node.js 20 or newer
- PostgreSQL 15 or newer
- npm

## Local setup

Run these commands from `backend/`:

```sh
npm install
cp .env.example .env
```

Set the database credentials, `JWT_SECRET`, and `CORS_ORIGIN` in `.env`. Point
`CORS_ORIGIN` at the exact browser origin, such as `http://localhost:3000`.
`DB_SCHEMA` must be an existing or creatable PostgreSQL schema name; the
application creates it before applying migrations.

Start the API and seed its deterministic data:

```sh
npm run dev
npm run seed:dev
```

The API listens on port `5000` by default. Run `npm run build` to compile the
production server, then `npm start` to start the compiled application. The
server applies migrations before listening.

### Environment variables

| Variable         | Required | Description                                                                                        |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `NODE_ENV`       | Yes      | `development` or `production`.                                                                     |
| `PORT`           | No       | HTTP port; defaults to `5000`.                                                                     |
| `CORS_ORIGIN`    | Yes      | The single allowed frontend origin.                                                                |
| `DB_HOST`        | Yes      | PostgreSQL host.                                                                                   |
| `DB_PORT`        | Yes      | PostgreSQL port.                                                                                   |
| `DB_NAME`        | Yes      | Database name.                                                                                     |
| `DB_USER`        | Yes      | Database user.                                                                                     |
| `DB_PASSWORD`    | Yes      | Database password.                                                                                 |
| `DB_SCHEMA`      | Yes      | Schema for YardPulse tables, such as `public`.                                                     |
| `JWT_SECRET`     | Yes      | Secret used to sign and verify access tokens.                                                      |
| `JWT_EXPIRES_IN` | No       | Access-token duration in seconds, minutes, or hours; defaults to `1h`, and cannot exceed one hour. |
| `SLOT_CAPACITY`  | No       | Maximum booked appointments per slot; defaults to `20` and must be a positive integer.             |

The API reflects only the configured `CORS_ORIGIN`, including in development.
Environment files are local secrets and should not be committed.

## Seed data and test accounts

`npm run seed:dev` creates the seeded users with bcrypt-hashed passwords,
three vessel visits, 30 containers (10 per line), holds, and container events.
Fixed fixture container timestamps are interpreted in terminal time
(`Asia/Dubai`) and stored as UTC instants. Seed dates are relative to the seed
run; serial numbers and generated fixture values are deterministic.

| Email                  | Password        | Role     | Line      |
| ---------------------- | --------------- | -------- | --------- |
| `ops@yardpulse.test`   | `Operator#2026` | operator | All lines |
| `alice@atlasline.test` | `Customer#2026` | customer | ALN       |
| `bob@borealis.test`    | `Customer#2026` | customer | BRL       |

The fixed container fixtures include `ALNU1234567`, `ALNU7654321`,
`ALNU5550001`, and `BRLU0000017`. `ALNU7654321` has an active customs hold.

## API

All endpoints are under `/api/v1`. All endpoints except login and health require
`Authorization: Bearer <access-token>`.

| Method | Path                                | Authentication | Purpose                                                                             |
| ------ | ----------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `POST` | `/api/v1/auth/login`                | Public         | Verify email/password and return a short-lived access JWT.                          |
| `GET`  | `/api/v1/me`                        | Required       | Return the authenticated user, role, and line.                                      |
| `GET`  | `/api/v1/containers`                | Required       | Search and cursor-page containers.                                                  |
| `GET`  | `/api/v1/containers/{container_no}` | Required       | Return container detail, active holds, active appointment, and newest-first events. |
| `POST` | `/api/v1/appointments`              | Required       | Create an appointment; requires a UUID `Idempotency-Key` header.                    |
| `GET`  | `/api/v1/health`                    | Public         | Check API and database connectivity.                                                |

Container search accepts `q` (container-number prefix), `status`,
`has_active_hold=true|false`, `limit` (default `25`, maximum `100`), and
`cursor`. Pages are stably ordered by container ID; `page.next_cursor` is the
last returned ID to use for the next request. Customer line scope is enforced
by server queries for listing, detail, and booking. A request for another
line's container returns `404 not_found`; operators can access every line.

Create an appointment with a future, whole-hour `slot_start` including a
timezone offset and a `truck_plate` of up to 20 characters:

```http
POST /api/v1/appointments
Authorization: Bearer <access-token>
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "container_no": "ALNU1234567",
  "slot_start": "2026-10-27T08:00:00+04:00",
  "truck_plate": "DXB-12345"
}
```

Slots are 06:00–21:00 terminal time (`Asia/Dubai`) and have a configurable
capacity. Containers must be `IN_YARD`, have no active holds, and have no
existing booked appointment. Advisory transaction locks protect same-key
retries and slot capacity; a unique partial index and row lock protect the
one-active-appointment rule. The API records an `APPOINTMENT_BOOKED` event in
the same transaction as the appointment.

The policy module documents Friday/public-holiday restrictions for assistant
use. The API intentionally enforces the appointment rules listed above, not
the additional policy-calendar rules.

## Error response contract

API errors use `Content-Type: application/problem+json` and include `type`,
`title`, `status`, `code`, and `detail`. Validation errors use HTTP `400` and
also include `errors: [{ "field": "...", "message": "..." }]`.

For example, a full slot is returned as:

```json
{
  "type": "https://yardpulse.test/problems/slot-full",
  "title": "Slot is full",
  "status": 409,
  "code": "slot_full",
  "detail": "The 2026-10-22T08:00+04:00 slot has no remaining capacity."
}
```

Each error sets the HTTP response status to the same value as its `status`
member. Unexpected service errors are logged server-side in development; SQL,
driver details, and stack traces are not sent to clients.

| HTTP  | Code                     | Meaning                                                      |
| ----- | ------------------------ | ------------------------------------------------------------ |
| `400` | `validation_failed`      | Invalid body, query, header, or appointment slot.            |
| `401` | `unauthenticated`        | Credentials are missing, invalid, or expired.                |
| `404` | `not_found`              | The resource does not exist or is not visible to the caller. |
| `409` | `container_not_eligible` | Container is not in yard or has an active hold.              |
| `409` | `slot_full`              | No remaining appointment capacity for the requested slot.    |
| `409` | `appointment_exists`     | Container already has an active appointment.                 |
| `422` | `idempotency_key_reused` | Same user's key was reused with a different request.         |
| `500` | `internal_error`         | Unexpected server or database error.                         |

Same user, key, and request body returns the original status/body without
creating a second booking. Idempotency keys are stored in PostgreSQL and scoped
to their user. Rate limiting also returns a problem response when its limit is
reached.

## Authentication notes

Login returns a short-lived JWT in JSON, which the browser sends as a bearer
token; the API does not currently set an `HttpOnly` cookie. Browser storage of
a bearer token has XSS risk, so a production deployment should prefer a
`Secure`, `HttpOnly`, `SameSite` session cookie. Logout can revoke the user's
refresh-token record and clear the browser session. Refresh can validate and
rotate the stored refresh-token hash before issuing a new short-lived access
token.

## Database migrations

Migrations live in `src/migrations/`. Runtime synchronization is disabled;
the server creates the configured schema if needed and applies pending
migrations before accepting requests. The initial migration defines the
PostgreSQL schema, enum types, foreign keys, role/line and container-number
constraints, and appointment/idempotency indexes.

The initial migration is intended for a new YardPulse schema. Back up and
review existing data before using it against a schema previously created by
TypeORM synchronization; existing installations may need a dedicated
data-preserving migration first.

## Integration tests

Tests run against a real PostgreSQL instance, not a mocked repository:

```sh
npm run typecheck:test
npm run test:integration
```

They use the configured database connection, create a disposable schema named
`yardpulse_test_<pid>` (or the value of `TEST_DB_SCHEMA`), apply migrations,
seed fixtures, and drop only that test schema afterward. Never configure
`TEST_DB_SCHEMA` to point at application data. The suite covers idempotency
replay and key conflicts, ten parallel bookings with one seat remaining,
customer line isolation, operator-wide listing, cursor pagination, active-hold
filtering, validation responses, and same-container concurrent booking.

## Backend folder structure

```text
backend/
├── README.md
├── .env.example
├── package.json
├── docker-compose.yml
├── src/
│   ├── app.ts                       # Express app, health, API errors
│   ├── server.ts                    # Database initialization and listener
│   ├── common/
│   │   ├── enum.ts                  # Roles, lines, statuses, event types
│   │   ├── type.d.ts                # Shared request/response types
│   │   └── data/seed.data.ts        # Seed users, visits, containers, holds
│   ├── config/
│   │   ├── database.ts              # TypeORM and migration initialization
│   │   └── env.ts                   # Environment parsing and validation
│   ├── migrations/                  # PostgreSQL schema migrations
│   ├── middlewares/                 # Authentication, validation, CORS, limits
│   ├── modules/
│   │   ├── user/                    # Login, profile, user entity
│   │   ├── container/               # Search, detail, holds, history
│   │   └── appointment/             # Booking rules, transactions, entities
│   ├── routes/index.ts              # Versioned API route mounting
│   └── utils/                       # Problem responses and shared helpers
├── seeders/                         # Deterministic PostgreSQL seed tasks
└── test/
    └── api.integration.test.ts       # Real-PostgreSQL API coverage
```
