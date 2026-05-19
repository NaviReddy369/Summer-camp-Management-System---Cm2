const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const VALID_AUDIENCES = new Set([
  'all', 'campers', 'counselors', 'specific_camper', 'specific_counselor',
]);

// Returns the list of announcements visible to the current user, including their
// acknowledgement state (acknowledged: 0 or 1, acknowledged_at).
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    let query = `
      SELECT a.*, u.name as author_name, u.role as author_role,
             ack.acknowledged_at,
             tu.name as target_user_name
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      LEFT JOIN announcement_acknowledgements ack
        ON ack.announcement_id = a.id AND ack.user_id = ?
      LEFT JOIN users tu ON a.target_user_id = tu.id
    `;
    const params = [userId];
    const conds = [];

    if (role === 'camper') {
      conds.push("(a.audience = 'all' OR a.audience = 'campers' OR (a.audience = 'specific_camper' AND a.target_user_id = ?))");
      params.push(userId);
    } else if (role === 'counselor') {
      conds.push("(a.audience = 'all' OR a.audience = 'counselors' OR (a.audience = 'specific_counselor' AND a.target_user_id = ?))");
      params.push(userId);
    }
    // admin sees everything

    if (conds.length) query += ' WHERE ' + conds.join(' AND ');
    query += ' ORDER BY a.created_at DESC';

    const rows = await db.all(query, params);
    const announcements = rows.map((a) => ({
      ...a,
      acknowledged: a.acknowledged_at ? 1 : 0,
    }));
    res.json({ announcements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.post('/', authenticateToken, requireRole('counselor', 'admin'), async (req, res) => {
  try {
    const { title, body, audience, target_user_id } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }
    const aud = audience || 'all';
    if (!VALID_AUDIENCES.has(aud)) {
      return res.status(400).json({ error: 'Invalid audience' });
    }
    if ((aud === 'specific_camper' || aud === 'specific_counselor') && !target_user_id) {
      return res.status(400).json({ error: 'target_user_id is required for specific audience' });
    }

    const result = await db.run(
      'INSERT INTO announcements (author_id, title, body, audience, target_user_id) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, title, body, aud, target_user_id || null]
    );

    const announcement = await db.get(
      `SELECT a.*, u.name as author_name, u.role as author_role,
              tu.name as target_user_name
       FROM announcements a JOIN users u ON a.author_id = u.id
       LEFT JOIN users tu ON a.target_user_id = tu.id
       WHERE a.id = ?`,
      [result.lastInsertRowid]
    );

    res.status(201).json({ announcement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Acknowledge an announcement
router.post('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const annId = req.params.id;
    const userId = req.user.id;

    // Upsert — if already acknowledged, no-op
    const existing = await db.get(
      'SELECT id FROM announcement_acknowledgements WHERE announcement_id = ? AND user_id = ?',
      [annId, userId]
    );
    if (!existing) {
      await db.run(
        'INSERT INTO announcement_acknowledgements (announcement_id, user_id) VALUES (?, ?)',
        [annId, userId]
      );
    }
    res.json({ message: 'Acknowledged' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to acknowledge' });
  }
});

// Un-acknowledge (uncheck the box)
router.delete('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    await db.run(
      'DELETE FROM announcement_acknowledgements WHERE announcement_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Acknowledgement removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove acknowledgement' });
  }
});

// Admin: get the acknowledgement summary for a specific announcement
router.get('/:id/acknowledgements', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const annId = req.params.id;
    const ann = await db.get('SELECT * FROM announcements WHERE id = ?', [annId]);
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });

    // Build the audience list
    let audienceUsers = [];
    if (ann.audience === 'all') {
      audienceUsers = await db.all(
        "SELECT id, name, role FROM users WHERE role IN ('camper','counselor') ORDER BY name"
      );
    } else if (ann.audience === 'campers') {
      audienceUsers = await db.all(
        "SELECT id, name, role FROM users WHERE role = 'camper' ORDER BY name"
      );
    } else if (ann.audience === 'counselors') {
      audienceUsers = await db.all(
        "SELECT id, name, role FROM users WHERE role = 'counselor' ORDER BY name"
      );
    } else if (ann.audience === 'specific_camper' || ann.audience === 'specific_counselor') {
      const u = await db.get('SELECT id, name, role FROM users WHERE id = ?', [ann.target_user_id]);
      if (u) audienceUsers = [u];
    }

    const acks = await db.all(
      'SELECT user_id, acknowledged_at FROM announcement_acknowledgements WHERE announcement_id = ?',
      [annId]
    );
    const ackMap = new Map(acks.map((a) => [Number(a.user_id), a.acknowledged_at]));

    const list = audienceUsers.map((u) => ({
      user_id: u.id,
      name: u.name,
      role: u.role,
      acknowledged_at: ackMap.get(Number(u.id)) || null,
    }));

    const accepted = list.filter((u) => u.acknowledged_at).length;

    res.json({
      announcement: ann,
      total: list.length,
      accepted,
      pending: list.length - accepted,
      users: list,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch acknowledgements' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM announcement_acknowledgements WHERE announcement_id = ?', [req.params.id]);
    await db.run('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

module.exports = router;
