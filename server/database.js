const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./data.db");

// create table

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fb_user_id TEXT,
      fb_username TEXT,
      profile_url TEXT,
      comment_url TEXT,
      comment_text TEXT,
      display_name TEXT,
      label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;