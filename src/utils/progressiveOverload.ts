import { Set, ExerciseInWorkout } from '../types';

// Helper function to calculate one rep max using Epley formula
export const calculateOneRepMax = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (reps <= 0) return 0;
  
  // Epley formula: 1RM = weight * (1 + reps/30)
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
};

// Helper function to calculate total volume
export const calculateTotalVolume = (sets: Array<{ weight: number; reps: number }>): number => {
  return sets.reduce((total, set) => total + (set.weight * set.reps), 0);
};

// Helper function to calculate average reps for sets with same weight
export const calculateAverageRepsForWeight = (sets: Array<{ weight: number; reps: number }>): Array<{ weight: number; avgReps: number; setCount: number }> => {
  const weightGroups: { [weight: number]: { totalReps: number; count: number } } = {};
  
  sets.forEach(set => {
    if (!weightGroups[set.weight]) {
      weightGroups[set.weight] = { totalReps: 0, count: 0 };
    }
    weightGroups[set.weight].totalReps += set.reps;
    weightGroups[set.weight].count += 1;
  });
  
  return Object.entries(weightGroups).map(([weight, data]) => ({
    weight: parseFloat(weight),
    avgReps: Math.round((data.totalReps / data.count) * 100) / 100, // Round to 2 decimal places
    setCount: data.count
  }));
};

export interface ProgressiveOverloadSuggestion {
  exerciseId: string;
  exerciseName: string;
  currentMaxWeight: number;
  suggestedWeight: number;
  suggestedReps: number;
  reason: string;
  type: 'weight' | 'reps' | 'volume' | 'maintain';
}

export interface WorkoutAnalysis {
  exerciseId: string;
  exerciseName: string;
  previousMaxWeight: number;
  currentMaxWeight: number;
  improvement: number;
  improvementPercentage: number;
  totalVolume: number;
  oneRepMax: number;
  suggestion: ProgressiveOverloadSuggestion;
}

/**
 * Calculate progressive overload suggestions based on previous performance
 */
