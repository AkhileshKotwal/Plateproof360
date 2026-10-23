# PlateProof 360

PlateProof 360 is a local food-safety traceability prototype. It connects a customer QR trust page to a kitchen incident workflow:

```text
order → QR → scan → complaint → incident → assign → proof → supervisor verifies → closed
```

## Architecture

- **Client:** React, Vite, Tailwind, React Router
- **API:** Node.js and Express REST API
- **Database:** SQLite through `better-sqlite3`, stored at `server/db/plateproof.db`
- **Optional sensor:** API-key-protected ESP32/probe endpoint at `POST /api/probe/reading`
- **Uploads:** proof images are stored in `server/uploads` and served at `/uploads`

## Setup

Prerequisites: Node.js 20+ (the current environment also works with Node 25).

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env

cd server
npm install
npm run db:reset

cd ..\client
npm install
```

## Environment variables

### `server/.env`

```env
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
PORT=4000
PROBE_API_KEY=replace-with-a-probe-key
```

### `client/.env`

```env
VITE_API_URL=http://localhost:4000
```

## Run

Terminal 1:

```powershell
cd server
npm start
```

Terminal 2:

```powershell
cd client
npm run dev
```

Open `http://localhost:5173`. Kitchen users start at `/login`; the customer QR route is `/o/<token>`.

For phone testing, find the laptop address with `ipconfig`, then set:

```env
# server/.env
CLIENT_URL=http://192.168.x.x:5173

# client/.env
VITE_API_URL=http://192.168.x.x:4000
```

Restart both processes after changing environment files. Vite is configured with `host: true`.

## Tests

```powershell
cd server
npm test
npm run db:reset
npm run test:curl

cd ..\client
npm run build
```

`npm run test:curl` performs a demo reset as part of its lifecycle checks, so do not run it between rehearsal and the pitch. Reset once on stage with the manager-only **Reset demo data** button.

The server smoke test covers QR/public order access, invalid tokens, complaint submission, role enforcement, assignment, multipart proof upload, verification, closing, customer status changes, and manager demo reset.

## Main API endpoints

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/demo-login` | Public demo login |
| POST | `/api/orders` | Public/staff demo order creation |
| GET | `/api/incidents` | Bearer token |
| GET | `/api/incidents/:id` | Bearer token |
| POST | `/api/incidents/:id/assign` | Staff, supervisor, manager |
| POST | `/api/incidents/:id/fix` | Staff, supervisor, manager; multipart proof |
| POST | `/api/incidents/:id/verify` | Supervisor only |
| POST | `/api/incidents/:id/reject` | Supervisor only |
| POST | `/api/incidents/:id/close` | Supervisor or manager |
| GET/POST | `/api/checklist`, `/api/checklist/log` | Bearer token |
| GET/POST | `/api/storage/items`, `/api/storage/scan` | Bearer token |
| POST | `/api/storage/:id/reading` | Bearer token |
| POST | `/api/demo/reset` | Manager; disabled in production |

## Known limitations

- Manual temperature entry is self-reported and traceable, but not sensor-verified.
- Allergen data is recipe-based and does not cover cross-contact.
- Authentication is demo-level JWT role switching, not full identity management.
- The prototype runs locally on SQLite. PostgreSQL is planned for production.
- Storage values are currently exposed for the demo monitor; production workflows should add stronger inventory controls.
