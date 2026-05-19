const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const GREETINGS = /\b(hi|hello|hey|howdy|sup|yo|good morning|good afternoon)\b/i;
const SCHEDULE_KW = /\b(schedule|timetable|when|what time|what day|calendar)\b/i;
const ACTIVITY_KW = /\b(activit|swimming|archery|arts|crafts|sports|bonfire|hiking|canoeing|nature|talent|climbing|things to do|fun)\b/i;
const TEAM_KW = /\b(team|cabin|eagle|falcon|bear|my team|teammate|teammates|roommate|bunk)\b/i;
const COUNSELOR_KW = /\b(counselor|counsellor|leader|who is my counselor|staff)\b/i;
const ATTENDANCE_KW = /\b(attendance|absent|present|miss|missed|show up)\b/i;
const ANNOUNCEMENT_KW = /\b(announcement|news|update|notice|whats new|what's new)\b/i;
const FOOD_KW = /\b(food|eat|meal|lunch|dinner|breakfast|snack|cafeteria)\b/i;
const HELP_KW = /\b(help|what can you|commands|options|what do you know)\b/i;
const CAMP_KW = /\b(camp|cm2|community matters|about)\b/i;

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.json({ reply: "I didn't catch that. Try asking me about activities, schedule, or teams!" });
    }

    const msg = message.trim();
    const user = req.user;
    let reply = '';

    if (GREETINGS.test(msg)) {
      const greetings = [
        `Hey ${user.name}! 👋 Welcome to CM2 Camp Chat! Ask me about activities, schedule, teams, or announcements.`,
        `Hi there, ${user.name}! 🏕️ How can I help? I know about schedules, activities, teams, and more!`,
        `Hello ${user.name}! 🌞 Ready to chat about camp? Ask me anything!`,
      ];
      reply = greetings[Math.floor(Math.random() * greetings.length)];
    } else if (HELP_KW.test(msg)) {
      reply = `Here's what I can help with! 🤓\n\n` +
        `📅 **Schedule** — "What's my schedule?" or "What's on Monday?"\n` +
        `🎯 **Activities** — "What activities are there?"\n` +
        `🏠 **Teams** — "Who's on my team?" or "Tell me about Eagle team"\n` +
        `👤 **Counselors** — "Who is my counselor?"\n` +
        `📋 **Attendance** — "How's my attendance?"\n` +
        `📢 **Announcements** — "Any new announcements?"\n` +
        `🏕️ **Camp info** — "Tell me about CM2"`;
    } else if (SCHEDULE_KW.test(msg)) {
      reply = await handleSchedule(msg, user);
    } else if (ACTIVITY_KW.test(msg)) {
      reply = await handleActivities(msg);
    } else if (TEAM_KW.test(msg)) {
      reply = await handleTeam(msg, user);
    } else if (COUNSELOR_KW.test(msg)) {
      reply = await handleCounselor(msg, user);
    } else if (ATTENDANCE_KW.test(msg)) {
      reply = await handleAttendance(user);
    } else if (ANNOUNCEMENT_KW.test(msg)) {
      reply = await handleAnnouncements(user);
    } else if (FOOD_KW.test(msg)) {
      reply = "🍕 Camp meals are served at the Main Hall!\n\n" +
        "**Breakfast**: 7:30 AM - 8:30 AM\n**Lunch**: 12:00 PM - 1:00 PM\n**Dinner**: 5:30 PM - 6:30 PM\n\n" +
        "Don't forget to bring your water bottle to activities! 💧";
    } else if (CAMP_KW.test(msg)) {
      reply = "🏕️ **Community Matters 2 (CM2)** is an extraordinary youth summer camp!\n\n" +
        "We offer swimming, archery, arts & crafts, hiking, team sports, bonfire nights, and much more. " +
        "Every camper is assigned to a team with a dedicated counselor. " +
        "It's all about fun, friendship, and adventure! 🌟";
    } else {
      const fallbacks = [
        `Hmm, I'm not sure about that! 🤔 Try asking about **schedule**, **activities**, **teams**, or **announcements**.`,
        `Great question, but I don't have info on that yet! Ask me about camp **activities**, **schedule**, or type **help** to see what I know. 😊`,
        `I'm still learning! 📚 I can help with **schedule**, **activities**, **teams**, **attendance**, and **announcements**. Type **help** for details!`,
      ];
      reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.json({ reply: "Oops, something went wrong! Try again in a moment. 🏕️" });
  }
});

