# CM2 Summer Camp Management System

A full-stack Summer Camp Management System for **Community Matters 2 (CM2)** — a vibrant, youth-focused summer camp platform.

## Quick Start

```bash
cd cm2-summer-camp
npm install
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Login Credentials

| Role       | Username    | Password   |
|------------|-------------|------------|
| Admin      | admin       | admin123   |
| Counselor  | counselor1  | camp2024   |
| Counselor  | counselor2  | camp2024   |
| Counselor  | counselor3  | camp2024   |
| Camper     | camper1     | camp2024   |
| Camper     | camper2     | camp2024   |
| Camper     | camper3–6   | camp2024   |

## Role Capabilities

### Camper
- View weekly activity schedule (calendar grid)
- See cabin mates with fun avatars
- View personal attendance history
- Read camp announcements

### Counselor
- View & manage their cabin's camper roster
- Mark daily attendance (checkbox list)
- Post announcements (to campers or everyone)
- View cabin's activity schedule

### Admin / Staff
- Dashboard with stats (campers, counselors, cabins, activities)
- Full camper management (add, edit, delete, assign cabins)
- Weekly schedule builder (assign activities to cabins by date)
- Manage all announcements (create & delete)
- View all cabins and counselor assignments

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (local dev) / Vercel Postgres (production)
- **Auth**: JWT tokens (stored in localStorage)
- **Styling**: Plain CSS with CSS variables, Google Fonts (Baloo 2 + Nunito)
- **Icons**: Lucide React
- **Deployment**: Vercel (frontend static + Express serverless function)

## Deploying to Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add a **Postgres** database from Vercel's Storage tab (free tier) — sets `POSTGRES_URL` automatically
4. Add email + frontend URL env vars in **Settings → Environment Variables**:
   - `RESEND_API_KEY` — get one at [resend.com/api-keys](https://resend.com/api-keys)
   - `RESEND_FROM_EMAIL` — e.g. `CM2 Camp <onboarding@resend.dev>` (or your verified domain)
   - `FRONTEND_URL` — your live app URL, e.g. `https://cm2-camp.vercel.app`
5. Deploy — the database auto-seeds on the first request

> See `.env.example` for the full list of supported variables and local-dev defaults.

## Email Notifications (Resend)

The system sends transactional emails for these events (all non-blocking — API responses never wait for email delivery):

| Trigger | Recipient | Email |
|---|---|---|
| Admin creates a camper | Camper email | **Welcome** with username + temp password |
| Admin creates a counselor | Counselor email | **Welcome** with username + temp password |
| Admin resets a password | User email | **Password Reset** with new temp password |
| Counselor marks camper "Ready for Pickup" | Camper / guardian email | **Pickup Ready** notification |
| Camper marked absent (bulk attendance) | Camper / guardian email | **Absence Alert** |

If `RESEND_API_KEY` is not set, emails are silently skipped (a console warning is logged) — the rest of the app works normally.

The app uses a dual-mode database layer:
- **Local dev**: SQLite via `better-sqlite3` (zero config)
- **Vercel production**: Postgres via `pg` (auto-detected from `POSTGRES_URL` env var)

## Project Structure

```
cm2-summer-camp/
├── api/
│   └── index.js              # Vercel serverless wrapper
├── backend/
│   ├── server.js             # Express app (exports for Vercel)
│   ├── database.js           # Dual-mode DB (SQLite + Postgres)
│   ├── middleware/auth.js     # JWT authentication middleware
│   └── routes/
│       ├── auth.js            # Login & user info
│       ├── campers.js         # Camper CRUD
│       ├── cabins.js          # Cabin management
│       ├── activities.js      # Activity CRUD
│       ├── schedule.js        # Schedule management
│       ├── attendance.js      # Attendance tracking
│       └── announcements.js   # Announcements
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # Routing & auth state
│       ├── api.js             # Axios config with JWT interceptor
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── AnnouncementCard.jsx
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── CamperDashboard.jsx
│       │   ├── CounselorDashboard.jsx
│       │   └── AdminDashboard.jsx
│       └── styles/
│           └── global.css
├── vercel.json                # Vercel deployment config
├── package.json               # Root — runs both via concurrently
└── README.md
```

## Seed Data

The database auto-seeds on first run with:
- **3 Cabins**: Eagle, Falcon, Bear
- **6 Campers** across 3 cabins
- **3 Counselors** (one per cabin)
- **1 Admin**
- **10 Activities**: Swimming, Archery, Arts & Crafts, Team Sports, Bonfire Night, Hiking, Canoeing, Nature Study, Talent Show Prep, Rock Climbing
- **1 week of scheduled activities**
- **Sample attendance records**
- **4 sample announcements**

To reset the local database, delete `backend/camp.db` and restart the server.
To reset the Vercel Postgres database, drop all tables and redeploy.
