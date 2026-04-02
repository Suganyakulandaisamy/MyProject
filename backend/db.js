import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import dotenv from "dotenv";

dotenv.config();

let db = null;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set.`);
  }
  return value;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureSchema() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('Admin','Faculty','Student')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      faculty_id INTEGER NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_subjects_faculty_id ON subjects (faculty_id);

    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      subject TEXT NOT NULL,
      semester TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      subject_id INTEGER NULL,
      pass_percentage REAL NOT NULL,
      quality_status TEXT NOT NULL CHECK (quality_status IN ('Good','Need Improvement','Pending Evaluation')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_faculty_user_id ON faculty (user_id);
    CREATE INDEX IF NOT EXISTS idx_faculty_subject_id ON faculty (subject_id);

    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      faculty_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (student_id, subject_id)
    );
    CREATE INDEX IF NOT EXISTS idx_feedbacks_faculty_id ON feedbacks (faculty_id);
    CREATE INDEX IF NOT EXISTS idx_feedbacks_subject_id ON feedbacks (subject_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_subjects_updated_at
    AFTER UPDATE ON subjects
    FOR EACH ROW
    BEGIN
      UPDATE subjects SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_faculty_updated_at
    AFTER UPDATE ON faculty
    FOR EACH ROW
    BEGIN
      UPDATE faculty SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_feedbacks_updated_at
    AFTER UPDATE ON feedbacks
    FOR EACH ROW
    BEGIN
      UPDATE feedbacks SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_notifications_updated_at
    AFTER UPDATE ON notifications
    FOR EACH ROW
    BEGIN
      UPDATE notifications SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `);
}

export async function connectDb() {
  if (db) return db;

  const rawPath = process.env.SQLITE_PATH || path.join(__dirname, "data", "aaqap.sqlite");
  const resolved = path.isAbsolute(rawPath) ? rawPath : path.join(__dirname, rawPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  db = await open({
    filename: resolved,
    driver: sqlite3.Database
  });

  await db.exec("PRAGMA foreign_keys = ON");
  await ensureSchema();
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call connectDb() first.");
  }
  return db;
}

export async function query(sql, params = []) {
  const db = getDb();
  const trimmed = sql.trim().toLowerCase();
  if (trimmed.startsWith("select") || trimmed.startsWith("pragma")) {
    return db.all(sql, params);
  }
  const result = await db.run(sql, params);
  return {
    insertId: result.lastID,
    affectedRows: result.changes
  };
}
