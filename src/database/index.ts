import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { createTables, seedDefaultExercises } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  // Initialize database for all platforms including web
  // SQLite web support is now enabled in app.json

  db = await SQLite.openDatabaseAsync('progressive_overload.db');
  
  // Improve concurrency and stability
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync('PRAGMA busy_timeout = 5000;');
  } catch (e) {
    // Ignore pragma errors; continue with default settings
  }
  
  // Only create tables if they don't exist - DON'T drop existing data!
  await createTables(db);
  await seedDefaultExercises(db);
  
  return db;
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};
