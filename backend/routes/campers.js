const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    let campers;

    if (req.user.role === 'counselor') {
      campers = await db.all(
        `SELECT u.id, u.name, u.username, u.age, u.cabin_id, c.name as cabin_name
         FROM users u LEFT JOIN cabins c ON u.cabin_id = c.id
         WHERE u.role = 'camper' AND u.cabin_id = ?
         ORDER BY u.name`,
        [req.user.cabin_id]
      );
    } else {
      campers = await db.all(
        `SELECT u.id, u.name, u.username, u.age, u.cabin_id, c.name as cabin_name
         FROM users u LEFT JOIN cabins c ON u.cabin_id = c.id
         WHERE u.role = 'camper'
         ORDER BY u.name`
      );
    }

    res.json({ campers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campers' });
  }
});

router.get('/cabin/:cabinId', authenticateToken, async (req, res) => {
  try {
    const campers = await db.all(
      `SELECT u.id, u.name, u.username, u.age, u.cabin_id, c.name as cabin_name
       FROM users u LEFT JOIN cabins c ON u.cabin_id = c.id
       WHERE u.role = 'camper' AND u.cabin_id = ?
       ORDER BY u.name`,
      [req.params.cabinId]
    );

    res.json({ campers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cabin campers' });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, username, password, cabin_id, age } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' });
    }

    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
      [name, username, password_hash, 'camper', cabin_id || null, age || null]
    );

    res.status(201).json({ id: result.lastInsertRowid, name, username, role: 'camper', cabin_id, age });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create camper' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, cabin_id, age } = req.body;

    await db.run(
      'UPDATE users SET name = ?, cabin_id = ?, age = ? WHERE id = ? AND role = ?',
      [name, cabin_id || null, age || null, req.params.id, 'camper']
    );

    res.json({ message: 'Camper updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update camper' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM attendance WHERE camper_id = ?', [req.params.id]);
    await db.run('DELETE FROM users WHERE id = ? AND role = ?', [req.params.id, 'camper']);
    res.json({ message: 'Camper deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete camper' });
  }
});

module.exports = router;
