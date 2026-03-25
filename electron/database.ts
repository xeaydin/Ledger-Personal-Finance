import Database from 'better-sqlite3';
import path from 'node:path';
import electron from 'electron';

let db: any;

export function initDb() {
  const dbPath = path.join(electron.app.getPath('userData'), 'ledger.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS Accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      current_balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS Transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      category_id INTEGER,
      status TEXT DEFAULT 'approved',
      installment_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS Installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      total_amount REAL NOT NULL,
      total_months INTEGER NOT NULL,
      start_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      percentage REAL NOT NULL,
      category TEXT NOT NULL,
      effective_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      units REAL NOT NULL,
      current_value_per_unit REAL NOT NULL
    );
  `);
}

export function getDb() {
  return db;
}
