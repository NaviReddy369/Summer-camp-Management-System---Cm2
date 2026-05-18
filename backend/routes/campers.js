const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateTempPassword, generateUniqueUsername } = require('../utils/credentials');

const router = express.Router();

const CAMPER_FIELDS = `u.id, u.name, u.username, u.age, u.cabin_id, u.email, u.phone,
  u.guardian_name, u.guardian_phone, u.must_change_password, c.name as cabin_name`;

router.get('/', authenticateToken, async (req, res) => {
  try {
    let campers;

    if (req.user.role === 'counselor') {
      campers = await db.all(
        `SELECT ${CAMPER_FIELDS}
         FROM users u LEFT JOIN cabins c ON u.cabin_id = c.id
         WHERE u.role = 'camper' AND u.cabin_id = ?
         ORDER BY u.name`,
        [req.user.cabin_id]
      );
    } else {
      campers = await db.all(
        `SELECT ${CAMPER_FIELDS}
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
      `SELECT ${CAMPER_FIELDS}
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
    const {
      name, email, age, cabin_id,
      guardian_name, guardian_phone,
      username: providedUsername, password: providedPassword,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Camper name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required so we can send credentials' });
    }

    let username = (providedUsername || '').trim();
    if (username) {
      const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
      if (existing) return res.status(409).json({ error: 'Username already exists' });
    } else {
      username = await generateUniqueUsername(db, name);
    }

    const tempPassword = (providedPassword && providedPassword.trim()) || generateTempPassword();
    const password_hash = bcrypt.hashSync(tempPassword, 10);

    const result = await db.run(
      `INSERT INTO users
         (name, username, password_hash, role, cabin_id, age, email, guardian_name, guardian_phone, must_change_password)
       VALUES (?, ?, ?, 'camper', ?, ?, ?, ?, ?, 1)`,
      [name.trim(), username, password_hash, cabin_id || null, age || null,
       email.trim(), guardian_name || null, guardian_phone || null]
    );

    res.status(201).json({
      camper: {
        id: result.lastInsertRowid,
        name: name.trim(),
        username,
        email: email.trim(),
        role: 'camper',
        cabin_id: cabin_id || null,
        age: age || null,
        guardian_name: guardian_name || null,
        guardian_phone: guardian_phone || null,
      },
      credentials: {
        username,
        temp_password: tempPassword,
        must_change_password: true,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create camper' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, cabin_id, age, email, guardian_name, guardian_phone } = req.body;

    await db.run(
      `UPDATE users
         SET name = ?, cabin_id = ?, age = ?, email = ?, guardian_name = ?, guardian_phone = ?
       WHERE id = ? AND role = 'camper'`,
      [name, cabin_id || null, age || null, email || null,
       guardian_name || null, guardian_phone || null, req.params.id]
    );

    res.json({ message: 'Camper updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update camper' });
  }
});

router.post('/:id/reset-password', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const camper = await db.get(
      "SELECT id, name, username, email FROM users WHERE id = ? AND role = 'camper'",
      [req.params.id]
    );
    if (!camper) return res.status(404).json({ error: 'Camper not found' });

    const tempPassword = generateTempPassword();
    const password_hash = bcrypt.hashSync(tempPassword, 10);

    await db.run(
      'UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?',
      [password_hash, req.params.id]
    );

    res.json({
      credentials: {
        username: camper.username,
        temp_password: tempPassword,
        must_change_password: true,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
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
