import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, Alert, TouchableOpacity } from 'react-native';
import * as Updates from 'expo-updates';
import { initDatabase } from './src/database';
import TabNavigator from './src/navigation/TabNavigator';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useExerciseStore } from './src/stores/exerciseStore';
import { useProgressStore } from './src/stores/progressStore';
import { removeGlutesFromDatabase } from './src/utils/removeGlutes';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const { loadExercises, loadMuscleGroups, loadTrainingSessions, loadWorkouts } = useExerciseStore();
  const { loadProgressData } = useProgressStore();

  // Debug function to remove Glutes
  const handleRemoveGlutes = async () => {
    Alert.alert(
      'Fjern Glutes',
      'Er du sikker på at du vil fjerne Glutes muskelgruppen helt fra databasen?',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Fjern',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeGlutesFromDatabase();
              // Reload muscle groups after removal
              await loadMuscleGroups();
              Alert.alert('Succes', 'Glutes muskelgruppen er fjernet! Appen vil opdatere sig nu.');
            } catch (error) {
              console.error('Failed to remove Glutes:', error);
              Alert.alert('Fejl', 'Kunne ikke fjerne Glutes muskelgruppen.');
            }
          }
        }
      ]
    );
  };

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
        
        {/* Debug Menu - Only show in development builds */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <TouchableOpacity 
              style={styles.debugToggle}
              onPress={() => setShowDebugMenu(!showDebugMenu)}
            >
              <Text style={styles.debugToggleText}>🔧</Text>
            </TouchableOpacity>
            
            {showDebugMenu && (
              <View style={styles.debugMenu}>
                <Text style={styles.debugTitle}>Debug Menu</Text>
                <TouchableOpacity 
                  style={styles.debugButton}
                  onPress={handleRemoveGlutes}
                >
                  <Text style={styles.debugButtonText}>🗑️ Fjern Glutes</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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
  debugContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 9999,
  },
  debugToggle: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugToggleText: {
    fontSize: 20,
  },
  debugMenu: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    minWidth: 200,
  },
  debugTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
  },
  debugButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
