import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { createTables } from './schema';

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
  
  // Insert default muscle groups if they don't exist
  await insertDefaultMuscleGroups(db);
  
  return db;
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

const insertDefaultMuscleGroups = async (db: SQLite.SQLiteDatabase) => {
  try {
    // Check if muscle groups already exist
    const existingGroups = await db.getAllAsync('SELECT COUNT(*) as count FROM muscle_groups');
    const count = (existingGroups[0] as any).count;
    
    if (count > 0) {
      console.log('Default muscle groups already exist, skipping...');
      return;
    }

    console.log('Inserting default muscle groups...');
    
    const defaultMuscleGroups = [
      { name: 'Bryst', color: '#FF6B6B', icon: 'fitness' },
      { name: 'Skulder', color: '#45B7D1', icon: 'fitness' },
      { name: 'Triceps', color: '#FFEAA7', icon: 'fitness' },
      { name: 'Ben', color: '#98D8C8', icon: 'fitness' },
      { name: 'Biceps', color: '#96CEB4', icon: 'fitness' },
      { name: 'Ryg', color: '#4ECDC4', icon: 'fitness' },
      { name: 'Mave', color: '#DDA0DD', icon: 'fitness' }
    ];

    for (const group of defaultMuscleGroups) {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const created_at = new Date().toISOString();
      
      await db.runAsync(`
        INSERT INTO muscle_groups (id, name, color, icon, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [id, group.name, group.color, group.icon, created_at]);
    }
    
    console.log('✅ Default muscle groups inserted successfully!');
  } catch (error) {
    console.error('Failed to insert default muscle groups:', error);
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};
