const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
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

    const schedule = await db.all(query, params);
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { cabin_id, activity_id, date } = req.body;

    if (!cabin_id || !activity_id || !date) {
      return res.status(400).json({ error: 'Cabin, activity, and date are required' });
    }

    const result = await db.run(
      'INSERT INTO schedule (cabin_id, activity_id, date) VALUES (?, ?, ?)',
      [cabin_id, activity_id, date]
    );

    res.status(201).json({ id: result.lastInsertRowid, cabin_id, activity_id, date });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule entry' });
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
