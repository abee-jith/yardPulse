# YardPulse frontend

Next.js App Router frontend for searching containers and booking gate
appointments with the YardPulse API.

## Requirements

- Node.js 20 or newer
- npm
- YardPulse backend and PostgreSQL running

## Run locally

From `frontend/`, install dependencies and configure the backend URL:

```sh
npm install
cp .env.example .env.local
npm run dev
```

The development server runs at `http://localhost:3000`. Set
`NEXT_PUBLIC_API_URL` to the backend API base URL, including `/api`; the
included example points to `http://localhost:4000/api`. The backend's
`CORS_ORIGIN` must exactly match the frontend origin, for example
`http://localhost:3000`.

For a production build:

```sh
npm run typecheck
npm run build
npm start
```

## Features

- `/login` sends the email and password to `POST /api/v1/auth/login` and keeps
  the returned access JWT in browser local storage.
- `/` checks the token with `GET /api/v1/me`; missing credentials redirect to
  `/login`. Requests include the token as a bearer credential.
- Container search is debounced and supports the backend's canonical status
  values and active-hold filter. React Query requests cursor-based pages and
  exposes a Load more action.
- Selecting a container loads its status, yard location, active holds,
  appointments, vessel-visit information, and events. Events are shown newest
  first.
- The booking form offers Dubai-local dates and whole-hour slots from 06:00
  through 21:00. It is disabled when the container is not in the yard, has an
  active hold, or already has a booked appointment. The API remains
  authoritative for eligibility and booking validation.
- Booking generates one UUID `Idempotency-Key` for each submitted attempt and
  uses a synchronous in-flight guard to prevent double-click submissions. The
  React Query cache is updated and refreshed after booking without reloading
  the page.
- Loading, empty, and retryable error states are included. RFC 9457
  `application/problem+json` errors display their `title` or `detail`.
- The assistant panel provides local guidance about search, holds, and
  booking. The backend currently has no assistant endpoint, so this chat does
  not answer questions from live container records or policy documents.

API and chat responses are rendered as ordinary React text; the frontend does
not use `dangerouslySetInnerHTML`.

## Authentication note

The backend returns a bearer JWT in the login response, so this SPA stores it
in `localStorage` and attaches it to API requests. This is convenient for the
assessment but carries XSS exposure. A production deployment should prefer a
backend-managed `Secure`, `HttpOnly`, `SameSite` cookie and suitable CSRF
protection.

## Folder structure

```text
frontend/
├── README.md
├── .env.example
├── package.json
├── package-lock.json
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── app/
│   ├── globals.css            # Tailwind import and global tokens
│   ├── layout.tsx             # App Router root layout and metadata
│   ├── providers.tsx          # Shared TanStack Query client
│   ├── login/
│   │   └── page.tsx           # Login form
│   └── page.tsx               # Protected container dashboard
└── lib/
    └── api.ts                 # API client, bearer auth, problem errors
```

## API contract used

The frontend expects the backend at `NEXT_PUBLIC_API_URL` and calls:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/auth/login` | Sign in and receive the access token. |
| `GET` | `/v1/me` | Validate the current session. |
| `GET` | `/v1/containers` | Search, filter, and cursor-page containers. |
| `GET` | `/v1/containers/{container_no}` | Load container detail and activity. |
| `POST` | `/v1/appointments` | Book with an `Idempotency-Key` UUID header. |

The full backend API and seed-account instructions are in
[`../backend/README.md`](../backend/README.md).
