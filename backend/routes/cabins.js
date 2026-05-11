const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const cabins = await db.all(
      `SELECT c.*, u.name as counselor_name,
       (SELECT COUNT(*) FROM users WHERE cabin_id = c.id AND role = 'camper') as camper_count
       FROM cabins c LEFT JOIN users u ON c.counselor_id = u.id
       ORDER BY c.name`
    );

    res.json({ cabins });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cabins' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const cabin = await db.get(
      `SELECT c.*, u.name as counselor_name,
       (SELECT COUNT(*) FROM users WHERE cabin_id = c.id AND role = 'camper') as camper_count
       FROM cabins c LEFT JOIN users u ON c.counselor_id = u.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (!cabin) {
      return res.status(404).json({ error: 'Cabin not found' });
    }

    cabin.camper_count = Number(cabin.camper_count);
    res.json({ cabin });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cabin' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, counselor_id, theme_color } = req.body;

    await db.run(
      'UPDATE cabins SET name = ?, counselor_id = ?, theme_color = ? WHERE id = ?',
      [name, counselor_id || null, theme_color || '#FF6B2C', req.params.id]
    );

    res.json({ message: 'Cabin updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cabin' });
  }
});

module.exports = router;
