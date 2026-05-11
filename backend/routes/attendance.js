const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { camper_id, date, cabin_id } = req.query;

    let query = `
      SELECT a.*, u.name as camper_name, u.cabin_id, c.name as cabin_name
      FROM attendance a
      JOIN users u ON a.camper_id = u.id
      LEFT JOIN cabins c ON u.cabin_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (camper_id) {
      conditions.push('a.camper_id = ?');
      params.push(camper_id);
    }
    if (date) {
      conditions.push('a.date = ?');
      params.push(date);
    }
    if (cabin_id) {
      conditions.push('u.cabin_id = ?');
      params.push(cabin_id);
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY a.date DESC, u.name';

    const attendance = await db.all(query, params);
    res.json({ attendance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

router.post('/', authenticateToken, requireRole('counselor', 'admin'), async (req, res) => {
  try {
    const { camper_id, date, present, notes } = req.body;

    if (!camper_id || !date) {
      return res.status(400).json({ error: 'Camper ID and date are required' });
    }

    const existing = await db.get(
      'SELECT id FROM attendance WHERE camper_id = ? AND date = ?',
      [camper_id, date]
    );

    if (existing) {
      await db.run(
        'UPDATE attendance SET present = ?, notes = ? WHERE id = ?',
        [present ? 1 : 0, notes || null, existing.id]
      );
      return res.json({ message: 'Attendance updated', id: existing.id });
    }

    const result = await db.run(
      'INSERT INTO attendance (camper_id, date, present, notes) VALUES (?, ?, ?, ?)',
      [camper_id, date, present ? 1 : 0, notes || null]
    );

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

router.post('/bulk', authenticateToken, requireRole('counselor', 'admin'), async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    for (const record of records) {
      const existing = await db.get(
        'SELECT id FROM attendance WHERE camper_id = ? AND date = ?',
        [record.camper_id, record.date]
      );
      if (existing) {
        await db.run(
          'UPDATE attendance SET present = ?, notes = ? WHERE camper_id = ? AND date = ?',
          [record.present ? 1 : 0, record.notes || null, record.camper_id, record.date]
        );
      } else {
        await db.run(
          'INSERT INTO attendance (camper_id, date, present, notes) VALUES (?, ?, ?, ?)',
          [record.camper_id, record.date, record.present ? 1 : 0, record.notes || null]
        );
      }
    }

    res.json({ message: 'Bulk attendance recorded', count: records.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record bulk attendance' });
  }
});

module.exports = router;
