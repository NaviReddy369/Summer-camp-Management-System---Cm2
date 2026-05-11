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
- **Database**: SQLite (via better-sqlite3) — file-based, no setup needed
- **Auth**: JWT tokens (stored in localStorage)
- **Styling**: Plain CSS with CSS variables, Google Fonts (Baloo 2 + Nunito)
- **Icons**: Lucide React

## Project Structure

```
cm2-summer-camp/
├── backend/
│   ├── server.js            # Express server entry point
│   ├── database.js          # SQLite init + seed data
│   ├── middleware/auth.js    # JWT authentication middleware
│   └── routes/
│       ├── auth.js           # Login & user info
│       ├── campers.js        # Camper CRUD
│       ├── cabins.js         # Cabin management
│       ├── activities.js     # Activity CRUD
│       ├── schedule.js       # Schedule management
│       ├── attendance.js     # Attendance tracking
│       └── announcements.js  # Announcements
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx           # Routing & auth state
│       ├── api.js            # Axios config with JWT interceptor
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
├── package.json              # Root — runs both via concurrently
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

To reset the database, delete `backend/camp.db` and restart the server.
