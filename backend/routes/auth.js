const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.get(
      'SELECT u.*, c.name as cabin_name FROM users u LEFT JOIN cabins c ON u.cabin_id = c.id WHERE u.username = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name, cabin_id: user.cabin_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        cabin_id: user.cabin_id,
        cabin_name: user.cabin_name,
        age: user.age,
        email: user.email,
        must_change_password: Number(user.must_change_password ?? 0) === 1 ? 1 : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get(
      `SELECT u.id, u.name, u.username, u.role, u.cabin_id, u.age, u.email, u.must_change_password,
              c.name as cabin_name
       FROM users u LEFT JOIN cabins c ON u.cabin_id = c.id WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        ...user,
        must_change_password: Number(user.must_change_password ?? 0) === 1 ? 1 : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await db.get('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    if (bcrypt.compareSync(newPassword, user.password_hash)) {
      return res.status(400).json({ error: 'New password must be different from the current one' });
    }

    const password_hash = bcrypt.hashSync(newPassword, 10);
    await db.run(
      'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
      [password_hash, req.user.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
