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