async function handleSchedule(msg, user) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayMatch = days.find(d => msg.toLowerCase().includes(d));

  let teamId = user.team_id;
  if (user.role === 'admin') {
    const first = await db.get('SELECT id FROM teams LIMIT 1');
    teamId = first?.id || 1;
  }

  if (!teamId) {
    return "No team assigned yet, so I can't show a schedule. Ask the admin! 📋";
  }

  let schedule;
  if (dayMatch) {
    const dateMap = { monday: '2026-05-11', tuesday: '2026-05-12', wednesday: '2026-05-13', thursday: '2026-05-14', friday: '2026-05-15' };
    schedule = await db.all(
      `SELECT s.date, a.name, COALESCE(s.time_slot, a.time_slot) as time_slot, a.location
       FROM schedule s JOIN activities a ON s.activity_id = a.id
       WHERE s.team_id = ? AND s.date = ?
       ORDER BY COALESCE(s.time_slot, a.time_slot)`,
      [teamId, dateMap[dayMatch]]
    );
    if (schedule.length === 0) return `No activities scheduled for ${dayMatch.charAt(0).toUpperCase() + dayMatch.slice(1)}. Free day! 🌞`;
    let reply = `📅 **${dayMatch.charAt(0).toUpperCase() + dayMatch.slice(1)}'s Schedule:**\n\n`;
    schedule.forEach(s => { reply += `• **${s.name}** — ${s.time_slot} @ ${s.location}\n`; });
    return reply;
  }

  schedule = await db.all(
    `SELECT s.date, a.name, COALESCE(s.time_slot, a.time_slot) as time_slot, a.location
     FROM schedule s JOIN activities a ON s.activity_id = a.id
     WHERE s.team_id = ?
     ORDER BY s.date, COALESCE(s.time_slot, a.time_slot)`,
    [teamId]
  );
  if (schedule.length === 0) return "No schedule found yet. The fun is coming soon! 🏕️";

  const dayLabels = { '2026-05-11': 'Monday', '2026-05-12': 'Tuesday', '2026-05-13': 'Wednesday', '2026-05-14': 'Thursday', '2026-05-15': 'Friday' };
  let reply = "📅 **Your Weekly Schedule:**\n\n";
  let currentDay = '';
  schedule.forEach(s => {
    const day = dayLabels[s.date] || s.date;
    if (day !== currentDay) { reply += `**${day}:**\n`; currentDay = day; }
    reply += `  • ${s.name} — ${s.time_slot} @ ${s.location}\n`;
  });
  return reply;
}

async function handleActivities(msg) {
  const activities = await db.all('SELECT name, description, location, time_slot, day_of_week FROM activities ORDER BY day_of_week, time_slot');
  if (activities.length === 0) return "No activities yet — the fun is coming! 🏕️";

  const specific = activities.find(a => msg.toLowerCase().includes(a.name.toLowerCase()));
  if (specific) {
    return `🎯 **${specific.name}**\n\n${specific.description}\n\n📍 Location: ${specific.location}\n⏰ Time: ${specific.time_slot}\n📅 Day: ${specific.day_of_week}`;
  }

  let reply = "🎯 **All Camp Activities:**\n\n";
  activities.forEach(a => { reply += `• **${a.name}** — ${a.day_of_week} ${a.time_slot} @ ${a.location}\n`; });
  return reply;
}

