let resendClient = null;

function getClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  try {
    const { Resend } = require('resend');
    resendClient = new Resend(apiKey);
    return resendClient;
  } catch (err) {
    console.error('[email] Failed to initialize Resend client:', err.message);
    return null;
  }
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || 'CM2 Camp <onboarding@resend.dev>';
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseTemplate({ heading, intro, blocks = [], warning, footerNote = '' }) {
  const blocksHtml = blocks.map((b) => `
    <div style="margin: 14px 0;">
      <div style="font-size:12px; font-weight:700; color:#707070; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">${escapeHtml(b.label)}</div>
      <div style="background:#F5F5F5; border:1px solid #E8E8E8; border-radius:8px; padding:12px 14px; font-family: 'Courier New', monospace; font-size:15px; font-weight:700; color:${b.highlight ? '#FF6B2C' : '#1A1A2E'};">
        ${escapeHtml(b.value)}
      </div>
    </div>
  `).join('');

  const warningHtml = warning ? `
    <div style="margin: 20px 0 12px; padding: 12px 14px; background: rgba(255,217,61,0.15); border-left: 4px solid #FFD93D; border-radius:6px;">
      <strong style="color:#FF6B2C; font-size:14px;">⚠ ${escapeHtml(warning)}</strong>
    </div>
  ` : '';

  return `
  <!doctype html>
  <html><head><meta charset="utf-8"><title>${escapeHtml(heading)}</title></head>
  <body style="margin:0; padding:0; background:#F4F4F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color:#1A1A2E; line-height:1.5;">
    <div style="max-width:600px; margin:0 auto; padding:24px 16px;">
      <div style="background:#FF6B2C; color:#fff; padding:20px 24px; border-radius:12px 12px 0 0; text-align:center;">
        <div style="font-size:13px; font-weight:600; letter-spacing:1px; opacity:0.85;">COMMUNITY MATTERS 2</div>
        <div style="font-size:22px; font-weight:800; margin-top:4px;">CM2 Summer Camp</div>
      </div>
      <div style="background:#ffffff; padding:28px 24px; border-radius:0 0 12px 12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <h1 style="font-size:20px; margin:0 0 14px 0; color:#1A1A2E;">${escapeHtml(heading)}</h1>
        <div style="font-size:15px; color:#333; margin-bottom:8px;">${intro}</div>
        ${blocksHtml}
        ${warningHtml}
        ${footerNote ? `<div style="margin-top:16px; font-size:14px; color:#444;">${footerNote}</div>` : ''}
      </div>
      <div style="text-align:center; color:#999; font-size:12px; margin-top:18px;">
        CM2 Summer Camp 2026 — Where every day is an adventure! 🏕️
      </div>
    </div>
  </body></html>
  `;
}

