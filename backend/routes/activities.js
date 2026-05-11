const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const activities = await db.all('SELECT * FROM activities ORDER BY day_of_week, time_slot');
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, location, time_slot, day_of_week } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Activity name is required' });
    }

    const result = await db.run(
      'INSERT INTO activities (name, description, location, time_slot, day_of_week) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', location || '', time_slot || '', day_of_week || '']
    );

    res.status(201).json({ id: result.lastInsertRowid, name, description, location, time_slot, day_of_week });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, location, time_slot, day_of_week } = req.body;

    await db.run(
      'UPDATE activities SET name = ?, description = ?, location = ?, time_slot = ?, day_of_week = ? WHERE id = ?',
      [name, description, location, time_slot, day_of_week, req.params.id]
    );

    res.json({ message: 'Activity updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM schedule WHERE activity_id = ?', [req.params.id]);
    await db.run('DELETE FROM activities WHERE id = ?', [req.params.id]);
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

module.exports = router;
