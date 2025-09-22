import { useCallback } from 'react';
import { useExerciseStore, ExerciseState } from '../stores/exerciseStore';
import { useWorkoutStore, WorkoutState } from '../stores/workoutStore';
import { useProgressStore, ProgressState } from '../stores/progressStore';
import { exerciseSelectors, workoutSelectors, progressSelectors } from '../stores/selectors';

// Optimized hook for exercise store
export const useOptimizedExerciseStore = <T>(
  selector: (state: ExerciseState) => T
) => {
  return useExerciseStore(useCallback(selector, []));
};

// Optimized hook for workout store
export const useOptimizedWorkoutStore = <T>(
  selector: (state: WorkoutState) => T
) => {
  return useWorkoutStore(useCallback(selector, []));
};

// Optimized hook for progress store
export const useOptimizedProgressStore = <T>(
  selector: (state: ProgressState) => T
) => {
  return useProgressStore(useCallback(selector, []));
};

// Convenience hooks with pre-built selectors
export const useExerciseSelectors = () => ({
  exercises: useOptimizedExerciseStore(exerciseSelectors.exercises),
  muscleGroups: useOptimizedExerciseStore(exerciseSelectors.muscleGroups),
  trainingSessions: useOptimizedExerciseStore(exerciseSelectors.trainingSessions),
  currentWorkout: useOptimizedExerciseStore(exerciseSelectors.currentWorkout),
  isLoading: useOptimizedExerciseStore(exerciseSelectors.isLoading),
  stats: useOptimizedExerciseStore(exerciseSelectors.exerciseStats),
});

export const useWorkoutSelectors = () => ({
  currentWorkout: useOptimizedWorkoutStore(workoutSelectors.currentWorkout),
  isLoading: useOptimizedWorkoutStore(workoutSelectors.isLoading),
  templates: useOptimizedWorkoutStore(workoutSelectors.templates),
  suggestions: useOptimizedWorkoutStore(workoutSelectors.suggestions),
  analysis: useOptimizedWorkoutStore(workoutSelectors.analysis),
  stats: useOptimizedWorkoutStore(workoutSelectors.currentWorkoutStats),
});

export const useProgressSelectors = () => ({
  progressData: useOptimizedProgressStore(progressSelectors.progressData),
  isLoading: useOptimizedProgressStore(progressSelectors.isLoading),
});

// Parameterized selectors
export const useExercisesByMuscleGroup = (muscleGroupId: string) =>
  useOptimizedExerciseStore(exerciseSelectors.exercisesByMuscleGroup(muscleGroupId));

export const useExercisesBySession = (sessionId: string) =>
  useOptimizedExerciseStore(exerciseSelectors.exercisesBySession(sessionId));

export const useRecentWorkouts = (limit: number = 10) =>
  useOptimizedExerciseStore(exerciseSelectors.recentWorkouts(limit));

export const useExerciseProgress = (exerciseId: string) =>
  useOptimizedProgressStore(progressSelectors.exerciseProgress(exerciseId));

export const useRecentProgress = (days: number = 30) =>
  useOptimizedProgressStore(progressSelectors.recentProgress(days));
