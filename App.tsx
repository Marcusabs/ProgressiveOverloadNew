import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { initDatabase } from './src/database';
import TabNavigator from './src/navigation/TabNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useExerciseStore } from './src/stores/exerciseStore';
import { useProgressStore } from './src/stores/progressStore';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const { loadExercises, loadMuscleGroups, loadTrainingSessions, loadWorkouts } = useExerciseStore();
  const { loadProgressData } = useProgressStore();

  // Check for OTA updates
  const checkForUpdates = async () => {
    try {
      if (Platform.OS === 'web') return; // Skip on web
      
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Opdatering tilgængelig',
          'Der er en ny version tilgængelig. Vil du opdatere nu?',
          [
            { text: 'Senere', style: 'cancel' },
            { 
              text: 'Opdater', 
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    'Opdatering klar',
                    'Appen vil genstarte for at installere den nye version.',
                    [{ text: 'OK', onPress: () => Updates.reloadAsync() }]
                  );
                } catch (error) {
                  console.log('Update fetch failed:', error);
                  Alert.alert('Fejl', 'Kunne ikke hente opdatering. Prøv igen senere.');
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.log('Update check failed:', error);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database for all platforms
        await initDatabase();
        
        // Load all data from stores
        await Promise.all([
          loadExercises(),
          loadMuscleGroups(),
          loadTrainingSessions(),
          loadWorkouts(),
          loadProgressData()
        ]);
        
        setIsReady(true);
        
        // Check for updates after app is ready
        setTimeout(() => {
          checkForUpdates();
        }, 2000); // Wait 2 seconds after app loads
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
        <Text style={styles.loadingText}>Loading...</Text>
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
