import { getDatabase } from './index';
import { dbCache, CACHE_KEYS } from './cache';
import { Exercise, MuscleGroup, TrainingSession, Workout, ProgressData } from '../types';

// Optimized query executor with caching
async function executeQuery<T>(
  cacheKey: string,
  query: string,
  params: any[] = [],
  ttl?: number
): Promise<T[]> {
  // Try to get from cache first
  const cached = dbCache.get<T[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Execute query if not in cache
  const db = getDatabase();
  const result = await db.getAllAsync(query, params) as T[];
  
  // Cache the result
  dbCache.set(cacheKey, result, ttl);
  
  return result;
}

// Optimized Exercises Queries
export const optimizedExerciseQueries = {
  async getAllExercises(): Promise<Exercise[]> {
    return executeQuery<Exercise>(
      CACHE_KEYS.EXERCISES,
      `SELECT e.*, m.name as muscle_group_name, t.name as session_name
       FROM exercises e
       LEFT JOIN muscle_groups m ON e.muscle_group_id = m.id
       LEFT JOIN training_sessions t ON e.session_id = t.id
       ORDER BY e.session_id, e.order_index`,
      [],
      10 * 60 * 1000 // 10 minutes
    );
  },

  async getExercisesByMuscleGroup(muscleGroupId: string): Promise<Exercise[]> {
    return executeQuery<Exercise>(
      CACHE_KEYS.EXERCISES_BY_MUSCLE_GROUP(muscleGroupId),
      `SELECT e.*, m.name as muscle_group_name
       FROM exercises e
       LEFT JOIN muscle_groups m ON e.muscle_group_id = m.id
       WHERE e.muscle_group_id = ?
       ORDER BY e.name`,
      [muscleGroupId],
      15 * 60 * 1000 // 15 minutes
    );
  },

  async getExercisesBySession(sessionId: string): Promise<Exercise[]> {
    return executeQuery<Exercise>(
      CACHE_KEYS.EXERCISES_BY_SESSION(sessionId),
      `SELECT e.*, m.name as muscle_group_name
       FROM exercises e
       LEFT JOIN muscle_groups m ON e.muscle_group_id = m.id
       WHERE e.session_id = ?
       ORDER BY e.order_index`,
      [sessionId],
      15 * 60 * 1000 // 15 minutes
    );
  },

  async getExerciseById(id: string): Promise<Exercise | null> {
    const cached = dbCache.get<Exercise>(CACHE_KEYS.EXERCISE_BY_ID(id));
    if (cached) return cached;

    const db = getDatabase();
    const result = await db.getFirstAsync(
      `SELECT e.*, m.name as muscle_group_name, t.name as session_name
       FROM exercises e
       LEFT JOIN muscle_groups m ON e.muscle_group_id = m.id
       LEFT JOIN training_sessions t ON e.session_id = t.id
       WHERE e.id = ?`,
      [id]
    ) as Exercise | null;

    if (result) {
      dbCache.set(CACHE_KEYS.EXERCISE_BY_ID(id), result, 30 * 60 * 1000); // 30 minutes
    }

    return result;
  },
};

// Optimized Muscle Groups Queries
export const optimizedMuscleGroupQueries = {
  async getAllMuscleGroups(): Promise<MuscleGroup[]> {
    return executeQuery<MuscleGroup>(
      CACHE_KEYS.MUSCLE_GROUPS,
      `SELECT * FROM muscle_groups ORDER BY name`,
      [],
      30 * 60 * 1000 // 30 minutes - muscle groups change rarely
    );
  },
};

// Optimized Training Sessions Queries
export const optimizedTrainingSessionQueries = {
  async getAllTrainingSessions(): Promise<TrainingSession[]> {
    return executeQuery<TrainingSession>(
      CACHE_KEYS.TRAINING_SESSIONS,
      `SELECT ts.*, 
              COUNT(e.id) as exercise_count,
              GROUP_CONCAT(DISTINCT m.name) as muscle_groups
       FROM training_sessions ts
       LEFT JOIN exercises e ON ts.id = e.session_id
       LEFT JOIN muscle_groups m ON e.muscle_group_id = m.id
       GROUP BY ts.id
       ORDER BY ts.name`,
      [],
      15 * 60 * 1000 // 15 minutes
    );
  },
};

// Optimized Workouts Queries
export const optimizedWorkoutQueries = {
  async getAllWorkouts(): Promise<Workout[]> {
    return executeQuery<Workout>(
      CACHE_KEYS.WORKOUTS,
      `SELECT w.*, ts.name as session_name
       FROM workouts w
       LEFT JOIN training_sessions ts ON w.session_id = ts.id
       ORDER BY w.created_at DESC`,
      [],
      5 * 60 * 1000 // 5 minutes
    );
  },

  async getRecentWorkouts(limit: number = 10): Promise<Workout[]> {
    return executeQuery<Workout>(
      CACHE_KEYS.RECENT_WORKOUTS(limit),
      `SELECT w.*, ts.name as session_name,
              COUNT(DISTINCT we.id) as exercise_count,
              COUNT(s.id) as total_sets,
              SUM(CASE WHEN s.completed = 1 THEN 1 ELSE 0 END) as completed_sets
       FROM workouts w
       LEFT JOIN training_sessions ts ON w.session_id = ts.id
       LEFT JOIN workout_exercises we ON w.id = we.workout_id
       LEFT JOIN sets s ON we.id = s.workout_exercise_id
       GROUP BY w.id
       ORDER BY w.created_at DESC
       LIMIT ?`,
      [limit],
      3 * 60 * 1000 // 3 minutes
    );
  },
};

// Optimized Progress Queries
export const optimizedProgressQueries = {
  async getProgressByExercise(exerciseId: string): Promise<ProgressData[]> {
    return executeQuery<ProgressData>(
      CACHE_KEYS.PROGRESS_BY_EXERCISE(exerciseId),
      `SELECT p.*, e.name as exercise_name
       FROM progress_data p
       LEFT JOIN exercises e ON p.exercise_id = e.id
       WHERE p.exercise_id = ?
       ORDER BY p.date DESC`,
      [exerciseId],
      10 * 60 * 1000 // 10 minutes
    );
  },
};

// Cache invalidation helpers
export const cacheInvalidators = {
  invalidateExercises() {
    dbCache.invalidatePattern('exercises');
  },
  
  invalidateMuscleGroups() {
    dbCache.invalidate(CACHE_KEYS.MUSCLE_GROUPS);
  },
  
  invalidateTrainingSessions() {
    dbCache.invalidate(CACHE_KEYS.TRAINING_SESSIONS);
  },
  
  invalidateWorkouts() {
    dbCache.invalidatePattern('workouts');
  },
  
  invalidateProgress() {
    dbCache.invalidatePattern('progress');
  },
  
  invalidateAll() {
    dbCache.clear();
  },
};
