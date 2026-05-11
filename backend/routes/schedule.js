const express = require('express');
const { getDb } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { cabin_id, date } = req.query;

    let query = `
      SELECT s.*, a.name as activity_name, a.description, a.location, a.time_slot, a.day_of_week,
             c.name as cabin_name
      FROM schedule s
      JOIN activities a ON s.activity_id = a.id
      JOIN cabins c ON s.cabin_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (cabin_id) {
      conditions.push('s.cabin_id = ?');
      params.push(cabin_id);
    }
    if (date) {
      conditions.push('s.date = ?');
      params.push(date);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY s.date, a.time_slot';

    const schedule = db.prepare(query).all(...params);
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { cabin_id, activity_id, date } = req.body;

    if (!cabin_id || !activity_id || !date) {
      return res.status(400).json({ error: 'Cabin, activity, and date are required' });
    }

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO schedule (cabin_id, activity_id, date) VALUES (?, ?, ?)'
    ).run(cabin_id, activity_id, date);

    res.status(201).json({ id: result.lastInsertRowid, cabin_id, activity_id, date });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule entry' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM schedule WHERE id = ?').run(req.params.id);
    res.json({ message: 'Schedule entry deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule entry' });
  }
});

module.exports = router;
