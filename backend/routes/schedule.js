const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    // Accept both `team_id` (new) and `cabin_id` (legacy) query keys
    const teamId = req.query.team_id ?? req.query.cabin_id;
    const { date } = req.query;

    let query = `
      SELECT s.*, a.name as activity_name, a.description, a.location,
             a.time_slot as activity_time_slot, a.day_of_week,
             t.name as team_name, t.team_color,
             COALESCE(s.time_slot, a.time_slot) as time_slot
      FROM schedule s
      JOIN activities a ON s.activity_id = a.id
      JOIN teams t ON s.team_id = t.id
    `;
    const params = [];
    const conditions = [];

    if (teamId) {
      conditions.push('s.team_id = ?');
      params.push(teamId);
    }
    if (date) {
      conditions.push('s.date = ?');
      params.push(date);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY s.date, COALESCE(s.time_slot, a.time_slot)';

    const schedule = await db.all(query, params);
    // Map team_name → cabin_name for legacy frontend compatibility on a few fields
    schedule.forEach((s) => {
      s.cabin_name = s.team_name;
      s.cabin_id = s.team_id;
    });
    res.json({ schedule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { team_id, cabin_id, activity_id, date, time_slot } = req.body;
    const teamId = team_id ?? cabin_id;

    if (!teamId || !activity_id || !date) {
      return res.status(400).json({ error: 'Team, activity, and date are required' });
    }

    const result = await db.run(
      'INSERT INTO schedule (team_id, activity_id, date, time_slot) VALUES (?, ?, ?, ?)',
      [teamId, activity_id, date, time_slot || null]
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      team_id: teamId,
      activity_id,
      date,
      time_slot: time_slot || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule entry' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { team_id, cabin_id, activity_id, date, time_slot } = req.body;
    const teamId = team_id ?? cabin_id;
    await db.run(
      'UPDATE schedule SET team_id = ?, activity_id = ?, date = ?, time_slot = ? WHERE id = ?',
      [teamId, activity_id, date, time_slot || null, req.params.id]
    );
    res.json({ message: 'Schedule entry updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update schedule entry' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM schedule WHERE id = ?', [req.params.id]);
    res.json({ message: 'Schedule entry deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule entry' });
  }
});

module.exports = router;
