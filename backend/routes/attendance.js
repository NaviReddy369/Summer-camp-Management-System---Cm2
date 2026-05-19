const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendAbsenceAlertEmail } = require('../services/email');

const router = express.Router();

function formatHumanDate(dateStr) {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { camper_id, date } = req.query;
    const teamId = req.query.team_id ?? req.query.cabin_id;

    let query = `
      SELECT a.*, u.name as camper_name, u.team_id, t.name as team_name
      FROM attendance a
      JOIN users u ON a.camper_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
    `;
    const params = [];
    const conditions = [];

    if (camper_id) {
      conditions.push('a.camper_id = ?');
      params.push(camper_id);
    }
    if (date) {
      conditions.push('a.date = ?');
      params.push(date);
    }
    if (teamId) {
      conditions.push('u.team_id = ?');
      params.push(teamId);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY a.date DESC, u.name';

    const attendance = await db.all(query, params);
    attendance.forEach((a) => { a.cabin_name = a.team_name; });
    res.json({ attendance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

router.post('/', authenticateToken, requireRole('counselor', 'admin'), async (req, res) => {
  try {
    const { camper_id, date, present, notes } = req.body;

    if (!camper_id || !date) {
      return res.status(400).json({ error: 'Camper ID and date are required' });
    }

    const existing = await db.get(
      'SELECT id FROM attendance WHERE camper_id = ? AND date = ?',
      [camper_id, date]
    );

    if (existing) {
      await db.run(
        'UPDATE attendance SET present = ?, notes = ? WHERE id = ?',
        [present ? 1 : 0, notes || null, existing.id]
      );
      return res.json({ message: 'Attendance updated', id: existing.id });
    }

    const result = await db.run(
      'INSERT INTO attendance (camper_id, date, present, notes) VALUES (?, ?, ?, ?)',
      [camper_id, date, present ? 1 : 0, notes || null]
    );

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

router.post('/bulk', authenticateToken, requireRole('counselor', 'admin'), async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    const newlyAbsent = [];

    for (const record of records) {
      const existing = await db.get(
        'SELECT id, present FROM attendance WHERE camper_id = ? AND date = ?',
        [record.camper_id, record.date]
      );
      const presentInt = record.present ? 1 : 0;

      if (existing) {
        await db.run(
          'UPDATE attendance SET present = ?, notes = ? WHERE camper_id = ? AND date = ?',
          [presentInt, record.notes || null, record.camper_id, record.date]
        );
        if (!record.present && existing.present === 1) {
          newlyAbsent.push(record);
        }
      } else {
        await db.run(
          'INSERT INTO attendance (camper_id, date, present, notes) VALUES (?, ?, ?, ?)',
          [record.camper_id, record.date, presentInt, record.notes || null]
        );
        if (!record.present) {
          newlyAbsent.push(record);
        }
      }
    }

    res.json({ message: 'Bulk attendance recorded', count: records.length });

    if (newlyAbsent.length > 0) {
      (async () => {
        for (const rec of newlyAbsent) {
          try {
            const camper = await db.get(
              "SELECT name, email, guardian_name FROM users WHERE id = ? AND role = 'camper'",
              [rec.camper_id]
            );
            if (camper?.email) {
              await sendAbsenceAlertEmail({
                to: camper.email,
                guardianName: camper.guardian_name,
                camperName: camper.name,
                date: formatHumanDate(rec.date),
              });
            }
          } catch (e) {
            console.error('[email] absence alert failed:', e.message);
          }
        }
      })();
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to record bulk attendance' });
  }
});

module.exports = router;
