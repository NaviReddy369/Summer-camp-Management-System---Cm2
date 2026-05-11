const express = require('express');
const { getDb } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const activities = db.prepare('SELECT * FROM activities ORDER BY day_of_week, time_slot').all();
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, description, location, time_slot, day_of_week } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Activity name is required' });
    }

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO activities (name, description, location, time_slot, day_of_week) VALUES (?, ?, ?, ?, ?)'
    ).run(name, description || '', location || '', time_slot || '', day_of_week || '');

    res.status(201).json({ id: result.lastInsertRowid, name, description, location, time_slot, day_of_week });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, description, location, time_slot, day_of_week } = req.body;
    const db = getDb();

    db.prepare(
      'UPDATE activities SET name = ?, description = ?, location = ?, time_slot = ?, day_of_week = ? WHERE id = ?'
    ).run(name, description, location, time_slot, day_of_week, req.params.id);

    res.json({ message: 'Activity updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM schedule WHERE activity_id = ?').run(req.params.id);
    db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

module.exports = router;
