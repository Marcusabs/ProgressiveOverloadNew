import { create } from 'zustand';
import { Workout, ExerciseInWorkout, Set, WorkoutTemplate, TrainingSession } from '../types';
import { getDatabase } from '../database';
import { calculateProgressiveOverload, analyzeWorkout, generateWorkoutSummary, ProgressiveOverloadSuggestion, WorkoutAnalysis } from '../utils/progressiveOverload';
import { useProgressStore } from './progressStore';

export interface WorkoutState {
  currentWorkout: Workout | null;
  workoutTemplates: WorkoutTemplate[];
  isLoading: boolean;
  progressiveOverloadSuggestions: ProgressiveOverloadSuggestion[];
  workoutAnalysis: WorkoutAnalysis[];
  
  // Actions
  startWorkout: (workoutData: Omit<Workout, 'id' | 'created_at'>) => Promise<void>;
  addExerciseToWorkout: (exerciseId: string) => Promise<void>;
  updateSet: (exerciseId: string, setId: string, updates: Partial<Set>) => Promise<void>;
  completeWorkout: () => Promise<void>;
  cancelWorkout: () => void;
  loadTemplates: () => Promise<void>;
  createTemplate: (template: Omit<WorkoutTemplate, 'id' | 'created_at'>) => Promise<void>;
  getProgressiveOverloadSuggestions: () => Promise<void>;
  analyzeCurrentWorkout: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  currentWorkout: null,
  workoutTemplates: [],
  isLoading: false,
  progressiveOverloadSuggestions: [],
  workoutAnalysis: [],

  startWorkout: async (workoutData) => {
    set({ isLoading: true });
    try {
      const workout: Workout = {
        id: Date.now().toString(),
        ...workoutData,
        created_at: new Date().toISOString()
      };

      set({ currentWorkout: workout });
    } catch (error) {
      console.error('Error starting workout:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addExerciseToWorkout: async (exerciseId) => {
    const { currentWorkout } = get();
    if (!currentWorkout) return;

    try {
      const db = getDatabase();
      const exerciseData = await db.getFirstAsync(`
        SELECT e.*, m.name as muscle_group_name
        FROM exercises e
        LEFT JOIN muscle_groups m ON e.muscle_group_id = m.id
        WHERE e.id = ?
      `, [exerciseId]);

      if (!exerciseData) return;

      const newExercise: ExerciseInWorkout = {
        id: Date.now().toString(),
        workout_id: currentWorkout.id,
        exercise_id: exerciseId,
        order_index: currentWorkout.exercises?.length || 0,
        completed: false
      };

      set(state => ({
        currentWorkout: state.currentWorkout ? {
          ...state.currentWorkout,
          exercises: [...(state.currentWorkout.exercises || []), newExercise]
        } : null
      }));
    } catch (error) {
      console.error('Error adding exercise to workout:', error);
    }
  },

  updateSet: async (exerciseId, setId, updates) => {
    const { currentWorkout } = get();
    if (!currentWorkout) return;

    try {
      set(state => ({
        currentWorkout: state.currentWorkout ? {
          ...state.currentWorkout,
          exercises: state.currentWorkout.exercises?.map(ex => {
            if (ex.exercise_id === exerciseId) {
              return {
                ...ex,
                sets: ex.sets?.map(set => 
                  set.id === setId ? { ...set, ...updates } : set
                ) || []
              };
            }
            return ex;
          }) || []
        } : null
      }));
    } catch (error) {
      console.error('Error updating set:', error);
    }
  },

  completeWorkout: async () => {
    const { currentWorkout } = get();
    if (!currentWorkout) return;

    try {
      const db = getDatabase();
      const workoutId = currentWorkout.id;
      
      // Save workout to database
      await db.runAsync(`
        INSERT INTO workouts (id, session_id, name, date, duration, notes, completed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        workoutId,
        currentWorkout.session_id,
        currentWorkout.name,
        currentWorkout.date,
        currentWorkout.duration ?? 0,
        currentWorkout.notes ?? '',
        1,
        currentWorkout.created_at
      ]);

      // Save workout exercises
      for (const exercise of currentWorkout.exercises || []) {
        await db.runAsync(`
          INSERT INTO workout_exercises (id, workout_id, exercise_id, order_index, completed)
          VALUES (?, ?, ?, ?, ?)
        `, [exercise.id, workoutId, exercise.exercise_id, exercise.order_index, exercise.completed ? 1 : 0]);

        // Save sets for each exercise
        for (const set of exercise.sets || []) {
          await db.runAsync(`
            INSERT INTO sets (id, workout_exercise_id, reps, weight, rest_time, completed, notes, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            set.id,
            exercise.id,
            set.reps ?? 0,
            set.weight ?? 0,
            set.rest_time ?? null,
            set.completed ? 1 : 0,
            set.notes ?? null,
            set.order_index ?? 0
          ]);
        }
      }

      // Save progress data
      const { saveWorkoutProgress } = useProgressStore.getState();
      await saveWorkoutProgress(currentWorkout);

      set({ currentWorkout: null });
    } catch (error) {
      console.error('Error completing workout:', error);
    }
  },

