const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateTempPassword, generateUniqueUsername } = require('../utils/credentials');

const router = express.Router();

const COUNSELOR_FIELDS = `u.id, u.name, u.username, u.email, u.phone, u.age, u.cabin_id,
  u.must_change_password, c.name as cabin_name`;

router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const counselors = await db.all(
      `SELECT ${COUNSELOR_FIELDS}
       FROM users u LEFT JOIN cabins c ON u.cabin_id = c.id
       WHERE u.role = 'counselor'
       ORDER BY u.name`
    );
    res.json({ counselors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch counselors' });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      name, email, phone, age, cabin_id,
      username: providedUsername, password: providedPassword,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Counselor name is required' });
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
         (name, username, password_hash, role, cabin_id, age, email, phone, must_change_password)
       VALUES (?, ?, ?, 'counselor', ?, ?, ?, ?, 1)`,
      [name.trim(), username, password_hash, cabin_id || null, age || null,
       email.trim(), phone || null]
    );

    // If a cabin was specified and has no counselor yet, link them
    if (cabin_id) {
      const cabin = await db.get('SELECT counselor_id FROM cabins WHERE id = ?', [cabin_id]);
      if (cabin && !cabin.counselor_id) {
        await db.run('UPDATE cabins SET counselor_id = ? WHERE id = ?', [result.lastInsertRowid, cabin_id]);
      }
    }

    res.status(201).json({
      counselor: {
        id: result.lastInsertRowid,
        name: name.trim(),
        username,
        email: email.trim(),
        phone: phone || null,
        role: 'counselor',
        cabin_id: cabin_id || null,
        age: age || null,
      },
      credentials: {
        username,
        temp_password: tempPassword,
        must_change_password: true,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create counselor' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, age, cabin_id } = req.body;

    await db.run(
      `UPDATE users
         SET name = ?, email = ?, phone = ?, age = ?, cabin_id = ?
       WHERE id = ? AND role = 'counselor'`,
      [name, email || null, phone || null, age || null, cabin_id || null, req.params.id]
    );

    res.json({ message: 'Counselor updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update counselor' });
  }
});

router.post('/:id/reset-password', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const counselor = await db.get(
      "SELECT id, name, username, email FROM users WHERE id = ? AND role = 'counselor'",
      [req.params.id]
    );
    if (!counselor) return res.status(404).json({ error: 'Counselor not found' });

    const tempPassword = generateTempPassword();
    const password_hash = bcrypt.hashSync(tempPassword, 10);

    await db.run(
      'UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?',
      [password_hash, req.params.id]
    );

    res.json({
      credentials: {
        username: counselor.username,
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
    // Unlink from any cabins they lead
    await db.run('UPDATE cabins SET counselor_id = NULL WHERE counselor_id = ?', [req.params.id]);
    await db.run("DELETE FROM users WHERE id = ? AND role = 'counselor'", [req.params.id]);
    res.json({ message: 'Counselor deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete counselor' });
  }
});

module.exports = router;
