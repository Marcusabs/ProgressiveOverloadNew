import { create } from 'zustand';
import { ProgressData, Workout, ExerciseInWorkout } from '../types';
import { getDatabase } from '../database';

export interface ProgressState {
  progressData: ProgressData[];
  isLoading: boolean;
  
  // Actions
  loadProgressData: () => Promise<void>;
  getExerciseProgress: (exerciseId: string) => ProgressData[];
  getOneRepMax: (exerciseId: string) => number | null;
  getVolumeProgress: (exerciseId: string) => ProgressData[];
  getRecentWorkouts: (limit?: number) => Promise<any[]>;
  saveWorkoutProgress: (workout: Workout) => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  progressData: [],
  isLoading: false,

  loadProgressData: async () => {
    set({ isLoading: true });
    try {
      const db = getDatabase();
      const progress = await db.getAllAsync(`
        SELECT pd.*, e.name as exercise_name
        FROM progress_data pd
        JOIN exercises e ON pd.exercise_id = e.id
        ORDER BY pd.date DESC
      `);

      const formattedProgress: ProgressData[] = progress.map((p: any) => ({
        exerciseId: p.exercise_id,
        exerciseName: p.exercise_name,
        date: new Date(p.date),
        maxWeight: p.max_weight,
        totalVolume: p.total_volume,
        oneRepMax: p.one_rep_max
      }));

      set({ progressData: formattedProgress });
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  getExerciseProgress: (exerciseId) => {
    const { progressData } = get();
    return progressData
      .filter(p => p.exerciseId === exerciseId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  },

  getOneRepMax: (exerciseId) => {
    const { progressData } = get();
    const exerciseProgress = progressData
      .filter(p => p.exerciseId === exerciseId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return exerciseProgress.length > 0 ? exerciseProgress[0].oneRepMax || null : null;
  },

  getVolumeProgress: (exerciseId) => {
    const { progressData } = get();
    return progressData
      .filter(p => p.exerciseId === exerciseId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  },

  getRecentWorkouts: async (limit = 10) => {
    try {
      const db = getDatabase();
      const workouts = await db.getAllAsync(`
        SELECT w.*, 
               COUNT(DISTINCT we.id) as exercise_count,
               SUM(CASE WHEN we.completed = 1 THEN 1 ELSE 0 END) as completed_exercises,
               COUNT(s.id) as total_sets
        FROM workouts w
        LEFT JOIN workout_exercises we ON w.id = we.workout_id
        LEFT JOIN sets s ON we.id = s.workout_exercise_id
        WHERE w.completed = 1
        GROUP BY w.id
        ORDER BY w.date DESC
        LIMIT ?
      `, [limit]);

      return workouts;
    } catch (error) {
      console.error('Error loading recent workouts:', error);
      return [];
    }
  },

  saveWorkoutProgress: async (workout) => {
    try {
      const db = getDatabase();
      
      for (const exercise of workout.exercises || []) {
        if (!exercise.sets || exercise.sets.length === 0) continue;
        
        const maxWeight = Math.max(...exercise.sets.map(set => set.weight));
        const totalVolume = exercise.sets.reduce((total, set) => total + (set.weight * set.reps), 0);
        const oneRepMax = Math.max(...exercise.sets.map(set => {
          if (set.reps === 1) return set.weight;
          if (set.reps <= 0) return 0;
          return Math.round(set.weight * (1 + set.reps / 30) * 100) / 100;
        }));

        await db.runAsync(`
          INSERT INTO progress_data (id, exercise_id, workout_id, date, max_weight, total_volume, one_rep_max)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          Date.now().toString() + Math.random(),
          exercise.exercise_id,
          workout.id,
          workout.date,
          maxWeight,
          totalVolume,
          oneRepMax
        ]);
      }

      // Reload progress data
      get().loadProgressData();
    } catch (error) {
      console.error('Error saving workout progress:', error);
    }
  }
}));