export const calculateProgressiveOverload = (
  currentWorkout: ExerciseInWorkout,
  previousWorkouts: Array<{ sets: Set[]; date: Date }>
): ProgressiveOverloadSuggestion => {
  const exerciseName = currentWorkout.exercise?.name || 'Unknown Exercise';
  const exerciseId = currentWorkout.exercise_id;

  // Get the most recent workout for this exercise
  const lastWorkout = previousWorkouts[0];
  
  if (!lastWorkout || lastWorkout.sets.length === 0) {
    // First time doing this exercise - start with moderate weight
    return {
      exerciseId,
      exerciseName,
      currentMaxWeight: 0,
      suggestedWeight: 20, // Default starting weight
      suggestedReps: 8,
      reason: 'First time doing this exercise. Start with a moderate weight.',
      type: 'weight'
    };
  }

  const lastMaxWeight = Math.max(...lastWorkout.sets.map(set => set.weight));
  const lastMaxReps = Math.max(...lastWorkout.sets.map(set => set.reps));
  const lastTotalVolume = calculateTotalVolume(lastWorkout.sets);
  const lastOneRepMax = Math.max(...lastWorkout.sets.map(set => 
    calculateOneRepMax(set.weight, set.reps)
  ));
  
  // Calculate average reps for sets with same weight
  const lastWeightAverages = calculateAverageRepsForWeight(lastWorkout.sets);
  const lastMaxWeightData = lastWeightAverages
    .filter(w => w.weight === lastMaxWeight)
    .sort((a, b) => b.avgReps - a.avgReps)[0];
  const lastHeaviestAvgReps = lastMaxWeightData?.avgReps || lastMaxReps;

  // Calculate current workout performance
  const currentMaxWeight = Math.max(...(currentWorkout.sets || []).map(set => set.weight));
  const currentMaxReps = Math.max(...(currentWorkout.sets || []).map(set => set.reps));
  const currentTotalVolume = calculateTotalVolume(currentWorkout.sets || []);
  
  // Calculate average reps for current workout sets with same weight
  const currentWeightAverages = calculateAverageRepsForWeight(currentWorkout.sets || []);
  const currentMaxWeightData = currentWeightAverages
    .filter(w => w.weight === currentMaxWeight)
    .sort((a, b) => b.avgReps - a.avgReps)[0];
  const currentHeaviestAvgReps = currentMaxWeightData?.avgReps || currentMaxReps;

  // Progressive overload logic
  if (!currentWorkout.sets || currentWorkout.sets.length === 0) {
    // No sets completed yet - suggest based on last workout (using average reps)
    if (lastHeaviestAvgReps >= 12) {
      // Last workout was high reps, increase weight
      return {
        exerciseId,
        exerciseName,
        currentMaxWeight: lastMaxWeight,
        suggestedWeight: lastMaxWeight + 2.5,
        suggestedReps: 8,
        reason: `Last workout averaged ${lastHeaviestAvgReps} reps at max weight. Increase weight and reduce reps.`,
        type: 'weight'
      };
    } else if (lastHeaviestAvgReps >= 8) {
      // Moderate reps, increase weight slightly
      return {
        exerciseId,
        exerciseName,
        currentMaxWeight: lastMaxWeight,
        suggestedWeight: lastMaxWeight + 2.5,
        suggestedReps: Math.round(lastHeaviestAvgReps),
        reason: `Last workout averaged ${lastHeaviestAvgReps} reps. Increase weight by 2.5kg.`,
        type: 'weight'
      };
    } else {
      // Low reps, increase reps
      return {
        exerciseId,
        exerciseName,
        currentMaxWeight: lastMaxWeight,
        suggestedWeight: lastMaxWeight,
        suggestedReps: Math.round(lastHeaviestAvgReps) + 1,
        reason: `Last workout averaged ${lastHeaviestAvgReps} reps. Increase reps by 1.`,
        type: 'reps'
      };
    }
  }

  // Analyze current workout performance
  const weightImprovement = currentMaxWeight - lastMaxWeight;
  const repsImprovement = currentHeaviestAvgReps - lastHeaviestAvgReps; // Use average reps comparison
  const volumeImprovement = currentTotalVolume - lastTotalVolume;

  if (weightImprovement > 0) {
    // Successfully increased weight
    return {
      exerciseId,
      exerciseName,
      currentMaxWeight,
      suggestedWeight: currentMaxWeight + 2.5,
      suggestedReps: Math.max(6, currentMaxReps - 1),
      reason: `Great! You increased weight by ${weightImprovement}kg. Try increasing by another 2.5kg.`,
      type: 'weight'
    };
  } else if (repsImprovement > 0) {
    // Successfully increased reps (average)
    return {
      exerciseId,
      exerciseName,
      currentMaxWeight,
      suggestedWeight: currentMaxWeight + 2.5,
      suggestedReps: Math.round(currentHeaviestAvgReps),
      reason: `Good! You increased average reps from ${lastHeaviestAvgReps} to ${currentHeaviestAvgReps} (+${repsImprovement.toFixed(1)}). Now try increasing weight.`,
      type: 'weight'
    };
  } else if (volumeImprovement > 0) {
    // Increased total volume
    return {
      exerciseId,
      exerciseName,
      currentMaxWeight,
      suggestedWeight: currentMaxWeight + 2.5,
      suggestedReps: currentMaxReps,
      reason: 'Volume increased. Try increasing weight by 2.5kg.',
      type: 'weight'
    };
  } else {
    // No improvement or regression
    return {
      exerciseId,
      exerciseName,
      currentMaxWeight,
      suggestedWeight: currentMaxWeight,
      suggestedReps: Math.round(currentHeaviestAvgReps),
      reason: `Maintain current weight and average ${currentHeaviestAvgReps} reps. Focus on form and consistency.`,
      type: 'maintain'
    };
  }
};

/**
 * Analyze workout performance and provide insights
 */
