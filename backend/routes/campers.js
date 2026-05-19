const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateTempPassword, generateUniqueUsername } = require('../utils/credentials');
const { sendWelcomeEmail, sendPasswordResetEmail, sendPickupReadyEmail } = require('../services/email');

const router = express.Router();

const CAMPER_FIELDS = `u.id, u.name, u.username, u.age, u.team_id, u.email, u.phone,
  u.guardian_name, u.guardian_phone, u.pickup_status, u.must_change_password,
  t.name as team_name, t.team_color`;

function getLoginUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    let campers;

    if (req.user.role === 'counselor') {
      campers = await db.all(
        `SELECT ${CAMPER_FIELDS}
         FROM users u LEFT JOIN teams t ON u.team_id = t.id
         WHERE u.role = 'camper' AND u.team_id = ?
         ORDER BY u.name`,
        [req.user.team_id]
      );
    } else {
      campers = await db.all(
        `SELECT ${CAMPER_FIELDS}
         FROM users u LEFT JOIN teams t ON u.team_id = t.id
         WHERE u.role = 'camper'
         ORDER BY u.name`
      );
    }

    res.json({ campers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campers' });
  }
});

router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const campers = await db.all(
      `SELECT ${CAMPER_FIELDS}
       FROM users u LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.role = 'camper' AND u.team_id = ?
       ORDER BY u.name`,
      [req.params.teamId]
    );
    res.json({ campers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team campers' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const camper = await db.get(
      `SELECT ${CAMPER_FIELDS}
       FROM users u LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.role = 'camper' AND u.id = ?`,
      [req.params.id]
    );
    if (!camper) return res.status(404).json({ error: 'Camper not found' });

    // Counselors can only see campers in their own team
    if (req.user.role === 'counselor' && camper.team_id !== req.user.team_id) {
      return res.status(403).json({ error: 'You can only view campers in your own team' });
    }

    res.json({ camper });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch camper' });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      name, email, age, team_id, cabin_id, // accept legacy cabin_id too
      guardian_name, guardian_phone,
      username: providedUsername, password: providedPassword,
    } = req.body;
    const teamId = team_id ?? cabin_id ?? null;

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
         (name, username, password_hash, role, team_id, age, email, guardian_name, guardian_phone, must_change_password)
       VALUES (?, ?, ?, 'camper', ?, ?, ?, ?, ?, 1)`,
      [name.trim(), username, password_hash, teamId || null, age || null,
       email.trim(), guardian_name || null, guardian_phone || null]
    );

    res.status(201).json({
      camper: {
        id: result.lastInsertRowid,
        name: name.trim(),
        username,
        email: email.trim(),
        role: 'camper',
        team_id: teamId || null,
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

    sendWelcomeEmail({
      to: email.trim(),
      name: name.trim(),
      username,
      tempPassword,
      role: 'camper',
      loginUrl: getLoginUrl(),
    }).catch((e) => console.error('[email] welcome (camper) failed:', e.message));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create camper' });
  }
});

router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, team_id, cabin_id, age, email, guardian_name, guardian_phone } = req.body;
    const teamId = team_id ?? cabin_id ?? null;

    await db.run(
      `UPDATE users
         SET name = ?, team_id = ?, age = ?, email = ?, guardian_name = ?, guardian_phone = ?
       WHERE id = ? AND role = 'camper'`,
      [name, teamId || null, age || null, email || null,
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

    if (camper.email) {
      sendPasswordResetEmail({
        to: camper.email,
        name: camper.name,
        username: camper.username,
        tempPassword,
        loginUrl: getLoginUrl(),
      }).catch((e) => console.error('[email] reset (camper) failed:', e.message));
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

const VALID_PICKUP_STATUS = new Set(['at_camp', 'ready', 'picked_up']);

router.put('/:id/pickup', authenticateToken, requireRole('counselor', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_PICKUP_STATUS.has(status)) {
      return res.status(400).json({ error: "status must be one of: 'at_camp', 'ready', 'picked_up'" });
    }

    const camper = await db.get(
      `SELECT u.id, u.name, u.email, u.guardian_name, u.guardian_phone, u.team_id, t.name as team_name
       FROM users u LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.id = ? AND u.role = 'camper'`,
      [req.params.id]
    );
    if (!camper) return res.status(404).json({ error: 'Camper not found' });

    if (req.user.role === 'counselor' && camper.team_id !== req.user.team_id) {
      return res.status(403).json({ error: 'You can only update campers in your own team' });
    }

    await db.run('UPDATE users SET pickup_status = ? WHERE id = ?', [status, req.params.id]);

    res.json({
      id: camper.id,
      name: camper.name,
      pickup_status: status,
      team_name: camper.team_name,
    });

    if (status === 'ready' && camper.email) {
      sendPickupReadyEmail({
        to: camper.email,
        guardianName: camper.guardian_name,
        camperName: camper.name,
        counselorName: req.user.name,
        cabinName: camper.team_name,
      }).catch((e) => console.error('[email] pickup-ready failed:', e.message));
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update pickup status' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM attendance WHERE camper_id = ?', [req.params.id]);
    await db.run('DELETE FROM announcement_acknowledgements WHERE user_id = ?', [req.params.id]);
    await db.run('DELETE FROM camper_special_notes WHERE camper_id = ?', [req.params.id]);
    await db.run('DELETE FROM admin_notes WHERE to_user_id = ?', [req.params.id]);
    await db.run('DELETE FROM users WHERE id = ? AND role = ?', [req.params.id, 'camper']);
    res.json({ message: 'Camper deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete camper' });
  }
});

module.exports = router;
