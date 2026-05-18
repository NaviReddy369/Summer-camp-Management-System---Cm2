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
  try {
    // Dynamic require prevents Vercel's bundler from tracing this native module
    const sqliteModule = 'better-sqlite3';
    const Database = require(sqliteModule);
    sqliteDb = new Database(path.join(__dirname, 'camp.db'));
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');
  } catch (err) {
    console.error('better-sqlite3 not available. Set POSTGRES_URL for production.', err.message);
  }
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
    email TEXT,
    phone TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    must_change_password INTEGER DEFAULT 1,
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
    email TEXT,
    phone TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    must_change_password INTEGER DEFAULT 1,
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
  await migrateAddColumns();

  const result = await db.get('SELECT COUNT(*) as count FROM users');
  if (Number(result.count) === 0) {
    await seedDatabase();
  }
}

async function migrateAddColumns() {
  const newColumns = [
    { name: 'email', type: 'TEXT' },
    { name: 'phone', type: 'TEXT' },
    { name: 'guardian_name', type: 'TEXT' },
    { name: 'guardian_phone', type: 'TEXT' },
    { name: 'must_change_password', type: 'INTEGER DEFAULT 1' },
  ];

  if (usePostgres) {
    for (const col of newColumns) {
      try {
        await db.exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } catch (e) {
        console.error(`Migration ${col.name} skipped:`, e.message);
      }
    }
  } else {
    const existing = await db.all("PRAGMA table_info(users)");
    const existingNames = new Set(existing.map((c) => c.name));
    for (const col of newColumns) {
      if (!existingNames.has(col.name)) {
        try {
          await db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
          console.error(`Migration ${col.name} failed:`, e.message);
        }
      }
    }
  }
}

async function seedDatabase() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  await db.run('INSERT INTO cabins (name, theme_color) VALUES (?, ?)', ['Eagle', '#FF6B2C']);
  await db.run('INSERT INTO cabins (name, theme_color) VALUES (?, ?)', ['Falcon', '#3498DB']);
  await db.run('INSERT INTO cabins (name, theme_color) VALUES (?, ?)', ['Bear', '#2ECC71']);

  const insertUserSql =
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age, email, phone, guardian_name, guardian_phone, must_change_password) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)';

  await db.run(insertUserSql, ['Camp Admin', 'admin', hash('admin123'), 'admin', null, null, 'admin@cm2camp.org', null, null, null]);

  await db.run(insertUserSql, ['Sarah Johnson', 'counselor1', hash('camp2024'), 'counselor', 1, 24, 'sarah@cm2camp.org', '555-0101', null, null]);
  await db.run(insertUserSql, ['Mike Chen', 'counselor2', hash('camp2024'), 'counselor', 2, 26, 'mike@cm2camp.org', '555-0102', null, null]);
  await db.run(insertUserSql, ['Lisa Park', 'counselor3', hash('camp2024'), 'counselor', 3, 23, 'lisa@cm2camp.org', '555-0103', null, null]);

  await db.run(insertUserSql, ['Alex Rivera', 'camper1', hash('camp2024'), 'camper', 1, 12, 'alex.rivera@example.com', null, 'Maria Rivera', '555-1001']);
  await db.run(insertUserSql, ['Jordan Smith', 'camper2', hash('camp2024'), 'camper', 1, 11, 'jordan.smith@example.com', null, 'Pat Smith', '555-1002']);
  await db.run(insertUserSql, ['Casey Brown', 'camper3', hash('camp2024'), 'camper', 2, 13, 'casey.brown@example.com', null, 'Sam Brown', '555-1003']);
  await db.run(insertUserSql, ['Taylor Davis', 'camper4', hash('camp2024'), 'camper', 2, 12, 'taylor.davis@example.com', null, 'Robin Davis', '555-1004']);
  await db.run(insertUserSql, ['Morgan Lee', 'camper5', hash('camp2024'), 'camper', 3, 11, 'morgan.lee@example.com', null, 'Jordan Lee', '555-1005']);
  await db.run(insertUserSql, ['Riley Wilson', 'camper6', hash('camp2024'), 'camper', 3, 14, 'riley.wilson@example.com', null, 'Chris Wilson', '555-1006']);

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
