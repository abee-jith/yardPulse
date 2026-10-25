# YardPulse API

Versioned Express API for the YardPulse container and appointment portal.

## Run locally

1. Copy `.env.example` to `.env` and set the PostgreSQL connection, JWT secret,
   `DB_SCHEMA`, and the exact browser origin in `CORS_ORIGIN`.
2. Run `npm install`, then `npm run dev`. The server creates the configured
   schema, applies TypeORM migrations, and then starts listening on port 5000.
3. Run `npm run seed:dev` to create the three hashed-password seed users,
   vessel visits, 30 containers, holds, and events. The seed values are
   reproducible; event and discharge timestamps are relative to the seed date.

Set `SLOT_CAPACITY` to a positive integer; it defaults to 20. `JWT_EXPIRES_IN`
accepts seconds, minutes, or hours up to and including one hour. CORS reflects
only the one exact `CORS_ORIGIN` value, including in development.

## Authentication and API

`POST /api/v1/auth/login` returns a short-lived JWT and the current (not yet
rotatable) refresh token in JSON. The SPA uses the JWT as an `Authorization:
Bearer` token, so the API does not currently set a cookie; browser storage has
XSS risk, and a production deployment should prefer an `HttpOnly`, `Secure`,
`SameSite` cookie.

All other API endpoints require a valid bearer token:

- `GET /api/v1/me`
- `GET /api/v1/containers?q=&status=&has_active_hold=&limit=&cursor=`
- `GET /api/v1/containers/{container_no}`
- `POST /api/v1/appointments` with a UUID `Idempotency-Key` header
- `GET /api/v1/health` (public, includes a database connectivity check)

Customers are scoped to their `line_code` in list, detail, and booking queries.
Operators can work across all lines. Error responses use
`application/problem+json`; query/body/header validation problems include an
`errors` array. Container events and active holds are filtered/ordered by the
API, while booking results include the active appointment in the detail data.

## Database and tests

Schema changes are maintained in `src/migrations`; runtime schema
synchronization is disabled. The booking transaction serializes requests by
idempotency key, container, and slot, with a unique partial index protecting
the one-active-appointment rule.

`npm run test:integration` runs the API against PostgreSQL, not a mock. It reads
the connection settings from `.env` and creates/drops only a separate schema
whose name begins with `yardpulse_test_`; set `TEST_DB_SCHEMA` to use a
predictable test schema. Do not point this test schema setting at application
data.

Rate limiting is already enabled for API requests. Logout can be added by
revoking the caller's refresh-token record and clearing the browser session;
refresh can be added by validating and rotating the stored refresh-token hash,
then issuing a new short-lived access token.