const express = require('express');
const { getDb } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const cabins = db.prepare(
      `SELECT c.*, u.name as counselor_name,
       (SELECT COUNT(*) FROM users WHERE cabin_id = c.id AND role = 'camper') as camper_count
       FROM cabins c LEFT JOIN users u ON c.counselor_id = u.id
       ORDER BY c.name`
    ).all();

    res.json({ cabins });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cabins' });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const cabin = db.prepare(
      `SELECT c.*, u.name as counselor_name,
       (SELECT COUNT(*) FROM users WHERE cabin_id = c.id AND role = 'camper') as camper_count
       FROM cabins c LEFT JOIN users u ON c.counselor_id = u.id
       WHERE c.id = ?`
    ).get(req.params.id);

    if (!cabin) {
      return res.status(404).json({ error: 'Cabin not found' });
    }

    res.json({ cabin });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cabin' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, counselor_id, theme_color } = req.body;
    const db = getDb();

    db.prepare('UPDATE cabins SET name = ?, counselor_id = ?, theme_color = ? WHERE id = ?')
      .run(name, counselor_id || null, theme_color || '#FF6B2C', req.params.id);

    res.json({ message: 'Cabin updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cabin' });
  }
});

module.exports = router;
