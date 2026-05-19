const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const teams = await db.all(
      `SELECT t.*, u.name as counselor_name,
       (SELECT COUNT(*) FROM users WHERE team_id = t.id AND role = 'camper') as camper_count
       FROM teams t LEFT JOIN users u ON t.counselor_id = u.id
       ORDER BY t.name`
    );
    teams.forEach((t) => { t.camper_count = Number(t.camper_count); });
    res.json({ teams });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const team = await db.get(
      `SELECT t.*, u.name as counselor_name,
       (SELECT COUNT(*) FROM users WHERE team_id = t.id AND role = 'camper') as camper_count
       FROM teams t LEFT JOIN users u ON t.counselor_id = u.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!team) return res.status(404).json({ error: 'Team not found' });
    team.camper_count = Number(team.camper_count);
    res.json({ team });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, team_color, counselor_id } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Team name is required' });

    const result = await db.run(
      'INSERT INTO teams (name, counselor_id, team_color) VALUES (?, ?, ?)',
      [name.trim(), counselor_id || null, team_color || '#FF6B2C']
    );
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), team_color: team_color || '#FF6B2C', counselor_id: counselor_id || null });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create team' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, counselor_id, team_color } = req.body;
    await db.run(
      'UPDATE teams SET name = ?, counselor_id = ?, team_color = ? WHERE id = ?',
      [name, counselor_id || null, team_color || '#FF6B2C', req.params.id]
    );
    res.json({ message: 'Team updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update team' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    // Unassign campers and counselors first
    await db.run('UPDATE users SET team_id = NULL WHERE team_id = ?', [req.params.id]);
    await db.run('DELETE FROM schedule WHERE team_id = ?', [req.params.id]);
    await db.run('DELETE FROM teams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

module.exports = router;
