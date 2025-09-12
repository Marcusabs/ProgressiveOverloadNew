import { create } from 'zustand';
import { Exercise, MuscleGroup, TrainingSession, Workout, ExerciseInWorkout, Set, ProgressData, ProgressiveOverloadSuggestion } from '../types';
import { getDatabase } from '../database';

interface ExerciseState {
  exercises: Exercise[];
  muscleGroups: MuscleGroup[];
  trainingSessions: TrainingSession[];
  selectedSession: TrainingSession | null;
  currentWorkout: Workout | null;
  workouts: Workout[];
  isLoading: boolean;
  loadExercises: () => Promise<void>;
  loadMuscleGroups: () => Promise<void>;
  loadTrainingSessions: () => Promise<void>;
  loadWorkouts: () => Promise<void>;
  addExercise: (exercise: Omit<Exercise, 'id' | 'created_at'>) => Promise<void>;
  updateExercise: (id: string, updates: Partial<Exercise>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  addMuscleGroup: (group: Omit<MuscleGroup, 'id' | 'created_at'>) => Promise<void>;
  addTrainingSession: (session: Omit<TrainingSession, 'id' | 'created_at'>) => Promise<TrainingSession>;
  updateTrainingSession: (id: string, updates: Partial<TrainingSession>) => Promise<void>;
  deleteTrainingSession: (id: string) => Promise<void>;
  startWorkout: (sessionId: string) => Promise<Workout>;
  endWorkout: (workoutId: string, duration: number, notes?: string) => Promise<void>;
  addSetToExercise: (workoutId: string, exerciseId: string, reps: number, weight: number) => Promise<void>;
  getProgressiveOverloadSuggestions: (sessionId: string) => Promise<ProgressiveOverloadSuggestion[]>;
  setSelectedSession: (session: TrainingSession | null) => void;
  setCurrentWorkout: (workout: Workout | null) => void;
  getExercisesBySession: (sessionId: string) => Exercise[];
  getExercisesByMuscleGroup: (muscleGroupId: string) => Exercise[];
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  exercises: [],
  muscleGroups: [],
  trainingSessions: [],
  selectedSession: null,
  currentWorkout: null,
  workouts: [],
  isLoading: false,

  loadExercises: async () => {
    try {
      set({ isLoading: true });
      const db = getDatabase();
      const result = await db.getAllAsync(`
        SELECT e.*, m.name as muscle_group_name, t.name as session_name
        FROM exercises e
        LEFT JOIN muscle_groups m ON e.muscle_group_id = m.id
        LEFT JOIN training_sessions t ON e.session_id = t.id
        ORDER BY e.session_id, e.order_index
      `);
      
             const exercises: Exercise[] = result.map(row => ({
         id: row.id,
         name: row.name,
         muscle_group_id: row.muscle_group_id,
         session_id: row.session_id,
         order_index: row.order_index || 0,
         description: row.description,
         equipment: row.equipment,
         difficulty: row.difficulty,
         created_at: row.created_at
       }));
      
      set({ exercises });
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadMuscleGroups: async () => {
    try {
      const db = getDatabase();
      const result = await db.getAllAsync(`
        SELECT * FROM muscle_groups ORDER BY name
      `);
      
      const muscleGroups: MuscleGroup[] = result.map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        icon: row.icon,
        created_at: row.created_at
      }));
      
      set({ muscleGroups });
    } catch (error) {
      console.error('Failed to load muscle groups:', error);
    }
  },

  loadTrainingSessions: async () => {
    try {
      const db = getDatabase();
      const result = await db.getAllAsync(`
        SELECT ts.*, mg.name as muscle_group_name, mg.color as muscle_group_color
        FROM training_sessions ts
        LEFT JOIN muscle_groups mg ON ts.muscle_group_id = mg.id
        WHERE ts.is_active = 1
        ORDER BY ts.name
      `);
      
      const trainingSessions: TrainingSession[] = result.map(row => ({
        id: row.id,
        name: row.name,
        muscle_group_id: row.muscle_group_id,
        description: row.description,
        is_active: row.is_active === 1,
        created_at: row.created_at
      }));
      
      set({ trainingSessions });
    } catch (error) {
      console.error('Failed to load training sessions:', error);
    }
  },

