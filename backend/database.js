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
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    counselor_id INTEGER,
    team_color TEXT DEFAULT '#FF6B2C'
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    team_id INTEGER REFERENCES teams(id),
    age INTEGER,
    email TEXT,
    phone TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    must_change_password INTEGER DEFAULT 1,
    pickup_status TEXT DEFAULT 'at_camp',
    parent_of_camper_id INTEGER REFERENCES users(id),
    role_extended TEXT,
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
    team_id INTEGER NOT NULL REFERENCES teams(id),
    activity_id INTEGER NOT NULL REFERENCES activities(id),
    date TEXT NOT NULL,
    time_slot TEXT
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
    audience TEXT DEFAULT 'all',
    target_user_id INTEGER REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS announcement_acknowledgements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    acknowledged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(announcement_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS camper_special_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camper_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    note TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    counselor_notified_at DATETIME
  );
  CREATE TABLE IF NOT EXISTS admin_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    note_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME
  );
  CREATE TABLE IF NOT EXISTS counselor_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    counselor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    duty TEXT NOT NULL,
    notes TEXT
  );
`;

const POSTGRES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    counselor_id INTEGER,
    team_color TEXT DEFAULT '#FF6B2C'
  );
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    team_id INTEGER REFERENCES teams(id),
    age INTEGER,
    email TEXT,
    phone TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    must_change_password INTEGER DEFAULT 1,
    pickup_status TEXT DEFAULT 'at_camp',
    parent_of_camper_id INTEGER REFERENCES users(id),
    role_extended TEXT,
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
    team_id INTEGER NOT NULL REFERENCES teams(id),
    activity_id INTEGER NOT NULL REFERENCES activities(id),
    date TEXT NOT NULL,
    time_slot TEXT
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
    audience TEXT DEFAULT 'all',
    target_user_id INTEGER REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS announcement_acknowledgements (
    id SERIAL PRIMARY KEY,
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(announcement_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS camper_special_notes (
    id SERIAL PRIMARY KEY,
    camper_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    note TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    counselor_notified_at TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS admin_notes (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS counselor_schedule (
    id SERIAL PRIMARY KEY,
    counselor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    duty TEXT NOT NULL,
    notes TEXT
  );
`;

// ──────────────────────────────────────────────────────────────────
// MIGRATIONS — handle old DBs that used `cabins` / `cabin_id` / `theme_color`
// and a CHECK constraint on users.role that excluded 'parent'.
// ──────────────────────────────────────────────────────────────────

async function tableExists(name) {
  if (usePostgres) {
    const r = await db.get(
      "SELECT 1 as e FROM information_schema.tables WHERE table_name = ? AND table_schema = current_schema()",
      [name]
    );
    return !!r;
  }
  const r = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [name]);
  return !!r;
}

