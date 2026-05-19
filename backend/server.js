try { require('dotenv').config(); } catch { /* dotenv optional — Vercel injects env vars directly */ }

const express = require('express');
const cors = require('cors');
const { db, initializeDatabase } = require('./database');

const authRoutes = require('./routes/auth');
const camperRoutes = require('./routes/campers');
const counselorRoutes = require('./routes/counselors');
const teamRoutes = require('./routes/teams');
const activityRoutes = require('./routes/activities');
const scheduleRoutes = require('./routes/schedule');
const counselorScheduleRoutes = require('./routes/counselorSchedule');
const attendanceRoutes = require('./routes/attendance');
const announcementRoutes = require('./routes/announcements');
const chatRoutes = require('./routes/chat');
const notesRoutes = require('./routes/notes');
const specialNotesRoutes = require('./routes/specialNotes');
const dailyStatusRoutes = require('./routes/dailyStatus');

const app = express();
const PORT = 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.VERCEL) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());

let dbInitPromise = null;
function ensureDb() {
  if (!dbInitPromise) {
    dbInitPromise = initializeDatabase().catch((err) => {
      console.error('DB init failed:', err);
      dbInitPromise = null;
      throw err;
    });
  }
  return dbInitPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/campers', camperRoutes);
app.use('/api/counselors', counselorRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/cabins', teamRoutes); // legacy alias
app.use('/api/activities', activityRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/counselor-schedule', counselorScheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/special-notes', specialNotesRoutes);
app.use('/api/daily-status', dailyStatusRoutes);

app.get('/api/stats', async (req, res) => {
  try {
    const campers = Number((await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'camper'")).count);
    const counselors = Number((await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'counselor'")).count);
    const teams = Number((await db.get('SELECT COUNT(*) as count FROM teams')).count);
    const activities = Number((await db.get('SELECT COUNT(*) as count FROM activities')).count);
    res.json({ campers, counselors, teams, cabins: teams, activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

if (!process.env.VERCEL) {
  ensureDb().then(() => {
    app.listen(PORT, () => {
      console.log(`CM2 Summer Camp API running on http://localhost:${PORT}`);
    });
  }).catch(console.error);
}

module.exports = app;