  addExercise: async (exerciseData) => {
    try {
      const db = getDatabase();
      const id = Date.now().toString();
      const created_at = new Date().toISOString();
      
      // If no session_id, just use order_index 0
      const orderIndex = exerciseData.session_id ? 
        (await db.getAllAsync(`SELECT COUNT(*) as count FROM exercises WHERE session_id = ?`, [exerciseData.session_id]))[0]?.count + 1 || 1 : 0;
      
      await db.runAsync(`
        INSERT INTO exercises (id, name, muscle_group_id, session_id, order_index, description, equipment, difficulty, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, exerciseData.name, exerciseData.muscle_group_id, exerciseData.session_id || null, orderIndex,
          exerciseData.description, exerciseData.equipment, exerciseData.difficulty, created_at]);
      
      const newExercise: Exercise = {
        id,
        ...exerciseData,
        created_at
      };
      
      set(state => ({
        exercises: [...state.exercises, newExercise]
      }));
    } catch (error) {
      console.error('Failed to add exercise:', error);
    }
  },

  updateExercise: async (id, updates) => {
    try {
      const db = getDatabase();
      
      const updateFields = [];
      const updateValues = [];
      
      if (updates.name) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updates.description);
      }
      if (updates.equipment !== undefined) {
        updateFields.push('equipment = ?');
        updateValues.push(updates.equipment);
      }
      if (updates.difficulty) {
        updateFields.push('difficulty = ?');
        updateValues.push(updates.difficulty);
      }
      if (updates.muscle_group_id) {
        updateFields.push('muscle_group_id = ?');
        updateValues.push(updates.muscle_group_id);
      }
      if (updates.session_id !== undefined) {
        updateFields.push('session_id = ?');
        updateValues.push(updates.session_id);
      }
      if (updates.order_index !== undefined) {
        updateFields.push('order_index = ?');
        updateValues.push(updates.order_index);
      }

      if (updateFields.length > 0) {
        updateValues.push(id);
        const query = `UPDATE exercises SET ${updateFields.join(', ')} WHERE id = ?`;
        console.log('Updating exercise:', id, 'with query:', query, 'values:', updateValues);
        await db.runAsync(query, updateValues);

        set(state => ({
          exercises: state.exercises.map(exercise =>
            exercise.id === id ? { ...exercise, ...updates } : exercise
          )
        }));
      }
    } catch (error) {
      console.error('Failed to update exercise:', error);
    }
  },

  deleteExercise: async (id) => {
    try {
      const db = getDatabase();
      
      // Check if exercise is used in workouts
      const workoutUsage = await db.getAllAsync(`
        SELECT COUNT(*) as count FROM workout_exercises WHERE exercise_id = ?
      `, [id]);
      
      if (workoutUsage[0].count > 0) {
        throw new Error('Cannot delete exercise that is used in workouts.');
      }
      
      await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
      
      set(state => ({
        exercises: state.exercises.filter(exercise => exercise.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      throw error;
    }
  },

  addMuscleGroup: async (groupData) => {
    try {
      const db = getDatabase();
      const id = Date.now().toString();
      const created_at = new Date().toISOString();
      
      await db.runAsync(`
        INSERT INTO muscle_groups (id, name, color, icon, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [id, groupData.name, groupData.color, groupData.icon, created_at]);
      
      const newGroup: MuscleGroup = {
        id,
        ...groupData,
        created_at
      };
      
      set(state => ({
        muscleGroups: [...state.muscleGroups, newGroup]
      }));
    } catch (error) {
      console.error('Failed to add muscle group:', error);
    }
  },

  addTrainingSession: async (sessionData) => {
    try {
      const db = getDatabase();
      const id = Date.now().toString();
      const created_at = new Date().toISOString();
      
      await db.runAsync(`
        INSERT INTO training_sessions (id, name, muscle_group_id, description, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, sessionData.name, sessionData.muscle_group_id, sessionData.description, 
          sessionData.is_active ? 1 : 0, created_at]);
      
      const newSession: TrainingSession = {
        id,
        ...sessionData,
        created_at
      };
      
      set(state => ({
        trainingSessions: [...state.trainingSessions, newSession]
      }));
      
      return newSession;
    } catch (error) {
      console.error('Failed to add training session:', error);
      throw error;
    }
  },

  updateTrainingSession: async (id, updates) => {
    try {
      const db = getDatabase();
      
      const updateFields = [];
      const updateValues = [];
      
      if (updates.name) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updates.description);
      }
      if (updates.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(updates.is_active ? 1 : 0);
      }
      if (updates.muscle_group_id) {
        updateFields.push('muscle_group_id = ?');
        updateValues.push(updates.muscle_group_id);
      }

      if (updateFields.length > 0) {
        updateValues.push(id);
        await db.runAsync(`
          UPDATE training_sessions SET ${updateFields.join(', ')} WHERE id = ?
        `, updateValues);

        set(state => ({
          trainingSessions: state.trainingSessions.map(session =>
            session.id === id ? { ...session, ...updates } : session
          )
        }));
      }
    } catch (error) {
      console.error('Failed to update training session:', error);
    }
  },

  deleteTrainingSession: async (id) => {
    try {
      const db = getDatabase();
      
      // Check if session has exercises
      const exercises = await db.getAllAsync(`
        SELECT COUNT(*) as count FROM exercises WHERE session_id = ?
      `, [id]);
      
      console.log('Checking exercises for session:', id, 'Count:', exercises[0].count);
      
      if (exercises[0].count > 0) {
        // Let's also check which exercises are still linked
        const linkedExercises = await db.getAllAsync(`
          SELECT id, name, session_id FROM exercises WHERE session_id = ?
        `, [id]);
        console.log('Linked exercises:', linkedExercises);
        throw new Error('Cannot delete session with exercises. Remove exercises first.');
      }
      
      await db.runAsync('DELETE FROM training_sessions WHERE id = ?', [id]);
      
      set(state => ({
        trainingSessions: state.trainingSessions.filter(session => session.id !== id)
      }));
    } catch (error) {
      console.error('Failed to delete training session:', error);
      throw error;
    }
  },

  setSelectedSession: (session) => {
    set({ selectedSession: session });
  },

  getExercisesBySession: (sessionId) => {
    const session = get().trainingSessions.find(s => s.id === sessionId);
    if (!session) return [];
    
    // First try to find exercises by session_id (preferred method)
    let sessionExercises = get().exercises.filter(exercise => exercise.session_id === sessionId);
    
    // If no exercises found by session_id, fall back to muscle_group_id
    if (sessionExercises.length === 0) {
      sessionExercises = get().exercises.filter(exercise => exercise.muscle_group_id === session.muscle_group_id);
    }
    
    return sessionExercises;
  },

  getExercisesByMuscleGroup: (muscleGroupId) => {
    return get().exercises.filter(exercise => exercise.muscle_group_id === muscleGroupId);
  },

  loadWorkouts: async () => {
    try {
      const db = getDatabase();
      const result = await db.getAllAsync(`
        SELECT w.*, ts.name as session_name, ts.muscle_group_id
        FROM workouts w
        LEFT JOIN training_sessions ts ON w.session_id = ts.id
        ORDER BY w.date DESC
      `);
      
      const workouts: Workout[] = result.map(row => ({
        id: row.id,
        session_id: row.session_id,
        name: row.name,
        date: row.date,
        duration: row.duration,
        notes: row.notes,
        completed: row.completed === 1,
        created_at: row.created_at
      }));
      
      set({ workouts });
    } catch (error) {
      console.error('Failed to load workouts:', error);
    }
  },

  startWorkout: async (sessionId) => {
    try {
      const db = getDatabase();
      const session = get().trainingSessions.find(s => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      const workoutId = Date.now().toString();
      const created_at = new Date().toISOString();
      const date = new Date().toISOString().split('T')[0];
      
      // Create workout
      await db.runAsync(`
        INSERT INTO workouts (id, session_id, name, date, completed, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [workoutId, sessionId, session.name, date, 0, created_at]);

      // Get exercises for this session
      const sessionExercises = get().getExercisesBySession(sessionId);
      
      // Create workout_exercises entries
      for (let i = 0; i < sessionExercises.length; i++) {
        const exercise = sessionExercises[i];
        const workoutExerciseId = `${workoutId}_${exercise.id}`;
        
        await db.runAsync(`
          INSERT INTO workout_exercises (id, workout_id, exercise_id, order_index, completed)
          VALUES (?, ?, ?, ?, ?)
        `, [workoutExerciseId, workoutId, exercise.id, i + 1, 0]);
      }

      const newWorkout: Workout = {
        id: workoutId,
        session_id: sessionId,
        name: session.name,
        date,
        completed: false,
        created_at
      };

      set({ currentWorkout: newWorkout });
      return newWorkout;
    } catch (error) {
      console.error('Failed to start workout:', error);
      throw error;
    }
  },

  endWorkout: async (workoutId, duration, notes) => {
    try {
      const db = getDatabase();
      
      await db.runAsync(`
        UPDATE workouts 
        SET duration = ?, notes = ?, completed = 1 
        WHERE id = ?
      `, [duration, notes || null, workoutId]);

      set({ currentWorkout: null });
      get().loadWorkouts();
    } catch (error) {
      console.error('Failed to end workout:', error);
    }
  },

  addSetToExercise: async (workoutId, exerciseId, reps, weight) => {
    try {
      const db = getDatabase();
      
      // Get workout_exercise_id
      const workoutExercise = await db.getFirstAsync(`
        SELECT id FROM workout_exercises 
        WHERE workout_id = ? AND exercise_id = ?
      `, [workoutId, exerciseId]);
      
      if (!workoutExercise) {
        console.error('Workout exercise not found for workoutId:', workoutId, 'exerciseId:', exerciseId);
        throw new Error('Workout exercise not found');
      }

      // Get next set number
      const setCount = await db.getFirstAsync(`
        SELECT COUNT(*) as count FROM sets 
        WHERE workout_exercise_id = ?
      `, [workoutExercise.id]);

      const setId = `${workoutExercise.id}_${(setCount?.count || 0) + 1}`;
      
      await db.runAsync(`
        INSERT INTO sets (id, workout_exercise_id, reps, weight, completed, order_index)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [setId, workoutExercise.id, reps, weight, 1, (setCount?.count || 0) + 1]);

      console.log('Set added successfully:', { setId, reps, weight });

    } catch (error) {
      console.error('Failed to add set:', error);
      throw error; // Re-throw the error so it can be caught in the UI
    }
  },

  getProgressiveOverloadSuggestions: async (sessionId) => {
    try {
      const db = getDatabase();
      
      // Get last workout for this session
      const lastWorkout = await db.getFirstAsync(`
        SELECT * FROM workouts 
        WHERE session_id = ? AND completed = 1 
        ORDER BY date DESC 
        LIMIT 1
      `, [sessionId]);

      if (!lastWorkout) return [];

      const suggestions: ProgressiveOverloadSuggestion[] = [];
      
      // Get exercises and their last performance
      const exercises = get().getExercisesBySession(sessionId);
      
      for (const exercise of exercises) {
        const lastSets = await db.getAllAsync(`
          SELECT s.* FROM sets s
          JOIN workout_exercises we ON s.workout_exercise_id = we.id
          WHERE we.workout_id = ? AND we.exercise_id = ?
          ORDER BY s.order_index DESC
          LIMIT 3
        `, [lastWorkout.id, exercise.id]);

        if (lastSets.length > 0) {
          const avgWeight = lastSets.reduce((sum, set) => sum + set.weight, 0) / lastSets.length;
          const avgReps = lastSets.reduce((sum, set) => sum + set.reps, 0) / lastSets.length;
          
          // Progressive overload logic (2.5-5% increase)
          const increasePercentage = avgReps >= 8 ? 0.025 : 0.05; // 2.5% if high reps, 5% if low reps
          const suggestedWeight = Math.round((avgWeight * (1 + increasePercentage)) * 2) / 2; // Round to nearest 0.5kg
          
          if (suggestedWeight > avgWeight) {
            suggestions.push({
              exercise_id: exercise.id,
              exercise_name: exercise.name,
              current_weight: avgWeight,
              suggested_weight: suggestedWeight,
              increase_percentage: increasePercentage * 100,
              reason: avgReps >= 8 
                ? `Du klarede ${avgReps.toFixed(1)} reps i gennemsnit. Øg vægten med 2.5% for at opretholde 6-8 reps.`
                : `Du klarede ${avgReps.toFixed(1)} reps i gennemsnit. Øg vægten med 5% for at opretholde 3-5 reps.`
            });
          }
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to get progressive overload suggestions:', error);
      return [];
    }
  },

  setCurrentWorkout: (workout) => {
    set({ currentWorkout: workout });
  }
}));
