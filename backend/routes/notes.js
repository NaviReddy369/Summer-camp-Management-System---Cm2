const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Admin sends a private note to a single user (camper or counselor)
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { to_user_id, note_text } = req.body;
    if (!to_user_id || !note_text || !note_text.trim()) {
      return res.status(400).json({ error: 'to_user_id and note_text are required' });
    }
    const target = await db.get('SELECT id, role FROM users WHERE id = ?', [to_user_id]);
    if (!target) return res.status(404).json({ error: 'Recipient not found' });
    if (target.role !== 'camper' && target.role !== 'counselor') {
      return res.status(400).json({ error: 'Notes can only be sent to campers or counselors' });
    }

    const result = await db.run(
      'INSERT INTO admin_notes (from_user_id, to_user_id, note_text) VALUES (?, ?, ?)',
      [req.user.id, to_user_id, note_text.trim()]
    );

    const note = await db.get(
      `SELECT n.*, fu.name as from_name, tu.name as to_name
       FROM admin_notes n
       JOIN users fu ON n.from_user_id = fu.id
       JOIN users tu ON n.to_user_id = tu.id
       WHERE n.id = ?`,
      [result.lastInsertRowid]
    );
    res.status(201).json({ note });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send note' });
  }
});

// Get my inbox (notes sent to me)
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const notes = await db.all(
      `SELECT n.*, fu.name as from_name
       FROM admin_notes n
       JOIN users fu ON n.from_user_id = fu.id
       WHERE n.to_user_id = ?
       ORDER BY n.created_at DESC`,
      [req.user.id]
    );
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Mark a note as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const note = await db.get('SELECT * FROM admin_notes WHERE id = ?', [req.params.id]);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (Number(note.to_user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Not your note' });
    }
    if (!note.read_at) {
      await db.run('UPDATE admin_notes SET read_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    }
    res.json({ message: 'Note marked read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// Admin: list notes sent to a specific user
router.get('/to/:userId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const notes = await db.all(
      `SELECT n.*, fu.name as from_name, tu.name as to_name
       FROM admin_notes n
       JOIN users fu ON n.from_user_id = fu.id
       JOIN users tu ON n.to_user_id = tu.id
       WHERE n.to_user_id = ?
       ORDER BY n.created_at DESC`,
      [req.params.userId]
    );
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM admin_notes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
