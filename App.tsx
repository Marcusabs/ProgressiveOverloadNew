import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { initDatabase } from './src/database';
import TabNavigator from './src/navigation/TabNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useExerciseStore } from './src/stores/exerciseStore';
import { useProgressStore } from './src/stores/progressStore';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const { loadExercises, loadMuscleGroups, loadTrainingSessions, loadWorkouts } = useExerciseStore();
  const { loadProgressData } = useProgressStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database only on mobile platforms
        if (Platform.OS !== 'web') {
          await initDatabase();
          
          // Load all data from stores
          await Promise.all([
            loadExercises(),
            loadMuscleGroups(),
            loadTrainingSessions(),
            loadWorkouts(),
            loadProgressData()
          ]);
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsReady(true); // Continue anyway
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {Platform.OS === 'web' ? 'Please use the mobile app for full functionality' : 'Loading...'}
        </Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
        <TabNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});