async function columnExists(table, column) {
  if (usePostgres) {
    const r = await db.get(
      "SELECT 1 as e FROM information_schema.columns WHERE table_name = ? AND column_name = ?",
      [table, column]
    );
    return !!r;
  }
  const cols = await db.all(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

async function getSqliteTableSql(name) {
  const row = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?", [name]);
  return row?.sql || '';
}

async function migrateLegacyCabinsToTeams() {
  // 1) Rename cabins → teams if needed
  const hasCabins = await tableExists('cabins');
  const hasTeams = await tableExists('teams');

  if (hasCabins && !hasTeams) {
    await db.exec('ALTER TABLE cabins RENAME TO teams');
  }

  // 2) Ensure team_color column on teams
  if (await tableExists('teams')) {
    const hasThemeColor = await columnExists('teams', 'theme_color');
    const hasTeamColor = await columnExists('teams', 'team_color');
    if (!hasTeamColor && hasThemeColor) {
      // Rename theme_color → team_color
      try {
        await db.exec('ALTER TABLE teams RENAME COLUMN theme_color TO team_color');
      } catch (e) {
        // Fallback: add column and copy
        await db.exec("ALTER TABLE teams ADD COLUMN team_color TEXT DEFAULT '#FF6B2C'");
        await db.exec('UPDATE teams SET team_color = theme_color WHERE team_color IS NULL');
      }
    } else if (!hasTeamColor) {
      await db.exec("ALTER TABLE teams ADD COLUMN team_color TEXT DEFAULT '#FF6B2C'");
    }
  }

  // 3) Rename users.cabin_id → users.team_id
  if (await tableExists('users')) {
    const hasCabinId = await columnExists('users', 'cabin_id');
    const hasTeamId = await columnExists('users', 'team_id');
    if (hasCabinId && !hasTeamId) {
      try {
        await db.exec('ALTER TABLE users RENAME COLUMN cabin_id TO team_id');
      } catch (e) {
        await db.exec('ALTER TABLE users ADD COLUMN team_id INTEGER');
        await db.exec('UPDATE users SET team_id = cabin_id');
      }
    }
  }

  // 4) Rename schedule.cabin_id → schedule.team_id
  if (await tableExists('schedule')) {
    const hasCabinId = await columnExists('schedule', 'cabin_id');
    const hasTeamId = await columnExists('schedule', 'team_id');
    if (hasCabinId && !hasTeamId) {
      try {
        await db.exec('ALTER TABLE schedule RENAME COLUMN cabin_id TO team_id');
      } catch (e) {
        await db.exec('ALTER TABLE schedule ADD COLUMN team_id INTEGER');
        await db.exec('UPDATE schedule SET team_id = cabin_id');
      }
    }
  }
}

async function migrateAddColumns() {
  const newUserCols = [
    { name: 'email', type: 'TEXT' },
    { name: 'phone', type: 'TEXT' },
    { name: 'guardian_name', type: 'TEXT' },
    { name: 'guardian_phone', type: 'TEXT' },
    { name: 'must_change_password', type: 'INTEGER DEFAULT 1' },
    { name: 'pickup_status', type: "TEXT DEFAULT 'at_camp'" },
    { name: 'parent_of_camper_id', type: 'INTEGER' },
    { name: 'role_extended', type: 'TEXT' },
  ];
  const newScheduleCols = [
    { name: 'time_slot', type: 'TEXT' },
  ];
  const newAnnCols = [
    { name: 'target_user_id', type: 'INTEGER' },
  ];
  const newSpecialNoteCols = [
    { name: 'counselor_notified_at', type: 'DATETIME' },
  ];

  const addCols = async (table, cols) => {
    if (!(await tableExists(table))) return;
    if (usePostgres) {
      for (const col of cols) {
        try {
          await db.exec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        } catch (e) {
          console.error(`Migration ${table}.${col.name} skipped:`, e.message);
        }
      }
    } else {
      for (const col of cols) {
        if (!(await columnExists(table, col.name))) {
          try {
            await db.exec(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
          } catch (e) {
            console.error(`Migration ${table}.${col.name} failed:`, e.message);
          }
        }
      }
    }
  };

  await addCols('users', newUserCols);
  await addCols('schedule', newScheduleCols);
  await addCols('announcements', newAnnCols);
  await addCols('camper_special_notes', newSpecialNoteCols);
}

async function migrateAllowParentRole() {
  // Allow 'parent' in users.role — drop the old CHECK constraint.
  if (usePostgres) {
    try {
      await db.exec(`
        DO $$ DECLARE r RECORD;
        BEGIN
          FOR r IN SELECT conname FROM pg_constraint
                   WHERE conrelid = 'users'::regclass AND contype = 'c'
          LOOP EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(r.conname);
          END LOOP;
        END $$;
      `);
    } catch (e) {
      console.error('drop role check (pg):', e.message);
    }
    return;
  }

  // SQLite: detect CHECK on role and recreate table without it.
  const sql = await getSqliteTableSql('users');
  if (!sql) return;
  if (sql.includes("CHECK(role IN") || sql.includes("CHECK (role IN") || sql.includes("CHECK(role in")) {
    try {
      sqliteDb.exec('BEGIN');
      sqliteDb.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL,
          team_id INTEGER REFERENCES teams(id),
          age INTEGER,
          email TEXT,
          phone TEXT,
          guardian_name TEXT,
          guardian_phone TEXT,
          must_change_password INTEGER DEFAULT 1,
          pickup_status TEXT DEFAULT 'at_camp',
          parent_of_camper_id INTEGER REFERENCES users(id),
          role_extended TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // Copy data — only the columns that exist
      const cols = sqliteDb.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
      const wanted = [
        'id', 'name', 'username', 'password_hash', 'role', 'team_id', 'age',
        'email', 'phone', 'guardian_name', 'guardian_phone',
        'must_change_password', 'pickup_status', 'parent_of_camper_id', 'role_extended',
        'created_at',
      ];
      const present = wanted.filter((c) => cols.includes(c));
      const placeholders = wanted.map((c) => (cols.includes(c) ? c : 'NULL')).join(', ');
      sqliteDb.exec(`INSERT INTO users_new (${wanted.join(', ')}) SELECT ${placeholders} FROM users`);
      sqliteDb.exec('DROP TABLE users');
      sqliteDb.exec('ALTER TABLE users_new RENAME TO users');
      sqliteDb.exec('COMMIT');
    } catch (e) {
      sqliteDb.exec('ROLLBACK');
      console.error('SQLite users CHECK rebuild failed:', e.message);
    }
  }
}

async function migrateRemoveParentAccounts() {
  try {
    await db.run("DELETE FROM users WHERE role = 'parent'");
  } catch (e) {
    console.error('remove parent accounts:', e.message);
  }
}

async function migrateAudienceValues() {
  // Old code used 'camper' / 'counselor' (singular). Normalize to plural per spec.
  try {
    await db.run("UPDATE announcements SET audience = 'campers' WHERE audience = 'camper'");
    await db.run("UPDATE announcements SET audience = 'counselors' WHERE audience = 'counselor'");
  } catch (e) {
    console.error('audience normalize:', e.message);
  }
}

async function initializeDatabase() {
  // Step 1: rename legacy cabins/cabin_id → teams/team_id BEFORE CREATE IF NOT EXISTS
  await migrateLegacyCabinsToTeams();

  // Step 2: create any missing tables
  await db.exec(usePostgres ? POSTGRES_SCHEMA : SQLITE_SCHEMA);

  // Step 3: add new columns to legacy tables
  await migrateAddColumns();

  // Step 4: drop role CHECK so we can use 'parent'
  await migrateAllowParentRole();

  // Step 5: normalize old audience strings
  await migrateAudienceValues();

  // Step 6: remove deprecated parent role accounts (merged into camper)
  await migrateRemoveParentAccounts();

  const result = await db.get('SELECT COUNT(*) as count FROM users');
  if (Number(result.count) === 0) {
    await seedDatabase();
  }
}

async function seedDatabase() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  await db.run('INSERT INTO teams (name, team_color) VALUES (?, ?)', ['Eagle', '#FF6B2C']);
  await db.run('INSERT INTO teams (name, team_color) VALUES (?, ?)', ['Falcon', '#3498DB']);
  await db.run('INSERT INTO teams (name, team_color) VALUES (?, ?)', ['Bear', '#2ECC71']);

  const insertUserSql =
    'INSERT INTO users (name, username, password_hash, role, team_id, age, email, phone, guardian_name, guardian_phone, must_change_password) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)';

  await db.run(insertUserSql, ['Camp Admin', 'admin', hash('admin123'), 'admin', null, null, 'admin@cm2camp.org', null, null, null]);

  await db.run(insertUserSql, ['Sarah Johnson', 'counselor1', hash('camp2024'), 'counselor', 1, 24, 'sarah@cm2camp.org', '555-0101', null, null]);
  await db.run(insertUserSql, ['Mike Chen', 'counselor2', hash('camp2024'), 'counselor', 2, 26, 'mike@cm2camp.org', '555-0102', null, null]);
  await db.run(insertUserSql, ['Lisa Park', 'counselor3', hash('camp2024'), 'counselor', 3, 23, 'lisa@cm2camp.org', '555-0103', null, null]);

  await db.run(insertUserSql, ['Alex Rivera', 'camper1', hash('camp2024'), 'camper', 1, 6, 'alex.rivera@example.com', null, 'Maria Rivera', '555-1001']);
  await db.run(insertUserSql, ['Jordan Smith', 'camper2', hash('camp2024'), 'camper', 1, 5, 'jordan.smith@example.com', null, 'Pat Smith', '555-1002']);
  await db.run(insertUserSql, ['Casey Brown', 'camper3', hash('camp2024'), 'camper', 2, 7, 'casey.brown@example.com', null, 'Sam Brown', '555-1003']);
  await db.run(insertUserSql, ['Taylor Davis', 'camper4', hash('camp2024'), 'camper', 2, 6, 'taylor.davis@example.com', null, 'Robin Davis', '555-1004']);
  await db.run(insertUserSql, ['Morgan Lee', 'camper5', hash('camp2024'), 'camper', 3, 5, 'morgan.lee@example.com', null, 'Jordan Lee', '555-1005']);
  await db.run(insertUserSql, ['Riley Wilson', 'camper6', hash('camp2024'), 'camper', 3, 7, 'riley.wilson@example.com', null, 'Chris Wilson', '555-1006']);

  await db.run('UPDATE teams SET counselor_id = 2 WHERE id = 1');
  await db.run('UPDATE teams SET counselor_id = 3 WHERE id = 2');
  await db.run('UPDATE teams SET counselor_id = 4 WHERE id = 3');

  const activities = [
    ['Swimming', 'Cool off with laps and water games!', 'Lake Cove', '9:00 AM - 10:30 AM', 'Monday'],
    ['Archery', 'Learn to shoot like Robin Hood!', 'Archery Range', '11:00 AM - 12:00 PM', 'Monday'],
    ['Arts & Crafts', 'Get creative with paints, clay, and more!', 'Art Cabin', '2:00 PM - 3:30 PM', 'Tuesday'],
    ['Team Sports', 'Soccer, basketball, and more team fun!', 'Main Field', '9:00 AM - 10:30 AM', 'Wednesday'],
    ["Bonfire Night", "Stories, s'mores, and stargazing!", 'Fire Pit', '7:00 PM - 9:00 PM', 'Friday'],
    ['Hiking', 'Explore the trails and discover nature!', 'Mountain Trail', '9:00 AM - 11:30 AM', 'Thursday'],
    ['Canoeing', 'Paddle across the lake with your team!', 'Lake Dock', '2:00 PM - 3:30 PM', 'Wednesday'],
    ['Nature Study', 'Identify plants, bugs, and birds!', 'Forest Path', '11:00 AM - 12:00 PM', 'Tuesday'],
    ['Talent Show Prep', 'Practice your act for Friday night!', 'Main Hall', '2:00 PM - 3:30 PM', 'Thursday'],
    ['Rock Climbing', 'Conquer the climbing wall!', 'Climbing Wall', '11:00 AM - 12:00 PM', 'Wednesday'],
    ['Breakfast', 'Fuel up for the day!', 'Main Hall', '7:30 AM - 8:00 AM', 'Daily'],
    ['Morning Circle', 'Daily kickoff and announcements', 'Amphitheater', '8:00 AM - 8:30 AM', 'Daily'],
    ['Lunch', 'Refuel and recharge', 'Main Hall', '12:00 PM - 12:30 PM', 'Daily'],
    ['Free Time', 'Hang out, chill, and play games', 'Common Area', '3:00 PM - 3:30 PM', 'Daily'],
  ];
  for (const a of activities) {
    await db.run(
      'INSERT INTO activities (name, description, location, time_slot, day_of_week) VALUES (?, ?, ?, ?, ?)', a
    );
  }

  const weekDates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];

  // Seed schedule entries with explicit time_slots for the new grid
  const scheduleEntries = [
    // Monday
    { team: 1, act: 1, date: weekDates[0], slot: '9:00 AM - 9:30 AM' },
    { team: 2, act: 2, date: weekDates[0], slot: '11:00 AM - 11:30 AM' },
    { team: 3, act: 1, date: weekDates[0], slot: '9:00 AM - 9:30 AM' },
    // Tuesday
    { team: 1, act: 3, date: weekDates[1], slot: '2:00 PM - 2:30 PM' },
    { team: 2, act: 8, date: weekDates[1], slot: '11:00 AM - 11:30 AM' },
    { team: 3, act: 3, date: weekDates[1], slot: '2:00 PM - 2:30 PM' },
    // Wednesday
    { team: 1, act: 4, date: weekDates[2], slot: '9:00 AM - 9:30 AM' },
    { team: 2, act: 7, date: weekDates[2], slot: '2:00 PM - 2:30 PM' },
    { team: 3, act: 10, date: weekDates[2], slot: '11:00 AM - 11:30 AM' },
    // Thursday
    { team: 1, act: 6, date: weekDates[3], slot: '9:00 AM - 9:30 AM' },
    { team: 2, act: 9, date: weekDates[3], slot: '2:00 PM - 2:30 PM' },
    { team: 3, act: 6, date: weekDates[3], slot: '9:00 AM - 9:30 AM' },
    // Friday
    { team: 1, act: 5, date: weekDates[4], slot: '7:00 PM - 7:30 PM' },
    { team: 2, act: 5, date: weekDates[4], slot: '7:00 PM - 7:30 PM' },
    { team: 3, act: 5, date: weekDates[4], slot: '7:00 PM - 7:30 PM' },
  ];
  for (const s of scheduleEntries) {
    await db.run(
      'INSERT INTO schedule (team_id, activity_id, date, time_slot) VALUES (?, ?, ?, ?)',
      [s.team, s.act, s.date, s.slot]
    );
  }

  // Counselor schedule
  const counselorIds = [2, 3, 4];
  const sampleDuties = [
    { slot: '7:30 AM - 8:00 AM', duty: 'Breakfast Supervision' },
    { slot: '8:00 AM - 8:30 AM', duty: 'Morning Circle' },
    { slot: '9:00 AM - 10:30 AM', duty: 'Activity Facilitation' },
    { slot: '10:30 AM - 11:00 AM', duty: 'Break' },
    { slot: '12:00 PM - 12:30 PM', duty: 'Lunch Supervision' },
    { slot: '2:00 PM - 3:00 PM', duty: 'Activity Facilitation' },
    { slot: '3:00 PM - 3:30 PM', duty: 'Free Time / Pickup Prep' },
  ];
  for (const cid of counselorIds) {
    for (const date of weekDates) {
      for (const d of sampleDuties) {
        await db.run(
          'INSERT INTO counselor_schedule (counselor_id, date, time_slot, duty, notes) VALUES (?, ?, ?, ?, ?)',
          [cid, date, d.slot, d.duty, null]
        );
      }
    }
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
    [1, 'Welcome to CM2 Summer Camp 2026!', 'We are thrilled to have everyone here! Get ready for an amazing week of fun, friendship, and adventure. Check your team assignments and schedule!', 'all']
  );
  await db.run(
    'INSERT INTO announcements (author_id, title, body, audience) VALUES (?, ?, ?, ?)',
    [2, 'Eagle Team — Campfire Song Practice', "Eagles! Let's meet at 4 PM today to rehearse our campfire song. Bring your energy!", 'campers']
  );
  await db.run(
    'INSERT INTO announcements (author_id, title, body, audience) VALUES (?, ?, ?, ?)',
    [1, 'Schedule Update', 'Due to weather, Thursday hiking has been moved to the indoor gym for Team Sports instead. Stay tuned!', 'all']
  );
  await db.run(
    'INSERT INTO announcements (author_id, title, body, audience) VALUES (?, ?, ?, ?)',
    [3, 'Falcon Team Reminder', "Don't forget your water bottles and sunscreen for tomorrow's canoeing trip!", 'campers']
  );
  await db.run(
    'INSERT INTO announcements (author_id, title, body, audience) VALUES (?, ?, ?, ?)',
    [1, 'Staff Meeting Friday', 'All counselors — please meet in the main hall at 4 PM Friday to review the week.', 'counselors']
  );

  console.log('Database seeded successfully!');
}

module.exports = { db, initializeDatabase };
