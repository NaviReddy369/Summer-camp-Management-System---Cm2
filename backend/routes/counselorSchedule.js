const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { counselor_id, date } = req.query;

    let query = `
      SELECT cs.*, u.name as counselor_name, u.team_id, t.name as team_name, t.team_color
      FROM counselor_schedule cs
      JOIN users u ON cs.counselor_id = u.id
      LEFT JOIN teams t ON u.team_id = t.id
    `;
    const params = [];
    const conds = [];

    // Counselors only see their own
    if (req.user.role === 'counselor') {
      conds.push('cs.counselor_id = ?');
      params.push(req.user.id);
    } else if (counselor_id) {
      conds.push('cs.counselor_id = ?');
      params.push(counselor_id);
    }
    if (date) {
      conds.push('cs.date = ?');
      params.push(date);
    }
    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY cs.date, cs.time_slot';

    const schedule = await db.all(query, params);
    res.json({ schedule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch counselor schedule' });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { counselor_id, date, time_slot, duty, notes } = req.body;
    if (!counselor_id || !date || !time_slot || !duty) {
      return res.status(400).json({ error: 'counselor_id, date, time_slot, duty are required' });
    }
    const result = await db.run(
      'INSERT INTO counselor_schedule (counselor_id, date, time_slot, duty, notes) VALUES (?, ?, ?, ?, ?)',
      [counselor_id, date, time_slot, duty, notes || null]
    );
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { counselor_id, date, time_slot, duty, notes } = req.body;
    await db.run(
      'UPDATE counselor_schedule SET counselor_id = ?, date = ?, time_slot = ?, duty = ?, notes = ? WHERE id = ?',
      [counselor_id, date, time_slot, duty, notes || null, req.params.id]
    );
    res.json({ message: 'Entry updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM counselor_schedule WHERE id = ?', [req.params.id]);
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
