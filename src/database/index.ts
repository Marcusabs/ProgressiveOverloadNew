import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { createTables, seedDefaultExercises } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  // Skip database initialization on web platform
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not supported on web platform. Please use the mobile app.');
  }

  db = await SQLite.openDatabaseAsync('progressive_overload.db');
  
  // Drop existing tables to recreate with new schema
  try {
    await db.execAsync('DROP TABLE IF EXISTS progress_data');
    await db.execAsync('DROP TABLE IF EXISTS sets');
    await db.execAsync('DROP TABLE IF EXISTS workout_exercises');
    await db.execAsync('DROP TABLE IF EXISTS workouts');
    await db.execAsync('DROP TABLE IF EXISTS template_exercises');
    await db.execAsync('DROP TABLE IF EXISTS workout_templates');
    await db.execAsync('DROP TABLE IF EXISTS exercises');
    await db.execAsync('DROP TABLE IF EXISTS training_sessions');
    await db.execAsync('DROP TABLE IF EXISTS muscle_groups');
  } catch (error) {
    console.log('Tables already dropped or don\'t exist');
  }
  
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
