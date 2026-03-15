# College Events Platform

A full-stack, multi-portal web application for managing college events — from faculty creation and superadmin approval to student discovery and registration.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Seeding the Database](#seeding-the-database)
- [Running the Application](#running-the-application)
- [Portal URLs & Credentials](#portal-urls--credentials)
- [API Overview](#api-overview)
- [Data Models](#data-models)
- [Auth Flow](#auth-flow)
- [College Workflow](#college-workflow)
- [Event Workflow](#event-workflow)
- [Deployment](#deployment)
- [Utility Scripts](#utility-scripts)
- [Known Constraints](#known-constraints)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Clients                       │
│                                                             │
│  Student Portal   Faculty Portal   Superadmin Portal        │
│  :5173            :5174             :5175                   │
│  (React + Vite)   (React + Vite)   (React + Vite)          │
└────────────┬───────────────┬───────────────┬────────────────┘
             │  /api proxy   │               │
             └───────────────▼───────────────┘
                    ┌─────────────────┐
                    │  Express Server │  :5000
                    │  Node.js + JWT  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    MongoDB      │
                    │  (standalone)   │
                    └─────────────────┘
```

Each frontend proxies `/api` and `/uploads` to the Express server at port 5000. There is no separate gateway — the Vite dev server handles the proxy in development, and a reverse proxy (nginx/Caddy) handles it in production.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, TanStack Query v5, Zustand, React Hook Form, Zod, Axios |
| Backend | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB (standalone — no replica set required) |
| Auth | JWT (access + refresh token rotation), httpOnly cookies |
| File uploads | Multer (disk storage) |
| Caching | node-cache (in-memory) |
| Logging | Winston + winston-daily-rotate-file |
| Scheduling | node-cron (deadline reminders) |
| Security | Helmet, express-rate-limit, express-mongo-sanitize, xss, bcryptjs |

---

## Project Structure

```
mvp/
├── server/                  # Express API
│   ├── config/              # env validation, db connection, cache config
│   ├── controllers/         # route handlers (auth, admin, college, event, ...)
│   ├── middleware/          # auth, rate limiting, upload, validation, error handler
│   ├── models/              # Mongoose schemas (User, College, Event, Registration, ...)
│   ├── routes/              # Express routers
│   ├── seed/                # Database seed scripts
│   ├── services/            # notification, analytics, fileManager
│   ├── uploads/             # Uploaded files (gitignored in production)
│   ├── utils/               # ApiError, ApiResponse, logger, generateToken
│   ├── jobs/                # Cron jobs (deadline reminders)
│   ├── .env.example         # Environment variable template
│   ├── app.js               # Express app setup
│   └── server.js            # HTTP server entry point
│
├── student-portal/          # Student-facing React app  (:5173)
├── faculty-portal/          # Faculty-facing React app  (:5174)
├── superadmin-portal/       # Admin React app           (:5175)
│
├── shared/                  # Design tokens and Tailwind preset shared across portals
├── start.bat                # One-click Windows dev launcher
└── README.md
```

Each portal follows the same internal structure:

```
<portal>/src/
├── api/          # axios instance + typed service functions
├── components/   # shared UI components (Button, Input, PageHeader, ...)
├── hooks/        # useAuth (login, logout, restoreSession)
├── pages/        # route-level page components
├── store/        # Zustand auth store
└── styles/       # global CSS, design tokens
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18 or higher |
| npm | 9 or higher |
| MongoDB | 6 or higher (standalone, no replica set needed) |

MongoDB must be running locally on `mongodb://localhost:27017` before starting the server, or you must supply a remote `MONGO_URI` in `.env`.

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd mvp
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
```

Open `server/.env` and set at minimum:

```env
MONGO_URI=mongodb://localhost:27017/college_events
JWT_ACCESS_SECRET=<64-char random hex>
JWT_REFRESH_SECRET=<64-char random hex>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Install dependencies

```bash
# Server
cd server && npm install && cd ..

# Portals
cd student-portal    && npm install && cd ..
cd faculty-portal    && npm install && cd ..
cd superadmin-portal && npm install && cd ..
```

### 4. Seed the superadmin account

```bash
cd server && npm run seed
```

This creates (or resets) the superadmin user using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

### 5. Start all services

**Windows (one command):**

```bat
start.bat
```

This opens four terminal windows — one per service — and waits 5 seconds for the server before launching the portals.

**Manual (any OS):**

```bash
# Terminal 1 — API server
cd server && npm run dev

# Terminal 2 — Student portal
cd student-portal && npm run dev

# Terminal 3 — Faculty portal
cd faculty-portal && npm run dev

# Terminal 4 — Superadmin portal
cd superadmin-portal && npm run dev
```

---

## Environment Variables

All variables live in `server/.env`. The full reference is in `server/.env.example`.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express server port |
| `NODE_ENV` | `development` | `development` \| `production` |
| `MONGO_URI` | `mongodb://localhost:27017/college_events` | MongoDB connection string |
| `MONGO_POOL_SIZE` | `10` | Mongoose connection pool size |
| `JWT_ACCESS_SECRET` | — | **Required.** 64-char random hex |
| `JWT_REFRESH_SECRET` | — | **Required.** Different 64-char random hex |
| `JWT_ACCESS_EXPIRES` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh token lifetime |
| `CLIENT_ORIGIN` | `http://localhost:5173,...` | Comma-separated allowed CORS origins |
| `BASE_URL` | `http://localhost:5000` | Server base URL (used in links) |
| `UPLOAD_PATH` | `uploads` | Directory for uploaded files (relative to server root) |
| `MAX_FILE_SIZE_MB` | `10` | Per-file upload limit in MB |
| `RATE_LIMIT_MAX_AUTH` | `10` | Max auth requests per 15-minute window |
| `RATE_LIMIT_MAX_API` | `100` | Max API requests per 15-minute window |
| `LOG_LEVEL` | `debug` | Winston log level |
| `ADMIN_EMAIL` | — | Superadmin email (used by seed script) |
| `ADMIN_PASSWORD` | — | Superadmin password (used by seed script) |
| `BRUTE_MAX_ATTEMPTS` | `5` | Failed login attempts before lockout |
| `BRUTE_LOCKOUT_MS` | `1800000` | Lockout duration (30 min) |

> In `NODE_ENV=development`, rate limiting and brute-force lockout are **disabled** automatically.

---

## Seeding the Database

### Create / reset superadmin

```bash
cd server
npm run seed
# or: node seed/admin.seed.js
```

### Fix a faculty user's role

If a faculty member accidentally registered via the student portal and has `role: 'student'`:

```bash
cd server
node seed/fix-faculty-role.js their@email.com
```

---

## Running the Application

### Development

```bash
cd server && npm run dev        # nodemon, auto-restarts on changes
```

### Production

```bash
cd server && npm start          # plain node, no file watching
```

For production, build the frontend portals and serve them via nginx (see [Deployment](#deployment)).

---

## Portal URLs & Credentials

| Portal | URL | Role |
|---|---|---|
| Student Portal | http://localhost:5173 | `student` |
| Faculty Portal | http://localhost:5174 | `faculty` |
| Superadmin Portal | http://localhost:5175 | `superadmin` |
| API Server | http://localhost:5000 | — |
| Health Check | http://localhost:5000/health | — |

**Default superadmin login** (after running seed):

```
Email:    admin@example.com   (or whatever ADMIN_EMAIL is set to)
Password: admin123            (or whatever ADMIN_PASSWORD is set to)
```

Each portal enforces its own role — logging into the faculty portal with a student account will be rejected at the client and server level.

---

## API Overview

All routes are prefixed with `/api`. Authentication uses a Bearer token in the `Authorization` header (set automatically by the Axios interceptor after login).

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login, returns access token + sets refresh cookie |
| POST | `/auth/register` | Public | Register student account |
| POST | `/auth/register/faculty` | Public | Register faculty account (forces `role: faculty`) |
| POST | `/auth/refresh` | Cookie | Rotate refresh token, return new access token |
| POST | `/auth/logout` | Token | Invalidate refresh token |

### Users — `/api/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Token | Get current user profile |
| PUT | `/users/me` | Token | Update profile |

### Colleges — `/api/colleges`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/colleges` | Token | List colleges |
| POST | `/colleges` | Faculty | Submit new college for approval |
| GET | `/colleges/my` | Faculty | Get the college created by the current faculty |
| PATCH | `/colleges/my/edit` | Faculty | Submit an edit request for a verified college |
| GET | `/colleges/:id` | Token | Get college by ID |
| PUT | `/colleges/:id` | Faculty / Superadmin | Direct update (superadmin only in practice) |

### Events — `/api/events`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/events` | Token | List/search events |
| POST | `/events` | Faculty | Create event (status: pending) |
| GET | `/events/:id` | Token | Get event detail |
| PUT | `/events/:id` | Faculty | Update event |
| DELETE | `/events/:id` | Faculty | Delete event |
| GET | `/events/analytics/summary` | Faculty | Faculty analytics summary |
| GET | `/events/:id/analytics` | Faculty | Per-event analytics |

### Registrations — `/api/registrations`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/registrations/:eventId` | Student | Register for event |
| DELETE | `/registrations/:eventId` | Student | Cancel registration |
| GET | `/registrations/events/:id/attendees` | Faculty | List attendees |
| PUT | `/registrations/events/:id/close` | Faculty | Close registration |
| GET | `/registrations/events/:id/export` | Faculty | Export attendees as CSV |

### Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Token | Get notifications (paginated) |
| PATCH | `/notifications/:id/read` | Token | Mark one as read |
| PUT | `/notifications/read-all` | Token | Mark all as read |
| DELETE | `/notifications/:id` | Token | Delete notification |

### Admin — `/api/admin` (Superadmin only)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/colleges/pending` | List colleges by verification status |
| GET | `/admin/colleges/pending-edits` | List colleges with pending edit requests |
| GET | `/admin/colleges/:id/profile` | Get full college profile |
| PATCH | `/admin/colleges/:id/verify` | Verify a college |
| PATCH | `/admin/colleges/:id/reject` | Reject a college (reason required) |
| PATCH | `/admin/colleges/:id/approve-edit` | Approve a college edit request |
| PATCH | `/admin/colleges/:id/reject-edit` | Reject a college edit request (reason required) |
| GET | `/admin/events/pending` | List events by status |
| PATCH | `/admin/events/:id/approve` | Approve an event |
| PATCH | `/admin/events/:id/reject` | Reject an event (reason required) |
| PUT | `/admin/events/:id/moderate` | Flag / restore / cancel an event |
| GET | `/admin/users` | List all users |
| PUT | `/admin/users/:id/toggle` | Suspend or reactivate a user |
| GET | `/admin/logs` | Audit log |
| GET | `/admin/analytics` | Platform-wide analytics |

---

## Data Models

### User

| Field | Type | Notes |
|---|---|---|
| `name`, `email`, `password` | String | Core identity; password bcrypt-hashed |
| `role` | `student` \| `faculty` \| `superadmin` | Enforced server-side |
| `college` | ObjectId → College | Students and faculty |
| `isActive`, `isSuspended` | Boolean | Account status |
| `loginAttempts`, `lockUntil` | Number / Date | Brute-force protection |
| `refreshToken` | String | Hashed, rotated on every refresh |

### College

| Field | Type | Notes |
|---|---|---|
| `name`, `email`, `phone`, `website` | String | Identity |
| `verificationStatus` | `pending` \| `verified` \| `rejected` | Drives faculty event creation permission |
| `verificationRejectionReason` | String | Set on rejection |
| `editStatus` | `none` \| `pending` \| `approved` \| `rejected` | Edit request workflow |
| `pendingEdit` | Object | Proposed changes awaiting superadmin review |
| `editRejectionReason` | String | Set when edit is rejected |
| `status` | `pending` \| `approved` \| `rejected` \| `suspended` | Lifecycle status |
| `createdBy` | ObjectId → User | Faculty owner |

### Event

| Field | Type | Notes |
|---|---|---|
| `title`, `description`, `type` | String | Core fields |
| `status` | `pending` \| `approved` \| `rejected` \| `flagged` \| `cancelled` | Moderation state |
| `college`, `createdBy` | ObjectId | Ownership |
| `startDate`, `endDate`, `registrationDeadline` | Date | Schedule |
| `totalSeats`, `registeredCount` | Number | Capacity; `registeredCount` updated atomically via `$inc` |
| `isFree`, `fee` | Boolean / Number | Pricing |
| `isTeamEvent`, `minTeamSize`, `maxTeamSize` | Boolean / Number | Team settings |
| `rejectionReason` | String | Set on rejection |

### Registration

Tracks student ↔ event relationships with status `confirmed` | `waitlisted` | `cancelled` | `attended`.

### Notification

In-app notifications with `type`, `title`, `message`, `priority`, `isRead`, and optional `relatedEvent` / `relatedCollege` references.

### AdminLog

Immutable audit trail of every superadmin action with `performedBy`, `action`, `targetType`, `targetId`, `previousValue`, `newValue`, `severity`, `ipAddress`.

---

## Auth Flow

```
Login
  → POST /auth/login
  → Server: validate credentials, check lockout, issue accessToken (15m) + refreshToken (7d)
  → Client: store accessToken in memory (Zustand), refreshToken in httpOnly cookie

Session Restore (on page load)
  → POST /auth/refresh  (cookie sent automatically)
  → Server: validate refresh token, rotate it, return new accessToken
  → Client: setAccessToken() → GET /users/me → role check → setAuth()

Token Expiry (401 on any request)
  → Axios interceptor catches 401
  → POST /auth/refresh automatically
  → Retry original request with new token
  → If refresh also fails → clearAuth() → redirect to /login

Logout
  → POST /auth/logout → server clears refreshToken in DB
  → Client: clearAuth()
```

**Important:** `setAccessToken(token)` must be called **before** `getMe()` in both `login` and `restoreSession` so the Authorization header is present on the profile request.

---

## College Workflow

```
Faculty registers college
  → POST /colleges  →  verificationStatus: pending
  → Superadmins notified

Superadmin reviews
  → PATCH /admin/colleges/:id/verify   →  verificationStatus: verified
  → PATCH /admin/colleges/:id/reject   →  verificationStatus: rejected  (reason required)
  → Faculty notified with result (and reason if rejected)

Faculty edits verified college
  → PATCH /colleges/my/edit  →  editStatus: pending, changes stored in pendingEdit
  → Superadmins notified

Superadmin reviews edit
  → PATCH /admin/colleges/:id/approve-edit  →  pendingEdit merged into live fields
  → PATCH /admin/colleges/:id/reject-edit   →  editRejectionReason set  (reason required)
  → Faculty notified with result and reason
```

Faculty can only create events when `verificationStatus === 'verified'`.

---

## Event Workflow

```
Faculty creates event
  → POST /events  →  status: pending
  → Superadmins notified

Superadmin reviews
  → PATCH /admin/events/:id/approve  →  status: approved
      → Faculty notified
      → All students of the college notified (new event published)
  → PATCH /admin/events/:id/reject   →  status: rejected  (reason required)
      → Faculty notified with reason

Post-approval moderation
  → PUT /admin/events/:id/moderate  { action: "flag" | "restore" | "cancel" }
```

---

## Deployment

### 1. Build frontend portals

```bash
cd student-portal    && npm run build
cd faculty-portal    && npm run build
cd superadmin-portal && npm run build
```

Output goes to `<portal>/dist/`.

### 2. Set production environment variables

In `server/.env`:

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/college_events
JWT_ACCESS_SECRET=<64-char hex>
JWT_REFRESH_SECRET=<different 64-char hex>
CLIENT_ORIGIN=https://students.yourdomain.com,https://faculty.yourdomain.com,https://admin.yourdomain.com
BASE_URL=https://api.yourdomain.com
```

### 3. Start the server

```bash
cd server && npm start
```

Use a process manager in production:

```bash
npm install -g pm2
pm2 start server.js --name college-events-api
pm2 save
pm2 startup
```

### 4. Nginx reverse proxy (example)

```nginx
# API server
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    location / {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

# Student portal (repeat for faculty and superadmin with their dist/ paths)
server {
    listen 443 ssl;
    server_name students.yourdomain.com;

    root /var/www/student-portal/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
    }

    location /uploads {
        proxy_pass http://localhost:5000;
    }
}
```

### 5. Uploads directory

In production, the `server/uploads/` directory must be writable by the Node process. For multi-instance deployments, replace local disk storage with S3 or similar object storage by updating `middleware/upload.middleware.js`.

### 6. MongoDB

The application uses a **standalone** MongoDB instance (no replica set). Transactions are not used — all multi-document operations use atomic `$inc` / `findByIdAndUpdate`. For production, use MongoDB Atlas (free tier works) or a managed MongoDB service.

---

## Utility Scripts

| Script | Command | Description |
|---|---|---|
| Seed superadmin | `cd server && npm run seed` | Creates or resets the superadmin account from `.env` |
| Fix faculty role | `cd server && node seed/fix-faculty-role.js <email>` | Corrects a user's role to `faculty` by email |
| Generate JWT secret | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | Generates a secure 64-char hex secret |

---

## Known Constraints

- **No replica set / transactions** — MongoDB is standalone. All operations that need atomicity use `$inc` and `findByIdAndUpdate` instead of sessions.
- **In-memory cache** — `node-cache` is per-process. In a multi-instance deployment, cache invalidation will not propagate across instances. Replace with Redis for horizontal scaling.
- **Local file storage** — Uploaded files are stored on disk under `server/uploads/`. This does not scale across multiple server instances. Use S3 or equivalent for production multi-instance setups.
- **No email notifications** — All notifications are in-app only. There is no SMTP integration.
- **Rate limiting is disabled in development** — `NODE_ENV=development` skips auth rate limiting and brute-force lockout to avoid friction during development.
