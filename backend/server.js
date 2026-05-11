const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');

const authRoutes = require('./routes/auth');
const camperRoutes = require('./routes/campers');
const cabinRoutes = require('./routes/cabins');
const activityRoutes = require('./routes/activities');
const scheduleRoutes = require('./routes/schedule');
const attendanceRoutes = require('./routes/attendance');
const announcementRoutes = require('./routes/announcements');

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

initializeDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/campers', camperRoutes);
app.use('/api/cabins', cabinRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);

app.get('/api/stats', (req, res) => {
  try {
    const { getDb } = require('./database');
    const db = getDb();

    const campers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'camper'").get().count;
    const counselors = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'counselor'").get().count;
    const cabins = db.prepare('SELECT COUNT(*) as count FROM cabins').get().count;
    const activities = db.prepare('SELECT COUNT(*) as count FROM activities').get().count;

    res.json({ campers, counselors, cabins, activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`CM2 Summer Camp API running on http://localhost:${PORT}`);
});