export const analyzeWorkout = (
  exercises: ExerciseInWorkout[],
  previousWorkouts: Array<{ exerciseId: string; sets: Set[]; date: Date }>
): WorkoutAnalysis[] => {
  return exercises.map(exercise => {
    const exercisePreviousWorkouts = previousWorkouts
      .filter(w => w.exerciseId === exercise.exercise_id)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const suggestion = calculateProgressiveOverload(exercise, exercisePreviousWorkouts);
    
    const previousMaxWeight = exercisePreviousWorkouts.length > 0 
      ? Math.max(...exercisePreviousWorkouts[0].sets.map(set => set.weight))
      : 0;
    
    const currentMaxWeight = exercise.sets && exercise.sets.length > 0
      ? Math.max(...exercise.sets.map(set => set.weight))
      : 0;

    const improvement = currentMaxWeight - previousMaxWeight;
    const improvementPercentage = previousMaxWeight > 0 
      ? (improvement / previousMaxWeight) * 100 
      : 0;

    const totalVolume = calculateTotalVolume(exercise.sets || []);
    const oneRepMax = exercise.sets && exercise.sets.length > 0
      ? Math.max(...exercise.sets.map(set => calculateOneRepMax(set.weight, set.reps)))
      : 0;

    return {
      exerciseId: exercise.exercise_id,
      exerciseName: exercise.exercise?.name || 'Unknown Exercise',
      previousMaxWeight,
      currentMaxWeight,
      improvement,
      improvementPercentage,
      totalVolume,
      oneRepMax,
      suggestion
    };
  });
};

/**
 * Get workout intensity based on percentage of 1RM
 */
export const getWorkoutIntensity = (weight: number, oneRepMax: number): string => {
  if (oneRepMax === 0) return 'Unknown';
  
  const percentage = (weight / oneRepMax) * 100;
  
  if (percentage >= 90) return 'Maximum';
  if (percentage >= 80) return 'High';
  if (percentage >= 70) return 'Moderate-High';
  if (percentage >= 60) return 'Moderate';
  if (percentage >= 50) return 'Light-Moderate';
  return 'Light';
};

/**
 * Calculate recommended rest time based on intensity
 */
export const getRecommendedRestTime = (intensity: string): number => {
  switch (intensity) {
    case 'Maximum': return 300; // 5 minutes
    case 'High': return 240; // 4 minutes
    case 'Moderate-High': return 180; // 3 minutes
    case 'Moderate': return 120; // 2 minutes
    case 'Light-Moderate': return 90; // 1.5 minutes
    case 'Light': return 60; // 1 minute
    default: return 120; // 2 minutes default
  }
};

/**
 * Generate workout summary with progressive overload insights
 */
export const generateWorkoutSummary = (analysis: WorkoutAnalysis[]): {
  totalImprovements: number;
  averageImprovement: number;
  strongestExercise: WorkoutAnalysis | null;
  needsAttention: WorkoutAnalysis[];
  recommendations: string[];
} => {
  const improvements = analysis.filter(a => a.improvement > 0);
  const totalImprovements = improvements.length;
  const averageImprovement = improvements.length > 0
    ? improvements.reduce((sum, a) => sum + a.improvement, 0) / improvements.length
    : 0;

  const strongestExercise = analysis.reduce((strongest, current) => 
    current.currentMaxWeight > strongest.currentMaxWeight ? current : strongest
  , analysis[0] || null);

  const needsAttention = analysis.filter(a => a.improvement <= 0);

  const recommendations: string[] = [];
  
  if (totalImprovements > 0) {
    recommendations.push(`Great job! You improved on ${totalImprovements} exercises.`);
  }
  
  if (needsAttention.length > 0) {
    recommendations.push(`Focus on form and consistency for ${needsAttention.length} exercises.`);
  }
  
  if (strongestExercise) {
    recommendations.push(`${strongestExercise.exerciseName} is your strongest exercise at ${strongestExercise.currentMaxWeight}kg.`);
  }

  return {
    totalImprovements,
    averageImprovement,
    strongestExercise,
    needsAttention,
    recommendations
  };
};
