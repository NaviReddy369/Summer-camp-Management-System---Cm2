const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

async function notifyCounselor(camperId, noteText) {
  try {
    const camper = await db.get(
      `SELECT u.name as camper_name, u.guardian_name, u.team_id,
              t.name as team_name, t.counselor_id
       FROM users u LEFT JOIN teams t ON u.team_id = t.id
       WHERE u.id = ? AND u.role = 'camper'`,
      [camperId]
    );
    if (!camper?.counselor_id) return;

    const counselor = await db.get(
      'SELECT id, name, email FROM users WHERE id = ? AND role = ?',
      [camper.counselor_id, 'counselor']
    );
    if (!counselor?.email) return;

    const { sendEmail } = require('../services/email');
    const guardian = camper.guardian_name || 'A family member';
    const preview = (noteText || '').slice(0, 200);
    await sendEmail(
      counselor.email,
      `CM2 Camp — Family note updated for ${camper.camper_name}`,
      `<p>Hi <strong>${counselor.name}</strong>,</p>
       <p><strong>${guardian}</strong> updated the family note for <strong>${camper.camper_name}</strong> (${camper.team_name || 'team'}).</p>
       <blockquote style="border-left:4px solid #FF6B2C;padding-left:12px;color:#333;">${preview.replace(/</g, '&lt;')}</blockquote>
       <p>View it on your Counselor Dashboard roster.</p>`
    );
  } catch (e) {
    console.error('[special-notes] counselor notify failed:', e.message);
  }
}

router.get('/camper/:camperId', authenticateToken, async (req, res) => {
  try {
    const camperId = Number(req.params.camperId);
    const camper = await db.get(
      "SELECT id, team_id, guardian_name FROM users WHERE id = ? AND role = 'camper'",
      [camperId]
    );
    if (!camper) return res.status(404).json({ error: 'Camper not found' });

    const { role, id: userId, team_id } = req.user;
    if (role === 'counselor' && Number(team_id) !== Number(camper.team_id)) {
      return res.status(403).json({ error: 'Counselors can only view notes for their own team' });
    }
    if (role === 'camper' && Number(userId) !== camperId) {
      return res.status(403).json({ error: 'You can only view your own family note' });
    }

    const note = await db.get(
      `SELECT id, camper_id, note, updated_at, counselor_notified_at
       FROM camper_special_notes WHERE camper_id = ?`,
      [camperId]
    );

    const notes = note ? [{
      ...note,
      guardian_name: camper.guardian_name,
    }] : [];

    res.json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Camper account (used by family) saves one note per camper
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'camper') {
      return res.status(403).json({ error: 'Only camper accounts can save family notes' });
    }
    const { note } = req.body;
    const camperId = req.user.id;

    const existing = await db.get(
      'SELECT id FROM camper_special_notes WHERE camper_id = ?',
      [camperId]
    );

    if (existing) {
      await db.run(
        `UPDATE camper_special_notes
         SET note = ?, updated_at = CURRENT_TIMESTAMP, counselor_notified_at = NULL
         WHERE id = ?`,
        [note || '', existing.id]
      );
      notifyCounselor(camperId, note).then(async () => {
        await db.run(
          'UPDATE camper_special_notes SET counselor_notified_at = CURRENT_TIMESTAMP WHERE id = ?',
          [existing.id]
        );
      }).catch(() => {});
      return res.json({ id: existing.id, message: 'Note updated — your counselor has been notified' });
    }

    const result = await db.run(
      'INSERT INTO camper_special_notes (camper_id, note) VALUES (?, ?)',
      [camperId, note || '']
    );
    notifyCounselor(camperId, note).then(async () => {
      await db.run(
        'UPDATE camper_special_notes SET counselor_notified_at = CURRENT_TIMESTAMP WHERE id = ?',
        [result.lastInsertRowid]
      );
    }).catch(() => {});

    res.status(201).json({ id: result.lastInsertRowid, message: 'Note saved — your counselor has been notified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

module.exports = router;
