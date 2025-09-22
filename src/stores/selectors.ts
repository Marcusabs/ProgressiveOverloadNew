import { ExerciseState } from './exerciseStore';
import { WorkoutState } from './workoutStore';
import { ProgressState } from './progressStore';

// Exercise Store Selectors
export const exerciseSelectors = {
  // Basic selectors
  exercises: (state: ExerciseState) => state.exercises,
  muscleGroups: (state: ExerciseState) => state.muscleGroups,
  trainingSessions: (state: ExerciseState) => state.trainingSessions,
  currentWorkout: (state: ExerciseState) => state.currentWorkout,
  isLoading: (state: ExerciseState) => state.isLoading,

  // Memoized selectors
  exercisesByMuscleGroup: (muscleGroupId: string) => (state: ExerciseState) =>
    state.exercises.filter(exercise => exercise.muscle_group_id === muscleGroupId),

  exercisesBySession: (sessionId: string) => (state: ExerciseState) =>
    state.exercises.filter(exercise => exercise.session_id === sessionId),

  muscleGroupById: (id: string) => (state: ExerciseState) =>
    state.muscleGroups.find(group => group.id === id),

  sessionById: (id: string) => (state: ExerciseState) =>
    state.trainingSessions.find(session => session.id === id),

  // Complex computed selectors
  exerciseStats: (state: ExerciseState) => ({
    totalExercises: state.exercises.length,
    totalSessions: state.trainingSessions.length,
    totalMuscleGroups: state.muscleGroups.length,
    favoriteSessionType: state.trainingSessions.reduce((acc, session) => {
      acc[session.type] = (acc[session.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  }),

  recentWorkouts: (limit: number = 10) => (state: ExerciseState) =>
    state.workouts
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit),
};

// Workout Store Selectors
export const workoutSelectors = {
  currentWorkout: (state: WorkoutState) => state.currentWorkout,
  isLoading: (state: WorkoutState) => state.isLoading,
  templates: (state: WorkoutState) => state.workoutTemplates,
  suggestions: (state: WorkoutState) => state.progressiveOverloadSuggestions,
  analysis: (state: WorkoutState) => state.workoutAnalysis,

  // Computed selectors
  currentWorkoutStats: (state: WorkoutState) => {
    if (!state.currentWorkout) return null;
    
    const totalSets = state.currentWorkout.exercises?.reduce(
      (acc, exercise) => acc + (exercise.sets?.length || 0), 0
    ) || 0;
    
    const completedSets = state.currentWorkout.exercises?.reduce(
      (acc, exercise) => acc + (exercise.sets?.filter(set => set.completed).length || 0), 0
    ) || 0;

    return {
      totalExercises: state.currentWorkout.exercises?.length || 0,
      totalSets,
      completedSets,
      progress: totalSets > 0 ? (completedSets / totalSets) * 100 : 0,
    };
  },

  workoutsByTemplate: (templateId: string) => (state: WorkoutState) =>
    state.workoutTemplates.filter(template => template.id === templateId),
};

// Progress Store Selectors
export const progressSelectors = {
  progressData: (state: ProgressState) => state.progressData,
  isLoading: (state: ProgressState) => state.isLoading,

  exerciseProgress: (exerciseId: string) => (state: ProgressState) =>
    state.progressData.filter(data => data.exercise_id === exerciseId),

  recentProgress: (days: number = 30) => (state: ProgressState) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return state.progressData.filter(
      data => new Date(data.date) >= cutoffDate
    );
  },

  progressByMuscleGroup: (muscleGroupId: string) => (state: ProgressState) =>
    state.progressData.filter(data => {
      // Note: This would need to be joined with exercise data
      // For now, returning all data
      return true;
    }),
};
