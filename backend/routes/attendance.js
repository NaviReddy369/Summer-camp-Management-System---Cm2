const express = require('express');
const { getDb } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
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

    const attendance = db.prepare(query).all(...params);
    res.json({ attendance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

router.post('/', authenticateToken, requireRole('counselor', 'admin'), (req, res) => {
  try {
    const { camper_id, date, present, notes } = req.body;

    if (!camper_id || !date) {
      return res.status(400).json({ error: 'Camper ID and date are required' });
    }

    const db = getDb();
    const existing = db.prepare(
      'SELECT id FROM attendance WHERE camper_id = ? AND date = ?'
    ).get(camper_id, date);

    if (existing) {
      db.prepare('UPDATE attendance SET present = ?, notes = ? WHERE id = ?')
        .run(present ? 1 : 0, notes || null, existing.id);
      return res.json({ message: 'Attendance updated', id: existing.id });
    }

    const result = db.prepare(
      'INSERT INTO attendance (camper_id, date, present, notes) VALUES (?, ?, ?, ?)'
    ).run(camper_id, date, present ? 1 : 0, notes || null);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

router.post('/bulk', authenticateToken, requireRole('counselor', 'admin'), (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    const db = getDb();
    const upsert = db.prepare(`
      INSERT INTO attendance (camper_id, date, present, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(camper_id, date) DO UPDATE SET present = excluded.present, notes = excluded.notes
    `);

    const checkExisting = db.prepare('SELECT id FROM attendance WHERE camper_id = ? AND date = ?');
    const update = db.prepare('UPDATE attendance SET present = ?, notes = ? WHERE camper_id = ? AND date = ?');
    const insert = db.prepare('INSERT INTO attendance (camper_id, date, present, notes) VALUES (?, ?, ?, ?)');

    const transaction = db.transaction((records) => {
      for (const record of records) {
        const existing = checkExisting.get(record.camper_id, record.date);
        if (existing) {
          update.run(record.present ? 1 : 0, record.notes || null, record.camper_id, record.date);
        } else {
          insert.run(record.camper_id, record.date, record.present ? 1 : 0, record.notes || null);
        }
      }
    });

    transaction(records);
    res.json({ message: 'Bulk attendance recorded', count: records.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record bulk attendance' });
  }
});

module.exports = router;
