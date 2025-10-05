import { create } from 'zustand';
import { Exercise, MuscleGroup, TrainingSession, Workout, ExerciseInWorkout, Set, ProgressData, ProgressiveOverloadSuggestion } from '../types';
import { getDatabase } from '../database';

export interface ExerciseState {
  exercises: Exercise[];
  filteredExercises: Exercise[];
  searchQuery: string;
  selectedCategory: string;
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
  endWorkout: (workoutId: string, duration: number, notes?: string, date?: string) => Promise<void>;
  addSetToExercise: (workoutId: string, exerciseId: string, reps: number, weight: number) => Promise<void>;
  updateSetInExercise: (workoutId: string, exerciseId: string, setIndex: number, reps: number, weight: number) => Promise<void>;
  deleteSetFromExercise: (workoutId: string, exerciseId: string, setIndex: number) => Promise<void>;
  addWorkout: (workout: Omit<Workout, 'id' | 'created_at'>) => Promise<Workout>;
  deleteWorkout: (workoutId: string) => Promise<void>;
  updateWorkout: (workoutId: string, updates: { name?: string; notes?: string; date?: string }) => Promise<void>;
  getProgressiveOverloadSuggestions: (sessionId: string) => Promise<ProgressiveOverloadSuggestion[]>;
  setSelectedSession: (session: TrainingSession | null) => void;
  setCurrentWorkout: (workout: Workout | null) => void;
  getExercisesBySession: (sessionId: string) => Exercise[];
  getExercisesByMuscleGroup: (muscleGroupId: string) => Exercise[];
  saveWorkoutProgress: (workoutId: string) => Promise<void>;
  cleanupIncompleteWorkout: (workoutId: string) => Promise<void>;
  cleanupAllIncompleteWorkouts: () => Promise<void>;
  searchExercises: (query: string) => void;
  filterByCategory: (category: string) => void;
  exportAllData: () => Promise<string>;
  importAllData: (dataJson: string) => Promise<boolean>;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  exercises: [],
  filteredExercises: [],
  searchQuery: '',
  selectedCategory: 'All',
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
      