async function handleTeam(msg, user) {
  const teamNames = ['eagle', 'falcon', 'bear'];
  const specific = teamNames.find(t => msg.toLowerCase().includes(t));

  if (specific) {
    const team = await db.get(
      `SELECT t.*, u.name as counselor_name FROM teams t LEFT JOIN users u ON t.counselor_id = u.id WHERE LOWER(t.name) = ?`,
      [specific]
    );
    if (!team) return `I couldn't find a team called "${specific}". We have Eagle, Falcon, and Bear! 🏠`;
    const campers = await db.all(`SELECT name, age FROM users WHERE team_id = ? AND role = 'camper' ORDER BY name`, [team.id]);
    let reply = `🏠 **${team.name} Team**\n\n👤 Counselor: ${team.counselor_name || 'Unassigned'}\n🎨 Color: ${team.team_color}\n👥 Campers (${campers.length}):\n`;
    campers.forEach(c => { reply += `  • ${c.name} (age ${c.age})\n`; });
    return reply;
  }

  if (user.team_id) {
    const team = await db.get(
      `SELECT t.*, u.name as counselor_name FROM teams t LEFT JOIN users u ON t.counselor_id = u.id WHERE t.id = ?`,
      [user.team_id]
    );
    const campers = await db.all(`SELECT name, age FROM users WHERE team_id = ? AND role = 'camper' ORDER BY name`, [user.team_id]);
    let reply = `🏠 **Your Team: ${team.name}**\n\n👤 Counselor: ${team.counselor_name || 'Unassigned'}\n👥 Team Mates (${campers.length}):\n`;
    campers.forEach(c => { reply += `  • ${c.name} (age ${c.age})\n`; });
    return reply;
  }

  const teams = await db.all(`SELECT t.name, (SELECT COUNT(*) FROM users WHERE team_id = t.id AND role = 'camper') as count FROM teams t`);
  let reply = "🏠 **Camp Teams:**\n\n";
  teams.forEach(c => { reply += `• **${c.name}** — ${c.count} campers\n`; });
  return reply;
}

async function handleCounselor(msg, user) {
  if (user.team_id) {
    const team = await db.get(
      `SELECT t.name, u.name as counselor_name FROM teams t LEFT JOIN users u ON t.counselor_id = u.id WHERE t.id = ?`,
      [user.team_id]
    );
    if (team?.counselor_name) {
      return `👤 Your counselor for **${team.name} Team** is **${team.counselor_name}**! Feel free to reach out to them anytime. 🧭`;
    }
  }
  const counselors = await db.all(
    `SELECT u.name, t.name as team_name FROM users u LEFT JOIN teams t ON u.team_id = t.id WHERE u.role = 'counselor' ORDER BY u.name`
  );
  let reply = "👤 **Camp Counselors:**\n\n";
  counselors.forEach(c => { reply += `• **${c.name}** — ${c.team_name || 'Unassigned'} Team\n`; });
  return reply;
}

async function handleAttendance(user) {
  if (user.role === 'camper') {
    const records = await db.all(
      'SELECT date, present, notes FROM attendance WHERE camper_id = ? ORDER BY date DESC LIMIT 7',
      [user.id]
    );
    if (records.length === 0) return "📋 No attendance records yet. Your counselor will start tracking soon!";
    const presentCount = records.filter(r => r.present).length;
    let reply = `📋 **Your Attendance** (${presentCount}/${records.length} days present)\n\n`;
    records.forEach(r => {
      const status = r.present ? '✅ Present' : '❌ Absent';
      reply += `• ${r.date} — ${status}${r.notes ? ` (${r.notes})` : ''}\n`;
    });
    return reply;
  }
  return "📋 You can view and manage attendance from your dashboard. Use the **Daily Attendance** section to mark campers present or absent!";
}

async function handleAnnouncements(user) {
  let query = `SELECT a.title, a.body, u.name as author_name, a.created_at, a.audience
               FROM announcements a JOIN users u ON a.author_id = u.id`;
  const params = [];
  if (user.role === 'camper') {
    query += ` WHERE a.audience IN ('all', 'campers')`;
  } else if (user.role === 'counselor') {
    query += ` WHERE a.audience IN ('all', 'counselors')`;
  }
  query += ' ORDER BY a.created_at DESC LIMIT 3';

  const announcements = await db.all(query, params);
  if (announcements.length === 0) return "📢 No announcements yet. Stay tuned for camp news!";

  let reply = "📢 **Latest Announcements:**\n\n";
  announcements.forEach(a => {
    reply += `**${a.title}**\n${a.body}\n— _${a.author_name}_\n\n`;
  });
  return reply;
}

module.exports = router;
