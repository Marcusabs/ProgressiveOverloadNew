import React, { lazy, Suspense } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Lazy loaded screens
const HomeScreen = lazy(() => import('../screens/HomeScreen'));
const TrainingScreen = lazy(() => import('../screens/TrainingScreen'));
const ProgressScreen = lazy(() => import('../screens/ProgressScreen'));
const ProfileScreen = lazy(() => import('../screens/ProfileScreen'));
const ExercisesScreen = lazy(() => import('../screens/ExercisesScreen'));
const WorkoutScreen = lazy(() => import('../screens/WorkoutScreen'));

// Loading component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

// HOC for lazy screens
const withSuspense = (Component: React.LazyExoticComponent<any>) => {
  return (props: any) => (
    <Suspense fallback={<LoadingScreen />}>
      <Component {...props} />
    </Suspense>
  );
};

// Exported lazy screens
export const LazyHomeScreen = withSuspense(HomeScreen);
export const LazyTrainingScreen = withSuspense(TrainingScreen);
export const LazyProgressScreen = withSuspense(ProgressScreen);
export const LazyProfileScreen = withSuspense(ProfileScreen);
export const LazyExercisesScreen = withSuspense(ExercisesScreen);
export const LazyWorkoutScreen = withSuspense(WorkoutScreen);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
