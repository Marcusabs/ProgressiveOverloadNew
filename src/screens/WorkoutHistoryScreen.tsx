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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgressStore } from '../stores/progressStore';
import { useTheme } from '../contexts/ThemeContext';
import { TrainingSession, Exercise, Workout, Set } from '../types';
import { getDatabase } from '../database';

export default function WorkoutHistoryScreen() {
  const { trainingSessions, exercises, loadTrainingSessions, loadExercises, addWorkout, addSetToExercise, startWorkout, endWorkout, getExercisesBySession, deleteWorkout, updateWorkout } = useExerciseStore();
  const { progressData, getRecentWorkouts } = useProgressStore();
  const { theme, isDark } = useTheme();
  
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [showEditWorkout, setShowEditWorkout] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<any>(null);
  const [editWorkoutData, setEditWorkoutData] = useState({ name: '', notes: '', date: '' });
  
  // Local workout state for manual training (separate from global currentWorkout)
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  
  // Live Training states
  const [showLiveTraining, setShowLiveTraining] = useState(false);
  const [trainingStartTime, setTrainingStartTime] = useState<Date | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState({ reps: '', weight: '' });
  const [completedSets, setCompletedSets] = useState<Array<{reps: number, weight: number}>>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Rest Timer states
  const [restTimer, setRestTimer] = useState<{
    isActive: boolean;
    timeLeft: number;
    totalTime: number;
  }>({
    isActive: false,
    timeLeft: 0,
    totalTime: 0
  });
  const [restTimerInterval, setRestTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
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

  // Real-time updates for training - only for live training, not manual training
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Only start timer if it's actually a live training (trainingStartTime was set via handleStartWorkoutForSession)
    if (showLiveTraining && trainingStartTime) {
      interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000); // Update every second
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [showLiveTraining, trainingStartTime]);

  // Cleanup rest timer on unmount
  useEffect(() => {
    return () => {
      if (restTimerInterval) {
        clearInterval(restTimerInterval);
      }
    };
  }, [restTimerInterval]);

  // Load sets for current exercise when exercise index changes (manual training)
  useEffect(() => {
    if (currentWorkout?.id.startsWith('manual-') && selectedSession) {
      const sessionExercises = getExercisesBySession(currentWorkout.session_id);
      const currentExercise = sessionExercises[currentExerciseIndex];
      
      if (currentExercise) {
        // Load saved sets for this exercise
        const savedSets = exerciseSets[currentExercise.id] || [];
        const completedSetsFromSaved = savedSets.map(set => ({
          reps: set.reps,
          weight: set.weight
        }));
        setCompletedSets(completedSetsFromSaved);
      }
    }
  }, [currentExerciseIndex, currentWorkout, selectedSession, exerciseSets]);

  // Cleanup training states when component unmounts
  useEffect(() => {
    return () => {
      setCurrentWorkout(null);
      setTrainingStartTime(null);
      setCurrentTime(new Date());
      setShowLiveTraining(false);
      setCurrentExerciseIndex(0);
      setCompletedSets([]);
      setCurrentSet({ reps: '', weight: '' });
    };
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

  // Live training stats functions
  const getTrainingDuration = () => {
    if (!trainingStartTime) return '00:00';
    const diff = Math.floor((currentTime.getTime() - trainingStartTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getEstimatedCalories = () => {
    if (!trainingStartTime) return 0;
    const duration = Math.floor((currentTime.getTime() - trainingStartTime.getTime()) / 1000 / 60);
    // Rough estimate: 8-12 calories per minute for strength training
    return Math.round(duration * 10);
  };

  const handleCreateWorkout = async () => {
    if (!selectedSession) {
      Alert.alert('Fejl', 'Ingen session valgt');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Fejl', 'Tilføj mindst én øvelse før du gemmer træningen');
      return;
    }

    // Check if any exercise has sets with actual reps/weight
    let hasValidSets = false;
    for (const exercise of selectedExercises) {
      const currentExerciseSets = exerciseSets[exercise.id] || [];
      if (currentExerciseSets.length > 0) {
        // Check if any set has reps > 0 or weight > 0
        const hasValidData = currentExerciseSets.some(set => set.reps > 0 || set.weight > 0);
        if (hasValidData) {
          hasValidSets = true;
          break;
        }
      }
    }

    if (!hasValidSets) {
      Alert.alert('Fejl', 'Tilføj mindst ét sæt med reps og vægt for en øvelse');
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
        const currentExerciseSets = exerciseSets[exercise.id] || [];
        
        // Only add exercise if it has valid sets
        if (currentExerciseSets.length > 0) {
          const hasValidData = currentExerciseSets.some(set => set.reps > 0 || set.weight > 0);
          
          if (hasValidData) {
            // Ensure workout_exercise entry exists before adding sets
            let workoutExerciseId = `${workout.id}_${exercise.id}`;
            const existingWorkoutExercise = await getDatabase().getFirstAsync(`
              SELECT id FROM workout_exercises WHERE workout_id = ? AND exercise_id = ?
            `, [workout.id, exercise.id]);

            if (!existingWorkoutExercise) {
              await getDatabase().runAsync(`
                INSERT INTO workout_exercises (id, workout_id, exercise_id, order_index, completed)
                VALUES (?, ?, ?, ?, ?)
              `, [workoutExerciseId, workout.id, exercise.id, 0, 0]);
            } else {
              workoutExerciseId = (existingWorkoutExercise as any).id;
            }

            // Add sets for this exercise
            for (const set of currentExerciseSets) {
              await addSetToExercise(workout.id, exercise.id, set.reps, set.weight);
            }
          }
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

  const handleStartWorkoutForSession = async (session: TrainingSession) => {
    try {
      // Reset any existing workout state first
      setCurrentWorkout(null);
      setTrainingStartTime(null);
      setCurrentTime(new Date());
      setCurrentExerciseIndex(0);
      setCompletedSets([]);
      setCurrentSet({ reps: '', weight: '' });
      
      // For manual training, we don't use the global currentWorkout state
      // Instead, we create a local workout object to avoid triggering TrainingScreen's auto-start
      const workout = {
        id: `manual-${Date.now()}`,
        session_id: session.id,
        name: session.name,
        date: workoutDate,
        duration: 0,
        notes: '',
        completed: false,
        created_at: new Date().toISOString()
      };
      
      // Set up the manual training interface (NO trainingStartTime = no live stats)
      setSelectedSession(session);
      setWorkoutDate(new Date().toISOString().split('T')[0]);
      setShowLiveTraining(true);
      
      // Set local currentWorkout instead of global one
      setCurrentWorkout(workout);
    } catch (error) {
      console.error('Error starting workout:', error);
      Alert.alert('Fejl', 'Kunne ikke starte træning');
    }
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

  // Live Training functions
  const handleAddSet = async () => {
    if (!currentWorkout || !currentSet.reps || !currentSet.weight) {
      Alert.alert('Fejl', 'Udfyld reps og vægt');
      return;
    }

    const reps = parseInt(currentSet.reps);
    const weight = parseFloat(currentSet.weight);

    if (isNaN(reps) || isNaN(weight)) {
      Alert.alert('Fejl', 'Ugyldige tal');
      return;
    }

    try {
      const sessionExercises = getExercisesBySession(currentWorkout.session_id);
      const currentExercise = sessionExercises[currentExerciseIndex];
      
      if (!currentExercise) {
        throw new Error(`Ingen øvelse fundet på index ${currentExerciseIndex}`);
      }
      
      // For manual training, we don't save to database immediately
      // We'll save when the user chooses to save the workout
      if (currentWorkout.id.startsWith('manual-')) {
        // Just add to local state
        setCompletedSets([...completedSets, { reps, weight }]);
        setCurrentSet({ reps: '', weight: '' });
        
        // NO rest timer for manual training
      } else {
        // For real workouts, save to database
        await addSetToExercise(currentWorkout.id, currentExercise.id, reps, weight);
        setCompletedSets([...completedSets, { reps, weight }]);
        setCurrentSet({ reps: '', weight: '' });
        
        // Start rest timer after adding a set (only for live training)
        startRestTimer(90); // Default 90 seconds
      }
    } catch (error) {
      console.error('Error adding set:', error);
      Alert.alert('Fejl', `Kunne ikke tilføje sæt: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    }
  };

  // Rest Timer functions
  const startRestTimer = (seconds: number) => {
    // Clear existing timer
    if (restTimerInterval) {
      clearInterval(restTimerInterval);
    }
    
    setRestTimer({
      isActive: true,
      timeLeft: seconds,
      totalTime: seconds
    });
    
    const interval = setInterval(() => {
      setRestTimer(prev => {
        if (prev.timeLeft <= 1) {
          clearInterval(interval);
          return {
            isActive: false,
            timeLeft: 0,
            totalTime: prev.totalTime
          };
        }
        return {
          ...prev,
          timeLeft: prev.timeLeft - 1
        };
      });
    }, 1000);
    
    setRestTimerInterval(interval);
  };

  const stopRestTimer = () => {
    if (restTimerInterval) {
      clearInterval(restTimerInterval);
      setRestTimerInterval(null);
    }
    setRestTimer({
      isActive: false,
      timeLeft: 0,
      totalTime: 0
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextExercise = () => {
    const sessionExercises = getExercisesBySession(currentWorkout?.session_id || '');
    if (currentExerciseIndex < sessionExercises.length - 1) {
      // Save current exercise's sets before moving to next
      if (currentWorkout?.id.startsWith('manual-') && completedSets.length > 0) {
        const currentExercise = sessionExercises[currentExerciseIndex];
        if (currentExercise) {
          const setsAsSetObjects = completedSets.map((set, index) => ({
            id: `temp-${Date.now()}-${index}`,
            workout_exercise_id: '',
            reps: set.reps,
            weight: set.weight,
            completed: true,
            order_index: index
          }));
          setExerciseSets(prev => ({
            ...prev,
            [currentExercise.id]: setsAsSetObjects
          }));
        }
      }
      
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCompletedSets([]);
      setCurrentSet({ reps: '', weight: '' });
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      // Save current exercise's sets before moving to previous
      if (currentWorkout?.id.startsWith('manual-') && completedSets.length > 0) {
        const sessionExercises = getExercisesBySession(currentWorkout?.session_id || '');
        const currentExercise = sessionExercises[currentExerciseIndex];
        if (currentExercise) {
          const setsAsSetObjects = completedSets.map((set, index) => ({
            id: `temp-${Date.now()}-${index}`,
            workout_exercise_id: '',
            reps: set.reps,
            weight: set.weight,
            completed: true,
            order_index: index
          }));
          setExerciseSets(prev => ({
            ...prev,
            [currentExercise.id]: setsAsSetObjects
          }));
        }
      }
      
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setCompletedSets([]);
      setCurrentSet({ reps: '', weight: '' });
    }
  };

  const handleEndTraining = async () => {
    if (!currentWorkout) return;

    // For manual training, trainingStartTime is null, so use a default duration
    const duration = trainingStartTime ? 
      Math.floor((new Date().getTime() - trainingStartTime.getTime()) / 1000 / 60) : // Live training
      1; // Manual training - default to 1 minute

    Alert.alert(
      'Afslut Træning',
      `Varighed: ${duration} minutter\n\nHvad vil du gøre?`,
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Afslut uden at gemme',
          style: 'destructive',
          onPress: async () => {
            try {
              // For manual training, we don't need to delete from database
              // since we're using a local workout object
              if (currentWorkout.id.startsWith('manual-')) {
                // Just reset the local state
                setCurrentWorkout(null);
                setShowLiveTraining(false);
                setTrainingStartTime(null);
                setCurrentTime(new Date());
                setCurrentExerciseIndex(0);
                setCompletedSets([]);
                setCurrentSet({ reps: '', weight: '' });
                await loadData();
                Alert.alert('Info', 'Træning afsluttet uden at gemme');
                return;
              }

              // For real workouts, delete from database
              const db = getDatabase();
              
              await db.withTransactionAsync(async () => {
                // 1. Get all workout_exercise_ids for this workout
                const workoutExercises = await db.getAllAsync<{ id: string }>(`
                  SELECT id FROM workout_exercises WHERE workout_id = ?
                `, [currentWorkout.id]);
                const workoutExerciseIds = workoutExercises.map(we => we.id);

                if (workoutExerciseIds.length > 0) {
                  // 2. Delete all sets related to these workout_exercises
                  await db.runAsync(`
                    DELETE FROM sets WHERE workout_exercise_id IN (${workoutExerciseIds.map(() => '?').join(',')})
                  `, workoutExerciseIds);
                }

                // 3. Delete all workout_exercises for this workout
                await db.runAsync(`
                  DELETE FROM workout_exercises WHERE workout_id = ?
                `, [currentWorkout.id]);

                // 4. Delete all progress_data for this workout
                await db.runAsync(`
                  DELETE FROM progress_data WHERE workout_id = ?
                `, [currentWorkout.id]);

                // 5. Finally delete the workout itself
                await db.runAsync(`
                  DELETE FROM workouts WHERE id = ?
                `, [currentWorkout.id]);
              });
              
              setCurrentWorkout(null);
              setShowLiveTraining(false);
              setTrainingStartTime(null);
              setCurrentTime(new Date()); // Reset current time
              setCurrentExerciseIndex(0);
              setCompletedSets([]);
              setCurrentSet({ reps: '', weight: '' });
              await loadData();
              Alert.alert('Info', 'Træning afsluttet uden at gemme');
            } catch (error) {
              console.error('Error discarding workout:', error);
              Alert.alert('Fejl', 'Kunne ikke afslutte træning');
            }
          }
        },
        {
          text: 'Gem og Afslut',
          onPress: async () => {
            try {
              // For manual training, create a real workout in the database
              if (currentWorkout.id.startsWith('manual-')) {
                // Save current exercise's sets before creating workout
                if (completedSets.length > 0) {
                  const sessionExercises = getExercisesBySession(currentWorkout.session_id);
                  const currentExercise = sessionExercises[currentExerciseIndex];
                  if (currentExercise) {
                    const setsAsSetObjects = completedSets.map((set, index) => ({
                      id: `temp-${Date.now()}-${index}`,
                      workout_exercise_id: '',
                      reps: set.reps,
                      weight: set.weight,
                      completed: true,
                      order_index: index
                    }));
                    setExerciseSets(prev => ({
                      ...prev,
                      [currentExercise.id]: setsAsSetObjects
                    }));
                  }
                }
                
                // Create a real workout in the database
                const db = getDatabase();
                const result = await db.runAsync(`
                  INSERT INTO workouts (session_id, name, date, duration, notes, created_at)
                  VALUES (?, ?, ?, ?, ?, ?)
                `, [currentWorkout.session_id, selectedSession?.name || 'Manual Workout', workoutDate, duration, '', new Date().toISOString()]);
                
                const newWorkoutId = (result as any).lastInsertRowId?.toString();
                
                // Save any completed sets
                for (const [exerciseId, sets] of Object.entries(exerciseSets)) {
                  if (sets.length > 0) {
                    await db.runAsync(`
                      INSERT INTO workout_exercises (workout_id, exercise_id, order_index)
                      VALUES (?, ?, ?)
                    `, [newWorkoutId, exerciseId, 0]);
                    
                    const workoutExerciseResult = await db.getAllAsync(`
                      SELECT id FROM workout_exercises WHERE workout_id = ? AND exercise_id = ?
                    `, [newWorkoutId, exerciseId]);
                    
                    const workoutExerciseId = (workoutExerciseResult[0] as any)?.id;
                    
                    for (let i = 0; i < sets.length; i++) {
                      const set = sets[i];
                      await db.runAsync(`
                        INSERT INTO sets (workout_exercise_id, reps, weight, order_index)
                        VALUES (?, ?, ?, ?)
                      `, [workoutExerciseId, set.reps, set.weight, i]);
                    }
                  }
                }
              } else {
                // For real workouts, use the existing endWorkout function
                await endWorkout(currentWorkout.id, duration, undefined, workoutDate);
              }
              
              setCurrentWorkout(null);
              setShowLiveTraining(false);
              setTrainingStartTime(null);
              setCurrentTime(new Date()); // Reset current time
              setCurrentExerciseIndex(0);
              setCompletedSets([]);
              setCurrentSet({ reps: '', weight: '' });
              await loadData();
              Alert.alert('Succes', 'Træning gemt!');
            } catch (error) {
              console.error('Error ending workout:', error);
              Alert.alert('Fejl', 'Kunne ikke gemme træning');
            }
          }
        }
      ]
    );
  };

  const handleEditWorkout = (workout: any) => {
    setEditingWorkout(workout);
    setEditWorkoutData({
      name: workout.name || '',
      notes: workout.notes || '',
      date: workout.date || ''
    });
    setShowEditWorkout(true);
  };

  const handleSaveEditWorkout = async () => {
    if (!editingWorkout) return;

    try {
      await updateWorkout(editingWorkout.id, editWorkoutData);
      await loadData(); // Reload data to reflect changes
      setShowEditWorkout(false);
      setEditingWorkout(null);
      setEditWorkoutData({ name: '', notes: '', date: '' });
      Alert.alert('Succes', 'Træning opdateret!');
    } catch (error) {
      console.error('Error updating workout:', error);
      Alert.alert('Fejl', 'Kunne ikke opdatere træning');
    }
  };

  const handleDeleteWorkout = (workout: any) => {
    Alert.alert(
      'Slet Træning',
      `Er du sikker på at du vil slette "${workout.name}"?\n\nDenne handling kan ikke fortrydes.`,
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkout(workout.id);
              await loadData(); // Reload data to reflect changes
              Alert.alert('Succes', 'Træning slettet!');
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Fejl', 'Kunne ikke slette træning');
            }
          }
        }
      ]
    );
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
          <View style={styles.workoutActions}>
            <View style={[styles.workoutStatus, { 
              backgroundColor: stats.completionRate === 100 ? '#4CAF50' : 
                             stats.completionRate >= 50 ? '#FF9800' : '#F44336'
            }]}>
              <Text style={styles.workoutStatusText}>{stats.completionRate}%</Text>
            </View>
            <View style={styles.workoutActionButtons}>
              <TouchableOpacity
                style={[styles.workoutActionButton, { backgroundColor: theme.colors.primary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditWorkout(workout);
                }}
              >
                <Ionicons name="pencil" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.workoutActionButton, { backgroundColor: theme.colors.accent }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteWorkout(workout);
                }}
              >
                <Ionicons name="trash" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
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
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Træningsøvelser</Text>
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
                      <View key={`${exercise.id}-set-${index}`} style={styles.setRow}>
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
              
              {selectedExercises.length === 0 && (
                <View style={[styles.emptyExercisesContainer, { backgroundColor: theme.colors.card }]}>
                  <Ionicons name="fitness" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.emptyExercisesText, { color: theme.colors.textSecondary }]}>
                    Ingen øvelser valgt
                  </Text>
                  <Text style={[styles.emptyExercisesSubtext, { color: theme.colors.textTertiary }]}>
                    Klik "Tilføj Øvelse" for at begynde træningen
                  </Text>
                </View>
              )}
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

  const renderLiveTrainingModal = (isManualTraining = false) => {
    if (!currentWorkout || !selectedSession) return null;
    
    const sessionExercises = getExercisesBySession(currentWorkout.session_id);
    const currentExercise = sessionExercises[currentExerciseIndex];
    const isLastExercise = currentExerciseIndex === sessionExercises.length - 1;
    
    return (
      <Modal
        visible={showLiveTraining}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowLiveTraining(false);
          // Reset all training states when closing modal
          setCurrentWorkout(null);
          setTrainingStartTime(null);
          setCurrentTime(new Date());
          setCurrentExerciseIndex(0);
          setCompletedSets([]);
          setCurrentSet({ reps: '', weight: '' });
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.liveTrainingModal, { backgroundColor: theme.colors.surface }]}>
            {/* Header */}
            <View style={styles.liveTrainingHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setShowLiveTraining(false);
                  // Reset all training states when closing modal
                  setCurrentWorkout(null);
                  setTrainingStartTime(null);
                  setCurrentTime(new Date());
                  setCurrentExerciseIndex(0);
                  setCompletedSets([]);
                  setCurrentSet({ reps: '', weight: '' });
                }}
              >
                <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <View style={styles.liveTrainingTitleContainer}>
                <Text style={[styles.liveTrainingTitle, { color: theme.colors.text }]}>
                  {selectedSession.name}
                </Text>
                {/* Show exercise count for both live and manual training */}
                <Text style={[styles.liveTrainingSubtitle, { color: theme.colors.textSecondary }]}>
                  Øvelse {currentExerciseIndex + 1} af {sessionExercises.length}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.endTrainingButton, { backgroundColor: theme.colors.accent }]}
                onPress={handleEndTraining}
              >
                <Ionicons name="stop" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView style={styles.liveTrainingScrollView} showsVerticalScrollIndicator={false}>
              {/* Live Training Stats - Only show when trainingStartTime is set (actual live training) */}
              {trainingStartTime && (
                <View style={styles.trainingStats}>
                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="time" size={20} color={theme.colors.primary} />
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>{getTrainingDuration()}</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Tid</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="flame" size={20} color={theme.colors.accent} />
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>{getEstimatedCalories()}</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Kalorier</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="fitness" size={20} color={theme.colors.secondary} />
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                      {currentExerciseIndex + 1}/{sessionExercises.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Øvelse</Text>
                  </View>
                </View>
              )}

              {/* Date Picker (Calendar) - Only for manual training */}
              <View style={[styles.dateInputContainer, { backgroundColor: theme.colors.card }]}> 
                <Text style={[styles.dateInputLabel, { color: theme.colors.text }]}> 
                  Træningsdato:
                </Text>
                <Calendar
                  onDayPress={(day) => setWorkoutDate(day.dateString)}
                  markedDates={{ [workoutDate]: { selected: true } }}
                  theme={{
                    calendarBackground: theme.colors.card,
                    textSectionTitleColor: theme.colors.textSecondary,
                    selectedDayBackgroundColor: theme.colors.primary,
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: theme.colors.accent,
                    dayTextColor: theme.colors.text,
                    textDisabledColor: theme.colors.textTertiary,
                    monthTextColor: theme.colors.text,
                    arrowColor: theme.colors.primary,
                  }}
                />
              </View>

              {/* Current Exercise */}
              {currentExercise && (
                <View style={[styles.currentExerciseCard, { backgroundColor: theme.colors.card }]}>
                  <Text style={[styles.currentExerciseName, { color: theme.colors.text }]}>
                    {currentExercise.name}
                  </Text>
                  <Text style={[styles.currentExerciseDescription, { color: theme.colors.textSecondary }]}>
                    {currentExercise.description}
                  </Text>
                </View>
              )}

              {/* Completed Sets */}
              {completedSets.length > 0 && (
                <View style={styles.completedSetsContainer}>
                  <Text style={[styles.completedSetsTitle, { color: theme.colors.text }]}>
                    Færdige sæt:
                  </Text>
                  {completedSets.map((set, index) => (
                    <View key={`completed-set-${index}`} style={[styles.completedSetItem, { backgroundColor: theme.colors.background }]}>
                      <Text style={[styles.completedSetText, { color: theme.colors.text }]}>
                        Sæt {index + 1}: {set.reps} x {set.weight} kg
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Rest Timer */}
              {restTimer.isActive && (
                <View style={[styles.restTimerContainer, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
                  <View style={styles.restTimerHeader}>
                    <Ionicons name="timer" size={24} color={theme.colors.primary} />
                    <Text style={[styles.restTimerTitle, { color: theme.colors.primary }]}>Hvile</Text>
                    <TouchableOpacity
                      style={[styles.stopTimerButton, { backgroundColor: theme.colors.accent }]}
                      onPress={stopRestTimer}
                    >
                      <Ionicons name="stop" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.restTimerTime, { color: theme.colors.primary }]}>
                    {formatTime(restTimer.timeLeft)}
                  </Text>
                  <View style={[styles.restTimerProgress, { backgroundColor: theme.colors.divider }]}>
                    <View 
                      style={[
                        styles.restTimerProgressBar, 
                        { 
                          backgroundColor: theme.colors.primary,
                          width: `${((restTimer.totalTime - restTimer.timeLeft) / restTimer.totalTime) * 100}%`
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.restTimerHint, { color: theme.colors.textSecondary }]}>
                    {restTimer.timeLeft > 0 ? 'Forbered dig til næste sæt' : 'Klar til næste sæt!'}
                  </Text>
                </View>
              )}

              {/* Add Set Input */}
              <View style={[styles.addSetContainer, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.addSetTitle, { color: theme.colors.text }]}>
                  Tilføj sæt:
                </Text>
                <View style={styles.addSetInputs}>
                  <TextInput
                    style={[styles.addSetInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={currentSet.reps}
                    onChangeText={(text) => setCurrentSet({ ...currentSet, reps: text })}
                    placeholder="Reps"
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                  <Text style={[styles.addSetLabel, { color: theme.colors.textSecondary }]}>x</Text>
                  <TextInput
                    style={[styles.addSetInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={currentSet.weight}
                    onChangeText={(text) => setCurrentSet({ ...currentSet, weight: text })}
                    placeholder="Kg"
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                  <TouchableOpacity
                    style={[styles.addSetButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleAddSet}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Navigation */}
            <View style={styles.exerciseNavigation}>
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: theme.colors.divider }]}
                onPress={handlePreviousExercise}
                disabled={currentExerciseIndex === 0}
              >
                <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Forrige</Text>
              </TouchableOpacity>
              
              {!isLastExercise && (
                <TouchableOpacity
                  style={[styles.navButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleNextExercise}
                >
                  <Text style={[styles.navButtonText, { color: '#fff' }]}>Næste</Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

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

  const renderEditWorkoutModal = () => (
    <Modal
      visible={showEditWorkout}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowEditWorkout(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.editWorkoutModal, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowEditWorkout(false)}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Rediger Træning</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Træningsnavn</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editWorkoutData.name}
                onChangeText={(text) => setEditWorkoutData({ ...editWorkoutData, name: text })}
                placeholder="Indtast træningsnavn"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Dato</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editWorkoutData.date}
                onChangeText={(text) => setEditWorkoutData({ ...editWorkoutData, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Noter</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editWorkoutData.notes}
                onChangeText={(text) => setEditWorkoutData({ ...editWorkoutData, notes: text })}
                placeholder="Tilføj noter til træningen..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.divider }]}
                onPress={() => setShowEditWorkout(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Annuller</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveEditWorkout}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Gem</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <View style={styles.logoImageContainer}>
                  <Image 
                    source={require('../../assets/logo.png')} 
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Træningsoversigt</Text>
              <Text style={styles.headerSubtitle}>Se og opret træningshistorik</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            Klik på en session for at oprette en træning manuelt
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
            {workouts.slice(0, 5).map((workout) => (
              <View key={workout.id}>
                {renderWorkoutCard({ item: workout })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {renderCreateWorkoutModal()}
      {renderAddExerciseModal()}
      {renderEditWorkoutModal()}
      {showLiveTraining && renderLiveTrainingModal(true)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding to avoid bottom tab overlap
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    marginRight: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImageContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  headerText: {
    flex: 1,
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
  trainingStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 10,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 2,
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
  workoutActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutActionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  workoutActionButton: {
    padding: 6,
    borderRadius: 6,
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
  // Edit Workout Modal
  editWorkoutModal: {
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
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
  emptyExercisesContainer: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 8,
    marginTop: 12,
  },
  emptyExercisesText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyExercisesSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Live Training Modal Styles
  liveTrainingModal: {
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxWidth: 500,
    height: '90%',
  },
  liveTrainingScrollView: {
    flex: 1,
    paddingBottom: 20,
  },
  liveTrainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  liveTrainingTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  liveTrainingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  liveTrainingSubtitle: {
    fontSize: 14,
  },
  endTrainingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInputContainer: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  dateInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  currentExerciseCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  currentExerciseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentExerciseDescription: {
    fontSize: 14,
  },
  completedSetsContainer: {
    marginBottom: 20,
  },
  completedSetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  completedSetItem: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  completedSetText: {
    fontSize: 14,
  },
  addSetContainer: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  addSetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  addSetInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSetInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    minWidth: 80,
    textAlign: 'center',
  },
  addSetLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  exerciseNavigation: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Rest Timer Styles
  restTimerContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  restTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  restTimerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  stopTimerButton: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restTimerTime: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  restTimerProgress: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  restTimerProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  restTimerHint: {
    fontSize: 14,
    textAlign: 'center',
  },
});
