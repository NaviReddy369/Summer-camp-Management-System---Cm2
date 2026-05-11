const bcrypt = require('bcryptjs');
const path = require('path');

const usePostgres = !!process.env.POSTGRES_URL;

let pool, sqliteDb;

if (usePostgres) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });
} else {
  const Database = require('better-sqlite3');
  sqliteDb = new Database(path.join(__dirname, 'camp.db'));
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
}

function pgParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const db = {
  async get(sql, params = []) {
    if (usePostgres) {
      const { rows } = await pool.query(pgParams(sql), params);
      return rows[0] || undefined;
    }
    return sqliteDb.prepare(sql).get(...params);
  },

  async all(sql, params = []) {
    if (usePostgres) {
      const { rows } = await pool.query(pgParams(sql), params);
      return rows;
    }
    return sqliteDb.prepare(sql).all(...params);
  },

  async run(sql, params = []) {
    if (usePostgres) {
      let pgSql = pgParams(sql);
      const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
      if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }
      const result = await pool.query(pgSql, params);
      return {
        changes: result.rowCount,
        lastInsertRowid: isInsert && result.rows[0] ? result.rows[0].id : null,
      };
    }
    const result = sqliteDb.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
  },

  async exec(sql) {
    if (usePostgres) {
      await pool.query(sql);
      return;
    }
    sqliteDb.exec(sql);
  },
};

const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS cabins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    counselor_id INTEGER,
    theme_color TEXT DEFAULT '#FF6B2C'
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('camper','counselor','admin')),
    cabin_id INTEGER REFERENCES cabins(id),
    age INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    time_slot TEXT,
    day_of_week TEXT
  );
  CREATE TABLE IF NOT EXISTS schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cabin_id INTEGER NOT NULL REFERENCES cabins(id),
    activity_id INTEGER NOT NULL REFERENCES activities(id),
    date TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camper_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    present INTEGER DEFAULT 1,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    audience TEXT DEFAULT 'all'
  );
`;

const POSTGRES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS cabins (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    counselor_id INTEGER,
    theme_color TEXT DEFAULT '#FF6B2C'
  );
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('camper','counselor','admin')),
    cabin_id INTEGER REFERENCES cabins(id),
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    time_slot TEXT,
    day_of_week TEXT
  );
  CREATE TABLE IF NOT EXISTS schedule (
    id SERIAL PRIMARY KEY,
    cabin_id INTEGER NOT NULL REFERENCES cabins(id),
    activity_id INTEGER NOT NULL REFERENCES activities(id),
    date TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    camper_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    present INTEGER DEFAULT 1,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    audience TEXT DEFAULT 'all'
  );
`;

async function initializeDatabase() {
  await db.exec(usePostgres ? POSTGRES_SCHEMA : SQLITE_SCHEMA);

  const result = await db.get('SELECT COUNT(*) as count FROM users');
  if (Number(result.count) === 0) {
    await seedDatabase();
  }
}

