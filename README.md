# CM2 Summer Camp Management System

A full-stack Summer Camp Management System for **Community Matters 2 (CM2)** — a vibrant, youth-focused summer camp platform for campers ages 4–7.

## Quick Start

```bash
cd cm2-summer-camp
npm install
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Login Credentials

There are **three roles**: Camper (family portal), Counselor, and Admin.

| Role       | Username    | Password   | Notes |
|------------|-------------|------------|-------|
| Admin      | admin       | admin123   | |
| Counselor  | counselor1  | camp2024   | |
| Counselor  | counselor2  | camp2024   | |
| Counselor  | counselor3  | camp2024   | |
| Camper     | camper1     | camp2024   | Family portal for Alex Rivera (age 6) |
| Camper     | camper2–6   | camp2024   | One account per camper — parents log in here |

> **Camper accounts are for families.** Young campers (ages 4–7) don't use the app themselves. Parents/guardians log in with the camper account to view schedule, attendance, announcements, and add **family notes** that notify the team counselor.

## Role Capabilities

### Camper / Family Portal
- View camper profile, team, and weekly activity schedule (30-min time grid, 7:30 AM – 3:30 PM)
- See team mates and personal attendance history
- Write/edit a **family note** (allergies, special needs, etc.) — saving notifies the team counselor by email
- Read camp announcements with **per-announcement acknowledgement checkbox**
- Receive private **admin notes** with unread indicator

### Counselor
- View & manage their team's camper roster (avatar tinted with team color)
- See **family special notes** for each camper (read-only, with "Updated" badge for recent changes)
- Mark daily attendance (checkbox list)
- Post announcements (to campers or everyone)
- View their team's activity schedule + their **personal duty schedule**
- Receive private **admin notes** with unread badge
- Acknowledge announcements targeted at them

### Admin / Staff (7 tabs)
1. **Overview** — stats and quick views
2. **Camper Management** — full CRUD, filters (team, age, name, attendance), profile cards, send notes, view family notes, view ack status per camper
3. **Counselor Management** — full CRUD, filters (team, name), profile cards with team roster, send notes, view ack status
4. **Teams** — manage teams with a **color picker**; team color flows everywhere
5. **Schedules** — team activity grid + counselor duty grid (30-min slots, Mon-Fri, 7:30 AM – 3:30 PM)
6. **Announcements** — audience targeting (`all`, `campers`, `counselors`, `specific_camper`, `specific_counselor`) and acknowledgement tracking (click an announcement to see who has / hasn't acknowledged)
7. **Daily Status** — pick a date, time window, and team — see activities running, counselors on duty, attendance summary, and active announcements

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (local dev) / Vercel Postgres (production)
- **Auth**: JWT tokens (stored in localStorage)
- **Styling**: Plain CSS with CSS variables, Google Fonts (Baloo 2 + Nunito)
- **Icons**: Lucide React
- **Deployment**: Vercel (frontend static + Express serverless function)

## Database

The app uses a dual-mode database layer:
- **Local dev**: SQLite via `better-sqlite3` (zero config)
- **Vercel production**: Postgres via `pg` (auto-detected from `POSTGRES_URL` env var)

### New / Updated tables in this release

- `teams` (renamed from `cabins`) — adds `team_color` (hex)
- `users` — `cabin_id` renamed to `team_id`, guardian fields for family contact
- `schedule` — `cabin_id` renamed to `team_id`, new `time_slot` column
- `announcements` — new `target_user_id` column; audience values are `all` / `campers` / `counselors` / `specific_camper` / `specific_counselor`
- `announcement_acknowledgements` — who acknowledged what
- `camper_special_notes` — one family note per camper; notifies counselor on save
- `admin_notes` — direct messages from admin to a camper or counselor
- `counselor_schedule` — separate schedule for counselor duties

The database auto-runs an in-place migration on startup, so existing dev DBs from the previous version will be upgraded (cabins→teams, parent accounts removed, etc.).

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
| Admin creates a camper / counselor | User email | **Welcome** with username + temp password |
| Admin resets a password | User email | **Password Reset** with new temp password |
| Family saves/updates a special note | Team counselor email | **Family note updated** notification |
| Counselor marks camper "Ready for Pickup" | Camper / guardian email | **Pickup Ready** notification |
| Camper marked absent (bulk attendance) | Camper / guardian email | **Absence Alert** |

If `RESEND_API_KEY` is not set, emails are silently skipped (a console warning is logged) — the rest of the app works normally.

## Project Structure

```
cm2-summer-camp/
├── api/
│   └── index.js                 # Vercel serverless wrapper
├── backend/
│   ├── server.js                # Express app (exports for Vercel)
│   ├── database.js              # Dual-mode DB + auto-migration + seed
│   ├── middleware/auth.js       # JWT authentication middleware
│   └── routes/
│       ├── auth.js              # Login & user info
│       ├── campers.js           # Camper CRUD
│       ├── counselors.js        # Counselor CRUD
│       ├── teams.js             # Team management with color
│       ├── activities.js        # Activity CRUD
│       ├── schedule.js          # Team activity schedule
│       ├── counselorSchedule.js # Counselor duty schedule
│       ├── attendance.js        # Attendance tracking
│       ├── announcements.js     # Announcements + acknowledgements
│       ├── notes.js             # Admin → camper/counselor private notes
│       ├── specialNotes.js      # Family notes (camper account)
│       ├── dailyStatus.js       # Daily camp overview
│       └── chat.js              # Chatbot
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # Routing & auth state (3 roles)
│       ├── api.js               # Axios config with JWT interceptor
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── AnnouncementCard.jsx
│       │   ├── Chatbot.jsx
│       │   └── CredentialsModal.jsx
│       ├── pages/
│       │   ├── Login.jsx        # Camper / Counselor / Admin tabs
│       │   ├── CamperDashboard.jsx   # Family portal
│       │   ├── CounselorDashboard.jsx
│       │   ├── AdminDashboard.jsx
│       │   └── ChangePassword.jsx
│       └── styles/
│           └── global.css
├── vercel.json                  # Vercel deployment config
├── package.json                 # Root — runs both via concurrently
└── README.md
```

## Seed Data

The database auto-seeds on first run with:
- **3 Teams**: Eagle (orange `#FF6B2C`), Falcon (blue `#3498DB`), Bear (green `#2ECC71`)
- **6 Campers** (ages 5–7) across 3 teams, each with guardian contact info
- **3 Counselors** (one per team)
- **1 Admin**
- **14 Activities**: Swimming, Archery, Arts & Crafts, Team Sports, Bonfire Night, Hiking, Canoeing, Nature Study, Talent Show Prep, Rock Climbing, Breakfast, Morning Circle, Lunch, Free Time
- **1 week of scheduled activities** with explicit time slots
- **Full week of counselor duties** (~21 entries per counselor)
- **Sample attendance records**
- **5 sample announcements** including a counselor-only one

To reset the local database, delete `backend/camp.db` and restart the server.
To reset the Vercel Postgres database, drop all tables and redeploy.
