const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'camp.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeDatabase() {
  const db = getDb();

  db.exec(`
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
  `);

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    seedDatabase(db);
  }
}

function seedDatabase(db) {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  const insertCabin = db.prepare('INSERT INTO cabins (name, theme_color) VALUES (?, ?)');
  insertCabin.run('Eagle', '#FF6B2C');
  insertCabin.run('Falcon', '#3498DB');
  insertCabin.run('Bear', '#2ECC71');

  const insertUser = db.prepare(
    'INSERT INTO users (name, username, password_hash, role, cabin_id, age) VALUES (?, ?, ?, ?, ?, ?)'
  );

  insertUser.run('Camp Admin', 'admin', hash('admin123'), 'admin', null, null);

  insertUser.run('Sarah Johnson', 'counselor1', hash('camp2024'), 'counselor', 1, 24);
  insertUser.run('Mike Chen', 'counselor2', hash('camp2024'), 'counselor', 2, 26);
  insertUser.run('Lisa Park', 'counselor3', hash('camp2024'), 'counselor', 3, 23);

  insertUser.run('Alex Rivera', 'camper1', hash('camp2024'), 'camper', 1, 12);
  insertUser.run('Jordan Smith', 'camper2', hash('camp2024'), 'camper', 1, 11);
  insertUser.run('Casey Brown', 'camper3', hash('camp2024'), 'camper', 2, 13);
  insertUser.run('Taylor Davis', 'camper4', hash('camp2024'), 'camper', 2, 12);
  insertUser.run('Morgan Lee', 'camper5', hash('camp2024'), 'camper', 3, 11);
  insertUser.run('Riley Wilson', 'camper6', hash('camp2024'), 'camper', 3, 14);

  db.prepare('UPDATE cabins SET counselor_id = 2 WHERE id = 1').run();
  db.prepare('UPDATE cabins SET counselor_id = 3 WHERE id = 2').run();
  db.prepare('UPDATE cabins SET counselor_id = 4 WHERE id = 3').run();

  const insertActivity = db.prepare(
    'INSERT INTO activities (name, description, location, time_slot, day_of_week) VALUES (?, ?, ?, ?, ?)'
  );

  const activities = [
    ['Swimming', 'Cool off with laps and water games!', 'Lake Cove', '9:00 AM - 10:30 AM', 'Monday'],
    ['Archery', 'Learn to shoot like Robin Hood!', 'Archery Range', '11:00 AM - 12:00 PM', 'Monday'],
    ['Arts & Crafts', 'Get creative with paints, clay, and more!', 'Art Cabin', '2:00 PM - 3:30 PM', 'Tuesday'],
    ['Team Sports', 'Soccer, basketball, and more team fun!', 'Main Field', '9:00 AM - 10:30 AM', 'Wednesday'],
    ['Bonfire Night', 'Stories, s\'mores, and stargazing!', 'Fire Pit', '7:00 PM - 9:00 PM', 'Friday'],
    ['Hiking', 'Explore the trails and discover nature!', 'Mountain Trail', '9:00 AM - 11:30 AM', 'Thursday'],
    ['Canoeing', 'Paddle across the lake with your cabin!', 'Lake Dock', '2:00 PM - 3:30 PM', 'Wednesday'],
    ['Nature Study', 'Identify plants, bugs, and birds!', 'Forest Path', '11:00 AM - 12:00 PM', 'Tuesday'],
    ['Talent Show Prep', 'Practice your act for Friday night!', 'Main Hall', '2:00 PM - 3:30 PM', 'Thursday'],
    ['Rock Climbing', 'Conquer the climbing wall!', 'Climbing Wall', '11:00 AM - 12:00 PM', 'Wednesday'],
  ];
  activities.forEach((a) => insertActivity.run(...a));

  const insertSchedule = db.prepare('INSERT INTO schedule (cabin_id, activity_id, date) VALUES (?, ?, ?)');

  const weekDates = ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'];

  // Monday
  insertSchedule.run(1, 1, weekDates[0]); // Eagle - Swimming
  insertSchedule.run(2, 2, weekDates[0]); // Falcon - Archery
  insertSchedule.run(3, 1, weekDates[0]); // Bear - Swimming
  // Tuesday
  insertSchedule.run(1, 3, weekDates[1]); // Eagle - Arts & Crafts
  insertSchedule.run(2, 8, weekDates[1]); // Falcon - Nature Study
  insertSchedule.run(3, 3, weekDates[1]); // Bear - Arts & Crafts
  // Wednesday
  insertSchedule.run(1, 4, weekDates[2]); // Eagle - Team Sports
  insertSchedule.run(2, 7, weekDates[2]); // Falcon - Canoeing
  insertSchedule.run(3, 10, weekDates[2]); // Bear - Rock Climbing
  // Thursday
  insertSchedule.run(1, 6, weekDates[3]); // Eagle - Hiking
  insertSchedule.run(2, 9, weekDates[3]); // Falcon - Talent Show Prep
  insertSchedule.run(3, 6, weekDates[3]); // Bear - Hiking
  // Friday
  insertSchedule.run(1, 5, weekDates[4]); // Eagle - Bonfire Night
  insertSchedule.run(2, 5, weekDates[4]); // Falcon - Bonfire Night
  insertSchedule.run(3, 5, weekDates[4]); // Bear - Bonfire Night

  const insertAttendance = db.prepare('INSERT INTO attendance (camper_id, date, present, notes) VALUES (?, ?, ?, ?)');
  for (let camperId = 5; camperId <= 10; camperId++) {
    for (const date of weekDates.slice(0, 3)) {
      insertAttendance.run(camperId, date, 1, null);
    }
  }
  insertAttendance.run(7, weekDates[3], 0, 'Feeling unwell');

  const insertAnnouncement = db.prepare(
    'INSERT INTO announcements (author_id, title, body, audience) VALUES (?, ?, ?, ?)'
  );
  insertAnnouncement.run(1, 'Welcome to CM2 Summer Camp 2026!', 'We are thrilled to have everyone here! Get ready for an amazing week of fun, friendship, and adventure. Check your cabin assignments and schedule!', 'all');
  insertAnnouncement.run(2, 'Eagle Cabin — Campfire Song Practice', 'Eagles! Let\'s meet at 4 PM today to rehearse our campfire song. Bring your energy!', 'camper');
  insertAnnouncement.run(1, 'Schedule Update', 'Due to weather, Thursday hiking has been moved to the indoor gym for Team Sports instead. Stay tuned!', 'all');
  insertAnnouncement.run(3, 'Falcon Cabin Reminder', 'Don\'t forget your water bottles and sunscreen for tomorrow\'s canoeing trip!', 'camper');

  console.log('Database seeded successfully!');
}

module.exports = { getDb, initializeDatabase };
