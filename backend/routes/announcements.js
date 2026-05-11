const express = require('express');
const { getDb } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    let query = `
      SELECT a.*, u.name as author_name, u.role as author_role
      FROM announcements a
      JOIN users u ON a.author_id = u.id
    `;

    if (req.user.role === 'camper') {
      query += ` WHERE a.audience IN ('all', 'camper')`;
    }

    query += ' ORDER BY a.created_at DESC';

    const announcements = db.prepare(query).all();
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.post('/', authenticateToken, requireRole('counselor', 'admin'), (req, res) => {
  try {
    const { title, body, audience } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO announcements (author_id, title, body, audience) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, title, body, audience || 'all');

    const announcement = db.prepare(
      `SELECT a.*, u.name as author_name, u.role as author_role
       FROM announcements a JOIN users u ON a.author_id = u.id WHERE a.id = ?`
    ).get(result.lastInsertRowid);

    res.status(201).json({ announcement });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

module.exports = router;
