import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useWorkoutStore } from '../stores/workoutStore';
import { Set } from '../types';

export default function WorkoutScreen() {
  const { currentWorkout, updateSet, completeWorkout, cancelWorkout } = useWorkoutStore();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [showAddSetModal, setShowAddSetModal] = useState(false);
  const [newSet, setNewSet] = useState({ reps: '', weight: '' });
  const [workoutStartTime] = useState(new Date());

  const handleAddSet = (exerciseId: string) => {
    setSelectedExercise(exerciseId);
    setNewSet({ reps: '', weight: '' });
    setShowAddSetModal(true);
  };

  const handleSaveSet = () => {
    if (!selectedExercise || !newSet.reps || !newSet.weight) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const reps = parseInt(newSet.reps);
    const weight = parseFloat(newSet.weight);

    if (isNaN(reps) || isNaN(weight) || reps <= 0 || weight <= 0) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }

    const setId = Date.now().toString();
    const set: Set = {
      id: setId,
      workout_exercise_id: selectedExercise,
      order_index: (currentWorkout?.exercises?.find(ex => ex.exercise_id === selectedExercise)?.sets?.length || 0) + 1,
      reps,
      weight,
      completed: false,
      notes: ''
    };

    // Add set to exercise
    if (currentWorkout) {
      const updatedWorkout = {
        ...currentWorkout,
        exercises: currentWorkout.exercises?.map(exercise => {
          if (exercise.exercise_id === selectedExercise) {
            return {
              ...exercise,
              sets: [...(exercise.sets || []), set]
            };
          }
          return exercise;
        })
      };
      
      // Update the store
      updateSet(selectedExercise, setId, set);
    }

    setShowAddSetModal(false);
    setSelectedExercise(null);
    setNewSet({ reps: '', weight: '' });
  };

  const handleCompleteSet = (exerciseId: string, setId: string) => {
    updateSet(exerciseId, setId, { completed: true });
  };

  const handleCompleteWorkout = () => {
    if (!currentWorkout) return;

    const totalSets = currentWorkout.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) || 0;
    const completedSets = currentWorkout.exercises?.reduce((sum, ex) => 
      sum + (ex.sets?.filter(set => set.completed).length || 0), 0
    );

    Alert.alert(
      'Complete Workout',
      `You completed ${completedSets} out of ${totalSets} sets. Complete this workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            const duration = Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000);
            completeWorkout();
            Alert.alert('Workout Complete!', `Great job! Duration: ${duration} minutes`);
          }
        }
      ]
    );
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure you want to cancel this workout? All progress will be lost.',
      [
        { text: 'Keep Working', style: 'cancel' },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: cancelWorkout
        }
      ]
    );
  };

  const getWorkoutDuration = () => {
    const duration = Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000);
    return duration;
  };

  if (!currentWorkout) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="fitness-outline" size={80} color="#ccc" />
        <Text style={styles.emptyTitle}>No Active Workout</Text>
        <Text style={styles.emptySubtitle}>
          Start a workout from the Home screen to begin tracking your exercises
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Workout Header */}
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.workoutName}>{currentWorkout.name}</Text>
            <Text style={styles.workoutTime}>
              {getWorkoutDuration()} minutes
            </Text>
          </View>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelWorkout}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {currentWorkout.exercises?.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.exercise?.name}</Text>
              <Text style={styles.exerciseCategory}>{exercise.exercise?.category}</Text>
            </View>

            {/* Sets */}
            <View style={styles.setsContainer}>
              {exercise.sets?.map((set, setIndex) => (
                <View
                  key={set.id}
                  style={[
                    styles.setRow,
                    set.completed && styles.completedSet
                  ]}
                >
                  <Text style={styles.setNumber}>{setIndex + 1}</Text>
                  <Text style={styles.setWeight}>{set.weight} kg</Text>
                  <Text style={styles.setReps}>{set.reps} reps</Text>
                  <TouchableOpacity
                    style={[
                      styles.completeButton,
                      set.completed && styles.completedButton
                    ]}
                    onPress={() => handleCompleteSet(exercise.exercise_id, set.id)}
                  >
                    <Ionicons
                      name={set.completed ? "checkmark" : "checkmark-outline"}
                      size={20}
                      color={set.completed ? "#fff" : "#007AFF"}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Add Set Button */}
            <TouchableOpacity
              style={styles.addSetButton}
              onPress={() => handleAddSet(exercise.exercise_id)}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.addSetText}>Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Complete Workout Button */}
        <TouchableOpacity
          style={styles.completeWorkoutButton}
          onPress={handleCompleteWorkout}
        >
          <Text style={styles.completeWorkoutText}>Complete Workout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Set Modal */}
      <Modal
        visible={showAddSetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Set</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={newSet.weight}
                onChangeText={(text) => setNewSet({ ...newSet, weight: text })}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Reps</Text>
              <TextInput
                style={styles.input}
                value={newSet.reps}
                onChangeText={(text) => setNewSet({ ...newSet, reps: text })}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowAddSetModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={handleSaveSet}
              >
                <Text style={styles.saveModalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  workoutTime: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  cancelButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseHeader: {
    marginBottom: 15,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  setsContainer: {
    marginBottom: 15,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  completedSet: {
    backgroundColor: '#e8f5e8',
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    width: 30,
  },
  setWeight: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginLeft: 15,
  },
  setReps: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  completeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addSetText: {
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  completeWorkoutButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  completeWorkoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelModalButton: {
    backgroundColor: '#f0f0f0',
  },
  saveModalButton: {
    backgroundColor: '#007AFF',
  },
  cancelModalButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveModalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
