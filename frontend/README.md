# YardPulse frontend

The Next.js dashboard uses the backend API at `http://localhost:5000/api` by
default. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` if
the API is hosted elsewhere.

Run `npm install` and then `npm run dev` from this directory. The backend's
`CORS_ORIGIN` must be set to the exact frontend origin (for local development,
`http://localhost:3000`).

The backend does not currently expose an assistant endpoint, so the dashboard's
chat provides local guidance for container search, holds, and appointments.
