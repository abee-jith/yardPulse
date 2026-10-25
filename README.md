# YardPulse monorepo

This repository contains the Express/PostgreSQL backend and the Next.js frontend.
Start and configure the backend first; the frontend needs its API URL and the
backend must allow the frontend's origin through CORS.

## Requirements

- Node.js 20 or newer and npm
- PostgreSQL with a database and a user that can create/use the configured
  schema
- The environment configuration supplied with the assessment/submission

## Environment setup

Environment files are local and ignored by Git. Do not paste environment
secrets into this README, source files, or commits.

1. Create the backend environment file:

   ```sh
   cp backend/.env.example backend/.env
   ```

   Copy the backend variables and values from the provided submission
   environment into `backend/.env`. Required settings include the PostgreSQL
   connection (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`),
   `DB_SCHEMA`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, and `NODE_ENV`.
   Use the frontend's exact browser origin for `CORS_ORIGIN`, normally
   `http://localhost:3000`.

2. Create the frontend environment file:

   ```sh
   cp frontend/.env.example frontend/.env.local
   ```

   Set `NEXT_PUBLIC_API_URL` from the provided frontend environment. It must
   point to the backend API base URL, including `/api`. For example, if the
   backend listens on port `4000`, use
   `NEXT_PUBLIC_API_URL=http://localhost:4000/api`. Do not copy database
   credentials or `JWT_SECRET` into the frontend environment.

The `.env.example` files contain templates/defaults, not the private values
from the submission environment. If the submission provides a different port
or origin, make both environment files agree.

## Install and run

Install and start the backend first:

```sh
cd backend
npm install
npm run dev
```

The backend initializes the configured PostgreSQL schema and applies pending
migrations before listening. Keep this terminal running. In another terminal,
seed the local database once:

```sh
cd /path/to/yardPulse/backend
npm run seed:dev
```

The seed script creates the assessment accounts, vessel visits, containers,
holds, and events with bcrypt-hashed passwords.

After the backend is running, install and start the frontend in a second
terminal:

```sh
cd /path/to/yardPulse/frontend
npm install
npm run dev
```

Open `http://localhost:3000`. If a terminal reports `uv_cwd`, its current
working directory no longer exists; open a new terminal and `cd` to the
repository's `backend/` or `frontend/` directory before running npm.

## Local seed accounts

| Email                  | Password        | Role     | Line      |
| ---------------------- | --------------- | -------- | --------- |
| `ops@yardpulse.test`   | `Operator#2026` | Operator | All lines |
| `alice@atlasline.test` | `Customer#2026` | Customer | ALN       |
| `bob@borealis.test`    | `Customer#2026` | Customer | BRL       |

Use these only in the local seeded development database.

## Project structure

```text
yardPulse/
├── README.md
├── answers.md
├── .gitignore
├── backend/
│   ├── README.md
│   ├── .env.example
│   ├── package.json
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── common/
│   │   ├── middlewares/
│   │   ├── migrations/
│   │   ├── modules/
│   │   │   ├── appointment/
│   │   │   ├── container/
│   │   │   └── user/
│   │   ├── routes/
│   │   └── utils/
│   ├── seeders/
│   └── test/
└── frontend/
    ├── README.md
    ├── .env.example
    ├── package.json
    ├── app/
    │   ├── login/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    └── lib/
```

For component-specific documentation, see the [backend README](./backend/README.md)
for API, migration, and integration-test instructions, and the
[frontend README](./frontend/README.md) for the dashboard and client API calls.

## Assistant status

The dashboard includes an assistant chat panel, but it is not connected to an
AI service, live container data, or policy documents. The current UI responds
with local help text only. AI assistant integration was not completed within
the available time.

## Useful checks

Run each command from the corresponding project directory:

```sh
cd backend
npm run build
npm run typecheck:test
npm run test:integration
```

```sh
cd frontend
npm run typecheck
npm run build
```

## Assessment handoff

### 1. Run, test, and log in

Follow the environment setup and backend-first startup steps above. Start
PostgreSQL, configure `backend/.env` and `frontend/.env.local`, then install and
run the backend before starting the frontend. Run `npm run seed:dev` from
`backend/` to load the local accounts and sample containers. Open
`http://localhost:3000` and sign in with one of the local accounts in the
[seed accounts table](#local-seed-accounts).

Run the backend checks against PostgreSQL from `backend/`:

```sh
npm run build
npm run typecheck:test
npm run test:integration
```

The integration suite creates and drops a separate `yardpulse_test_*` schema.
Keep `TEST_DB_SCHEMA` separate from any schema containing data you need. Run
the frontend checks from `frontend/`:

```sh
npm run typecheck
npm run build
```

### 2. Booking idempotency and slot capacity

The frontend creates one UUID idempotency key when the user submits a booking
attempt and blocks rapid duplicate clicks. The backend scopes keys to the
authenticated user, hashes the request body, and stores the response with the
key in the same database transaction as the booking; replaying the same key
and body returns the stored response, while reusing the key with a different
body returns `422`. The frontend does not retain a key after a failed request,
so a separate manual retry gets a new key; the backend's one-active-appointment
rule still prevents a second active booking for that container.

A retry of the same request must reuse its original key to receive the exact
original response. The no-overbooking guarantee depends on all appointment
writers using the same transaction and PostgreSQL database; direct SQL,
another service that skips the slot lock, or splitting booking writes across
independent databases could bypass it.

To prevent overbooking, the backend takes a PostgreSQL transaction-level
advisory lock for the requested slot, counts existing booked appointments, and
inserts only if capacity remains. The integration tests cover replay and ten
concurrent bookings competing for one remaining seat.

### 3. Assistant and customer data scope

The current assistant panel is only a local help-text placeholder; it does not
query containers or answer live-data questions, so it currently has no
assistant data-access path to scope. For a live assistant, requests must use
the signed-in user's identity from the verified server-side authentication
context and retrieve data through the same line-scoped backend services used
by search and detail. The assistant must never rely on a line code supplied in
the prompt, and should only receive the records that user is authorized to
see.

### 4. Logout, refresh, and rate limiting

Logout should revoke the stored refresh token and clear the client's
credentials; refresh should validate and rotate a hashed, single-use refresh
token, revoke the previous token, and issue a new short-lived access token.
The backend already applies a global per-client rate limit of 100 requests
per 15 minutes, but it should be supplemented with stricter login and refresh
limits and a shared store such as Redis when running multiple server
instances.

### 5. Cuts and next steps

The live AI assistant and policy-aware answers were cut; the existing panel
does not use live container data or policy documents. With another day, I
would implement a server-side assistant that uses authenticated, line-scoped
queries and policy retrieval, then add tests for cross-line prompts, tool
results, and refusal behavior. I would also add logout and refresh endpoints
with token rotation and lifecycle tests.

### 6. Time and AI usage

**Time spent:** approximately 7 hours total, including understanding the
requirements, implementation, testing, and documentation.

**AI usage:** AI assistance was used during development to help understand the
requirements, implement and troubleshoot parts of the application, and draft
documentation. The resulting code and documentation were reviewed and
validated against the repository and its available checks; AI output was not
treated as a substitute for testing.
