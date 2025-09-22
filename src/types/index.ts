export interface MuscleGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface TrainingSession {
  id: string;
  name: string;
  muscle_group_id: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group_id: string;
  session_id?: string;
  order_index: number;
  description?: string;
  equipment?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
}

export interface WorkoutTemplate {
  id: string;
  session_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: number;
  rest_time: number;
}

export interface Workout {
  id: string;
  session_id: string;
  name: string;
  date: string;
  duration?: number;
  notes?: string;
  completed: boolean;
  created_at: string;
  exercises?: ExerciseInWorkout[];
}

export interface ExerciseInWorkout {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  completed: boolean;
  sets?: Set[];
}

export interface Set {
  id: string;
  workout_exercise_id: string;
  reps: number;
  weight: number;
  rest_time?: number;
  completed: boolean;
  notes?: string;
  order_index: number;
}

export interface ProgressData {
  exerciseId: string;
  exerciseName: string;
  date: Date;
  maxWeight: number;
  totalVolume: number;
  oneRepMax?: number;
}

export interface ProgressiveOverloadSuggestion {
  exercise_id: string;
  exercise_name: string;
  current_weight: number;
  suggested_weight: number;
  increase_percentage: number;
  reason: string;
}

export interface WorkoutAnalysis {
  total_volume: number;
  total_sets: number;
  total_reps: number;
  average_weight: number;
  max_weight: number;
  estimated_one_rep_max: number;
  muscle_groups_trained: string[];
  recommendations: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  weight?: number;
  height?: number;
  experience: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  createdAt: Date;
}

export type RootTabParamList = {
  Home: undefined;
  Training: { initialTab?: 'sessions' | 'exercises' | 'builder' };
  Progress: undefined;
  WorkoutHistory: undefined;
  Profile: undefined;
};