async function seedDatabase() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  await db.run('INSERT INTO cabins (name, theme_color) VALUES (?, ?)', ['Eagle', '#FF6B2C']);
  await db.run('INSERT INTO cabins (name, theme_color) VALUES (?, ?)', ['Falcon', '#3498DB']);
  await db.run('INSERT INTO cabins (name, theme_color) VALUES (?, ?)', ['Bear', '#2ECC71']);

  await db.run(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
    ['Camp Admin', 'admin', hash('admin123'), 'admin', null, null]
  );
  await db.run(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
    ['Sarah Johnson', 'counselor1', hash('camp2024'), 'counselor', 1, 24]
  );
  await db.run(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
    ['Mike Chen', 'counselor2', hash('camp2024'), 'counselor', 2, 26]
  );
  await db.run(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
    ['Lisa Park', 'counselor3', hash('camp2024'), 'counselor', 3, 23]
  );
  await db.run(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
    ['Alex Rivera', 'camper1', hash('camp2024'), 'camper', 1, 12]
  );
  await db.run(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
    ['Jordan Smith', 'camper2', hash('camp2024'), 'camper', 1, 11]
  );
  await db.run(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
    ['Casey Brown', 'camper3', hash('camp2024'), 'camper', 2, 13]
  );
  await db.run(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
    ['Taylor Davis', 'camper4', hash('camp2024'), 'camper', 2, 12]
  );
  await db.run(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
    ['Morgan Lee', 'camper5', hash('camp2024'), 'camper', 3, 11]
  );
  await db.run(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)',
    ['Riley Wilson', 'camper6', hash('camp2024'), 'camper', 3, 14]
  );

  await db.run('UPDATE cabins SET counselor_id = 2 WHERE id = 1');
  await db.run('UPDATE cabins SET counselor_id = 3 WHERE id = 2');
  await db.run('UPDATE cabins SET counselor_id = 4 WHERE id = 3');

  const activities = [
    ['Swimming', 'Cool off with laps and water games!', 'Lake Cove', '9:00 AM - 10:30 AM', 'Monday'],
    ['Archery', 'Learn to shoot like Robin Hood!', 'Archery Range', '11:00 AM - 12:00 PM', 'Monday'],
    ['Arts & Crafts', 'Get creative with paints, clay, and more!', 'Art Cabin', '2:00 PM - 3:30 PM', 'Tuesday'],
    ['Team Sports', 'Soccer, basketball, and more team fun!', 'Main Field', '9:00 AM - 10:30 AM', 'Wednesday'],
    ["Bonfire Night", "Stories, s'mores, and stargazing!", 'Fire Pit', '7:00 PM - 9:00 PM', 'Friday'],
    ['Hiking', 'Explore the trails and discover nature!', 'Mountain Trail', '9:00 AM - 11:30 AM', 'Thursday'],
    ['Canoeing', 'Paddle across the lake with your cabin!', 'Lake Dock', '2:00 PM - 3:30 PM', 'Wednesday'],
    ['Nature Study', 'Identify plants, bugs, and birds!', 'Forest Path', '11:00 AM - 12:00 PM', 'Tuesday'],
    ['Talent Show Prep', 'Practice your act for Friday night!', 'Main Hall', '2:00 PM - 3:30 PM', 'Thursday'],
    ['Rock Climbing', 'Conquer the climbing wall!', 'Climbing Wall', '11:00 AM - 12:00 PM', 'Wednesday'],
  ];
  for (const a of activities) {
    await db.run(
      'INSERT INTO activities (name, description, location, time_slot, day_of_week) VALUES (?, ?, ?, ?, ?)', a
    );
  }

  const weekDates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];
  const scheduleEntries = [
    [1, 1, weekDates[0]], [2, 2, weekDates[0]], [3, 1, weekDates[0]],
    [1, 3, weekDates[1]], [2, 8, weekDates[1]], [3, 3, weekDates[1]],
    [1, 4, weekDates[2]], [2, 7, weekDates[2]], [3, 10, weekDates[2]],
    [1, 6, weekDates[3]], [2, 9, weekDates[3]], [3, 6, weekDates[3]],
    [1, 5, weekDates[4]], [2, 5, weekDates[4]], [3, 5, weekDates[4]],
  ];
  for (const s of scheduleEntries) {
    await db.run('INSERT INTO schedule (cabin_id, activity_id, date) VALUES (?, ?, ?)', s);
  }

  for (let camperId = 5; camperId <= 10; camperId++) {
    for (const date of weekDates.slice(0, 3)) {
      await db.run(
        'INSERT INTO attendance (camper_id, date, present, notes) VALUES (?, ?, ?, ?)',
        [camperId, date, 1, null]
      );
    }
  }
  await db.run(
    'INSERT INTO attendance (camper_id, date, present, notes) VALUES (?, ?, ?, ?)',
    [7, weekDates[3], 0, 'Feeling unwell']
  );

  await db.run(
    'INSERT INTO announcements (author_id, title, body, audience) VALUES (?, ?, ?, ?)',
    [1, 'Welcome to CM2 Summer Camp 2026!', 'We are thrilled to have everyone here! Get ready for an amazing week of fun, friendship, and adventure. Check your cabin assignments and schedule!', 'all']
  );
  await db.run(
    'INSERT INTO announcements (author_id, title, body, audience) VALUES (?, ?, ?, ?)',
    [2, 'Eagle Cabin — Campfire Song Practice', "Eagles! Let's meet at 4 PM today to rehearse our campfire song. Bring your energy!", 'camper']
  );
  await db.run(
    'INSERT INTO announcements (author_id, title, body, audience) VALUES (?, ?, ?, ?)',
    [1, 'Schedule Update', 'Due to weather, Thursday hiking has been moved to the indoor gym for Team Sports instead. Stay tuned!', 'all']
  );
  await db.run(
    'INSERT INTO announcements (author_id, title, body, audience) VALUES (?, ?, ?, ?)',
    [3, 'Falcon Cabin Reminder', "Don't forget your water bottles and sunscreen for tomorrow's canoeing trip!", 'camper']
  );

  console.log('Database seeded successfully!');
}

module.exports = { db, initializeDatabase };
