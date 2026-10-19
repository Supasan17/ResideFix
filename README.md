# ResideFix

**Accommodation complaint tracker for hostels, apartments and boarding houses.**

Residents report maintenance problems (a leaking tap, broken Wi-Fi, a faulty gate lock) and follow them until they are fixed. Managers work through the complaints for their properties: they assign them, update the status and reply. Admins manage users and properties and see statistics across the whole system.

[![CI](https://github.com/Supasan17/ResideFix/actions/workflows/ci.yml/badge.svg)](https://github.com/Supasan17/ResideFix/actions/workflows/ci.yml)
[![Docker build](https://github.com/Supasan17/ResideFix/actions/workflows/docker.yml/badge.svg)](https://github.com/Supasan17/ResideFix/actions/workflows/docker.yml)
[![Deploy](https://github.com/Supasan17/ResideFix/actions/workflows/deploy.yml/badge.svg)](https://github.com/Supasan17/ResideFix/actions/workflows/deploy.yml)

Live client: https://supasan17.github.io/ResideFix/

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started (local)](#getting-started-local)
- [Running with Docker](#running-with-docker)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [API summary](#api-summary)
- [Testing](#testing)
- [CI/CD and deployment](#cicd-and-deployment)
- [Git workflow](#git-workflow)

## Features

| Role | What they can do |
| --- | --- |
| **Resident** | Sign up and pick their property, submit complaints (category, priority, room, photo links), track status, chat in the comment thread, edit or withdraw while still open, confirm a fix to close the complaint |
| **Manager** | See complaints for the properties they manage (plus anything assigned to them), filter by property/assignee, change status with timeline notes, assign to staff, reply, edit their property details |
| **Admin** | Everything above for every property, plus user management (role, property, delete), property CRUD and a statistics dashboard |

Also included:

- JWT authentication with role-based route protection (API and UI)
- Filters, keyword search, sorting (incl. by priority) and pagination
- Status timeline (who changed what, when, with notes) and average resolution time
- Loading, error and empty states, toast notifications, client- and server-side validation
- Responsive layout; HashRouter so the client works on GitHub Pages
- Helmet, CORS whitelist from env, rate limiting, centralised error handling, consistent JSON responses

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, Vite 5, React Router 6 (HashRouter), Axios |
| Backend | Node.js 22, Express 4, Mongoose 8, express-validator, JWT, bcryptjs, helmet, express-rate-limit, morgan |
| Database | MongoDB 7+ |
| Testing | Jest + Supertest + mongodb-memory-server (API), Vitest + React Testing Library (client) |
| Quality | ESLint 9 (flat config), Prettier, EditorConfig |
| DevOps | Docker, Docker Compose, nginx, GitHub Actions (CI, Docker build check, GitHub Pages CD) |

## Project structure

```
ResideFix/
├── .github/workflows/
│   ├── ci.yml              # lint + test both apps on every push/PR
│   ├── docker.yml          # build both images and smoke-test the stack
│   └── deploy.yml          # build the client and deploy to GitHub Pages
├── residefix-server/       # Express API
│   ├── src/
│   │   ├── app.js          # Express app (middleware, routes, error handling)
│   │   ├── server.js       # entry point: connect DB, start server
│   │   ├── config/         # env, db connection, enum constants
│   │   ├── models/         # User, Property, Complaint
│   │   ├── controllers/    # route handlers
│   │   ├── routes/         # routers mounted under /api
│   │   ├── middleware/     # auth/roles, validation, rate limit, errors
│   │   ├── validators/     # express-validator rule sets
│   │   ├── utils/          # ApiError, responses, pagination, access rules
│   │   └── scripts/seed.js # sample data
│   ├── tests/              # Jest + Supertest
│   └── Dockerfile
├── residefix-client/       # React app
│   ├── src/
│   │   ├── api/            # Axios instance + endpoint functions
│   │   ├── context/        # AuthContext, ToastContext
│   │   ├── components/     # Layout, ProtectedRoute, cards, charts, timeline...
│   │   ├── hooks/          # useComplaints (filters + pagination)
│   │   ├── pages/          # one file per page
│   │   ├── utils/          # validators, formatters, constants, session
│   │   └── test/           # Vitest + React Testing Library
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml      # mongo + server + client
└── package.json            # root helper scripts (run both apps together)
```

## Getting started (local)

### Prerequisites

- Node.js 20 or newer (22 recommended) and npm
- MongoDB running locally on `mongodb://127.0.0.1:27017` (or use Docker: `docker compose up -d mongo`)
- Git

### 1. Clone and configure

```bash
git clone https://github.com/Supasan17/ResideFix.git
cd ResideFix
cp residefix-server/.env.example residefix-server/.env
cp residefix-client/.env.example residefix-client/.env
```

On Windows PowerShell use `Copy-Item` instead of `cp`.

### 2. Install, seed and run

Option A: both apps from the root (one terminal)

```bash
npm install          # also installs residefix-server and residefix-client
npm run seed         # optional: sample users, properties and complaints
npm run dev          # API on :5000 and client on :5173
```

Option B: each app in its own terminal

```bash
cd residefix-server
npm install
npm run seed
npm run dev
```

```bash
cd residefix-client
npm install
npm run dev
```

Open http://localhost:5173. The API health check is at http://localhost:5000/api/health.

### Sample accounts (after `npm run seed`)

All use the password `password123`.

| Role | Email |
| --- | --- |
| Admin | admin@residefix.com |
| Manager (Sunrise Hostel, Green Leaf) | manager@residefix.com |
| Manager (Lakeview Apartments) | manager2@residefix.com |
| Resident | resident@residefix.com, resident2@residefix.com, resident3@residefix.com |

New sign-ups are residents. To sign up as a manager, tick "I am a property manager" and enter `MANAGER_SIGNUP_CODE` (default `residefix-manager`). Admins can change anyone's role in the admin panel.

## Running with Docker

```bash
docker compose up --build -d
docker compose exec server node src/scripts/seed.js   # optional sample data
```

| Service | URL |
| --- | --- |
| Client (nginx) | http://localhost:8080 |
| API | http://localhost:5000/api |
| MongoDB | internal only (`mongo:27017`) |

To deploy on an Ubuntu machine so other computers on the network can use it, follow [docs/DEPLOY_UBUNTU.md](docs/DEPLOY_UBUNTU.md).

Stop with `docker compose down` (add `-v` to also delete the database volume). For anything beyond local use, put `JWT_SECRET=...` and `MANAGER_SIGNUP_CODE=...` in a `.env` file next to `docker-compose.yml`.

## Environment variables

### `residefix-server/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `NODE_ENV` | `development` | `production` hides error details, `test` disables logging and rate limits |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/residefix` | MongoDB connection string |
| `JWT_SECRET` | dev-only value | Secret for signing tokens. **Required** in production |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `MANAGER_SIGNUP_CODE` | empty | Code that turns a sign-up into a manager account (empty disables it) |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated CORS whitelist (`*` allows all) |
| `RATE_LIMIT_MAX` | `300` | Requests per 15 minutes per IP for `/api` |
| `AUTH_RATE_LIMIT_MAX` | `30` | Login/register attempts per 15 minutes per IP |

### `residefix-client/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000/api` | Base URL of the API (baked in at build time) |

Real `.env` files are git-ignored; only the `.env.example` files are committed.

## Scripts

| Where | Command | What it does |
| --- | --- | --- |
| root | `npm install` | Installs the root tools and both apps |
| root | `npm run dev` | Runs API and client together |
| root | `npm run lint` / `npm test` | Lint / test both apps |
| server | `npm run dev` | API with auto-reload (nodemon) |
| server | `npm start` | API without reload (production) |
| server | `npm run seed` | Reset the database with sample data |
| server | `npm test` / `npm run test:coverage` | Jest tests (in-memory MongoDB, no local DB needed) |
| server | `npm run lint` / `npm run format` | ESLint / Prettier |
| client | `npm run dev` | Vite dev server on :5173 |
| client | `npm run build` / `npm run preview` | Production build / preview it |
| client | `npm test` | Vitest component and utility tests |
| client | `npm run lint` / `npm run format` | ESLint / Prettier |

## API summary

All endpoints are under `/api`. Send the token as `Authorization: Bearer <token>`.

Responses always use one of two shapes:

```json
{ "success": true, "message": "optional", "data": {}, "meta": { "page": 1, "limit": 10, "total": 42, "pages": 5 } }
{ "success": false, "message": "What went wrong", "errors": [{ "field": "email", "message": "A valid email is required" }] }
```

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | public | Service and database status |
| POST | `/auth/register` | public | Create account (resident, or manager with `managerCode`) |
| POST | `/auth/login` | public | Returns `{ token, user }` |
| GET | `/auth/me` | logged in | Current user |
| PATCH | `/auth/me` | logged in | Update profile / change password |
| GET | `/complaints` | logged in | List (scoped by role). Query: `status`, `category`, `priority`, `property`, `assignedTo` (`me`/`unassigned`/id), `q`, `sort` (`newest`/`oldest`/`updated`/`priority`), `page`, `limit` |
| POST | `/complaints` | logged in | Create a complaint |
| GET | `/complaints/:id` | owner / staff | Full complaint with comments and timeline |
| PUT/PATCH | `/complaints/:id` | owner (while open) / staff | Edit fields |
| DELETE | `/complaints/:id` | owner (while open) / admin | Delete |
| POST | `/complaints/:id/comments` | owner / staff | Add a comment |
| PATCH | `/complaints/:id/status` | staff (resident may close once resolved) | `{ status, note }` |
| PATCH | `/complaints/:id/assign` | manager / admin | `{ assignedTo: userId \| null }` |
| GET | `/properties` | public | List properties |
| GET | `/properties/mine` | manager / admin | Properties the user manages |
| GET | `/properties/:id` | public | One property |
| POST | `/properties` | admin | Create |
| PUT/PATCH | `/properties/:id` | admin / its manager | Update (only admin can change the manager) |
| DELETE | `/properties/:id` | admin | Delete (refused while complaints reference it) |
| GET | `/users` | admin | List users. Query: `role`, `q`, `page`, `limit` |
| GET | `/users/staff` | manager / admin | Managers and admins (for assignment) |
| GET/PATCH/DELETE | `/users/:id` | admin | Read, update (role, property...) or delete |
| GET | `/stats` | logged in | Counts by status/category/priority, average resolution hours, 14-day trend (admins also get user/property totals) |

"Staff" means an admin, or a manager whose property the complaint belongs to (or who it is assigned to).

## Testing

```bash
cd residefix-server && npm test    # 34 API tests: auth, complaints, properties, users, stats, health
cd residefix-client && npm test    # component, route-guard and utility tests
```

The API tests start an in-memory MongoDB (`mongodb-memory-server`), so they do not touch your local database. The first run downloads a MongoDB binary.

## CI/CD and deployment

Three GitHub Actions workflows live in `.github/workflows/`:

1. **CI** (`ci.yml`), on every push and pull request: installs, lints and tests the server (with coverage) and lints, tests and builds the client.
2. **Docker build** (`docker.yml`), on pushes to `main` and pull requests: validates `docker-compose.yml`, builds both images, starts the whole stack and checks the health endpoint and the client page.
3. **Deploy** (`deploy.yml`), on pushes to `main`: tests and builds the client and publishes it to GitHub Pages.

### Deploying the client to GitHub Pages

1. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. (Once the API is hosted) go to **Settings → Secrets and variables → Actions → Variables** and add `VITE_API_URL`, e.g. `https://residefix-api.onrender.com/api`.
3. Push to `main`. The site appears at `https://supasan17.github.io/ResideFix/`.

### Deploying the API

The API is a standard Node app (or the `residefix-server` Docker image), so it can run on Render, Railway, Fly.io, Azure App Service or a VM:

- Use MongoDB Atlas (or another hosted MongoDB) for `MONGO_URI`.
- Set `NODE_ENV=production`, a long random `JWT_SECRET`, your own `MANAGER_SIGNUP_CODE`.
- Set `CLIENT_ORIGIN=https://supasan17.github.io` so the Pages site may call it.
- Start command: `npm start`. Health check path: `/api/health`.

## Git workflow

- `main` is always deployable; it is what GitHub Pages serves.
- Work on short-lived branches: `feature/<name>`, `fix/<name>`, `chore/<name>`.
- Open a pull request into `main`; CI and the Docker build must pass before merging.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`).

## License

MIT, for educational use as a university DevOps Engineering group project.