async function sendEmail(to, subject, html) {
  const client = getClient();
  if (!client) {
    console.warn(`[email] Skipping email to ${to} ("${subject}") — RESEND_API_KEY not configured.`);
    return { skipped: true };
  }
  try {
    const result = await client.emails.send({
      from: getFromEmail(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    if (result.error) {
      console.error(`[email] Resend error sending to ${to}:`, result.error);
      return { error: result.error };
    }
    return { id: result.data?.id };
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err.message);
    return { error: err.message };
  }
}

async function sendWelcomeEmail({ to, name, username, tempPassword, role, loginUrl }) {
  try {
    if (!to) return;
    const roleLabel = ({ camper: 'Camper', counselor: 'Counselor', admin: 'Admin' })[role] || role;
    const html = baseTemplate({
      heading: 'Welcome to CM2 Summer Camp! 🏕️',
      intro: `Hi <strong>${escapeHtml(name)}</strong>, your account has been created. Here are your login details:`,
      blocks: [
        { label: 'Role', value: roleLabel },
        { label: 'Username', value: username },
        { label: 'Temporary Password', value: tempPassword, highlight: true },
        { label: 'Login URL', value: loginUrl },
      ],
      warning: 'Please log in and change your password immediately.',
      footerNote: 'If you did not expect this account, please contact the camp office.',
    });
    return await sendEmail(to, 'Welcome to CM2 Summer Camp — Your Login Details', html);
  } catch (err) {
    console.error('[email] sendWelcomeEmail error:', err.message);
  }
}

async function sendPasswordResetEmail({ to, name, username, tempPassword, loginUrl }) {
  try {
    if (!to) return;
    const html = baseTemplate({
      heading: 'Password Reset — CM2 Summer Camp',
      intro: `Hi <strong>${escapeHtml(name)}</strong>, an administrator has reset your password. Your new temporary credentials:`,
      blocks: [
        { label: 'Username', value: username },
        { label: 'New Temporary Password', value: tempPassword, highlight: true },
        { label: 'Login URL', value: loginUrl },
      ],
      warning: 'Please log in and change your password immediately.',
      footerNote: 'If you did not request this reset, please contact the camp office.',
    });
    return await sendEmail(to, 'CM2 Summer Camp — Your Password Has Been Reset', html);
  } catch (err) {
    console.error('[email] sendPasswordResetEmail error:', err.message);
  }
}

async function sendPickupReadyEmail({ to, guardianName, camperName, counselorName, cabinName }) {
  try {
    if (!to) return;
    const now = new Date().toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
    const greeting = guardianName ? `Hi <strong>${escapeHtml(guardianName)}</strong>,` : 'Hello,';
    const html = baseTemplate({
      heading: `🎒 ${camperName} is Ready for Pickup!`,
      intro: `${greeting} this is a quick note from CM2 Summer Camp.`,
      blocks: [
        { label: 'Camper', value: camperName },
        { label: 'Cabin', value: cabinName || 'Unassigned' },
        { label: 'Confirmed by Counselor', value: counselorName || 'Camp Staff' },
        { label: 'Notification Time', value: now },
      ],
      footerNote: '<strong>Please come to the main entrance to pick up your camper.</strong> Safe travels — and thanks for being part of CM2!',
    });
    return await sendEmail(to, `CM2 Summer Camp — ${camperName} is Ready for Pickup`, html);
  } catch (err) {
    console.error('[email] sendPickupReadyEmail error:', err.message);
  }
}

async function sendAbsenceAlertEmail({ to, guardianName, camperName, date }) {
  try {
    if (!to) return;
    const greeting = guardianName ? `Hi <strong>${escapeHtml(guardianName)}</strong>,` : 'Hello,';
    const html = baseTemplate({
      heading: `Attendance Notice — ${camperName}`,
      intro: `${greeting} we wanted to let you know about today's attendance:`,
      blocks: [
        { label: 'Camper', value: camperName },
        { label: 'Marked Absent', value: date },
      ],
      footerNote: `Please contact the camp office if this is unexpected.<br/><br/>📞 <strong>Contact us at the camp office</strong>`,
    });
    return await sendEmail(to, `CM2 Summer Camp — Attendance Notice for ${camperName}`, html);
  } catch (err) {
    console.error('[email] sendAbsenceAlertEmail error:', err.message);
  }
}

async function sendAnnouncementEmail({ toList, title, body, audience }) {
  try {
    if (!Array.isArray(toList) || toList.length === 0) return;
    const audienceLabel = audience === 'camper' ? 'Campers' : audience === 'counselor' ? 'Counselors' : 'Everyone';
    const html = baseTemplate({
      heading: `📢 ${title}`,
      intro: `<em>New announcement for <strong>${escapeHtml(audienceLabel)}</strong>:</em>`,
      blocks: [
        { label: 'Message', value: body },
      ],
      footerNote: 'Stay tuned for more camp updates!',
    });
    const subject = `CM2 Camp Announcement — ${title}`;
    const results = [];
    for (const to of toList) {
      if (!to) continue;
      const r = await sendEmail(to, subject, html);
      results.push({ to, ...r });
    }
    return results;
  } catch (err) {
    console.error('[email] sendAnnouncementEmail error:', err.message);
  }
}

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPickupReadyEmail,
  sendAbsenceAlertEmail,
  sendAnnouncementEmail,
};