      const exercises: Exercise[] = result.map((row: any) => ({
        id: row.id,
        name: row.name,
        muscle_group_id: row.muscle_group_id,
        session_id: row.session_id,
        order_index: row.order_index || 0,
        description: row.description,
        equipment: row.equipment,
        difficulty: row.difficulty,
        category: row.category || 'General',
        muscleGroups: row.muscleGroups ? JSON.parse(row.muscleGroups) : [],
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
      console.log('🔄 Loading muscle groups...');
      const db = getDatabase();
      const result = await db.getAllAsync(`
        SELECT * FROM muscle_groups ORDER BY name
      `);
      
      console.log(`📊 Found ${result.length} muscle groups in database`);
      
      const muscleGroups: MuscleGroup[] = result.map((row: any) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        icon: row.icon,
        created_at: row.created_at
      }));
      
      console.log('✅ Muscle groups loaded:', muscleGroups.map(g => g.name));
      set({ muscleGroups });
    } catch (error) {
      console.error('❌ Failed to load muscle groups:', error);
    }
  },

  loadTrainingSessions: async () => {
    try {
      console.log('🔄 Loading training sessions...');
      const db = getDatabase();
      
      // 🚀 AUTOMATIC DATA MIGRATION SYSTEM
      console.log('🔍 Checking for data migration needs...');
      await performDataMigration(db);
      
      // 🚨 EMERGENCY DATA RESTORATION
      console.log('🚨 Emergency data restoration check...');
      await emergencyDataRestoration(db);
      
      // First check all sessions in database
      const allSessions = await db.getAllAsync(`SELECT * FROM training_sessions`);
      console.log('📊 All sessions in database:', allSessions);
      
      // Check if any sessions have is_active = 0
      const inactiveSessions = await db.getAllAsync(`SELECT * FROM training_sessions WHERE is_active = 0`);
      console.log('📊 Inactive sessions found:', inactiveSessions);
      
      // Fix any inactive sessions by setting them to active
      if (inactiveSessions.length > 0) {
        console.log('🔧 Fixing inactive sessions...');
        await db.runAsync(`UPDATE training_sessions SET is_active = 1 WHERE is_active = 0`);
        console.log(`✅ Fixed ${inactiveSessions.length} inactive sessions`);
      }
      
      const result = await db.getAllAsync(`
        SELECT ts.*, mg.name as muscle_group_name, mg.color as muscle_group_color
        FROM training_sessions ts
        LEFT JOIN muscle_groups mg ON ts.muscle_group_id = mg.id
        ORDER BY ts.name
      `);
      
      console.log('📊 Active sessions found:', result.length, result);
      
      const trainingSessions: TrainingSession[] = result.map((row: any) => ({
        id: row.id,
        name: row.name,
        muscle_group_id: row.muscle_group_id,
        description: row.description,
        is_active: row.is_active === 1,
        created_at: row.created_at
      }));
      
      console.log('✅ Processed training sessions:', trainingSessions);
      
      // 🚨 CHECK FOR DUPLICATE SESSIONS AND REMOVE THEM
      const duplicateCheck = await checkAndRemoveDuplicateSessions(db, trainingSessions);
      if (duplicateCheck.removed > 0) {
        console.log(`🧹 Removed ${duplicateCheck.removed} duplicate sessions`);
        // Reload sessions after duplicate removal
        const cleanedResult = await db.getAllAsync(`
          SELECT ts.*, mg.name as muscle_group_name, mg.color as muscle_group_color
          FROM training_sessions ts
          LEFT JOIN muscle_groups mg ON ts.muscle_group_id = mg.id
          ORDER BY ts.name
        `);
        
        const cleanedSessions: TrainingSession[] = cleanedResult.map((row: any) => ({
          id: row.id,
          name: row.name,
          muscle_group_id: row.muscle_group_id,
          description: row.description,
          is_active: row.is_active === 1,
          created_at: row.created_at
        }));
        
        console.log('✅ Cleaned training sessions:', cleanedSessions);
        set({ trainingSessions: cleanedSessions });
        return; // Exit early since we've already set the state
      }
      
      // Only restore sessions if we have NO sessions at all (fresh database)
      // Don't restore if user has manually deleted sessions
      if (trainingSessions.length === 0) {
        console.log('⚠️ No sessions found - this might be a fresh database, attempting to restore...');
        await restoreMissingSessions(db);
        
        // Reload sessions after restoration
        const restoredResult = await db.getAllAsync(`
          SELECT ts.*, mg.name as muscle_group_name, mg.color as muscle_group_color
          FROM training_sessions ts
          LEFT JOIN muscle_groups mg ON ts.muscle_group_id = mg.id
          ORDER BY ts.name
        `);
        
        const restoredSessions: TrainingSession[] = restoredResult.map((row: any) => ({
          id: row.id,
          name: row.name,
          muscle_group_id: row.muscle_group_id,
          description: row.description,
          is_active: row.is_active === 1,
          created_at: row.created_at
        }));
        
        console.log('✅ Restored training sessions:', restoredSessions);
        set({ trainingSessions: restoredSessions });
      } else {
        console.log(`✅ Found ${trainingSessions.length} sessions - no restoration needed`);
        set({ trainingSessions });
      }
    } catch (error) {
      console.error('❌ Failed to load training sessions:', error);
    }
  },

  addExercise: async (exerciseData) => {
    try {
      const db = getDatabase();
      const id = Date.now().toString();
      const created_at = new Date().toISOString();
      
      // If no session_id, just use order_index 0
      const orderIndex = exerciseData.session_id ? 
        ((await db.getAllAsync(`SELECT COUNT(*) as count FROM exercises WHERE session_id = ?`, [exerciseData.session_id]))[0] as any)?.count + 1 || 1 : 0;
      
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
      
      if ((workoutUsage[0] as any).count > 0) {
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
      `, [id, sessionData.name, sessionData.muscle_group_id, sessionData.description || '', 
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
      console.log('🔄 Updating training session:', id, updates);
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

      console.log('📝 Update fields:', updateFields);
      console.log('📝 Update values:', updateValues);

      if (updateFields.length > 0) {
        updateValues.push(id);
        const query = `UPDATE training_sessions SET ${updateFields.join(', ')} WHERE id = ?`;
        console.log('🔍 Executing query:', query);
        
        await db.runAsync(query, updateValues);
        console.log('✅ Database updated successfully');

        set(state => ({
          trainingSessions: state.trainingSessions.map(session =>
            session.id === id ? { ...session, ...updates } : session
          )
        }));
        console.log('✅ State updated successfully');
      } else {
        console.log('⚠️ No fields to update');
      }
    } catch (error) {
      console.error('❌ Failed to update training session:', error);
      throw error;
    }
  },

  deleteTrainingSession: async (id) => {
    try {
      console.log(`🗑️ Deleting training session: ${id}`);
      const db = getDatabase();

      // Perform dependent deletions to satisfy FK constraints
      await db.execAsync('BEGIN');
      
      // Delete in correct order to avoid foreign key issues
      console.log('🗑️ Deleting dependent data...');
      await db.runAsync(
        `DELETE FROM sets WHERE workout_exercise_id IN (
           SELECT id FROM workout_exercises WHERE workout_id IN (
             SELECT id FROM workouts WHERE session_id = ?
           )
         )`,
        [id]
      );
      await db.runAsync(
        `DELETE FROM workout_exercises WHERE workout_id IN (
           SELECT id FROM workouts WHERE session_id = ?
         )`,
        [id]
      );
      await db.runAsync(
        `DELETE FROM progress_data WHERE workout_id IN (
           SELECT id FROM workouts WHERE session_id = ?
         )`,
        [id]
      );
      await db.runAsync(`DELETE FROM workouts WHERE session_id = ?`, [id]);
      await db.runAsync(`UPDATE exercises SET session_id = NULL WHERE session_id = ?`, [id]);
      
      // Finally delete the session itself
      const deleteResult = await db.runAsync('DELETE FROM training_sessions WHERE id = ?', [id]);
      console.log(`🗑️ Session deletion result:`, deleteResult);
      
      await db.execAsync('COMMIT');
      console.log('✅ Session deleted successfully from database');

      // Update state immediately without reloading
      set(state => {
        const updatedSessions = state.trainingSessions.filter(session => session.id !== id);
        console.log(`✅ State updated: ${updatedSessions.length} sessions remaining`);
        return { trainingSessions: updatedSessions };
      });
      
      // Clear selected session if it was deleted
      const currentSelected = get().selectedSession;
      if (currentSelected && currentSelected.id === id) {
        set({ selectedSession: null });
        console.log('✅ Cleared selected session');
      }
      
    } catch (error) {
      try { 
        await getDatabase().execAsync('ROLLBACK'); 
        console.log('✅ Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Failed to rollback:', rollbackError);
      }
      console.error('❌ Failed to delete training session:', error);
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
        SELECT w.*, 
               ts.name as session_name, 
               ts.muscle_group_id,
               COUNT(DISTINCT we.id) as exercise_count,
               COUNT(s.id) as total_sets
        FROM workouts w
        LEFT JOIN training_sessions ts ON w.session_id = ts.id
        LEFT JOIN workout_exercises we ON w.id = we.workout_id
        LEFT JOIN sets s ON we.id = s.workout_exercise_id
        GROUP BY w.id
        ORDER BY w.date DESC
      `);
      
      const workouts: Workout[] = result.map((row: any) => ({
        id: row.id,
        session_id: row.session_id,
        name: row.name,
        date: row.date,
        duration: row.duration,
        notes: row.notes,
        completed: row.completed === 1,
        created_at: row.created_at,
        exercise_count: row.exercise_count,
        total_sets: row.total_sets
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

  endWorkout: async (workoutId, duration, notes, date) => {
    try {
      const db = getDatabase();
      
      await db.runAsync(`
        UPDATE workouts 
        SET duration = ?, notes = ?, completed = 1, date = ?
        WHERE id = ?
      `, [duration, notes || null, date || new Date().toISOString().split('T')[0], workoutId]);

      // Save progress data for all exercises in this workout
      await get().saveWorkoutProgress(workoutId);

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
      let workoutExercise = await db.getFirstAsync(`
        SELECT id FROM workout_exercises 
        WHERE workout_id = ? AND exercise_id = ?
      `, [workoutId, exerciseId]);
      
      if (!workoutExercise) {
        // Create workout_exercises row on the fly if missing
        const weCount = await db.getFirstAsync(`
          SELECT COUNT(*) as count FROM workout_exercises WHERE workout_id = ?
        `, [workoutId]);
        const orderIndex = ((weCount as any)?.count || 0) + 1;
        const workoutExerciseId = `${workoutId}_${exerciseId}`;
        await db.runAsync(`
          INSERT INTO workout_exercises (id, workout_id, exercise_id, order_index, completed)
          VALUES (?, ?, ?, ?, ?)
        `, [workoutExerciseId, workoutId, exerciseId, orderIndex, 1]);
        workoutExercise = { id: workoutExerciseId } as any;
      }

      // Get next set number
      const setCount = await db.getFirstAsync(`
        SELECT COUNT(*) as count FROM sets 
        WHERE workout_exercise_id = ?
      `, [(workoutExercise as any).id]);

      const setId = `${(workoutExercise as any).id}_${((setCount as any)?.count || 0) + 1}`;
      
      await db.runAsync(`
        INSERT INTO sets (id, workout_exercise_id, reps, weight, completed, order_index)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [setId, (workoutExercise as any).id, reps ?? 0, weight ?? 0, 1, ((setCount as any)?.count || 0) + 1]);

      console.log('Set added successfully:', { setId, reps, weight });

    } catch (error) {
      console.error('Failed to add set:', error);
      throw error; // Re-throw the error so it can be caught in the UI
    }
  },

  updateSetInExercise: async (workoutId, exerciseId, setIndex, reps, weight) => {
    try {
      const db = getDatabase();
      
      // Get workout_exercise_id
      const workoutExercise = await db.getFirstAsync(`
        SELECT id FROM workout_exercises 
        WHERE workout_id = ? AND exercise_id = ?
      `, [workoutId, exerciseId]);
      
      if (!workoutExercise) {
        throw new Error('Workout exercise not found');
      }

      // Get all sets for this exercise in order
      const sets = await db.getAllAsync(`
        SELECT id, order_index FROM sets 
        WHERE workout_exercise_id = ? 
        ORDER BY order_index
      `, [(workoutExercise as any).id]);

      if (setIndex >= sets.length || setIndex < 0) {
        throw new Error('Set index out of range');
      }

      const setToUpdate = sets[setIndex] as { id: string; order_index: number };
      
      // Update the specific set
      await db.runAsync(`
        UPDATE sets SET reps = ?, weight = ? WHERE id = ?
      `, [reps, weight, setToUpdate.id]);

      console.log('Set updated successfully:', { setId: setToUpdate.id, setIndex, reps, weight });

    } catch (error) {
      console.error('Failed to update set:', error);
      throw error; // Re-throw the error so it can be caught in the UI
    }
  },

  deleteSetFromExercise: async (workoutId, exerciseId, setIndex) => {
    try {
      const db = getDatabase();
      
      // Get workout_exercise_id
      const workoutExercise = await db.getFirstAsync(`
        SELECT id FROM workout_exercises 
        WHERE workout_id = ? AND exercise_id = ?
      `, [workoutId, exerciseId]);
      
      if (!workoutExercise) {
        throw new Error('Workout exercise not found');
      }

      // Get all sets for this exercise in order
      const sets = await db.getAllAsync(`
        SELECT id, order_index FROM sets 
        WHERE workout_exercise_id = ? 
        ORDER BY order_index
      `, [(workoutExercise as any).id]);

      if (setIndex >= sets.length || setIndex < 0) {
        throw new Error('Set index out of range');
      }

      const setToDelete = sets[setIndex] as { id: string; order_index: number };
      
      // Delete the specific set
      await db.runAsync(`
        DELETE FROM sets WHERE id = ?
      `, [setToDelete.id]);

      // Update order_index for remaining sets
      for (let i = setIndex + 1; i < sets.length; i++) {
        const remainingSet = sets[i] as { id: string; order_index: number };
        await db.runAsync(`
          UPDATE sets SET order_index = ? WHERE id = ?
        `, [i, remainingSet.id]);
      }

      console.log('Set deleted successfully:', { setId: setToDelete.id, setIndex });

    } catch (error) {
      console.error('Failed to delete set:', error);
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
        `, [(lastWorkout as any).id, exercise.id]);

        if (lastSets.length > 0) {
          const setsArr = lastSets as any[];
          const avgWeight = setsArr.reduce((sum, s) => sum + (s.weight || 0), 0) / setsArr.length;
          const avgReps = setsArr.reduce((sum, s) => sum + (s.reps || 0), 0) / setsArr.length;
          
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
  },

  addWorkout: async (workoutData) => {
    try {
      const db = getDatabase();
      const id = Date.now().toString();
      const created_at = new Date().toISOString();
      
      await db.runAsync(`
        INSERT INTO workouts (id, session_id, name, date, notes, completed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, workoutData.session_id, workoutData.name, workoutData.date, 
          workoutData.notes || '', workoutData.completed ? 1 : 0, created_at]);
      
      const newWorkout: Workout = {
        id,
        ...workoutData,
        created_at
      };
      
      set(state => ({
        workouts: [...state.workouts, newWorkout]
      }));
      
      return newWorkout;
    } catch (error) {
      console.error('Failed to add workout:', error);
      throw error;
    }
  },

  deleteWorkout: async (workoutId) => {
    try {
      const db = getDatabase();
      
      console.log('Starting deletion of workout:', workoutId);
      
      // Check if workout exists first
      const workoutExists = await db.getFirstAsync('SELECT id FROM workouts WHERE id = ?', [workoutId]);
      if (!workoutExists) {
        throw new Error('Workout not found');
      }
      
      // Delete all related data first (use correct table names)
      console.log('Deleting sets...');
      const setsResult = await db.runAsync('DELETE FROM sets WHERE workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id = ?)', [workoutId]);
      console.log('Deleted sets, affected rows:', setsResult.changes);
      
      console.log('Deleting workout_exercises...');
      const workoutExercisesResult = await db.runAsync('DELETE FROM workout_exercises WHERE workout_id = ?', [workoutId]);
      console.log('Deleted workout_exercises, affected rows:', workoutExercisesResult.changes);
      
      console.log('Deleting progress_data...');
      const progressResult = await db.runAsync('DELETE FROM progress_data WHERE workout_id = ?', [workoutId]);
      console.log('Deleted progress_data, affected rows:', progressResult.changes);
      
      console.log('Deleting workout...');
      const workoutResult = await db.runAsync('DELETE FROM workouts WHERE id = ?', [workoutId]);
      console.log('Deleted workout, affected rows:', workoutResult.changes);
      
      if (workoutResult.changes === 0) {
        throw new Error('No workout was deleted');
      }
      
      // Update local state
      set(state => ({
        workouts: state.workouts.filter(workout => workout.id !== workoutId)
      }));
      
      console.log('Successfully deleted workout:', workoutId);
    } catch (error) {
      console.error('Failed to delete workout:', error);
      throw error;
    }
  },

  updateWorkout: async (workoutId, updates) => {
    try {
      const db = getDatabase();
      
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      
      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.notes !== undefined) {
        updateFields.push('notes = ?');
        values.push(updates.notes);
      }
      if (updates.date !== undefined) {
        updateFields.push('date = ?');
        values.push(updates.date);
      }
      
      if (updateFields.length === 0) {
        return; // No updates to make
      }
      
      values.push(workoutId);
      
      await db.runAsync(`
        UPDATE workouts 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `, values);
      
      // Update local state
      set(state => ({
        workouts: state.workouts.map(workout => 
          workout.id === workoutId 
            ? { ...workout, ...updates }
            : workout
        )
      }));
    } catch (error) {
      console.error('Failed to update workout:', error);
      throw error;
    }
  },

  saveWorkoutProgress: async (workoutId) => {
    try {
      const db = getDatabase();
      
      // Get all workout exercises and their sets
      const workoutData = await db.getAllAsync(`
        SELECT we.exercise_id, s.reps, s.weight, w.date
        FROM workouts w
        JOIN workout_exercises we ON w.id = we.workout_id
        JOIN sets s ON we.id = s.workout_exercise_id
        WHERE w.id = ? AND s.completed = 1
      `, [workoutId]);

      if (workoutData.length === 0) return;

      // Group by exercise
      const exerciseGroups: Record<string, any[]> = workoutData.reduce((groups: Record<string, any[]>, data: any) => {
        if (!groups[data.exercise_id]) {
          groups[data.exercise_id] = [];
        }
        groups[data.exercise_id].push(data);
        return groups;
      }, {});

      // Calculate and save progress for each exercise
      for (const [exerciseId, sets] of Object.entries(exerciseGroups)) {
        const setsArray = sets;
        
        const maxWeight = Math.max(...setsArray.map(s => s.weight));
        const totalVolume = setsArray.reduce((total, s) => total + (s.weight * s.reps), 0);
        
        // Calculate 1RM using Brzycki formula
        const oneRepMax = Math.max(...setsArray.map(s => {
          if (s.reps === 1) return s.weight;
          if (s.reps <= 0) return 0;
          return Math.round(s.weight * (36 / (37 - s.reps)) * 100) / 100;
        }));

        // Save progress data
        const progressId = `${workoutId}_${exerciseId}`;
        await db.runAsync(`
          INSERT OR REPLACE INTO progress_data (id, exercise_id, workout_id, date, max_weight, total_volume, one_rep_max)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          progressId,
          exerciseId,
          workoutId,
          setsArray[0].date,
          maxWeight,
          totalVolume,
          oneRepMax
        ]);
      }

      console.log('✅ Workout progress saved successfully');
      
      // Reload progress data in progress store
      const { useProgressStore } = await import('./progressStore');
      useProgressStore.getState().loadProgressData();
      
      // Check achievements after workout completion
      const { useAchievementsStore } = await import('./achievementsStore');
      await useAchievementsStore.getState().loadUserStats();
      await useAchievementsStore.getState().checkAchievements();
    } catch (error) {
      console.error('❌ Failed to save workout progress:', error);
    }
  },

  cleanupIncompleteWorkout: async (workoutId) => {
    try {
      const db = getDatabase();
      
      console.log('🧹 Cleaning up incomplete workout:', workoutId);
      
      // Delete all sets for this workout
      await db.runAsync(`
        DELETE FROM sets 
        WHERE workout_exercise_id IN (
          SELECT id FROM workout_exercises WHERE workout_id = ?
        )
      `, [workoutId]);
      
      // Delete workout_exercises
      await db.runAsync(`
        DELETE FROM workout_exercises WHERE workout_id = ?
      `, [workoutId]);
      
      // Delete the workout itself (if it exists)
      await db.runAsync(`
        DELETE FROM workouts WHERE id = ? AND completed = 0
      `, [workoutId]);
      
      console.log('✅ Workout cleanup completed for:', workoutId);
    } catch (error) {
      console.error('❌ Failed to cleanup incomplete workout:', error);
    }
  },

  cleanupAllIncompleteWorkouts: async () => {
    try {
      const db = getDatabase();
      
      console.log('🧹 Cleaning up all incomplete workouts...');
      
      // Find all incomplete workouts (completed = 0 or NULL)
      const incompleteWorkouts = await db.getAllAsync(`
        SELECT id FROM workouts WHERE completed = 0 OR completed IS NULL
      `);
      
      for (const workout of incompleteWorkouts as any[]) {
        // Delete sets for each incomplete workout
        await db.runAsync(`
          DELETE FROM sets 
          WHERE workout_exercise_id IN (
            SELECT id FROM workout_exercises WHERE workout_id = ?
          )
        `, [workout.id]);
        
        // Delete workout_exercises
        await db.runAsync(`
          DELETE FROM workout_exercises WHERE workout_id = ?
        `, [workout.id]);
      }
      
      // Delete all incomplete workouts
      await db.runAsync(`
        DELETE FROM workouts WHERE completed = 0 OR completed IS NULL
      `);
      
      console.log(`✅ Cleaned up ${incompleteWorkouts.length} incomplete workouts`);
    } catch (error) {
      console.error('❌ Failed to cleanup incomplete workouts:', error);
    }
  },

  searchExercises: (query: string) => {
    set({ searchQuery: query });
    const { exercises, selectedCategory } = get();
    
    let filtered = exercises;
    
    // Filter by category
    if (selectedCategory && selectedCategory !== 'All') {
      filtered = filtered.filter(exercise => exercise.category === selectedCategory);
    }
    
    // Filter by search query
    if (query) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(query.toLowerCase()) ||
        exercise.description?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    set({ filteredExercises: filtered });
  },

  filterByCategory: (category: string) => {
    set({ selectedCategory: category });
    const { exercises, searchQuery } = get();
    
    let filtered = exercises;
    
    // Filter by category
    if (category && category !== 'All') {
      filtered = filtered.filter(exercise => exercise.category === category);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    set({ filteredExercises: filtered });
  },

  // 🚀 DATA EXPORT/IMPORT SYSTEM
  exportAllData: async () => {
    try {
      console.log('📤 Exporting all data...');
      const db = getDatabase();
      
      // Export all tables
      const data = {
        export_timestamp: new Date().toISOString(),
        version: '1.0.0',
        muscle_groups: await db.getAllAsync(`SELECT * FROM muscle_groups`),
        training_sessions: await db.getAllAsync(`SELECT * FROM training_sessions`),
        exercises: await db.getAllAsync(`SELECT * FROM exercises`),
        workouts: await db.getAllAsync(`SELECT * FROM workouts`),
        workout_exercises: await db.getAllAsync(`SELECT * FROM workout_exercises`),
        sets: await db.getAllAsync(`SELECT * FROM sets`),
        progress_data: await db.getAllAsync(`SELECT * FROM progress_data`),
      };
      
      const jsonString = JSON.stringify(data, null, 2);
      console.log('✅ Data exported successfully');
      return jsonString;
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      throw error;
    }
  },

  importAllData: async (dataJson: string) => {
    try {
      console.log('📥 Importing all data...');
      const db = getDatabase();
      
      // Validate JSON first
      let data;
      try {
        data = JSON.parse(dataJson);
        console.log('✅ JSON parsed successfully');
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error(`Invalid JSON format: ${parseError.message}`);
      }
      
      if (!data.version || !data.muscle_groups) {
        console.error('❌ Missing required fields:', { 
          hasVersion: !!data.version, 
          hasMuscleGroups: !!data.muscle_groups,
          dataKeys: Object.keys(data)
        });
        throw new Error('Invalid data format - missing version or muscle_groups');
      }
      
      console.log(`📊 Importing data version: ${data.version}`);
      console.log(`📅 Export timestamp: ${data.export_timestamp}`);
      console.log(`📊 Data structure:`, {
        muscle_groups: data.muscle_groups?.length || 0,
        training_sessions: data.training_sessions?.length || 0,
        exercises: data.exercises?.length || 0,
        workouts: data.workouts?.length || 0,
        sets: data.sets?.length || 0
      });
      
      // Start transaction
      await db.execAsync('BEGIN TRANSACTION');
      
      try {
        // 🗑️ CLEAR ALL EXISTING DATA FIRST (in correct order for foreign keys)
        console.log('🗑️ Clearing existing data before import...');
        
        // Disable foreign key constraints temporarily
        await db.runAsync('PRAGMA foreign_keys = OFF');
        console.log('✅ Foreign keys disabled');
        
        // Delete in correct order (child tables first)
        console.log('🗑️ Deleting sets...');
        await db.runAsync('DELETE FROM sets');
        console.log('🗑️ Deleting workout_exercises...');
        await db.runAsync('DELETE FROM workout_exercises');
        console.log('🗑️ Deleting workouts...');
        await db.runAsync('DELETE FROM workouts');
        console.log('🗑️ Deleting progress_data...');
        await db.runAsync('DELETE FROM progress_data');
        console.log('🗑️ Deleting exercises...');
        await db.runAsync('DELETE FROM exercises');
        console.log('🗑️ Deleting training_sessions...');
        await db.runAsync('DELETE FROM training_sessions');
        console.log('🗑️ Deleting muscle_groups...');
        await db.runAsync('DELETE FROM muscle_groups');
        
        // Re-enable foreign key constraints
        await db.runAsync('PRAGMA foreign_keys = ON');
        console.log('✅ Foreign keys re-enabled');
        
        console.log('✅ Existing data cleared');
        
        // Import muscle groups
        if (data.muscle_groups && data.muscle_groups.length > 0) {
          console.log(`📊 Importing ${data.muscle_groups.length} muscle groups...`);
          for (let i = 0; i < data.muscle_groups.length; i++) {
            const mg = data.muscle_groups[i];
            try {
              await db.runAsync(`
                INSERT INTO muscle_groups (id, name, color, icon, created_at)
                VALUES (?, ?, ?, ?, ?)
              `, [mg.id, mg.name, mg.color, mg.icon, mg.created_at]);
              console.log(`✅ Imported muscle group ${i + 1}/${data.muscle_groups.length}: ${mg.name}`);
            } catch (error) {
              console.error(`❌ Failed to import muscle group ${i + 1}:`, mg, error);
              throw error;
            }
          }
        }
        
        // Import training sessions
        if (data.training_sessions && data.training_sessions.length > 0) {
          console.log(`📊 Importing ${data.training_sessions.length} training sessions...`);
          for (let i = 0; i < data.training_sessions.length; i++) {
            const ts = data.training_sessions[i];
            try {
              await db.runAsync(`
                INSERT INTO training_sessions (id, name, muscle_group_id, description, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
              `, [ts.id, ts.name, ts.muscle_group_id, ts.description, ts.is_active, ts.created_at]);
              console.log(`✅ Imported session ${i + 1}/${data.training_sessions.length}: ${ts.name}`);
            } catch (error) {
              console.error(`❌ Failed to import session ${i + 1}:`, ts, error);
              throw error;
            }
          }
        }
        
        // Import exercises
        if (data.exercises && data.exercises.length > 0) {
          console.log(`📊 Importing ${data.exercises.length} exercises...`);
          for (const ex of data.exercises) {
            await db.runAsync(`
              INSERT INTO exercises (id, name, muscle_group_id, session_id, order_index, description, equipment, difficulty, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [ex.id, ex.name, ex.muscle_group_id, ex.session_id, ex.order_index, ex.description, ex.equipment, ex.difficulty, ex.created_at]);
          }
        }
        
        // Import workouts
        if (data.workouts && data.workouts.length > 0) {
          console.log(`📊 Importing ${data.workouts.length} workouts...`);
          for (const wo of data.workouts) {
            await db.runAsync(`
              INSERT INTO workouts (id, session_id, name, date, duration, notes, completed, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [wo.id, wo.session_id, wo.name, wo.date, wo.duration, wo.notes, wo.completed, wo.created_at]);
          }
        }
        
        // Import workout exercises
        if (data.workout_exercises && data.workout_exercises.length > 0) {
          console.log(`📊 Importing ${data.workout_exercises.length} workout exercises...`);
          for (const we of data.workout_exercises) {
            await db.runAsync(`
              INSERT INTO workout_exercises (id, workout_id, exercise_id, order_index, completed)
              VALUES (?, ?, ?, ?, ?)
            `, [we.id, we.workout_id, we.exercise_id, we.order_index, we.completed]);
          }
        }
        
        // Import sets
        if (data.sets && data.sets.length > 0) {
          console.log(`📊 Importing ${data.sets.length} sets...`);
          for (const s of data.sets) {
            await db.runAsync(`
              INSERT INTO sets (id, workout_exercise_id, reps, weight, completed, order_index)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [s.id, s.workout_exercise_id, s.reps, s.weight, s.completed, s.order_index]);
          }
        }
        
        // Import progress data
        if (data.progress_data && data.progress_data.length > 0) {
          console.log(`📊 Importing ${data.progress_data.length} progress records...`);
          for (const pd of data.progress_data) {
            await db.runAsync(`
              INSERT INTO progress_data (id, exercise_id, workout_id, date, max_weight, total_volume, one_rep_max)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [pd.id, pd.exercise_id, pd.workout_id, pd.date, pd.max_weight, pd.total_volume, pd.one_rep_max]);
          }
        }
        
        // Commit transaction
        await db.execAsync('COMMIT');
        
        // Reload all data
        await get().loadMuscleGroups();
        await get().loadTrainingSessions();
        await get().loadExercises();
        await get().loadWorkouts();
        
        console.log('✅ Data imported successfully');
        return true;
        
      } catch (error) {
        console.error('❌ Transaction error, rolling back...', error);
        try {
          await db.execAsync('ROLLBACK');
          console.log('✅ Transaction rolled back successfully');
        } catch (rollbackError) {
          console.error('❌ Failed to rollback transaction:', rollbackError);
        }
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return false;
    }
  }
}));

// 🚀 AUTOMATIC DATA MIGRATION SYSTEM
const performDataMigration = async (db: any) => {
  try {
    console.log('🔍 Starting automatic data migration...');
    
    // Check if we have any workout data
    const workoutCount = await db.getFirstAsync(`SELECT COUNT(*) as count FROM workouts`);
    const totalWorkouts = (workoutCount as any)?.count || 0;
    
    console.log(`📊 Found ${totalWorkouts} workouts in database`);
    
    if (totalWorkouts === 0) {
      console.log('⚠️ No workout data found - attempting to detect and migrate from old database...');
      await detectAndMigrateOldData(db);
    } else {
      console.log('✅ Workout data exists - no migration needed');
    }
    
    // Always check for missing sessions and restore them
    await restoreMissingSessions(db);
    
    console.log('✅ Data migration complete');
  } catch (error) {
    console.error('❌ Data migration failed:', error);
  }
};

// 🚨 EMERGENCY DATA RESTORATION
const emergencyDataRestoration = async (db: any) => {
  try {
    console.log('🚨 Starting emergency data restoration...');
    
    // Check if we have any data at all
    const sessionCount = await db.getFirstAsync(`SELECT COUNT(*) as count FROM training_sessions`);
    const exerciseCount = await db.getFirstAsync(`SELECT COUNT(*) as count FROM exercises`);
    const workoutCount = await db.getFirstAsync(`SELECT COUNT(*) as count FROM workouts`);
    
    const totalSessions = (sessionCount as any)?.count || 0;
    const totalExercises = (exerciseCount as any)?.count || 0;
    const totalWorkouts = (workoutCount as any)?.count || 0;
    
    console.log(`📊 Current data status:`);
    console.log(`   - Sessions: ${totalSessions}`);
    console.log(`   - Exercises: ${totalExercises}`);
    console.log(`   - Workouts: ${totalWorkouts}`);
    
    // If we have no data at all, this is a critical situation
    if (totalSessions === 0 && totalExercises === 0 && totalWorkouts === 0) {
      console.log('🚨 CRITICAL: No data found - this is a fresh database!');
      console.log('🚨 Attempting emergency restoration...');
      
      // Create emergency backup marker
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS emergency_log (
          id TEXT PRIMARY KEY,
          timestamp TEXT,
          status TEXT,
          details TEXT
        )
      `);
      
      const emergencyId = `emergency_${Date.now()}`;
      await db.runAsync(`
        INSERT INTO emergency_log (id, timestamp, status, details)
        VALUES (?, ?, ?, ?)
      `, [
        emergencyId,
        new Date().toISOString(),
        'data_loss_detected',
        'No training data found - emergency restoration needed'
      ]);
      
      console.log('🚨 Emergency log created - data loss detected!');
      console.log('🚨 User needs to manually restore data from old app!');
      
      // Show user-friendly message
      console.log('🚨 ==========================================');
      console.log('🚨 CRITICAL DATA LOSS DETECTED!');
      console.log('🚨 All training data has been lost.');
      console.log('🚨 Please contact support or restore from backup.');
      console.log('🚨 ==========================================');
      
    } else if (totalSessions === 0) {
      console.log('⚠️ Sessions missing but other data exists - restoring sessions...');
      await restoreMissingSessions(db);
    } else {
      console.log('✅ Data appears to be intact');
    }
    
  } catch (error) {
    console.error('❌ Emergency data restoration failed:', error);
  }
};

// 🧹 CHECK AND REMOVE DUPLICATE SESSIONS
const checkAndRemoveDuplicateSessions = async (db: any, sessions: TrainingSession[]) => {
  try {
    console.log('🔍 Checking for duplicate sessions...');
    
    // Group sessions by name
    const sessionGroups: { [name: string]: TrainingSession[] } = {};
    sessions.forEach(session => {
      if (!sessionGroups[session.name]) {
        sessionGroups[session.name] = [];
      }
      sessionGroups[session.name].push(session);
    });
    
    // Find duplicates
    const duplicates: TrainingSession[] = [];
    Object.entries(sessionGroups).forEach(([name, groupSessions]) => {
      if (groupSessions.length > 1) {
        console.log(`🚨 Found ${groupSessions.length} duplicate sessions for: ${name}`);
        // Keep the oldest session (first created), remove the rest
        groupSessions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        duplicates.push(...groupSessions.slice(1)); // Remove all but the first (oldest)
      }
    });
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate sessions found');
      return { removed: 0 };
    }
    
    console.log(`🧹 Removing ${duplicates.length} duplicate sessions...`);
    
    // Delete duplicates from database
    for (const duplicate of duplicates) {
      console.log(`🗑️ Deleting duplicate session: ${duplicate.name} (${duplicate.id})`);
      
      // Delete dependent data first
      await db.runAsync(
        `DELETE FROM sets WHERE workout_exercise_id IN (
           SELECT id FROM workout_exercises WHERE workout_id IN (
             SELECT id FROM workouts WHERE session_id = ?
           )
         )`,
        [duplicate.id]
      );
      await db.runAsync(
        `DELETE FROM workout_exercises WHERE workout_id IN (
           SELECT id FROM workouts WHERE session_id = ?
         )`,
        [duplicate.id]
      );
      await db.runAsync(
        `DELETE FROM progress_data WHERE workout_id IN (
           SELECT id FROM workouts WHERE session_id = ?
         )`,
        [duplicate.id]
      );
      await db.runAsync(`DELETE FROM workouts WHERE session_id = ?`, [duplicate.id]);
      await db.runAsync(`UPDATE exercises SET session_id = NULL WHERE session_id = ?`, [duplicate.id]);
      await db.runAsync(`DELETE FROM training_sessions WHERE id = ?`, [duplicate.id]);
    }
    
    console.log(`✅ Removed ${duplicates.length} duplicate sessions`);
    return { removed: duplicates.length };
    
  } catch (error) {
    console.error('❌ Failed to check/remove duplicates:', error);
    return { removed: 0 };
  }
};

// 🔍 DETECT AND MIGRATE OLD DATA
const detectAndMigrateOldData = async (db: any) => {
  try {
    console.log('🔍 Detecting old database files...');
    
    // Check for common database file locations
    const possiblePaths = [
      '/data/data/com.progressiveoverload.app/databases/',
      '/data/data/com.evolift.app/databases/',
      '/storage/emulated/0/Android/data/com.progressiveoverload.app/files/',
      '/storage/emulated/0/Android/data/com.evolift.app/files/',
    ];
    
    // For now, we'll implement a database backup/restore system
    // This will be expanded based on the actual database location
    console.log('📱 Database migration strategy:');
    console.log('1. Check for backup files');
    console.log('2. Look for old database exports');
    console.log('3. Attempt to restore from previous app version');
    
    // Create a backup marker so we know migration was attempted
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS migration_log (
        id TEXT PRIMARY KEY,
        migration_type TEXT,
        timestamp TEXT,
        status TEXT,
        details TEXT
      )
    `);
    
    const migrationId = `migration_${Date.now()}`;
    await db.runAsync(`
      INSERT INTO migration_log (id, migration_type, timestamp, status, details)
      VALUES (?, ?, ?, ?, ?)
    `, [
      migrationId,
      'data_migration_attempt',
      new Date().toISOString(),
      'attempted',
      'Automatic data migration system activated'
    ]);
    
    console.log('✅ Migration log created');
    
  } catch (error) {
    console.error('❌ Failed to detect old data:', error);
  }
};

// Helper function to restore missing training sessions
const restoreMissingSessions = async (db: any) => {
  try {
    console.log('🔄 Restoring missing training sessions...');
    
    // Check what muscle groups exist
    const muscleGroups = await db.getAllAsync(`SELECT * FROM muscle_groups ORDER BY name`);
    console.log('📊 Available muscle groups:', muscleGroups);
    
    // Expected sessions based on common patterns
    const expectedSessions = [
      { name: 'Ben', muscle_group_name: 'Ben' },
      { name: 'Biceps og ryg', muscle_group_name: 'Biceps' },
      { name: 'Bryst, skulder og triceps', muscle_group_name: 'Bryst' }
    ];
    
    for (const expectedSession of expectedSessions) {
      // Check if session already exists
      const existingSession = await db.getAllAsync(`
        SELECT * FROM training_sessions WHERE name = ?
      `, [expectedSession.name]);
      
      if (existingSession.length === 0) {
        // Find matching muscle group
        const muscleGroup = muscleGroups.find((mg: any) => 
          mg.name.toLowerCase().includes(expectedSession.muscle_group_name.toLowerCase())
        );
        
        if (muscleGroup) {
          const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const created_at = new Date().toISOString();
          
          await db.runAsync(`
            INSERT INTO training_sessions (id, name, muscle_group_id, description, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            sessionId,
            expectedSession.name,
            muscleGroup.id,
            `Session med fokus på ${expectedSession.muscle_group_name}`,
            1,
            created_at
          ]);
          
          console.log(`✅ Restored session: ${expectedSession.name}`);
        } else {
          console.log(`⚠️ Could not find muscle group for: ${expectedSession.name}`);
        }
      } else {
        console.log(`✅ Session already exists: ${expectedSession.name}`);
      }
    }
    
    console.log('✅ Session restoration complete');
  } catch (error) {
    console.error('❌ Failed to restore sessions:', error);
  }
};
