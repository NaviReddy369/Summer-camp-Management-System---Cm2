const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

function parseSlot(slot) {
  // Parse strings like "9:00 AM - 10:30 AM" → { startMin, endMin }
  if (!slot) return null;
  const m = String(slot).match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  const toMin = (h, mm, ap) => {
    h = parseInt(h, 10) % 12;
    if (ap.toUpperCase() === 'PM') h += 12;
    return h * 60 + parseInt(mm, 10);
  };
  return { startMin: toMin(m[1], m[2], m[3]), endMin: toMin(m[4], m[5], m[6]) };
}

function overlaps(slot, fromMin, toMin) {
  const p = parseSlot(slot);
  if (!p) return true; // include unparseable slots
  return p.startMin < toMin && p.endMin > fromMin;
}

// GET /api/daily-status?date=YYYY-MM-DD&from=HH:MM&to=HH:MM&team_id=N
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { date, team_id } = req.query;
    const from = req.query.from || '07:30';
    const to = req.query.to || '15:30';

    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    const fromMin = fh * 60 + fm;
    const toMin = th * 60 + tm;

    // Team activities for the day
    let schedQuery = `
      SELECT s.id, s.team_id, s.activity_id, s.date,
             COALESCE(s.time_slot, a.time_slot) as time_slot,
             a.name as activity_name, a.location,
             t.name as team_name, t.team_color
      FROM schedule s
      JOIN activities a ON s.activity_id = a.id
      JOIN teams t ON s.team_id = t.id
      WHERE s.date = ?
    `;
    const params = [date];
    if (team_id) {
      schedQuery += ' AND s.team_id = ?';
      params.push(team_id);
    }
    schedQuery += ' ORDER BY t.name, COALESCE(s.time_slot, a.time_slot)';
    let activities = await db.all(schedQuery, params);
    activities = activities.filter((a) => overlaps(a.time_slot, fromMin, toMin));

    // Counselors on duty
    let dutyQuery = `
      SELECT cs.id, cs.counselor_id, cs.date, cs.time_slot, cs.duty, cs.notes,
             u.name as counselor_name, u.team_id, t.name as team_name, t.team_color
      FROM counselor_schedule cs
      JOIN users u ON cs.counselor_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE cs.date = ?
    `;
    const dutyParams = [date];
    if (team_id) {
      dutyQuery += ' AND u.team_id = ?';
      dutyParams.push(team_id);
    }
    dutyQuery += ' ORDER BY cs.time_slot';
    let duties = await db.all(dutyQuery, dutyParams);
    duties = duties.filter((d) => overlaps(d.time_slot, fromMin, toMin));

    // Attendance summary by team
    let attQuery = `
      SELECT u.team_id, t.name as team_name, t.team_color,
             SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as present_count,
             SUM(CASE WHEN a.present = 0 THEN 1 ELSE 0 END) as absent_count,
             COUNT(*) as total
      FROM attendance a
      JOIN users u ON a.camper_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE a.date = ?
    `;
    const attParams = [date];
    if (team_id) {
      attQuery += ' AND u.team_id = ?';
      attParams.push(team_id);
    }
    attQuery += ' GROUP BY u.team_id, t.name, t.team_color ORDER BY t.name';
    const attendance = await db.all(attQuery, attParams);
    attendance.forEach((a) => {
      a.present_count = Number(a.present_count);
      a.absent_count = Number(a.absent_count);
      a.total = Number(a.total);
    });

    // Active announcements (created on or before this date)
    const announcements = await db.all(
      `SELECT a.id, a.title, a.body, a.audience, a.target_user_id, a.created_at,
              u.name as author_name
       FROM announcements a JOIN users u ON a.author_id = u.id
       WHERE date(a.created_at) <= date(?)
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [date]
    );

    res.json({
      date,
      window: { from, to },
      activities,
      duties,
      attendance,
      announcements,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch daily status' });
  }
});

module.exports = router;
