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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useExerciseStore } from '../stores/exerciseStore';
import { TrainingSession, Exercise } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { Calendar } from '../components/ui';

import { RouteProp } from '@react-navigation/native';
import { RootTabParamList } from '../types';

type TrainingScreenRouteProp = RouteProp<RootTabParamList, 'Training'>;

export default function TrainingScreen({ route }: { route: TrainingScreenRouteProp }) {
  const { trainingSessions, exercises, muscleGroups, loadTrainingSessions, loadExercises, loadMuscleGroups, updateExercise, addExercise, deleteExercise, addTrainingSession, updateTrainingSession, deleteTrainingSession, startWorkout, endWorkout, addSetToExercise, updateSetInExercise, deleteSetFromExercise, getProgressiveOverloadSuggestions, currentWorkout, setCurrentWorkout, cleanupIncompleteWorkout } = useExerciseStore();
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'sessions' | 'exercises' | 'builder'>(
    route?.params?.initialTab || 'sessions'
  );
  const [showExerciseDetails, setShowExerciseDetails] = useState(false);
  const [showEditExercise, setShowEditExercise] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    muscleGroupId: ''
  });
  
  // Session Builder states
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [sessionForm, setSessionForm] = useState({
    name: '',
    description: ''
  });

  // Live Training states
  const [showLiveTraining, setShowLiveTraining] = useState(false);
  const [trainingStartTime, setTrainingStartTime] = useState<Date | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState({ reps: '', weight: '' });
  const [completedSets, setCompletedSets] = useState<Array<{reps: number, weight: number}>>([]);
  const [allExerciseSets, setAllExerciseSets] = useState<{[exerciseId: string]: Array<{reps: number, weight: number}>}>({});
  const [showProgressiveOverload, setShowProgressiveOverload] = useState(false);
  const [progressiveOverloadSuggestions, setProgressiveOverloadSuggestions] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
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
  const [restTimerDuration, setRestTimerDuration] = useState(90); // Default 90 seconds, user can change
  const [showCustomTimerModal, setShowCustomTimerModal] = useState(false);
  const [customTimerInput, setCustomTimerInput] = useState('');
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [editSetData, setEditSetData] = useState({ reps: '', weight: '' });
  
  // Session management states
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [showEditSession, setShowEditSession] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  
  // Manual workout states
  const [showManualWorkout, setShowManualWorkout] = useState(false);
  const [manualWorkoutStep, setManualWorkoutStep] = useState<'setup' | 'training'>('setup');
  const [manualWorkoutData, setManualWorkoutData] = useState({
    sessionId: '',
    sessionName: '',
    date: new Date().toISOString().split('T')[0],
    duration: '',
    exercises: [] as Exercise[]
  });
  const [manualCurrentExerciseIndex, setManualCurrentExerciseIndex] = useState(0);
  const [manualCurrentSet, setManualCurrentSet] = useState({ reps: '', weight: '' });
  const [manualCompletedSets, setManualCompletedSets] = useState<Array<{reps: number, weight: number}>>([]);
  const [manualAllExerciseSets, setManualAllExerciseSets] = useState<{[exerciseId: string]: Array<{reps: number, weight: number}>}>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editSessionForm, setEditSessionForm] = useState({
    name: '',
    description: '',
    muscleGroupId: '',
    selectedExercises: [] as Exercise[]
  });
  
  // Exercise creation states
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [createExerciseForm, setCreateExerciseForm] = useState({
    name: '',
    description: '',
    muscle_group_id: ''
  });

  useEffect(() => {
    loadTrainingSessions();
    loadExercises();
    loadMuscleGroups();
  }, []);

  // Listen for route params changes
  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Auto-start live training if there's an active workout
  useEffect(() => {
    if (currentWorkout && !showLiveTraining) {
      console.log('Auto-starting live training for workout:', currentWorkout.id);
      setTrainingStartTime(new Date());
      setCurrentExerciseIndex(0);
      setCompletedSets([]);
      setAllExerciseSets({});
      setCurrentSet({ reps: '', weight: '' });
      setShowLiveTraining(true);
    }
  }, [currentWorkout]);

  // Load progressive overload suggestions when exercise changes
  useEffect(() => {
    if (showLiveTraining && currentWorkout) {
      loadProgressiveOverloadSuggestions();
      
      // Load existing sets for current exercise if any
      const sessionExercises = getExercisesForSession(currentWorkout.session_id);
      const currentExercise = sessionExercises[currentExerciseIndex];
      if (currentExercise && allExerciseSets[currentExercise.id]) {
        setCompletedSets(allExerciseSets[currentExercise.id]);
      }
    }
  }, [currentExerciseIndex, showLiveTraining, currentWorkout]);

  // Real-time updates for training
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
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

  const getMuscleGroupColor = (muscleGroupId: string): string => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const index = parseInt(muscleGroupId) % colors.length;
    return colors[index];
  };

  const getExercisesForSession = (sessionId: string): Exercise[] => {
    const session = trainingSessions.find(s => s.id === sessionId);
    if (!session) return [];
    
    // First try to find exercises by session_id (preferred method)
    let sessionExercises = exercises.filter(exercise => exercise.session_id === sessionId);
    
    // If no exercises found by session_id, fall back to muscle_group_id
    if (sessionExercises.length === 0) {
      sessionExercises = exercises.filter(exercise => exercise.muscle_group_id === session.muscle_group_id);
    }
    
    return sessionExercises;
  };

  const handleViewExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowExerciseDetails(true);
  };

  const handleEditExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setEditForm({
      name: exercise.name,
      description: exercise.description || '',
      muscleGroupId: exercise.muscle_group_id
    });
    setShowEditExercise(true);
  };

  const handleDeleteExercise = (exercise: Exercise) => {
    Alert.alert(
      'Slet øvelse',
      `Er du sikker på at du vil slette "${exercise.name}"? Denne handling kan ikke fortrydes.`,
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExercise(exercise.id);
              Alert.alert('Succes', 'Øvelse slettet succesfuldt');
            } catch (error) {
              Alert.alert('Fejl', 'Kunne ikke slette øvelse. Den bruges måske i træningssessioner.');
            }
          }
        }
      ]
    );
  };

  const handleSaveExercise = async () => {
    if (!selectedExercise || !editForm.name.trim()) {
      Alert.alert('Fejl', 'Øvelsens navn er påkrævet');
      return;
    }

    try {
      await updateExercise(selectedExercise.id, {
        name: editForm.name,
        description: editForm.description,
        muscle_group_id: editForm.muscleGroupId
      });
      
      Alert.alert('Succes', 'Øvelse opdateret!');
      loadExercises();
      setShowEditExercise(false);
      setSelectedExercise(null);
    } catch (error) {
      Alert.alert('Fejl', 'Kunne ikke opdatere øvelse');
    }
  };

  // Session Builder functions
  const handleAddExerciseToSession = (exercise: Exercise) => {
    if (!selectedExercises.find(e => e.id === exercise.id)) {
      setSelectedExercises([...selectedExercises, exercise]);
    }
  };

  const handleRemoveExerciseFromSession = (exerciseId: string) => {
    setSelectedExercises(selectedExercises.filter(e => e.id !== exerciseId));
  };

  const handleMoveExerciseUp = (index: number) => {
    if (index > 0) {
      const newExercises = [...selectedExercises];
      [newExercises[index], newExercises[index - 1]] = [newExercises[index - 1], newExercises[index]];
      setSelectedExercises(newExercises);
    }
  };

  const handleMoveExerciseDown = (index: number) => {
    if (index < selectedExercises.length - 1) {
      const newExercises = [...selectedExercises];
      [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
      setSelectedExercises(newExercises);
    }
  };

  const handleCreateSession = async () => {
    if (!sessionForm.name.trim()) {
      Alert.alert('Fejl', 'Session navn er påkrævet');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Fejl', 'Vælg mindst én øvelse');
      return;
    }

    try {
      // Create session with first exercise's muscle group as primary
      const primaryMuscleGroup = selectedExercises[0].muscle_group_id;
      
      // Create the session first
      const newSession = await addTrainingSession({
        name: sessionForm.name,
        muscle_group_id: primaryMuscleGroup,
        description: sessionForm.description,
        is_active: true
      });
      
      // Update exercises to belong to this session
      for (let i = 0; i < selectedExercises.length; i++) {
        const exercise = selectedExercises[i];
        await updateExercise(exercise.id, {
          session_id: newSession.id,
          order_index: i + 1
        });
      }
      
      Alert.alert('Succes', 'Session oprettet!');
      loadTrainingSessions();
      loadExercises(); // Reload exercises to show the new session assignments
      setShowCreateSession(false);
      setSelectedExercises([]);
      setSessionForm({ name: '', description: '' });
    } catch (error) {
      Alert.alert('Fejl', 'Kunne ikke oprette session');
    }
  };

  // Live Training functions
  const handleStartTraining = async (sessionId: string) => {
    try {
      // Make sure exercises are loaded
      await loadExercises();
      
      const sessionExercises = getExercisesForSession(sessionId);
      console.log('Starting training for session:', sessionId, 'with exercises:', sessionExercises.length);
      
      if (sessionExercises.length === 0) {
        Alert.alert('Fejl', 'Ingen øvelser fundet i denne session');
        return;
      }
      
      const workout = await startWorkout(sessionId);
      setTrainingStartTime(new Date());
      setCurrentExerciseIndex(0);
      setCompletedSets([]);
      setAllExerciseSets({});
      setCurrentSet({ reps: '', weight: '' });
      setShowLiveTraining(true);
    } catch (error) {
      console.error('Error starting training:', error);
      Alert.alert('Fejl', `Kunne ikke starte træning: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    }
  };

  const handleEndTraining = async () => {
    if (!currentWorkout || !trainingStartTime) return;

    const duration = Math.floor((new Date().getTime() - trainingStartTime.getTime()) / 1000 / 60); // minutes
    const calories = getEstimatedCalories();

    Alert.alert(
      'Afslut træning',
      `Er du sikker på, at du vil afslutte træningen?\n\nTræningstid: ${duration} minutter\nEstimeret kalorier: ${calories}\n\nVil du gemme træningsdataene?`,
      [
        {
          text: 'Annuller',
          style: 'cancel',
        },
        {
          text: 'Afslut uden at gemme',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clean up any sets that were saved during training
              if (currentWorkout?.id) {
                await cleanupIncompleteWorkout(currentWorkout.id);
              }
              
              setShowLiveTraining(false);
              setTrainingStartTime(null);
              setCurrentExerciseIndex(0);
              setCompletedSets([]);
              setAllExerciseSets({});
              setCurrentSet({ reps: '', weight: '' });
              setCurrentWorkout(null);
            } catch (error) {
              console.error('Error cleaning up workout:', error);
              // Still close the training even if cleanup fails
              setShowLiveTraining(false);
              setTrainingStartTime(null);
              setCurrentExerciseIndex(0);
              setCompletedSets([]);
              setAllExerciseSets({});
              setCurrentSet({ reps: '', weight: '' });
              setCurrentWorkout(null);
            }
          },
        },
        {
          text: 'Gem og afslut',
          onPress: async () => {
            try {
              await endWorkout(currentWorkout.id, duration);
              setShowLiveTraining(false);
              setTrainingStartTime(null);
              setCurrentExerciseIndex(0);
              setCompletedSets([]);
              setAllExerciseSets({});
              setCurrentSet({ reps: '', weight: '' });
              setCurrentWorkout(null);
              Alert.alert('Succes', 'Træningen er gemt!');
            } catch (error) {
              Alert.alert('Fejl', 'Kunne ikke gemme træning');
            }
          },
        },
      ]
    );
  };

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
      const sessionExercises = getExercisesForSession(currentWorkout.session_id);
      const currentExercise = sessionExercises[currentExerciseIndex];
      
      console.log('Adding set:', {
        workoutId: currentWorkout.id,
        sessionId: currentWorkout.session_id,
        exerciseId: currentExercise?.id,
        reps,
        weight,
        sessionExercises: sessionExercises.length,
        currentExerciseIndex,
        allExercises: exercises.length
      });
      
      if (!currentExercise) {
        throw new Error(`Ingen øvelse fundet på index ${currentExerciseIndex}`);
      }
      
      await addSetToExercise(currentWorkout.id, currentExercise.id, reps, weight);
      setCompletedSets([...completedSets, { reps, weight }]);
      setCurrentSet({ reps: '', weight: '' });
      
      // Haptic feedback for successful set addition
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Start rest timer after adding a set
      startRestTimer(restTimerDuration); // Use user-selected duration
      
      // Load progressive overload suggestions after adding a set
      await loadProgressiveOverloadSuggestions();
    } catch (error) {
      console.error('Error adding set:', error);
      Alert.alert('Fejl', `Kunne ikke tilføje sæt: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    }
  };

  const handleDeleteSet = async (setIndex: number) => {
    Alert.alert(
      'Slet Sæt',
      'Er du sikker på at du vil slette dette sæt?',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!currentWorkout) return;
              
              const sessionExercises = getExercisesForSession(currentWorkout.session_id);
              const currentExercise = sessionExercises[currentExerciseIndex];
              
              if (!currentExercise) {
                throw new Error(`Ingen øvelse fundet på index ${currentExerciseIndex}`);
              }

              // Remove from database
              await deleteSetFromExercise(currentWorkout.id, currentExercise.id, setIndex);
              
              // Remove from local state
              const newCompletedSets = completedSets.filter((_, index) => index !== setIndex);
              setCompletedSets(newCompletedSets);
              
              // Reload progressive overload suggestions
              await loadProgressiveOverloadSuggestions();
            } catch (error) {
              console.error('Error deleting set:', error);
              Alert.alert('Fejl', `Kunne ikke slette sæt: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
            }
          }
        }
      ]
    );
  };

  const handleEditSet = (setIndex: number) => {
    const set = completedSets[setIndex];
    setEditingSetIndex(setIndex);
    setEditSetData({ reps: set.reps.toString(), weight: set.weight.toString() });
  };

  const handleSaveEditSet = async () => {
    if (!currentWorkout || editingSetIndex === null) return;

    const reps = parseInt(editSetData.reps);
    const weight = parseFloat(editSetData.weight);

    if (isNaN(reps) || isNaN(weight)) {
      Alert.alert('Fejl', 'Ugyldige tal');
      return;
    }

    try {
      const sessionExercises = getExercisesForSession(currentWorkout.session_id);
      const currentExercise = sessionExercises[currentExerciseIndex];
      
      if (!currentExercise) {
        throw new Error(`Ingen øvelse fundet på index ${currentExerciseIndex}`);
      }

      // Update in database
      await updateSetInExercise(currentWorkout.id, currentExercise.id, editingSetIndex, reps, weight);
      
      // Update local state
      const newCompletedSets = [...completedSets];
      newCompletedSets[editingSetIndex] = { reps, weight };
      setCompletedSets(newCompletedSets);
      
      // Reset edit state
      setEditingSetIndex(null);
      setEditSetData({ reps: '', weight: '' });
      
      // Reload progressive overload suggestions
      await loadProgressiveOverloadSuggestions();
    } catch (error) {
      console.error('Error updating set:', error);
      Alert.alert('Fejl', `Kunne ikke opdatere sæt: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    }
  };

  const handleCancelEditSet = () => {
    setEditingSetIndex(null);
    setEditSetData({ reps: '', weight: '' });
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

  const changeRestTimerDuration = () => {
    setCustomTimerInput(restTimerDuration.toString());
    setShowCustomTimerModal(true);
  };

  const handleCustomTimerSubmit = () => {
    const newDuration = parseInt(customTimerInput);
    if (newDuration >= 30 && newDuration <= 300) {
      setRestTimerDuration(newDuration);
      setShowCustomTimerModal(false);
      setCustomTimerInput('');
    } else {
      Alert.alert('Fejl', 'Tid skal være mellem 30 og 300 sekunder');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load progressive overload suggestions for current exercise
  const loadProgressiveOverloadSuggestions = async () => {
    if (!currentWorkout) return;
    
    try {
      const sessionExercises = getExercisesForSession(currentWorkout.session_id);
      const currentExercise = sessionExercises[currentExerciseIndex];
      
      if (!currentExercise) return;

      // Get previous workout data for this exercise
      const { getDatabase } = await import('../database');
      const db = getDatabase();
      
      const previousWorkouts = await db.getAllAsync(`
        SELECT w.date, s.reps, s.weight
        FROM workouts w
        JOIN workout_exercises we ON w.id = we.workout_id
        JOIN sets s ON we.id = s.workout_exercise_id
        WHERE we.exercise_id = ? AND w.completed = 1 AND s.completed = 1
        ORDER BY w.date DESC
        LIMIT 50
      `, [currentExercise.id]);

      if (previousWorkouts.length === 0) {
        // First time doing this exercise - no suggestions
        setProgressiveOverloadSuggestions([]);
        return;
      }

      // Group sets by workout date and calculate metrics
      const workoutsByDate = previousWorkouts.reduce((acc: any, curr: any) => {
        const date = curr.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(curr);
        return acc;
      }, {});

      const lastWorkoutDate = Object.keys(workoutsByDate)[0];
      const lastWorkoutSets = workoutsByDate[lastWorkoutDate] || [];
      
      const lastMaxWeight = lastWorkoutSets.length > 0 ? Math.max(...lastWorkoutSets.map((s: any) => s.weight)) : 0;
      const lastMaxReps = lastWorkoutSets.length > 0 ? Math.max(...lastWorkoutSets.map((s: any) => s.reps)) : 0;
      
      const currentMaxWeight = completedSets.length > 0 ? Math.max(...completedSets.map(s => s.weight)) : 0;
      const currentMaxReps = completedSets.length > 0 ? Math.max(...completedSets.map(s => s.reps)) : 0;

      let suggestion;
      
      if (completedSets.length === 0) {
        // No sets completed yet - suggest based on last workout
        if (lastMaxReps >= 12) {
          suggestion = {
            exerciseId: currentExercise.id,
            exerciseName: currentExercise.name,
            currentMaxWeight: lastMaxWeight,
            suggestedWeight: lastMaxWeight + 2.5,
            suggestedReps: 8,
            reason: 'Sidste træning var høje reps. Prøv at øge vægten og reducere reps.',
            type: 'weight'
          };
        } else if (lastMaxReps >= 8) {
          suggestion = {
            exerciseId: currentExercise.id,
            exerciseName: currentExercise.name,
            currentMaxWeight: lastMaxWeight,
            suggestedWeight: lastMaxWeight + 2.5,
            suggestedReps: lastMaxReps,
            reason: 'Øg vægten med 2.5kg fra sidste træning.',
            type: 'weight'
          };
        } else {
          suggestion = {
            exerciseId: currentExercise.id,
            exerciseName: currentExercise.name,
            currentMaxWeight: lastMaxWeight,
            suggestedWeight: lastMaxWeight,
            suggestedReps: lastMaxReps + 1,
            reason: 'Øg reps med 1 fra sidste træning.',
            type: 'reps'
          };
        }
      } else {
        // Analyze current workout performance
        const weightImprovement = currentMaxWeight - lastMaxWeight;
        const repsImprovement = currentMaxReps - lastMaxReps;

        if (weightImprovement > 0) {
          suggestion = {
            exerciseId: currentExercise.id,
            exerciseName: currentExercise.name,
            currentMaxWeight,
            suggestedWeight: currentMaxWeight + 2.5,
            suggestedReps: Math.max(6, currentMaxReps - 1),
            reason: `Fremragende! Du øgede vægten med ${weightImprovement}kg. Prøv at øge med yderligere 2.5kg.`,
            type: 'weight'
          };
        } else if (repsImprovement > 0) {
          suggestion = {
            exerciseId: currentExercise.id,
            exerciseName: currentExercise.name,
            currentMaxWeight,
            suggestedWeight: currentMaxWeight + 2.5,
            suggestedReps: currentMaxReps,
            reason: `Godt! Du øgede reps med ${repsImprovement}. Prøv nu at øge vægten.`,
            type: 'weight'
          };
        } else {
          suggestion = {
            exerciseId: currentExercise.id,
            exerciseName: currentExercise.name,
            currentMaxWeight,
            suggestedWeight: currentMaxWeight,
            suggestedReps: currentMaxReps,
            reason: 'Behold nuværende vægt og reps. Fokusér på form og konsistens.',
            type: 'maintain'
          };
        }
      }

      setProgressiveOverloadSuggestions([suggestion]);
    } catch (error) {
      console.error('Error loading progressive overload suggestions:', error);
    }
  };

  const handleNextExercise = () => {
    const sessionExercises = getExercisesForSession(currentWorkout?.session_id || '');
    if (currentExerciseIndex < sessionExercises.length - 1) {
      // Save current exercise sets before moving to next
      const currentExercise = sessionExercises[currentExerciseIndex];
      if (currentExercise) {
        const updatedSets = {
          ...allExerciseSets,
          [currentExercise.id]: completedSets
        };
        setAllExerciseSets(updatedSets);
      }
      
      // Move to next exercise
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      const nextExercise = sessionExercises[nextIndex];
      
      // Load sets for next exercise (if any)
      if (nextExercise) {
        setCompletedSets(allExerciseSets[nextExercise.id] || []);
      } else {
        setCompletedSets([]);
      }
      setCurrentSet({ reps: '', weight: '' });
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      // Save current exercise sets before moving to previous
      const sessionExercises = getExercisesForSession(currentWorkout?.session_id || '');
      const currentExercise = sessionExercises[currentExerciseIndex];
      if (currentExercise) {
        const updatedSets = {
          ...allExerciseSets,
          [currentExercise.id]: completedSets
        };
        setAllExerciseSets(updatedSets);
      }
      
      // Move to previous exercise
      const prevIndex = currentExerciseIndex - 1;
      setCurrentExerciseIndex(prevIndex);
      const prevExercise = sessionExercises[prevIndex];
      
      // Load sets for previous exercise (if any)
      if (prevExercise) {
        setCompletedSets(allExerciseSets[prevExercise.id] || []);
      } else {
        setCompletedSets([]);
      }
      setCurrentSet({ reps: '', weight: '' });
    }
  };

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

  // Session management functions
  const handleViewSession = (session: TrainingSession) => {
    setSelectedSession(session);
    setShowSessionDetails(true);
  };

  const handleEditSession = (session: TrainingSession) => {
    console.log('🔧 Editing session:', session);
    setSelectedSession(session);
    
    // Get exercises for this session's muscle group
    const sessionExercises = exercises.filter(ex => ex.muscle_group_id === session.muscle_group_id);
    
    setEditSessionForm({
      name: session.name,
      description: session.description || '',
      muscleGroupId: session.muscle_group_id,
      selectedExercises: sessionExercises
    });
    setShowEditSession(true);
  };

  const handleSaveSession = async () => {
    console.log('💾 Saving session:', selectedSession?.id, editSessionForm);
    
    if (!selectedSession || !editSessionForm.name.trim()) {
      Alert.alert('Fejl', 'Session navn er påkrævet');
      return;
    }

    if (!editSessionForm.muscleGroupId) {
      Alert.alert('Fejl', 'Vælg en muskelgruppe');
      return;
    }

    try {
      // Update the session
      await updateTrainingSession(selectedSession.id, {
        name: editSessionForm.name,
        description: editSessionForm.description,
        muscle_group_id: editSessionForm.muscleGroupId
      });

      // Update exercises - remove old ones and add new ones
      const db = getDatabase();
      
      // Remove all exercises from this session
      await db.runAsync('DELETE FROM exercises WHERE session_id = ?', [selectedSession.id]);
      
      // Add selected exercises to the session
      for (let i = 0; i < editSessionForm.selectedExercises.length; i++) {
        const exercise = editSessionForm.selectedExercises[i];
        await db.runAsync(`
          INSERT INTO exercises (id, name, muscle_group_id, session_id, order_index, description, equipment, difficulty, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          `${Date.now()}_${i}`,
          exercise.name,
          editSessionForm.muscleGroupId,
          selectedSession.id,
          i,
          exercise.description || '',
          exercise.equipment || '',
          exercise.difficulty || 'beginner',
          new Date().toISOString()
        ]);
      }
      
      console.log('✅ Session updated successfully');
      Alert.alert('Succes', 'Session opdateret!');
      loadTrainingSessions();
      loadExercises();
      setShowEditSession(false);
      setSelectedSession(null);
    } catch (error) {
      console.error('❌ Failed to update session:', error);
      Alert.alert('Fejl', 'Kunne ikke opdatere session');
    }
  };

  const toggleExerciseSelection = (exercise: Exercise) => {
    setEditSessionForm(prev => ({
      ...prev,
      selectedExercises: prev.selectedExercises.find(ex => ex.id === exercise.id)
        ? prev.selectedExercises.filter(ex => ex.id !== exercise.id)
        : [...prev.selectedExercises, exercise]
    }));
  };

  const handleDeleteSession = (sessionId: string) => {
    // Find the session to get its name for the confirmation dialog
    const session = trainingSessions.find(s => s.id === sessionId);
    const sessionName = session?.name || 'denne session';
    
    Alert.alert(
      'Slet session',
      `Er du sikker på at du vil slette "${sessionName}"? Denne handling kan ikke fortrydes.`,
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: async () => {
            try {
              // First, remove exercises from this session using direct database query
              const { getDatabase } = await import('../database');
              const db = getDatabase();
              
              // Get exercises directly from database
              const sessionExercises = await db.getAllAsync(`
                SELECT * FROM exercises WHERE session_id = ?
              `, [sessionId]);
              
              console.log('Removing exercises from session:', sessionId, 'Exercises:', sessionExercises.length);
              
              // Update each exercise to remove session_id
              for (const exercise of sessionExercises) {
                const exerciseData = exercise as any;
                console.log('Updating exercise:', exerciseData.id, 'to remove from session');
                await db.runAsync(`
                  UPDATE exercises SET session_id = NULL, order_index = NULL WHERE id = ?
                `, [exerciseData.id]);
              }
              
              // Reload exercises to update local state
              await loadExercises();
              
              console.log('All exercises removed, now deleting session:', sessionId);
              // Then delete the session
              await deleteTrainingSession(sessionId);
              
              Alert.alert('Succes', 'Session slettet!');
              loadTrainingSessions();
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Fejl', `Kunne ikke slette session: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
            }
          }
        }
      ]
    );
  };

  // Exercise creation functions
  const handleCreateExercise = async () => {
    if (!createExerciseForm.name.trim()) {
      Alert.alert('Fejl', 'Øvelsens navn er påkrævet');
      return;
    }
    if (!createExerciseForm.muscle_group_id) {
      Alert.alert('Fejl', 'Vælg en muskelgruppe');
      return;
    }

    try {
      await addExercise({
        name: createExerciseForm.name.trim(),
        description: createExerciseForm.description.trim(),
        muscle_group_id: createExerciseForm.muscle_group_id,
        equipment: '',
        difficulty: 'intermediate',
        order_index: 0
      });
      
      setCreateExerciseForm({ name: '', description: '', muscle_group_id: '' });
      setShowCreateExercise(false);
      Alert.alert('Succes', 'Øvelse oprettet!');
    } catch (error) {
      Alert.alert('Fejl', 'Kunne ikke oprette øvelse');
    }
  };

  const handleStartManualWorkout = async () => {
    if (!manualWorkoutData.sessionId) {
      Alert.alert('Fejl', 'Vælg venligst en session');
      return;
    }

    try {
      // Load exercises for the session
      await loadExercises();
      const sessionExercises = getExercisesForSession(manualWorkoutData.sessionId);
      
      if (sessionExercises.length === 0) {
        Alert.alert('Fejl', 'Ingen øvelser fundet i denne session');
        return;
      }

      // Set up training data
      setManualWorkoutData(prev => ({ ...prev, exercises: sessionExercises }));
      setManualCurrentExerciseIndex(0);
      setManualCompletedSets([]);
      setManualAllExerciseSets({});
      setManualWorkoutStep('training');
    } catch (error) {
      console.error('Error starting manual workout:', error);
      Alert.alert('Fejl', 'Kunne ikke starte manuel træning');
    }
  };

  const handleCompleteManualWorkout = async () => {
    try {
      // Save current exercise sets before completing
      const currentExercise = manualWorkoutData.exercises[manualCurrentExerciseIndex];
      const finalSets = {
        ...manualAllExerciseSets,
        [currentExercise.id]: manualCompletedSets
      };
      setManualAllExerciseSets(finalSets);

      // Create workout
      const { addWorkout } = useExerciseStore.getState();
      const workout = await addWorkout({
        session_id: manualWorkoutData.sessionId,
        name: `Manuel træning - ${manualWorkoutData.sessionName}`,
        date: manualWorkoutData.date,
        duration: parseInt(manualWorkoutData.duration) || 0,
        completed: true,
        notes: 'Manuel indtastning'
      });

      const db = (await import('../database')).getDatabase();

      // Add exercises and sets
      for (let i = 0; i < manualWorkoutData.exercises.length; i++) {
        const exercise = manualWorkoutData.exercises[i];
        const sets = finalSets[exercise.id] || [];
        
        if (sets.length > 0) {
          // Create workout_exercise
          const workoutExerciseId = `${workout.id}_${exercise.id}`;
          await db.runAsync(`
            INSERT INTO workout_exercises (id, workout_id, exercise_id, order_index, completed)
            VALUES (?, ?, ?, ?, ?)
          `, [workoutExerciseId, workout.id, exercise.id, i, 1]);

          // Add sets
          for (let j = 0; j < sets.length; j++) {
            const set = sets[j];
            const setId = `${workoutExerciseId}_${j + 1}`;
            await db.runAsync(`
              INSERT INTO sets (id, workout_exercise_id, reps, weight, completed, order_index)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [setId, workoutExerciseId, set.reps, set.weight, 1, j + 1]);
          }
        }
      }

      // Save progress data
      const { saveWorkoutProgress } = useExerciseStore.getState();
      await saveWorkoutProgress(workout.id);

      Alert.alert('Succes', 'Manuel træning gemt!');
      
      // Reset everything
      setShowManualWorkout(false);
      setManualWorkoutStep('setup');
      setManualWorkoutData({
        sessionId: '',
        sessionName: '',
        date: new Date().toISOString().split('T')[0],
        duration: '',
        exercises: []
      });
      setManualCurrentExerciseIndex(0);
      setManualCompletedSets([]);
      setManualAllExerciseSets({});

    } catch (error) {
      console.error('Error completing manual workout:', error);
      Alert.alert('Fejl', 'Kunne ikke gemme manuel træning');
    }
  };

  const handleAddManualSet = () => {
    const reps = parseInt(manualCurrentSet.reps);
    const weight = parseFloat(manualCurrentSet.weight);

    if (isNaN(reps) || isNaN(weight)) {
      Alert.alert('Fejl', 'Indtast gyldige tal for reps og vægt');
      return;
    }

    const currentExercise = manualWorkoutData.exercises[manualCurrentExerciseIndex];
    const newSet = { reps, weight };
    
    // Add to current exercise sets
    const newCompletedSets = [...manualCompletedSets, newSet];
    setManualCompletedSets(newCompletedSets);
    
    // Add to all exercise sets
    setManualAllExerciseSets(prev => ({
      ...prev,
      [currentExercise.id]: newCompletedSets
    }));
    
    // Haptic feedback for successful set addition
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Clear form
    setManualCurrentSet({ reps: '', weight: '' });
  };

  const handleNextManualExercise = () => {
    if (manualCurrentExerciseIndex < manualWorkoutData.exercises.length - 1) {
      // Save current exercise sets
      const currentExercise = manualWorkoutData.exercises[manualCurrentExerciseIndex];
      const updatedSets = {
        ...manualAllExerciseSets,
        [currentExercise.id]: manualCompletedSets
      };
      setManualAllExerciseSets(updatedSets);
      
      // Move to next exercise
      const nextIndex = manualCurrentExerciseIndex + 1;
      setManualCurrentExerciseIndex(nextIndex);
      const nextExercise = manualWorkoutData.exercises[nextIndex];
      setManualCompletedSets(updatedSets[nextExercise.id] || []);
    }
  };

  const handlePrevManualExercise = () => {
    if (manualCurrentExerciseIndex > 0) {
      // Save current exercise sets
      const currentExercise = manualWorkoutData.exercises[manualCurrentExerciseIndex];
      const updatedSets = {
        ...manualAllExerciseSets,
        [currentExercise.id]: manualCompletedSets
      };
      setManualAllExerciseSets(updatedSets);
      
      // Move to previous exercise
      const prevIndex = manualCurrentExerciseIndex - 1;
      setManualCurrentExerciseIndex(prevIndex);
      const prevExercise = manualWorkoutData.exercises[prevIndex];
      setManualCompletedSets(updatedSets[prevExercise.id] || []);
    }
  };

  const handleCloseManualWorkout = () => {
    // If in setup phase, just close without warning
    if (manualWorkoutStep === 'setup') {
      setShowManualWorkout(false);
      setManualWorkoutStep('setup');
      return;
    }

    // Check if there are any completed sets in training phase
    // First save current exercise sets if any
    const currentExercise = manualWorkoutData.exercises[manualCurrentExerciseIndex];
    const currentSets = manualCompletedSets.length > 0 ? {
      ...manualAllExerciseSets,
      [currentExercise.id]: manualCompletedSets
    } : manualAllExerciseSets;
    
    const hasCompletedSets = Object.values(currentSets).some(sets => sets.length > 0);
    
    if (!hasCompletedSets) {
      // No sets to save, just close
      setShowManualWorkout(false);
      setManualWorkoutStep('setup');
      return;
    }

    // Show warning dialog
    Alert.alert(
      'Afslut Manuel Træning',
      'Du har ikke-gemte sæt. Hvad vil du gøre?',
      [
        {
          text: 'Annuller',
          style: 'cancel',
        },
        {
          text: 'Afslut uden at gemme',
          style: 'destructive',
          onPress: () => {
            setShowManualWorkout(false);
            setManualWorkoutStep('setup');
            setManualWorkoutData({
              sessionId: '',
              sessionName: '',
              date: new Date().toISOString().split('T')[0],
              duration: '',
              exercises: []
            });
            setManualCurrentExerciseIndex(0);
            setManualCompletedSets([]);
            setManualAllExerciseSets({});
          },
        },
        {
          text: 'Gem og afslut',
          onPress: async () => {
            try {
              // Save current sets before completing
              if (manualCompletedSets.length > 0) {
                setManualAllExerciseSets(currentSets);
              }
              await handleCompleteManualWorkout();
            } catch (error) {
              console.error('Error saving manual workout:', error);
              Alert.alert('Fejl', 'Kunne ikke gemme træning');
            }
          },
        },
      ]
    );
  };

  const renderSessionsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Træningssessioner</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Vælg en session for at starte træning</Text>
        
        {/* Manual Workout Button */}
        <TouchableOpacity
          style={[styles.manualWorkoutButton, { backgroundColor: theme.colors.primary }]}
          onPress={async () => {
            console.log('🔄 Manual workout button pressed');
            console.log('📊 Current trainingSessions:', trainingSessions);
            await loadTrainingSessions(); // Ensure sessions are loaded
            console.log('📊 trainingSessions after reload:', trainingSessions);
            setShowManualWorkout(true);
          }}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.manualWorkoutButtonText}>Tilføj Træning Manuelt</Text>
        </TouchableOpacity>
      </View>

      {trainingSessions && trainingSessions.length > 0 ? trainingSessions.map((session) => (
        <TouchableOpacity
          key={session.id}
          style={[styles.sessionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
          onPress={() => {/* TODO: Start workout */}}
        >
          <View style={styles.sessionHeader}>
            <View style={[styles.muscleGroupIndicator, { backgroundColor: getMuscleGroupColor(session.muscle_group_id) }]} />
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionName, { color: theme.colors.text }]}>{session.name}</Text>
              <Text style={[styles.sessionDescription, { color: theme.colors.textSecondary }]}>{session.description}</Text>
            </View>
            <Ionicons name="play-circle" size={24} color={theme.colors.primary} />
          </View>
          
          <View style={styles.exercisePreview}>
            <Text style={[styles.exercisePreviewTitle, { color: theme.colors.text }]}>Øvelser i denne session:</Text>
            <View style={styles.exerciseList}>
              {getExercisesForSession(session.id).slice(0, 3).map((exercise, index) => (
                <View key={`${exercise.id}-${index}`} style={styles.exerciseItem}>
                  <Text style={[styles.exerciseName, { color: theme.colors.textSecondary }]}>{exercise.name}</Text>
                  {index < 2 && <Text style={[styles.exerciseSeparator, { color: theme.colors.border }]}>•</Text>}
                </View>
              ))}
              {getExercisesForSession(session.id).length > 3 && (
                <Text style={[styles.moreExercises, { color: theme.colors.primary }]}>+{getExercisesForSession(session.id).length - 3} flere</Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.sessionActionButtons}>
            <TouchableOpacity 
              style={[styles.sessionActionButton, { backgroundColor: theme.colors.divider }]}
              onPress={() => handleViewSession(session)}
            >
              <Ionicons name="eye" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sessionActionButton, { backgroundColor: theme.colors.divider }]}
              onPress={() => handleEditSession(session)}
            >
              <Ionicons name="create" size={18} color={theme.colors.secondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sessionActionButton, { backgroundColor: theme.colors.divider }]}
              onPress={() => {
                Alert.alert(
                  'Slet Session',
                  'Er du sikker på at du vil slette denne session?',
                  [
                    { text: 'Annuller', style: 'cancel' },
                    { text: 'Slet', style: 'destructive', onPress: () => handleDeleteSession(session.id) }
                  ]
                );
              }}
            >
              <Ionicons name="trash" size={18} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Start Training Button */}
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleStartTraining(session.id)}
          >
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.startButtonText}>Start Træning</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )) : (
        <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="fitness-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>Ingen træningssessioner endnu</Text>
          <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
            Opret din første session i Session Builder
          </Text>
        </View>
      )}
    </View>
  );

  const renderExercisesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Øvelsesbibliotek</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Alle øvelser organiseret efter muskelgruppe</Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => setShowCreateExercise(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Ny øvelse</Text>
          </TouchableOpacity>
        </View>
      </View>

      {muscleGroups.map((muscleGroup) => {
        const groupExercises = exercises.filter(e => e.muscle_group_id === muscleGroup.id);
        return (
          <View key={muscleGroup.id} style={styles.muscleGroupSection}>
            <View style={styles.muscleGroupHeader}>
              <View style={[styles.muscleGroupColor, { backgroundColor: muscleGroup.color }]} />
              <Text style={[styles.muscleGroupName, { color: theme.colors.text }]}>{muscleGroup.name}</Text>
              <Text style={[styles.exerciseCount, { color: theme.colors.textSecondary }]}>({groupExercises.length})</Text>
            </View>
            
            {groupExercises.map((exercise) => (
              <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{exercise.name}</Text>
                  {exercise.description && (
                    <Text style={[styles.exerciseDescription, { color: theme.colors.textSecondary }]}>{exercise.description}</Text>
                  )}
                </View>
                <View style={styles.exerciseActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.colors.divider }]}
                    onPress={() => handleViewExercise(exercise)}
                  >
                    <Ionicons name="eye" size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.colors.divider }]}
                    onPress={() => handleEditExercise(exercise)}
                  >
                    <Ionicons name="create" size={16} color={theme.colors.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.colors.divider }]}
                    onPress={() => handleDeleteExercise(exercise)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );

  const renderBuilderTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Session Builder</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Byg dine egne træningssessioner</Text>
      </View>

      <TouchableOpacity 
        style={[styles.createSessionButton, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
        onPress={() => setShowCreateSession(true)}
      >
        <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
        <Text style={[styles.createSessionText, { color: theme.colors.primary }]}>Opret Ny Session</Text>
      </TouchableOpacity>

      {trainingSessions && trainingSessions.length > 0 && (
        <View style={styles.existingSessions}>
          <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>Eksisterende Sessioner</Text>
          {trainingSessions.map((session) => (
            <View key={session.id} style={[styles.builderSessionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <View style={styles.builderSessionInfo}>
                <Text style={[styles.builderSessionName, { color: theme.colors.text }]}>{session.name}</Text>
                <Text style={[styles.builderSessionDescription, { color: theme.colors.textSecondary }]}>{session.description}</Text>
              </View>
              <View style={styles.builderSessionActions}>
                <TouchableOpacity 
                  style={[styles.builderActionButton, { backgroundColor: theme.colors.divider }]}
                  onPress={() => handleEditSession(session)}
                >
                  <Ionicons name="create" size={16} color={theme.colors.secondary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.builderActionButton, { backgroundColor: theme.colors.divider }]}
                  onPress={() => handleDeleteSession(session.id)}
                >
                  <Ionicons name="trash" size={16} color={theme.colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
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
              <Text style={styles.headerTitle}>Træning</Text>
              <Text style={styles.headerSubtitle}>Øvelser, sessioner og træninger</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={[styles.tabNavigation, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'sessions' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('sessions')}
        >
          <Ionicons 
            name={activeTab === 'sessions' ? 'calendar' : 'calendar-outline'} 
            size={20} 
            color={activeTab === 'sessions' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'sessions' && { color: theme.colors.primary, fontWeight: '600' }]}>
            Sessioner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'exercises' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('exercises')}
        >
          <Ionicons 
            name={activeTab === 'exercises' ? 'library' : 'library-outline'} 
            size={20} 
            color={activeTab === 'exercises' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'exercises' && { color: theme.colors.primary, fontWeight: '600' }]}>
            Øvelser
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'builder' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('builder')}
        >
          <Ionicons 
            name={activeTab === 'builder' ? 'build' : 'build-outline'} 
            size={20} 
            color={activeTab === 'builder' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'builder' && { color: theme.colors.primary, fontWeight: '600' }]}>
            Opretter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'sessions' && renderSessionsTab()}
        {activeTab === 'exercises' && renderExercisesTab()}
        {activeTab === 'builder' && renderBuilderTab()}
      </ScrollView>

      {/* Exercise Details Modal */}
      <Modal
        visible={showExerciseDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExerciseDetails(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Øvelsesdetaljer</Text>
            
            {selectedExercise && (
              <>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Navn:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedExercise.name}</Text>
                </View>
                
                {selectedExercise.description && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Beskrivelse:</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedExercise.description}</Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Muskelgruppe:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>
                    {muscleGroups.find(mg => mg.id === selectedExercise.muscle_group_id)?.name || 'Ukendt'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Sværhedsgrad:</Text>
                  <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedExercise.difficulty || 'Beginner'}</Text>
                </View>
              </>
            )}
            
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowExerciseDetails(false)}
            >
              <Text style={styles.closeButtonText}>Luk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Exercise Modal */}
      <Modal
        visible={showEditExercise}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditExercise(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Rediger Øvelse</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.card, 
                color: theme.colors.text, 
                borderColor: theme.colors.border 
              }]}
              placeholder="Øvelsens navn"
              placeholderTextColor={theme.colors.textTertiary}
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: theme.colors.card, 
                color: theme.colors.text, 
                borderColor: theme.colors.border 
              }]}
              placeholder="Beskrivelse"
              placeholderTextColor={theme.colors.textTertiary}
              value={editForm.description}
              onChangeText={(text) => setEditForm({ ...editForm, description: text })}
              multiline
              numberOfLines={3}
            />
            
            <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Muskelgruppe</Text>
            <View style={styles.muscleGroupGrid}>
              {muscleGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.muscleGroupOption, 
                    { 
                      backgroundColor: editForm.muscleGroupId === group.id ? group.color + '20' : theme.colors.card,
                      borderColor: group.color,
                      borderWidth: editForm.muscleGroupId === group.id ? 2 : 1
                    }
                  ]}
                  onPress={() => setEditForm({ ...editForm, muscleGroupId: group.id })}
                >
                  <View style={[styles.muscleGroupColor, { backgroundColor: group.color }]} />
                  <Text style={[
                    styles.muscleGroupOptionText, 
                    { 
                      color: editForm.muscleGroupId === group.id ? group.color : theme.colors.text 
                    }
                  ]}>
                    {group.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setShowEditExercise(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveExercise}
              >
                <Text style={styles.confirmButtonText}>Gem</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Session Builder Modal */}
      <Modal
        visible={showCreateSession}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateSession(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.sessionBuilderModal, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Opret Ny Session</Text>
            
            {/* Session Form */}
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.card, 
                color: theme.colors.text, 
                borderColor: theme.colors.border 
              }]}
              placeholder="Session navn (fx. Push Day)"
              placeholderTextColor={theme.colors.textTertiary}
              value={sessionForm.name}
              onChangeText={(text) => setSessionForm({ ...sessionForm, name: text })}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: theme.colors.card, 
                color: theme.colors.text, 
                borderColor: theme.colors.border 
              }]}
              placeholder="Beskrivelse (valgfri)"
              placeholderTextColor={theme.colors.textTertiary}
              value={sessionForm.description}
              onChangeText={(text) => setSessionForm({ ...sessionForm, description: text })}
              multiline
              numberOfLines={2}
            />

            {/* Exercise Selection */}
            <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Vælg Øvelser</Text>
            <ScrollView style={styles.exerciseSelectionContainer} showsVerticalScrollIndicator={false}>
              {muscleGroups.map((muscleGroup) => {
                const groupExercises = exercises.filter(e => e.muscle_group_id === muscleGroup.id);
                if (groupExercises.length === 0) return null;
                
                return (
                  <View key={muscleGroup.id} style={styles.muscleGroupSection}>
                    <View style={styles.muscleGroupHeader}>
                      <View style={[styles.muscleGroupColor, { backgroundColor: muscleGroup.color }]} />
                      <Text style={[styles.muscleGroupName, { color: theme.colors.text }]}>{muscleGroup.name}</Text>
                    </View>
                    
                    {groupExercises.map((exercise) => {
                      const isSelected = selectedExercises.find(e => e.id === exercise.id);
                      return (
                        <TouchableOpacity
                          key={exercise.id}
                          style={[
                            styles.exerciseSelectionItem,
                            { 
                              backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.card,
                              borderColor: isSelected ? theme.colors.primary : theme.colors.border
                            }
                          ]}
                          onPress={() => isSelected ? handleRemoveExerciseFromSession(exercise.id) : handleAddExerciseToSession(exercise)}
                        >
                          <Text style={[styles.exerciseSelectionText, { color: theme.colors.text }]}>{exercise.name}</Text>
                          <Ionicons 
                            name={isSelected ? "checkmark-circle" : "add-circle-outline"} 
                            size={20} 
                            color={isSelected ? theme.colors.primary : theme.colors.textSecondary} 
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>

            {/* Selected Exercises - Reorderable List */}
            {selectedExercises.length > 0 && (
              <>
                <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Session Rækkefølge</Text>
                <View style={styles.selectedExercisesContainer}>
                  <FlatList
                    data={selectedExercises}
                    keyExtractor={(item: Exercise) => item.id}
                    renderItem={({ item, index }: { item: Exercise; index: number }) => (
                      <View style={[styles.selectedExerciseItem, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
                        <View style={styles.exerciseOrderControls}>
                          <TouchableOpacity 
                            onPress={() => handleMoveExerciseUp(index)}
                            disabled={index === 0}
                            style={[styles.orderButton, { opacity: index === 0 ? 0.3 : 1 }]}
                          >
                            <Ionicons name="chevron-up" size={16} color={theme.colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleMoveExerciseDown(index)}
                            disabled={index === selectedExercises.length - 1}
                            style={[styles.orderButton, { opacity: index === selectedExercises.length - 1 ? 0.3 : 1 }]}
                          >
                            <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.selectedExerciseText, { color: theme.colors.text }]}>{item.name}</Text>
                        <TouchableOpacity onPress={() => handleRemoveExerciseFromSession(item.id)}>
                          <Ionicons name="close-circle" size={20} color={theme.colors.accent} />
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>
              </>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.border }]}
                onPress={() => {
                  setShowCreateSession(false);
                  setSelectedExercises([]);
                  setSessionForm({ name: '', description: '' });
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreateSession}
              >
                <Text style={styles.confirmButtonText}>Opret Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Live Training Modal */}
      <Modal
        visible={showLiveTraining}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLiveTraining(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.liveTrainingModal, { backgroundColor: theme.colors.surface }]}>
            {/* Training Header */}
            <View style={styles.trainingHeader}>
              <Text style={[styles.trainingTitle, { color: theme.colors.text }]}>
                {currentWorkout?.name}
              </Text>
              <TouchableOpacity
                style={[styles.endTrainingButton, { backgroundColor: theme.colors.accent }]}
                onPress={handleEndTraining}
              >
                <Ionicons name="stop" size={16} color="#fff" />
                <Text style={styles.endTrainingText}>Afslut</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.liveTrainingScrollView} showsVerticalScrollIndicator={false}>

            {/* Training Stats */}
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
                  {currentExerciseIndex + 1}/{getExercisesForSession(currentWorkout?.session_id || '').length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Øvelse</Text>
              </View>
            </View>

            {/* Rest Timer */}
            {restTimer.isActive && (
              <View style={[styles.restTimerContainer, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
                <View style={styles.restTimerHeader}>
                  <Ionicons name="timer" size={24} color={theme.colors.primary} />
                  <Text style={[styles.restTimerTitle, { color: theme.colors.primary }]}>Hvile</Text>
                  <View style={styles.restTimerButtons}>
                    <TouchableOpacity
                      style={[styles.timerSettingsButton, { backgroundColor: theme.colors.secondary }]}
                      onPress={changeRestTimerDuration}
                    >
                      <Ionicons name="settings" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.stopTimerButton, { backgroundColor: theme.colors.accent }]}
                      onPress={stopRestTimer}
                    >
                      <Ionicons name="stop" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
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

            {/* Current Exercise */}
            {currentWorkout && showLiveTraining && (
              <>
                <View style={styles.currentExerciseSection}>
                  <Text style={[styles.currentExerciseTitle, { color: theme.colors.text }]}>
                    {getExercisesForSession(currentWorkout.session_id)[currentExerciseIndex]?.name || 'Ingen øvelse fundet'}
                  </Text>
                  <Text style={[styles.currentExerciseDescription, { color: theme.colors.textSecondary }]}>
                    {getExercisesForSession(currentWorkout.session_id)[currentExerciseIndex]?.description || ''}
                  </Text>
                  <Text style={[styles.debugText, { color: theme.colors.textTertiary }]}>
                    Debug: {getExercisesForSession(currentWorkout.session_id).length} øvelser, index: {currentExerciseIndex}
                  </Text>
                </View>

                {/* Completed Sets */}
                {completedSets.length > 0 && (
                  <View style={styles.completedSetsSection}>
                    <Text style={[styles.completedSetsTitle, { color: theme.colors.text }]}>Fuldførte sæt:</Text>
                    <View style={styles.completedSetsList}>
                      {completedSets.map((set, index) => (
                        <View key={index} style={[styles.completedSetItem, { backgroundColor: theme.colors.card }]}>
                          <View style={styles.setInfo}>
                            <Text style={[styles.setNumber, { color: theme.colors.primary }]}>Sæt {index + 1}</Text>
                            <Text style={[styles.setDetails, { color: theme.colors.text }]}>
                              {set.reps} reps × {set.weight} kg
                            </Text>
                          </View>
                          <View style={styles.setActions}>
                            <TouchableOpacity
                              style={[styles.editSetButton, { backgroundColor: theme.colors.primary }]}
                              onPress={() => handleEditSet(index)}
                            >
                              <Ionicons name="pencil" size={16} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.deleteSetButton, { backgroundColor: theme.colors.accent }]}
                              onPress={() => handleDeleteSet(index)}
                            >
                              <Ionicons name="trash" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Progressive Overload Suggestions */}
                {progressiveOverloadSuggestions.length > 0 && (
                  <View style={styles.progressiveOverloadSection}>
                    <View style={styles.progressiveOverloadHeader}>
                      <Ionicons name="trending-up" size={20} color={theme.colors.primary} />
                      <Text style={[styles.progressiveOverloadTitle, { color: theme.colors.text }]}>
                        Progressive Overload Forslag
                      </Text>
                    </View>
                    
                    {progressiveOverloadSuggestions.map((suggestion, index) => (
                      <View key={index} style={[styles.suggestionCard, { backgroundColor: theme.colors.card }]}>
                        <View style={styles.suggestionHeader}>
                          <Text style={[styles.suggestionExercise, { color: theme.colors.text }]}>
                            {suggestion.exerciseName}
                          </Text>
                          <View style={[styles.suggestionType, { 
                            backgroundColor: suggestion.type === 'weight' ? '#FF6B35' : 
                                           suggestion.type === 'reps' ? '#4ECDC4' : '#96CEB4'
                          }]}>
                            <Text style={styles.suggestionTypeText}>
                              {suggestion.type === 'weight' ? 'VÆGT' : 
                               suggestion.type === 'reps' ? 'REPS' : 'MAINTAIN'}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.suggestionContent}>
                          <View style={styles.suggestionValues}>
                            <View style={styles.suggestionValue}>
                              <Text style={[styles.suggestionLabel, { color: theme.colors.textSecondary }]}>Nuværende</Text>
                              <Text style={[styles.suggestionValueText, { color: theme.colors.text }]}>
                                {suggestion.currentMaxWeight}kg × {completedSets.length > 0 ? Math.max(...completedSets.map(s => s.reps)) : '?'} reps
                              </Text>
                            </View>
                            <Ionicons name="arrow-forward" size={16} color={theme.colors.textTertiary} />
                            <View style={styles.suggestionValue}>
                              <Text style={[styles.suggestionLabel, { color: theme.colors.textSecondary }]}>Forslået</Text>
                              <Text style={[styles.suggestionValueText, { color: theme.colors.primary }]}>
                                {suggestion.suggestedWeight}kg × {suggestion.suggestedReps} reps
                              </Text>
                            </View>
                          </View>
                          
                          <Text style={[styles.suggestionReason, { color: theme.colors.textSecondary }]}>
                            {suggestion.reason}
                          </Text>
                          
                          <TouchableOpacity
                            style={[styles.applySuggestionButton, { backgroundColor: theme.colors.primary }]}
                            onPress={() => {
                              setCurrentSet({ 
                                reps: suggestion.suggestedReps.toString(), 
                                weight: suggestion.suggestedWeight.toString() 
                              });
                            }}
                          >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={styles.applySuggestionText}>Anvend forslag</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Rest Timer Settings - Only show when timer is not active */}
                {!restTimer.isActive && (
                  <View style={styles.restTimerSettingsSection}>
                    <View style={styles.restTimerSettingsHeader}>
                      <Ionicons name="timer-outline" size={20} color={theme.colors.text} />
                      <Text style={[styles.restTimerSettingsTitle, { color: theme.colors.text }]}>
                        Hviletid: {restTimerDuration} sekunder
                      </Text>
                      <TouchableOpacity
                        style={[styles.changeTimerButton, { backgroundColor: theme.colors.primary }]}
                        onPress={changeRestTimerDuration}
                      >
                        <Ionicons name="create-outline" size={16} color="#fff" />
                        <Text style={styles.changeTimerText}>Ændre</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Add Set Form */}
                <View style={styles.addSetSection}>
                  <Text style={[styles.addSetTitle, { color: theme.colors.text }]}>Tilføj sæt:</Text>
                  <View style={styles.setInputRow}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Reps</Text>
                      <TextInput
                        style={[styles.setInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                        value={currentSet.reps}
                        onChangeText={(text) => setCurrentSet({ ...currentSet, reps: text })}
                        placeholder="10"
                        keyboardType="numeric"
                        placeholderTextColor={theme.colors.textTertiary}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Vægt (kg)</Text>
                      <TextInput
                        style={[styles.setInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                        value={currentSet.weight}
                        onChangeText={(text) => setCurrentSet({ ...currentSet, weight: text })}
                        placeholder="50"
                        keyboardType="numeric"
                        placeholderTextColor={theme.colors.textTertiary}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.addSetButton, { backgroundColor: theme.colors.primary }]}
                      onPress={handleAddSet}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            </ScrollView>

            {/* Navigation - Fixed at bottom */}
            {currentWorkout && showLiveTraining && (
              <View style={styles.exerciseNavigation}>
                <TouchableOpacity
                  style={[styles.navButton, { backgroundColor: theme.colors.divider }]}
                  onPress={handlePreviousExercise}
                  disabled={currentExerciseIndex === 0}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                  <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Forrige</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.navButton, { backgroundColor: theme.colors.divider }]}
                  onPress={handleNextExercise}
                  disabled={currentExerciseIndex >= getExercisesForSession(currentWorkout.session_id).length - 1}
                >
                  <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Næste</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Timer Modal */}
      <Modal
        visible={showCustomTimerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomTimerModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.customTimerModal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Custom Hviletid</Text>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowCustomTimerModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.customTimerContent}>
              <Text style={[styles.customTimerLabel, { color: theme.colors.text }]}>
                Indtast hviletid i sekunder:
              </Text>
              <Text style={[styles.customTimerSubLabel, { color: theme.colors.textSecondary }]}>
                (30-300 sekunder)
              </Text>
              <TextInput
                style={[styles.customTimerInput, { 
                  backgroundColor: theme.colors.card, 
                  color: theme.colors.text, 
                  borderColor: theme.colors.border 
                }]}
                value={customTimerInput}
                onChangeText={setCustomTimerInput}
                placeholder={`Nuværende: ${restTimerDuration}s`}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textTertiary}
                selectTextOnFocus={true}
              />
              
              <View style={styles.customTimerButtons}>
                <TouchableOpacity
                  style={[styles.customTimerButton, { backgroundColor: theme.colors.divider }]}
                  onPress={() => setShowCustomTimerModal(false)}
                >
                  <Text style={[styles.customTimerButtonText, { color: theme.colors.text }]}>Annuller</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.customTimerButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleCustomTimerSubmit}
                >
                  <Text style={[styles.customTimerButtonText, { color: '#fff' }]}>Gem</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Set Modal */}
      <Modal
        visible={editingSetIndex !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelEditSet}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.editSetModal, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Rediger Sæt</Text>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleCancelEditSet}
              >
                <Ionicons name="close" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.editSetContent}>
              <Text style={[styles.editSetLabel, { color: theme.colors.text }]}>
                Sæt {editingSetIndex !== null ? editingSetIndex + 1 : ''}
              </Text>
              
              <View style={styles.editSetInputs}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Reps</Text>
                  <TextInput
                    style={[styles.setInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={editSetData.reps}
                    onChangeText={(text) => setEditSetData({ ...editSetData, reps: text })}
                    placeholder="10"
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Vægt (kg)</Text>
                  <TextInput
                    style={[styles.setInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={editSetData.weight}
                    onChangeText={(text) => setEditSetData({ ...editSetData, weight: text })}
                    placeholder="50"
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textTertiary}
                  />
                </View>
              </View>
              
              <View style={styles.editSetButtons}>
                <TouchableOpacity
                  style={[styles.editSetButton, { backgroundColor: theme.colors.divider }]}
                  onPress={handleCancelEditSet}
                >
                  <Text style={[styles.editSetButtonText, { color: theme.colors.text }]}>Annuller</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.editSetButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSaveEditSet}
                >
                  <Text style={[styles.editSetButtonText, { color: '#fff' }]}>Gem</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Session Details Modal */}
      <Modal
        visible={showSessionDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSessionDetails(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.sessionDetailsModal, { backgroundColor: theme.colors.surface }]}>
            {/* Header with back button */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowSessionDetails(false)}
              >
                <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Session Detaljer</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {selectedSession && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Navn:</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedSession.name}</Text>
                  </View>
                  
                  {selectedSession.description && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Beskrivelse:</Text>
                      <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>{selectedSession.description}</Text>
                    </View>
                  )}
                  
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Primær muskelgruppe:</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>
                      {muscleGroups.find(mg => mg.id === selectedSession.muscle_group_id)?.name || 'Ukendt'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Antal øvelser:</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>
                      {getExercisesForSession(selectedSession.id).length}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.colors.text }]}>Oprettet:</Text>
                    <Text style={[styles.detailValue, { color: theme.colors.textSecondary }]}>
                      {new Date(selectedSession.created_at).toLocaleDateString('da-DK')}
                    </Text>
                  </View>

                  {/* Exercise List */}
                  <View style={styles.exerciseListSection}>
                    <Text style={[styles.exerciseListTitle, { color: theme.colors.text }]}>Øvelser i sessionen:</Text>
                    {getExercisesForSession(selectedSession.id).map((exercise, index) => (
                      <View key={exercise.id} style={[styles.exerciseListItem, { backgroundColor: theme.colors.card }]}>
                        <Text style={[styles.exerciseListNumber, { color: theme.colors.primary }]}>{index + 1}.</Text>
                        <Text style={[styles.exerciseListName, { color: theme.colors.text }]}>{exercise.name}</Text>
                        <View style={[styles.muscleGroupColor, { backgroundColor: getMuscleGroupColor(exercise.muscle_group_id) }]} />
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Session Modal */}
      <Modal
        visible={showEditSession}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditSession(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Rediger Session</Text>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.card, 
                  color: theme.colors.text, 
                  borderColor: theme.colors.border 
                }]}
                placeholder="Session navn"
                placeholderTextColor={theme.colors.textTertiary}
                value={editSessionForm.name}
                onChangeText={(text) => setEditSessionForm({ ...editSessionForm, name: text })}
              />
              
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.colors.card, 
                  color: theme.colors.text, 
                  borderColor: theme.colors.border 
                }]}
                placeholder="Beskrivelse"
                placeholderTextColor={theme.colors.textTertiary}
                value={editSessionForm.description}
                onChangeText={(text) => setEditSessionForm({ ...editSessionForm, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Muskelgruppe:</Text>
              <View style={styles.muscleGroupGrid}>
                {muscleGroups.map((muscleGroup) => (
                  <TouchableOpacity
                    key={muscleGroup.id}
                    style={[
                      styles.muscleGroupOption,
                      editSessionForm.muscleGroupId === muscleGroup.id && styles.selectedMuscleGroup
                    ]}
                    onPress={() => setEditSessionForm({ ...editSessionForm, muscleGroupId: muscleGroup.id })}
                  >
                    <View style={[styles.muscleGroupColor, { backgroundColor: muscleGroup.color }]} />
                    <Text style={[
                      styles.muscleGroupOptionText,
                      { color: editSessionForm.muscleGroupId === muscleGroup.id ? '#FFFFFF' : theme.colors.text }
                    ]}>
                      {muscleGroup.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Vælg Øvelser:</Text>
              <View style={styles.exerciseSelectionContainer}>
                {exercises.filter(ex => ex.muscle_group_id === editSessionForm.muscleGroupId).map((exercise) => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[
                      styles.exerciseSelectionItem,
                      editSessionForm.selectedExercises.find(ex => ex.id === exercise.id) && styles.selectedExercise
                    ]}
                    onPress={() => toggleExerciseSelection(exercise)}
                  >
                    <Text style={[
                      styles.exerciseSelectionText,
                      { color: editSessionForm.selectedExercises.find(ex => ex.id === exercise.id) ? '#FFFFFF' : theme.colors.text }
                    ]}>
                      {exercise.name}
                    </Text>
                    {editSessionForm.selectedExercises.find(ex => ex.id === exercise.id) && (
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setShowEditSession(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveSession}
              >
                <Text style={styles.confirmButtonText}>Gem</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Exercise Modal */}
      <Modal
        visible={showCreateExercise}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateExercise(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Opret Ny Øvelse</Text>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Øvelses navn"
                placeholderTextColor={theme.colors.textSecondary}
                value={createExerciseForm.name}
                onChangeText={(text) => setCreateExerciseForm({ ...createExerciseForm, name: text })}
              />
              
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: theme.colors.background, 
                  color: theme.colors.text,
                  borderColor: theme.colors.border 
                }]}
                placeholder="Beskrivelse (valgfri)"
                placeholderTextColor={theme.colors.textSecondary}
                value={createExerciseForm.description}
                onChangeText={(text) => setCreateExerciseForm({ ...createExerciseForm, description: text })}
                multiline
                numberOfLines={3}
              />
              
              <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Muskelgruppe:</Text>
              <View style={styles.muscleGroupGrid}>
                {muscleGroups.map((muscleGroup) => (
                  <TouchableOpacity
                    key={muscleGroup.id}
                    style={[
                      styles.muscleGroupOption,
                      createExerciseForm.muscle_group_id === muscleGroup.id && styles.selectedMuscleGroup
                    ]}
                    onPress={() => setCreateExerciseForm({ ...createExerciseForm, muscle_group_id: muscleGroup.id })}
                  >
                    <View style={[styles.muscleGroupColor, { backgroundColor: muscleGroup.color }]} />
                    <Text style={[
                      styles.muscleGroupOptionText,
                      { color: createExerciseForm.muscle_group_id === muscleGroup.id ? '#FFFFFF' : theme.colors.text }
                    ]}>
                      {muscleGroup.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setShowCreateExercise(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreateExercise}
              >
                <Text style={styles.confirmButtonText}>Opret</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Workout Modal */}
      <Modal
        visible={showManualWorkout}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowManualWorkout(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.liveTrainingModal, { backgroundColor: theme.colors.surface }]}>
            {/* Training Header */}
            <View style={styles.trainingHeader}>
              <Text style={[styles.trainingTitle, { color: theme.colors.text }]}>
                Manuel Træning
              </Text>
              <TouchableOpacity
                style={styles.endTrainingButton}
                onPress={handleCloseManualWorkout}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {manualWorkoutStep === 'setup' ? (
              /* Setup Phase - Simple Session Selection */
              <ScrollView style={styles.trainingContent}>
                <View style={styles.setupContainer}>
                  <Text style={[styles.setupTitle, { color: theme.colors.text }]}>Vælg Session</Text>
                  
                  {trainingSessions && trainingSessions.length > 0 ? (
                    <View style={styles.sessionList}>
                      {trainingSessions.map((session) => (
                        <TouchableOpacity
                          key={session.id}
                          style={[
                            styles.sessionOptionCard,
                            { backgroundColor: theme.colors.card },
                            manualWorkoutData.sessionId === session.id && { 
                              backgroundColor: theme.colors.primary,
                              borderColor: theme.colors.primary
                            }
                          ]}
                          onPress={() => setManualWorkoutData({ 
                            ...manualWorkoutData, 
                            sessionId: session.id, 
                            sessionName: session.name 
                          })}
                        >
                          <Text style={[
                            styles.sessionOptionText,
                            { color: theme.colors.text },
                            manualWorkoutData.sessionId === session.id && { color: '#fff', fontWeight: 'bold' }
                          ]}>
                            {session.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.noSessionsText, { color: theme.colors.textSecondary }]}>
                      Ingen sessioner tilgængelige. Opret en session i "Opretter" tab.
                    </Text>
                  )}

                  {/* Date and Duration */}
                  <View style={styles.setupInputs}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Vælg Dato:</Text>
                      <TouchableOpacity
                        style={[styles.datePickerButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                        <Text style={[styles.datePickerText, { color: theme.colors.text }]}>
                          {new Date(manualWorkoutData.date).toLocaleDateString('da-DK', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Varighed (min):</Text>
                      <TextInput
                        style={[styles.setupInput, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
                        value={manualWorkoutData.duration}
                        onChangeText={(text) => setManualWorkoutData({ ...manualWorkoutData, duration: text })}
                        placeholder="60"
                        placeholderTextColor={theme.colors.textTertiary}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.startTrainingButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleStartManualWorkout}
                  >
                    <Text style={styles.startTrainingButtonText}>Start Manuel Træning</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* Training Phase - Exact copy of live training but without timer */
              <ScrollView style={styles.trainingContent}>
                {/* Current Exercise Info */}
                <View style={styles.currentExerciseSection}>
                  <Text style={[styles.exerciseCounter, { color: theme.colors.primary }]}>
                    Øvelse {manualCurrentExerciseIndex + 1} af {manualWorkoutData.exercises.length}
                  </Text>
                  <Text style={[styles.currentExerciseName, { color: theme.colors.text }]}>
                    {manualWorkoutData.exercises[manualCurrentExerciseIndex]?.name}
                  </Text>
                </View>

                {/* Completed Sets */}
                <View style={styles.completedSetsSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Fuldførte Sæt ({manualCompletedSets.length})
                  </Text>
                  {manualCompletedSets.map((set, index) => (
                    <View key={index} style={[styles.completedSet, { backgroundColor: theme.colors.card }]}>
                      <Text style={[styles.setNumber, { color: theme.colors.textSecondary }]}>#{index + 1}</Text>
                      <Text style={[styles.setData, { color: theme.colors.text }]}>
                        {set.weight} kg × {set.reps} reps
                      </Text>
                    </View>
                  ))}
                  {manualCompletedSets.length === 0 && (
                    <Text style={[styles.noSetsText, { color: theme.colors.textTertiary }]}>
                      Ingen sæt endnu
                    </Text>
                  )}
                </View>

                {/* Add New Set */}
                <View style={styles.addSetSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tilføj Nyt Sæt</Text>
                  <View style={styles.setInputsRow}>
                    <View style={styles.setInputGroup}>
                      <Text style={[styles.setInputLabel, { color: theme.colors.textSecondary }]}>Vægt (kg)</Text>
                      <TextInput
                        style={[styles.setInputField, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                        value={manualCurrentSet.weight}
                        onChangeText={(text) => setManualCurrentSet({ ...manualCurrentSet, weight: text })}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor={theme.colors.textTertiary}
                      />
                    </View>
                    <View style={styles.setInputGroup}>
                      <Text style={[styles.setInputLabel, { color: theme.colors.textSecondary }]}>Reps</Text>
                      <TextInput
                        style={[styles.setInputField, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                        value={manualCurrentSet.reps}
                        onChangeText={(text) => setManualCurrentSet({ ...manualCurrentSet, reps: text })}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor={theme.colors.textTertiary}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.addSetButton, { backgroundColor: theme.colors.primary }]}
                      onPress={handleAddManualSet}
                    >
                      <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Exercise Navigation */}
                <View style={styles.exerciseNavigation}>
                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      { backgroundColor: theme.colors.border },
                      manualCurrentExerciseIndex === 0 && { opacity: 0.5 }
                    ]}
                    onPress={handlePrevManualExercise}
                    disabled={manualCurrentExerciseIndex === 0}
                  >
                    <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
                    <Text style={[styles.navButtonText, { color: theme.colors.text }]}>Forrige</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      { backgroundColor: theme.colors.primary },
                      manualCurrentExerciseIndex === manualWorkoutData.exercises.length - 1 && { opacity: 0.5 }
                    ]}
                    onPress={handleNextManualExercise}
                    disabled={manualCurrentExerciseIndex === manualWorkoutData.exercises.length - 1}
                  >
                    <Text style={[styles.navButtonText, { color: '#fff' }]}>Næste</Text>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Complete Workout Button */}
                <TouchableOpacity
                  style={[styles.completeWorkoutButton, { backgroundColor: theme.colors.success }]}
                  onPress={handleCompleteManualWorkout}
                >
                  <Text style={styles.completeWorkoutButtonText}>Afslut Manuel Træning</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.datePickerModal, { backgroundColor: theme.colors.surface }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginBottom: 20 }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Vælg Dato</Text>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Quick Date Options */}
            <View style={styles.quickDateOptions}>
              <TouchableOpacity
                style={[styles.quickDateButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setManualWorkoutData({ ...manualWorkoutData, date: new Date().toISOString().split('T')[0] });
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.quickDateButtonText}>I dag</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateButton, { backgroundColor: theme.colors.secondary }]}
                onPress={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setManualWorkoutData({ ...manualWorkoutData, date: yesterday.toISOString().split('T')[0] });
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.quickDateButtonText}>I går</Text>
              </TouchableOpacity>
            </View>

            {/* Calendar Component */}
            <Calendar
              selectedDate={manualWorkoutData.date}
              onDateSelect={(date) => {
                setManualWorkoutData({ ...manualWorkoutData, date });
                setShowDatePicker(false);
              }}
              theme={theme}
            />

            {/* Manual Date Input */}
            <View style={styles.manualDateInput}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Eller indtast dato:</Text>
              <TextInput
                style={[styles.setupInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={manualWorkoutData.date}
                onChangeText={(text) => setManualWorkoutData({ ...manualWorkoutData, date: text })}
                placeholder="2024-01-15"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.colors.primary, marginTop: 10 }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.confirmButtonText}>Luk</Text>
            </TouchableOpacity>
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
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: '#f0f8ff',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  muscleGroupIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#666',
  },
  exercisePreview: {
    marginBottom: 15,
  },
  exercisePreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  exerciseList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 12,
    color: '#666',
  },
  exerciseSeparator: {
    fontSize: 12,
    color: '#ccc',
    marginHorizontal: 6,
  },
  moreExercises: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 6,
  },
  startButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  muscleGroupSection: {
    marginBottom: 20,
  },
  muscleGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  muscleGroupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  exerciseCount: {
    fontSize: 14,
    color: '#666',
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  createSessionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createSessionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  existingSessions: {
    marginTop: 20,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  builderSessionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  builderSessionInfo: {
    flex: 1,
  },
  builderSessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  builderSessionDescription: {
    fontSize: 12,
    color: '#666',
  },
  builderSessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  builderActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    flex: 2,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  muscleGroupGrid: {
    flexDirection: 'column',
    marginBottom: 20,
    gap: 8,
  },
  muscleGroupOption: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  muscleGroupColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  muscleGroupOptionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 5,
  },
  confirmButton: {
    flex: 1,
    marginLeft: 5,
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sessionBuilderModal: {
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  exerciseSelectionContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  exerciseSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  exerciseSelectionText: {
    fontSize: 14,
    flex: 1,
  },
  selectedExercisesContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  selectedExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedExerciseText: {
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
  },
  exerciseOrderControls: {
    flexDirection: 'column',
    marginRight: 8,
  },
  orderButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginVertical: 1,
  },
  // Live Training Styles
  liveTrainingModal: {
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    flex: 1,
    flexDirection: 'column',
  },
  trainingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  trainingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  endTrainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  endTrainingText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  trainingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  currentExerciseSection: {
    marginBottom: 20,
  },
  currentExerciseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  currentExerciseDescription: {
    fontSize: 14,
  },
  completedSetsSection: {
    marginBottom: 20,
  },
  completedSetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  completedSetsList: {
    flexDirection: 'column',
  },
  completedSetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  setInfo: {
    flex: 1,
  },
  setActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editSetButton: {
    padding: 8,
    borderRadius: 6,
  },
  deleteSetButton: {
    padding: 8,
    borderRadius: 6,
  },
  // Edit Set Modal
  editSetModal: {
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  editSetContent: {
    paddingVertical: 20,
  },
  editSetLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  editSetInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  editSetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  editSetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  setNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  setDetails: {
    fontSize: 14,
    fontWeight: '500',
  },
  addSetSection: {
    marginBottom: 20,
  },
  addSetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  setInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  setInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  addSetButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  // Session management styles
  sessionActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  sessionActionButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  exerciseListSection: {
    marginTop: 20,
  },
  exerciseListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  exerciseListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  exerciseListNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
    minWidth: 20,
  },
  exerciseListName: {
    fontSize: 14,
    flex: 1,
  },
  // Session details modal styles
  sessionDetailsModal: {
    borderRadius: 12,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  debugText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'column',
    marginBottom: 16,
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedMuscleGroup: {
    backgroundColor: '#007AFF',
  },
  exerciseSelectionContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  exerciseSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedExercise: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  exerciseSelectionText: {
    fontSize: 14,
    flex: 1,
  },
  // Progressive Overload Styles
  progressiveOverloadSection: {
    marginBottom: 20,
  },
  progressiveOverloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressiveOverloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  suggestionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestionExercise: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  suggestionType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suggestionTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  suggestionContent: {
    gap: 12,
  },
  suggestionValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionValue: {
    alignItems: 'center',
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  suggestionValueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionReason: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  applySuggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  applySuggestionText: {
    color: '#fff',
    fontSize: 14,
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
  // Live Training ScrollView
  liveTrainingScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Rest Timer Settings
  restTimerSettingsSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  restTimerSettingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restTimerSettingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  changeTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeTimerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Rest Timer Buttons
  restTimerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timerSettingsButton: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Custom Timer Modal
  customTimerModal: {
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  customTimerContent: {
    paddingVertical: 20,
  },
  customTimerLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  customTimerSubLabel: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  customTimerInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  customTimerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  customTimerButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  customTimerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Manual Workout Styles
  manualWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  manualWorkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  manualWorkoutModal: {
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  sessionSelectorContainer: {
    marginBottom: 20,
  },
  sessionSelector: {
    maxHeight: 80,
  },
  sessionSelectorContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  sessionSelectorItem: {
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 120,
    maxWidth: 180,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  sessionSelectorText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
    lineHeight: 16,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  noSessionsContainer: {
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  noSessionsText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  noSessionsSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  // Manual Training Setup Styles
  setupContainer: {
    padding: 20,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  sessionList: {
    marginBottom: 30,
  },
  sessionOptionCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sessionOptionText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  setupInputs: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 15,
  },
  setupInput: {
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  startTrainingButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  startTrainingButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  completeWorkoutButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  completeWorkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Date Picker Styles
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  datePickerText: {
    fontSize: 16,
    flex: 1,
  },
  datePickerModal: {
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  quickDateOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  quickDateButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickDateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  weekCalendar: {
    marginBottom: 25,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  manualDateInput: {
    marginBottom: 15,
  },
});
