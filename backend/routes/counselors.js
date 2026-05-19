const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateTempPassword, generateUniqueUsername } = require('../utils/credentials');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

function getLoginUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

const COUNSELOR_FIELDS = `u.id, u.name, u.username, u.email, u.phone, u.age, u.team_id,
  u.must_change_password, t.name as team_name, t.team_color`;

router.get('/', authenticateToken, requireRole('admin', 'counselor'), async (req, res) => {
  try {
    const counselors = await db.all(
      `SELECT ${COUNSELOR_FIELDS}
       FROM users u LEFT JOIN teams t ON u.team_id = t.id
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
      name, email, phone, age, team_id, cabin_id,
      username: providedUsername, password: providedPassword,
    } = req.body;
    const teamId = team_id ?? cabin_id ?? null;

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
         (name, username, password_hash, role, team_id, age, email, phone, must_change_password)
       VALUES (?, ?, ?, 'counselor', ?, ?, ?, ?, 1)`,
      [name.trim(), username, password_hash, teamId || null, age || null,
       email.trim(), phone || null]
    );

    if (teamId) {
      const team = await db.get('SELECT counselor_id FROM teams WHERE id = ?', [teamId]);
      if (team && !team.counselor_id) {
        await db.run('UPDATE teams SET counselor_id = ? WHERE id = ?', [result.lastInsertRowid, teamId]);
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
        team_id: teamId || null,
        age: age || null,
      },
      credentials: {
        username,
        temp_password: tempPassword,
        must_change_password: true,
      },
    });

    sendWelcomeEmail({
      to: email.trim(),
      name: name.trim(),
      username,
      tempPassword,
      role: 'counselor',
      loginUrl: getLoginUrl(),
    }).catch((e) => console.error('[email] welcome (counselor) failed:', e.message));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create counselor' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, age, team_id, cabin_id } = req.body;
    const teamId = team_id ?? cabin_id ?? null;

    await db.run(
      `UPDATE users
         SET name = ?, email = ?, phone = ?, age = ?, team_id = ?
       WHERE id = ? AND role = 'counselor'`,
      [name, email || null, phone || null, age || null, teamId || null, req.params.id]
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

    if (counselor.email) {
      sendPasswordResetEmail({
        to: counselor.email,
        name: counselor.name,
        username: counselor.username,
        tempPassword,
        loginUrl: getLoginUrl(),
      }).catch((e) => console.error('[email] reset (counselor) failed:', e.message));
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('UPDATE teams SET counselor_id = NULL WHERE counselor_id = ?', [req.params.id]);
    await db.run('DELETE FROM admin_notes WHERE to_user_id = ?', [req.params.id]);
    await db.run('DELETE FROM announcement_acknowledgements WHERE user_id = ?', [req.params.id]);
    await db.run('DELETE FROM counselor_schedule WHERE counselor_id = ?', [req.params.id]);
    await db.run("DELETE FROM users WHERE id = ? AND role = 'counselor'", [req.params.id]);
    res.json({ message: 'Counselor deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete counselor' });
  }
});

module.exports = router;
