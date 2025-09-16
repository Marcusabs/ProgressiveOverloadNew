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

export const seedDefaultExercises = async (db: SQLite.SQLiteDatabase) => {
  // If there are already any training sessions, skip seeding defaults
  try {
    const existing = await db.getFirstAsync(`SELECT COUNT(*) as count FROM training_sessions`);
    if (existing && (existing as any).count > 0) {
      return;
    }
  } catch (e) {
    // If the COUNT query fails for some reason, continue with cautious seeding below
  }
  // Seed muscle groups
  const muscleGroups = [
    { id: '1', name: 'Bryst', color: '#FF6B6B', icon: 'fitness', created_at: new Date().toISOString() },
    { id: '2', name: 'Skulder', color: '#4ECDC4', icon: 'fitness', created_at: new Date().toISOString() },
    { id: '3', name: 'Triceps', color: '#45B7D1', icon: 'fitness', created_at: new Date().toISOString() },
    { id: '4', name: 'Ryg', color: '#96CEB4', icon: 'fitness', created_at: new Date().toISOString() },
    { id: '5', name: 'Biceps', color: '#FFEAA7', icon: 'fitness', created_at: new Date().toISOString() },
    { id: '6', name: 'Ben', color: '#DDA0DD', icon: 'fitness', created_at: new Date().toISOString() },
    { id: '7', name: 'Mave', color: '#98D8C8', icon: 'fitness', created_at: new Date().toISOString() }
  ];

  muscleGroups.forEach(group => {
    db.runAsync(
      `INSERT OR IGNORE INTO muscle_groups (id, name, color, icon, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [group.id, group.name, group.color, group.icon, group.created_at]
    );
  });

  // Seed training sessions
  const trainingSessions = [
    { id: '1', name: 'Bryst & Triceps', muscle_group_id: '1', description: 'Fokus på bryst og triceps øvelser', created_at: new Date().toISOString() },
    { id: '2', name: 'Skulder & Triceps', muscle_group_id: '2', description: 'Fokus på skulder og triceps øvelser', created_at: new Date().toISOString() },
    { id: '3', name: 'Bryst & Skulder', muscle_group_id: '1', description: 'Fokus på bryst og skulder øvelser', created_at: new Date().toISOString() },
    { id: '4', name: 'Push Day', muscle_group_id: '1', description: 'Alle push øvelser (bryst, skulder, triceps)', created_at: new Date().toISOString() },
    { id: '5', name: 'Pull Day', muscle_group_id: '4', description: 'Alle pull øvelser (ryg, biceps)', created_at: new Date().toISOString() },
    { id: '6', name: 'Leg Day', muscle_group_id: '6', description: 'Fokus på ben og mave', created_at: new Date().toISOString() }
  ];

  trainingSessions.forEach(session => {
    db.runAsync(
      `INSERT OR IGNORE INTO training_sessions (id, name, muscle_group_id, description, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [session.id, session.name, session.muscle_group_id, session.description, session.created_at]
    );
  });

  // Seed exercises for each session
  const exercises = [
    // Bryst & Triceps Session
    { id: '1', name: 'Bryst 1', muscle_group_id: '1', session_id: '1', description: 'Bench Press variation', equipment: 'Barbell, Bench', difficulty: 'intermediate', created_at: new Date().toISOString() },
    { id: '2', name: 'Bryst 2', muscle_group_id: '1', session_id: '1', description: 'Dumbbell Flyes', equipment: 'Dumbbells, Bench', difficulty: 'beginner', created_at: new Date().toISOString() },
    { id: '3', name: 'Bryst 3', muscle_group_id: '1', session_id: '1', description: 'Push-ups', equipment: 'None', difficulty: 'beginner', created_at: new Date().toISOString() },
    { id: '4', name: 'Triceps 1', muscle_group_id: '3', session_id: '1', description: 'Tricep Dips', equipment: 'Dip Bar', difficulty: 'intermediate', created_at: new Date().toISOString() },
    { id: '5', name: 'Triceps 2', muscle_group_id: '3', session_id: '1', description: 'Skull Crushers', equipment: 'Barbell, Bench', difficulty: 'intermediate', created_at: new Date().toISOString() },
    { id: '6', name: 'Triceps 3', muscle_group_id: '3', session_id: '1', description: 'Tricep Extensions', equipment: 'Cable Machine', difficulty: 'beginner', created_at: new Date().toISOString() },

    // Skulder & Triceps Session
    { id: '7', name: 'Skulder 1', muscle_group_id: '2', session_id: '2', description: 'Overhead Press', equipment: 'Barbell', difficulty: 'intermediate', created_at: new Date().toISOString() },
    { id: '8', name: 'Skulder 2', muscle_group_id: '2', session_id: '2', description: 'Lateral Raises', equipment: 'Dumbbells', difficulty: 'beginner', created_at: new Date().toISOString() },
    { id: '9', name: 'Skulder 3', muscle_group_id: '2', session_id: '2', description: 'Front Raises', equipment: 'Dumbbells', difficulty: 'beginner', created_at: new Date().toISOString() },
    { id: '10', name: 'Triceps 1', muscle_group_id: '3', session_id: '2', description: 'Close Grip Bench', equipment: 'Barbell, Bench', difficulty: 'intermediate', created_at: new Date().toISOString() },
    { id: '11', name: 'Triceps 2', muscle_group_id: '3', session_id: '2', description: 'Diamond Push-ups', equipment: 'None', difficulty: 'intermediate', created_at: new Date().toISOString() },
    { id: '12', name: 'Triceps 3', muscle_group_id: '3', session_id: '2', description: 'Overhead Extensions', equipment: 'Dumbbell', difficulty: 'beginner', created_at: new Date().toISOString() },

    // Bryst & Skulder Session
    { id: '13', name: 'Bryst 1', muscle_group_id: '1', session_id: '3', description: 'Incline Bench Press', equipment: 'Barbell, Incline Bench', difficulty: 'intermediate', created_at: new Date().toISOString() },
    { id: '14', name: 'Bryst 2', muscle_group_id: '1', session_id: '3', description: 'Decline Bench Press', equipment: 'Barbell, Decline Bench', difficulty: 'intermediate', created_at: new Date().toISOString() },
    { id: '15', name: 'Bryst 3', muscle_group_id: '1', session_id: '3', description: 'Cable Crossovers', equipment: 'Cable Machine', difficulty: 'beginner', created_at: new Date().toISOString() },
    { id: '16', name: 'Skulder 1', muscle_group_id: '2', session_id: '3', description: 'Military Press', equipment: 'Barbell', difficulty: 'intermediate', created_at: new Date().toISOString() },
    { id: '17', name: 'Skulder 2', muscle_group_id: '2', session_id: '3', description: 'Arnold Press', equipment: 'Dumbbells', difficulty: 'intermediate', created_at: new Date().toISOString() },
    { id: '18', name: 'Skulder 3', muscle_group_id: '2', session_id: '3', description: 'Upright Rows', equipment: 'Barbell', difficulty: 'intermediate', created_at: new Date().toISOString() }
  ];

  exercises.forEach((exercise, index) => {
    db.runAsync(
      `INSERT OR IGNORE INTO exercises (id, name, muscle_group_id, session_id, order_index, description, equipment, difficulty, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [exercise.id, exercise.name, exercise.muscle_group_id, exercise.session_id, index + 1,
       exercise.description, exercise.equipment, exercise.difficulty, exercise.created_at]
    );
  });
};
