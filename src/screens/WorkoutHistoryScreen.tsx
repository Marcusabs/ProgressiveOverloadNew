import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgressStore } from '../stores/progressStore';
import { useTheme } from '../contexts/ThemeContext';
import { TrainingSession, Exercise, Workout, Set } from '../types';

export default function WorkoutHistoryScreen() {
  const { trainingSessions, exercises, loadTrainingSessions, loadExercises, addWorkout, addSetToExercise } = useExerciseStore();
  const { progressData, getRecentWorkouts } = useProgressStore();
  const { theme, isDark } = useTheme();
  
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  
  // Create workout form
  const [workoutForm, setWorkoutForm] = useState({
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // Add exercise to workout
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [exerciseSets, setExerciseSets] = useState<Record<string, Set[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await loadTrainingSessions();
      await loadExercises();
      
      const recentWorkouts = await getRecentWorkouts(50);
      setWorkouts(recentWorkouts);
    } catch (error) {
      console.error('Error loading workout data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkout = async () => {
    if (!selectedSession) {
      Alert.alert('Fejl', 'Ingen session valgt');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Fejl', 'Tilføj mindst én øvelse');
      return;
    }

    try {
      const workoutData = {
        session_id: selectedSession.id,
        name: selectedSession.name,
        date: workoutForm.date,
        notes: workoutForm.notes,
        completed: true
      };

      const workout = await addWorkout(workoutData);
      
      // Add exercises to workout with their sets
      for (const exercise of selectedExercises) {
        const exerciseSets = exerciseSets[exercise.id] || [];
        if (exerciseSets.length > 0) {
          // Add sets for this exercise
          for (const set of exerciseSets) {
            await addSetToExercise(workout.id, exercise.id, set.reps, set.weight);
          }
        } else {
          // Add empty exercise if no sets
          await addSetToExercise(workout.id, exercise.id, 0, 0);
        }
      }

      setWorkoutForm({
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setSelectedExercises([]);
      setExerciseSets({});
      setSelectedSession(null);
      setShowCreateWorkout(false);
      
      await loadData();
      Alert.alert('Succes', 'Træning gemt!');
    } catch (error) {
      console.error('Error creating workout:', error);
      Alert.alert('Fejl', 'Kunne ikke gemme træning');
    }
  };

  const handleStartWorkoutForSession = (session: TrainingSession) => {
    setSelectedSession(session);
    // Forudvælg øvelser fra den valgte session; hvis ingen er linket, fald tilbage til muskelgruppen
    let sessionExercises = exercises.filter((ex) => (ex as any).session_id === session.id);
    if (sessionExercises.length === 0) {
      sessionExercises = exercises.filter((ex) => (ex as any).muscle_group_id === session.muscle_group_id);
    }
    setSelectedExercises(sessionExercises);
    const initialExerciseSets: Record<string, Set[]> = {};
    for (const ex of sessionExercises) {
      initialExerciseSets[ex.id] = [];
    }
    setExerciseSets(initialExerciseSets);
    setWorkoutForm({
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowCreateWorkout(true);
  };

  const handleAddExerciseToWorkout = (exercise: Exercise) => {
    if (selectedExercises.find(e => e.id === exercise.id)) {
      Alert.alert('Info', 'Øvelse er allerede tilføjet');
      return;
    }
    
    setSelectedExercises([...selectedExercises, exercise]);
    setExerciseSets({
      ...exerciseSets,
      [exercise.id]: []
    });
  };

  const handleAddSetToExercise = (exerciseId: string, reps: number, weight: number) => {
    const newSet: Set = {
      id: Date.now().toString(),
      workout_exercise_id: exerciseId,
      reps,
      weight,
      completed: true,
      order_index: exerciseSets[exerciseId]?.length || 0
    };

    setExerciseSets({
      ...exerciseSets,
      [exerciseId]: [...(exerciseSets[exerciseId] || []), newSet]
    });
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(e => e.id !== exerciseId));
    const newExerciseSets = { ...exerciseSets };
    delete newExerciseSets[exerciseId];
    setExerciseSets(newExerciseSets);
  };

  const getWorkoutStats = (workout: any) => {
    const totalSets = workout.exercise_count || 0;
    const completedSets = workout.completed_exercises || 0;
    const duration = workout.duration || 0;
    
    return {
      totalSets,
      completedSets,
      duration,
      completionRate: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('da-DK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getWorkoutDuration = (duration: number) => {
    if (!duration) return 'Ukendt';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return hours > 0 ? `${hours}t ${minutes}min` : `${minutes}min`;
  };

  const renderWorkoutCard = ({ item: workout }: { item: any }) => {
    const stats = getWorkoutStats(workout);
    const session = trainingSessions.find(s => s.id === workout.session_id);
    
    return (
      <TouchableOpacity
        style={[styles.workoutCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
        onPress={() => {
          setSelectedWorkout(workout);
          setShowWorkoutDetails(true);
        }}
      >
        <View style={styles.workoutHeader}>
          <View style={styles.workoutTitleContainer}>
            <Text style={[styles.workoutTitle, { color: theme.colors.text }]}>{workout.name}</Text>
            <Text style={[styles.workoutDate, { color: theme.colors.textSecondary }]}>
              {formatDate(workout.date)}
            </Text>
          </View>
          <View style={[styles.workoutStatus, { 
            backgroundColor: stats.completionRate === 100 ? '#4CAF50' : 
                           stats.completionRate >= 50 ? '#FF9800' : '#F44336'
          }]}>
            <Text style={styles.workoutStatusText}>{stats.completionRate}%</Text>
          </View>
        </View>
        
        <View style={styles.workoutStats}>
          <View style={styles.workoutStat}>
            <Ionicons name="fitness" size={16} color={theme.colors.primary} />
            <Text style={[styles.workoutStatText, { color: theme.colors.text }]}>
              {stats.completedSets}/{stats.totalSets} øvelser
            </Text>
          </View>
          <View style={styles.workoutStat}>
            <Ionicons name="time" size={16} color={theme.colors.secondary} />
            <Text style={[styles.workoutStatText, { color: theme.colors.text }]}>
              {getWorkoutDuration(stats.duration)}
            </Text>
          </View>
          <View style={styles.workoutStat}>
            <Ionicons name="calendar" size={16} color={theme.colors.accent} />
            <Text style={[styles.workoutStatText, { color: theme.colors.text }]}>
              {session?.name || 'Ukendt session'}
            </Text>
          </View>
        </View>
        
        {workout.notes && (
          <Text style={[styles.workoutNotes, { color: theme.colors.textSecondary }]}>
            {workout.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderCreateWorkoutModal = () => (
    <Modal
      visible={showCreateWorkout}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCreateWorkout(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.createWorkoutModal, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowCreateWorkout(false)}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {selectedSession ? `Opret ${selectedSession.name}` : 'Opret Træning'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedSession && (
              <View style={[styles.selectedSessionInfo, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
                <Text style={[styles.selectedSessionName, { color: theme.colors.primary }]}>
                  {selectedSession.name}
                </Text>
                <Text style={[styles.selectedSessionDescription, { color: theme.colors.textSecondary }]}>
                  {selectedSession.description || 'Ingen beskrivelse'}
                </Text>
              </View>
            )}
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Træningsdato</Text>
              <Text style={[styles.inputDescription, { color: theme.colors.textSecondary }]}>
                Hvilken dag trænede du denne session?
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={workoutForm.date}
                onChangeText={(text) => setWorkoutForm({ ...workoutForm, date: text })}
                placeholder="YYYY-MM-DD (f.eks. 2024-01-15)"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Noter (valgfrit)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={workoutForm.notes}
                onChangeText={(text) => setWorkoutForm({ ...workoutForm, notes: text })}
                placeholder="Tilføj noter om træningen..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.selectedExercisesSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tilføj Øvelser</Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowAddExercise(true)}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.addButtonText}>Tilføj Øvelse</Text>
                </TouchableOpacity>
              </View>
              
              {selectedExercises.map((exercise) => (
                <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseInfo}>
                      <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{exercise.name}</Text>
                      <Text style={[styles.exerciseDescription, { color: theme.colors.textSecondary }]}>
                        {exercise.description}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: theme.colors.accent }]}
                      onPress={() => handleRemoveExercise(exercise.id)}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Sets for this exercise */}
                  <View style={styles.setsContainer}>
                    <Text style={[styles.setsTitle, { color: theme.colors.text }]}>Sæt:</Text>
                    {exerciseSets[exercise.id]?.map((set, index) => (
                      <View key={index} style={styles.setRow}>
                        <Text style={[styles.setNumber, { color: theme.colors.textSecondary }]}>
                          Sæt {index + 1}:
                        </Text>
                        <TextInput
                          style={[styles.setInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                          value={set.reps.toString()}
                          onChangeText={(text) => {
                            const newSets = [...(exerciseSets[exercise.id] || [])];
                            newSets[index] = { ...set, reps: parseInt(text) || 0 };
                            setExerciseSets({ ...exerciseSets, [exercise.id]: newSets });
                          }}
                          placeholder="Reps"
                          keyboardType="numeric"
                          placeholderTextColor={theme.colors.textTertiary}
                        />
                        <Text style={[styles.setLabel, { color: theme.colors.textSecondary }]}>x</Text>
                        <TextInput
                          style={[styles.setInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                          value={set.weight.toString()}
                          onChangeText={(text) => {
                            const newSets = [...(exerciseSets[exercise.id] || [])];
                            newSets[index] = { ...set, weight: parseFloat(text) || 0 };
                            setExerciseSets({ ...exerciseSets, [exercise.id]: newSets });
                          }}
                          placeholder="Kg"
                          keyboardType="numeric"
                          placeholderTextColor={theme.colors.textTertiary}
                        />
                        <TouchableOpacity
                          style={[styles.removeSetButton, { backgroundColor: theme.colors.accent }]}
                          onPress={() => {
                            const newSets = exerciseSets[exercise.id]?.filter((_, i) => i !== index) || [];
                            setExerciseSets({ ...exerciseSets, [exercise.id]: newSets });
                          }}
                        >
                          <Ionicons name="trash" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    
                    <TouchableOpacity
                      style={[styles.addSetButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => handleAddSetToExercise(exercise.id, 0, 0)}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={styles.addSetButtonText}>Tilføj Sæt</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.divider }]}
              onPress={() => setShowCreateWorkout(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Annuller</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreateWorkout}
            >
              <Text style={styles.saveButtonText}>Opret Træning</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAddExerciseModal = () => (
    <Modal
      visible={showAddExercise}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddExercise(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.addExerciseModal, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowAddExercise(false)}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Vælg Øvelser</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item: exercise }) => (
              <TouchableOpacity
                style={[styles.exerciseItem, { backgroundColor: theme.colors.card }]}
                onPress={() => {
                  handleAddExerciseToWorkout(exercise);
                  setShowAddExercise(false);
                }}
              >
                <View style={styles.exerciseItemContent}>
                  <Text style={[styles.exerciseItemName, { color: theme.colors.text }]}>{exercise.name}</Text>
                  <Text style={[styles.exerciseItemDescription, { color: theme.colors.textSecondary }]}>
                    {exercise.description}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            style={styles.exerciseList}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Træningsoversigt</Text>
        <Text style={styles.headerSubtitle}>Se og opret træningshistorik</Text>
      </LinearGradient>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="fitness" size={24} color={theme.colors.primary} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{workouts.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Træninger</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="calendar" size={24} color={theme.colors.secondary} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>
            {workouts.filter(w => new Date(w.date).toDateString() === new Date().toDateString()).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>I dag</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="trending-up" size={24} color={theme.colors.accent} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>
            {workouts.filter(w => {
              const workoutDate = new Date(w.date);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return workoutDate >= weekAgo;
            }).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Denne uge</Text>
        </View>
      </View>

      {/* Sessions List */}
      <View style={styles.sessionsContainer}>
        <Text style={[styles.sessionsTitle, { color: theme.colors.text }]}>Dine Sessioner</Text>
        <Text style={[styles.sessionsSubtitle, { color: theme.colors.textSecondary }]}>
          Klik på en session for at oprette træning
        </Text>
        
        {trainingSessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            style={[styles.sessionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
            onPress={() => handleStartWorkoutForSession(session)}
          >
            <View style={styles.sessionCardContent}>
              <View style={styles.sessionInfo}>
                <Text style={[styles.sessionName, { color: theme.colors.text }]}>{session.name}</Text>
                <Text style={[styles.sessionDescription, { color: theme.colors.textSecondary }]}>
                  {session.description || 'Ingen beskrivelse'}
                </Text>
              </View>
              <View style={styles.sessionActions}>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Workouts */}
      {workouts.length > 0 && (
        <View style={styles.recentWorkoutsContainer}>
          <Text style={[styles.recentWorkoutsTitle, { color: theme.colors.text }]}>Seneste Træninger</Text>
          <FlatList
            data={workouts.slice(0, 5)}
            keyExtractor={(item) => item.id}
            renderItem={renderWorkoutCard}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {renderCreateWorkoutModal()}
      {renderAddExerciseModal()}
    </View>
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
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  createButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sessionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sessionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sessionsSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionDescription: {
    fontSize: 14,
  },
  sessionActions: {
    marginLeft: 12,
  },
  recentWorkoutsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  recentWorkoutsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  selectedSessionInfo: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  selectedSessionName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedSessionDescription: {
    fontSize: 14,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  workoutsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  workoutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutTitleContainer: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 14,
  },
  workoutStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  workoutStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  workoutStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workoutStatText: {
    fontSize: 12,
  },
  workoutNotes: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createWorkoutModal: {
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  addExerciseModal: {
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
  },
  sessionSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sessionOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedExercisesSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  setsContainer: {
    marginTop: 8,
  },
  setsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 60,
  },
  setInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    minWidth: 60,
    textAlign: 'center',
  },
  setLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeSetButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
    marginTop: 8,
  },
  addSetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseList: {
    maxHeight: 400,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseItemContent: {
    flex: 1,
  },
  exerciseItemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  exerciseItemDescription: {
    fontSize: 14,
  },
});
