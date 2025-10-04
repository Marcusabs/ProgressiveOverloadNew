import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useExerciseStore } from '../stores/exerciseStore';
import { Exercise, MuscleGroup } from '../types';

export default function ExerciseLibraryScreen() {
  const { 
    exercises, 
    muscleGroups,
    loadExercises,
    loadMuscleGroups,
    deleteExercise,
  } = useExerciseStore();
  
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);

  useEffect(() => {
    loadExercises();
    loadMuscleGroups();
  }, []);

  const getExercisesByMuscleGroup = (muscleGroupId: string): Exercise[] => {
    return exercises.filter(exercise => exercise.muscle_group_id === muscleGroupId);
  };

  const getMuscleGroupColor = (muscleGroupId: string): string => {
    const group = muscleGroups.find(g => g.id === muscleGroupId);
    return group?.color || '#666';
  };

  const handleDeleteExercise = (exercise: Exercise) => {
    Alert.alert(
      'Slet Øvelse',
      `Er du sikker på, at du vil slette "${exercise.name}"?`,
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExercise(exercise.id);
              Alert.alert('Succes', 'Øvelse slettet!');
            } catch (error: any) {
              Alert.alert('Fejl', error.message || 'Kunne ikke slette øvelse');
            }
          }
        }
      ]
    );
  };

  const renderMuscleGroupSection = (muscleGroup: MuscleGroup) => {
    const groupExercises = getExercisesByMuscleGroup(muscleGroup.id);
    
    return (
      <View key={muscleGroup.id} style={styles.muscleGroupSection}>
        <View style={styles.muscleGroupHeader}>
          <View style={[styles.muscleGroupIndicator, { backgroundColor: muscleGroup.color }]} />
          <Text style={styles.muscleGroupTitle}>{muscleGroup.name}</Text>
          <Text style={styles.exerciseCount}>({groupExercises.length} øvelser)</Text>
        </View>
        
        {groupExercises.length > 0 ? (
          <View style={styles.exerciseList}>
            {groupExercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {exercise.description && (
                    <Text style={styles.exerciseDescription}>{exercise.description}</Text>
                  )}
                  {exercise.equipment && (
                    <Text style={styles.exerciseEquipment}>Udstyr: {exercise.equipment}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteExercise(exercise)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF453A" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Ingen øvelser endnu</Text>
            <Text style={styles.emptyStateSubtext}>
              Tilføj øvelser til denne muskelgruppe
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Øvelsesbibliotek</Text>
        <Text style={styles.headerSubtitle}>Alle dine øvelser organiseret efter muskelgruppe</Text>
      </LinearGradient>

      <View style={styles.content}>
        {muscleGroups.map(renderMuscleGroupSection)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  muscleGroupSection: {
    marginBottom: 24,
  },
  muscleGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  muscleGroupIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  muscleGroupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  exerciseCount: {
    fontSize: 14,
    color: '#666',
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  exerciseEquipment: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
