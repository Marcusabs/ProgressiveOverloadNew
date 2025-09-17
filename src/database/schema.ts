import * as SQLite from 'expo-sqlite';

export const createTables = (db: SQLite.SQLiteDatabase) => {
  // Create muscle_groups table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS muscle_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#007AFF',
      icon TEXT DEFAULT 'fitness',
      created_at TEXT NOT NULL
    );
  `);

  // Create training_sessions table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS training_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      muscle_group_id TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups (id)
    );
  `);

  // Create exercises table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      muscle_group_id TEXT NOT NULL,
      session_id TEXT,
      order_index INTEGER DEFAULT 0,
      description TEXT,
      equipment TEXT,
      difficulty TEXT DEFAULT 'beginner',
      created_at TEXT NOT NULL,
      FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups (id),
      FOREIGN KEY (session_id) REFERENCES training_sessions (id)
    );
  `);

  // Create workout_templates table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES training_sessions (id)
    );
  `);

  // Create template_exercises table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS template_exercises (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      sets INTEGER DEFAULT 3,
      reps INTEGER DEFAULT 10,
      rest_time INTEGER DEFAULT 90,
      FOREIGN KEY (template_id) REFERENCES workout_templates (id),
      FOREIGN KEY (exercise_id) REFERENCES exercises (id)
    );
  `);

  // Create workouts table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER,
      notes TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES training_sessions (id)
    );
  `);

  // Create workout_exercises table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (workout_id) REFERENCES workouts (id),
      FOREIGN KEY (exercise_id) REFERENCES exercises (id)
    );
  `);

  // Create sets table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY,
      workout_exercise_id TEXT NOT NULL,
      reps INTEGER NOT NULL,
      weight REAL NOT NULL,
      rest_time INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises (id)
    );
  `);

  // Create progress_data table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS progress_data (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL,
      workout_id TEXT NOT NULL,
      date TEXT NOT NULL,
      max_weight REAL NOT NULL,
      total_volume REAL NOT NULL,
      one_rep_max REAL,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id),
      FOREIGN KEY (workout_id) REFERENCES workouts (id)
    );
  `);

  // Create user_profile table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      weight REAL,
      height REAL,
      experience TEXT DEFAULT 'beginner',
      goals TEXT DEFAULT '[]',
      preferred_units TEXT DEFAULT 'metric',
      default_rest_time TEXT DEFAULT '90',
      created_at TEXT NOT NULL
    );
  `);

  // Create achievements table
  db.execAsync(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      icon TEXT NOT NULL,
      requirement INTEGER NOT NULL,
      current_progress INTEGER DEFAULT 0,
      is_unlocked INTEGER DEFAULT 0,
      unlocked_at TEXT,
      points INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
};

// Removed seedDefaultExercises function - no auto-seeding of default data