  cancelWorkout: () => {
    set({ currentWorkout: null });
  },

  loadTemplates: async () => {
    try {
      const db = getDatabase();
      const result = await db.getAllAsync(`
        SELECT wt.*, ts.name as session_name
        FROM workout_templates wt
        LEFT JOIN training_sessions ts ON wt.session_id = ts.id
        ORDER BY wt.name
      `);
      
      const templates: WorkoutTemplate[] = result.map((row: any) => ({
        id: row.id,
        session_id: row.session_id,
        name: row.name,
        description: row.description,
        created_at: row.created_at
      }));
      
      set({ workoutTemplates: templates });
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  },

  createTemplate: async (templateData) => {
    try {
      const db = getDatabase();
      const id = Date.now().toString();
      const created_at = new Date().toISOString();
      
      await db.runAsync(`
        INSERT INTO workout_templates (id, session_id, name, description, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [id, templateData.session_id, templateData.name, templateData.description ?? '', created_at]);
      
      const newTemplate: WorkoutTemplate = {
        id,
        ...templateData,
        created_at
      };
      
      set(state => ({
        workoutTemplates: [...state.workoutTemplates, newTemplate]
      }));
    } catch (error) {
      console.error('Error creating template:', error);
    }
  },

  getProgressiveOverloadSuggestions: async () => {
    try {
      const db = getDatabase();
      const { currentWorkout } = get();
      
      if (!currentWorkout) return;

      // Get previous workout data for the same session
      const previousWorkouts = await db.getAllAsync(`
        SELECT w.*, we.exercise_id, s.reps, s.weight
        FROM workouts w
        JOIN workout_exercises we ON w.id = we.workout_id
        JOIN sets s ON we.id = s.workout_exercise_id
        WHERE w.session_id = ? AND w.completed = 1
        ORDER BY w.date DESC
        LIMIT 10
      `, [currentWorkout.session_id]);

      if (previousWorkouts.length === 0) return;

      // Adapt to util signature: calculateProgressiveOverload(currentExercise, previousWorkouts)
      const currentExercises = currentWorkout.exercises || [];
      const suggestions = currentExercises.map(ex => calculateProgressiveOverload(ex as any, previousWorkouts as any));
      const normalized = Array.isArray(suggestions) ? suggestions : [suggestions];
      set({ progressiveOverloadSuggestions: normalized });
    } catch (error) {
      console.error('Error getting progressive overload suggestions:', error);
    }
  },

  analyzeCurrentWorkout: async () => {
    try {
      const { currentWorkout } = get();
      
      if (!currentWorkout) return;

      // Adapt to util signature: analyzeWorkout(exercises, previousWorkouts)
      set({ workoutAnalysis: analyzeWorkout(currentWorkout.exercises || [], []) });
    } catch (error) {
      console.error('Error analyzing workout:', error);
    }
  }
}));
