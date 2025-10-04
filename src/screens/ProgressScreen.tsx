import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect, useNavigation, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../types';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgressStore } from '../stores/progressStore';
import { useAchievementsStore } from '../stores/achievementsStore';
import { useTheme } from '../contexts/ThemeContext';

type ProgressScreenNavigationProp = BottomTabNavigationProp<RootTabParamList, 'Progress'>;
type ProgressScreenRouteProp = RouteProp<RootTabParamList, 'Progress'>;

export default function ProgressScreen({ route }: { route?: ProgressScreenRouteProp }) {
  const navigation = useNavigation<ProgressScreenNavigationProp>();
  const { exercises, trainingSessions, workouts, muscleGroups = [] } = useExerciseStore();
  const { progressData, getRecentWorkouts } = useProgressStore();
  const { achievements, userStats, loadAchievements, loadUserStats, checkAchievements, getAchievementsByCategory, getUnlockedAchievements } = useAchievementsStore();
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'achievements' | 'calendar' | 'progression'>(
    route?.params?.initialTab || 'overview'
  );
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heatMapData, setHeatMapData] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<any[]>([]);
  const [showWorkoutDetailsModal, setShowWorkoutDetailsModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [editingWorkout, setEditingWorkout] = useState(false);
  const [workoutSets, setWorkoutSets] = useState<any[]>([]);
  const [progressionTab, setProgressionTab] = useState<'general' | 'sessions' | 'musclegroups' | 'exercises'>('general');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [progressionData, setProgressionData] = useState<any>({});
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load progress data first
      const { loadProgressData } = useProgressStore.getState();
      await loadProgressData();
      
      const workouts = await getRecentWorkouts(10);
      setRecentWorkouts(workouts);
      
      // Calculate heat map data
      calculateHeatMapData();
      
      // Calculate progression data
      await calculateProgressionData();
      
      // Load achievements and user stats
      await loadAchievements();
      await loadUserStats();
      await checkAchievements();
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkoutPress = async (workout: any) => {
    try {
      setSelectedWorkout(workout);
      
      // Load workout details including sets
      const { getDatabase } = await import('../database');
      const db = getDatabase();
      
      const sets = await db.getAllAsync(`
        SELECT s.*, e.name as exercise_name, we.exercise_id
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN exercises e ON we.exercise_id = e.id
        WHERE we.workout_id = ?
        ORDER BY we.order_index, s.order_index
      `, [workout.id]);
      
      setWorkoutSets(sets);
      setShowWorkoutDetailsModal(true);
    } catch (error) {
      console.error('Error loading workout details:', error);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!selectedWorkout) return;
    
    Alert.alert(
      'Slet Træning',
      `Er du sikker på at du vil slette træningen "${selectedWorkout.name}"? Denne handling kan ikke fortrydes.`,
      [
        { text: 'Annuller', style: 'cancel' },
        { 
          text: 'Slet', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteWorkout } = useExerciseStore.getState();
              await deleteWorkout(selectedWorkout.id);
              
              // Refresh data
              await loadData();
              
              // Also reload exercises store to ensure workouts are updated
              const { loadWorkouts } = useExerciseStore.getState();
              await loadWorkouts();
              
              // Close modal and update selected date workouts
              setShowWorkoutDetailsModal(false);
              if (selectedDate) {
                const updatedWorkouts = workouts.filter(w => w.date === selectedDate && w.id !== selectedWorkout.id);
                setSelectedDateWorkouts(updatedWorkouts);
              }
              
              // Recalculate heat map data after deletion
              calculateHeatMapData();
              
              Alert.alert('Succes', 'Træningen blev slettet');
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Fejl', 'Kunne ikke slette træningen');
            }
          }
        }
      ]
    );
  };

  const handleUpdateSet = async (setId: string, newReps: number, newWeight: number) => {
    try {
      const { getDatabase } = await import('../database');
      const db = getDatabase();
      
      await db.runAsync(`
        UPDATE sets SET reps = ?, weight = ? WHERE id = ?
      `, [newReps, newWeight, setId]);
      
      // Update local state
      setWorkoutSets(prevSets => 
        prevSets.map(set => 
          set.id === setId 
            ? { ...set, reps: newReps, weight: newWeight }
            : set
        )
      );
      
      // Refresh data to update calendar
      await loadData();
      
      Alert.alert('Succes', 'Sæt opdateret!');
    } catch (error) {
      console.error('Error updating set:', error);
      Alert.alert('Fejl', 'Kunne ikke opdatere sæt');
    }
  };

  const calculateHeatMapData = () => {
    const heatMap: Record<string, any> = {};
    
    // Group workouts by date
    const workoutsByDate: Record<string, any[]> = {};
    workouts.forEach(workout => {
      const date = workout.date;
      if (!workoutsByDate[date]) {
        workoutsByDate[date] = [];
      }
      workoutsByDate[date].push(workout);
    });
    
    // Calculate intensity for each date
    Object.keys(workoutsByDate).forEach(date => {
      const dayWorkouts = workoutsByDate[date];
      let totalDuration = 0;
      let totalExercises = 0;
      let totalSets = 0;
      
      dayWorkouts.forEach(workout => {
        totalDuration += workout.duration || 0;
        totalExercises += workout.exercise_count || 0;
        totalSets += workout.total_sets || 0;
      });
      
      // Debug logging for intensity calculation
      console.log(`Calendar Intensity Debug for ${date}:`, {
        totalDuration,
        totalExercises, 
        totalSets,
        dayWorkouts: dayWorkouts.length
      });
      
      // Calculate intensity based on efficiency and volume
      let intensity = 0;
      
      // Factor 1: Exercise density (exercises per hour)
      let densityScore = 0;
      if (totalDuration > 0) {
        const exercisesPerHour = (totalExercises / totalDuration) * 60;
        if (exercisesPerHour >= 12) densityScore = 3; // 12+ øvelser/time = meget intensiv
        else if (exercisesPerHour >= 8) densityScore = 2; // 8+ øvelser/time = intensiv  
        else if (exercisesPerHour >= 5) densityScore = 1; // 5+ øvelser/time = moderat
      }
      
      // Factor 2: Set density (sets per hour)
      let setDensityScore = 0;
      if (totalDuration > 0) {
        const setsPerHour = (totalSets / totalDuration) * 60;
        if (setsPerHour >= 30) setDensityScore = 3; // 30+ sæt/time = meget intensiv
        else if (setsPerHour >= 20) setDensityScore = 2; // 20+ sæt/time = intensiv
        else if (setsPerHour >= 12) setDensityScore = 1; // 12+ sæt/time = moderat
      }
      
      // Factor 3: Total volume bonus (reward higher absolute volume)
      let volumeScore = 0;
      if (totalSets >= 20) volumeScore = 3;
      else if (totalSets >= 12) volumeScore = 2;
      else if (totalSets >= 6) volumeScore = 1;
      
      // Calculate weighted intensity - prioritize efficiency over duration
      const weightedScore = (densityScore * 0.4) + (setDensityScore * 0.4) + (volumeScore * 0.2);
      
      if (weightedScore >= 2.5) intensity = 4; // Meget høj (Red)
      else if (weightedScore >= 1.8) intensity = 3; // Høj (Orange)
      else if (weightedScore >= 1.0) intensity = 2; // Medium (Yellow)
      else if (weightedScore > 0) intensity = 1; // Lav (Light green)
      else intensity = 0; // Ingen aktivitet (Gray)
      
      console.log(`  → Density Scores: exercise=${densityScore} (${totalDuration > 0 ? ((totalExercises / totalDuration) * 60).toFixed(1) : 0}/h), sets=${setDensityScore} (${totalDuration > 0 ? ((totalSets / totalDuration) * 60).toFixed(1) : 0}/h), volume=${volumeScore}`);
      console.log(`  → WeightedScore: ${weightedScore.toFixed(2)}, Intensity: ${intensity}, Color: ${getIntensityColor(intensity)}`);
      
      heatMap[date] = {
        marked: true,
        dotColor: getIntensityColor(intensity),
        customStyles: {
          container: {
            backgroundColor: getIntensityColor(intensity),
            borderRadius: 4,
          },
          text: {
            color: intensity > 2 ? '#fff' : '#000',
            fontWeight: 'bold',
          }
        }
      };
    });
    
    setHeatMapData(heatMap);
  };

  // Calculate progression data for sessions, muscle groups, and exercises
  const calculateProgressionData = async () => {
    try {
      console.log('Starting progression data calculation...');
      const db = (await import('../database')).getDatabase();
      
      // Get all sets with workout and exercise data
      const setsData = await db.getAllAsync(`
        SELECT 
          s.id, s.reps, s.weight, s.order_index,
          w.date, w.session_id, w.name as workout_name,
          e.name as exercise_name, e.muscle_group_id,
          ts.name as session_name
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        JOIN exercises e ON we.exercise_id = e.id
        LEFT JOIN training_sessions ts ON w.session_id = ts.id
        WHERE w.completed = 1
        ORDER BY w.date ASC, s.order_index ASC
      `);

      console.log('Found sets data:', setsData?.length || 0, 'records');

      if (!setsData || setsData.length === 0) {
        console.log('No sets data found, setting empty progression data');
        setProgressionData({
          general: [],
          sessions: {},
          muscleGroups: {},
          exercises: {}
        });
        return;
      }

      console.log('Processing progression data...');
      // Process data for different progression types
      const generalProgression = calculateGeneralProgression(setsData);
      const sessionProgression = calculateSessionProgression(setsData);
      const muscleGroupProgression = calculateMuscleGroupProgression(setsData);
      const exerciseProgression = calculateExerciseProgression(setsData);

      console.log('Progression data calculated successfully');
      setProgressionData({
        general: generalProgression,
        sessions: sessionProgression,
        muscleGroups: muscleGroupProgression,
        exercises: exerciseProgression
      });
    } catch (error) {
      console.error('Error calculating progression data:', error);
      // Set empty progression data on error
      setProgressionData({
        general: [],
        sessions: {},
        muscleGroups: {},
        exercises: {}
      });
    }
  };

  const calculateGeneralProgression = (setsData: any[]) => {
    const generalData: Record<string, any> = {};
    
    setsData.forEach(set => {
      const date = set.date;
      
      if (!generalData[date]) {
        generalData[date] = {
          date,
          sets: [],
          totalVolume: 0,
          maxWeight: 0,
          totalReps: 0,
          uniqueExercises: new Set(),
          uniqueMuscleGroups: new Set(),
          avgWeight: 0
        };
      }
      
      const volume = set.reps * set.weight;
      generalData[date].sets.push(set);
      generalData[date].totalVolume += volume;
      generalData[date].maxWeight = Math.max(generalData[date].maxWeight, set.weight);
      generalData[date].totalReps += set.reps;
      generalData[date].uniqueExercises.add(set.exercise_name);
      generalData[date].uniqueMuscleGroups.add(set.muscle_group_id);
    });
    
    // Convert to progression array
    const progression = Object.keys(generalData)
      .sort()
      .map(date => {
        const data = generalData[date];
        const avgWeight = data.sets.length > 0 
          ? data.sets.reduce((sum: number, set: any) => sum + set.weight, 0) / data.sets.length
          : 0;
        
        return {
          date,
          totalVolume: data.totalVolume,
          maxWeight: data.maxWeight,
          totalReps: data.totalReps,
          setCount: data.sets.length,
          exerciseCount: data.uniqueExercises.size,
          muscleGroupCount: data.uniqueMuscleGroups.size,
          avgWeight: Math.round(avgWeight * 10) / 10
        };
      });
    
    return progression;
  };

  const calculateSessionProgression = (setsData: any[]) => {
    const sessionData: Record<string, any> = {};
    
    setsData.forEach(set => {
      const sessionId = set.session_id;
      const sessionName = set.session_name || 'Ukendt Session';
      const date = set.date;
      
      if (!sessionData[sessionId]) {
        sessionData[sessionId] = {
          id: sessionId,
          name: sessionName,
          workouts: {},
          progression: []
        };
      }
      
      // Group by workout date
      if (!sessionData[sessionId].workouts[date]) {
        sessionData[sessionId].workouts[date] = {
          date,
          sets: [],
          totalVolume: 0,
          maxWeight: 0,
          totalReps: 0
        };
      }
      
      const volume = set.reps * set.weight;
      sessionData[sessionId].workouts[date].sets.push(set);
      sessionData[sessionId].workouts[date].totalVolume += volume;
      sessionData[sessionId].workouts[date].maxWeight = Math.max(
        sessionData[sessionId].workouts[date].maxWeight, 
        set.weight
      );
      sessionData[sessionId].workouts[date].totalReps += set.reps;
    });
    
    // Calculate progression for each session
    Object.keys(sessionData).forEach(sessionId => {
      const session = sessionData[sessionId];
      const workoutDates = Object.keys(session.workouts).sort();
      
      session.progression = workoutDates.map(date => {
        const workout = session.workouts[date];
        return {
          date,
          totalVolume: workout.totalVolume,
          maxWeight: workout.maxWeight,
          totalReps: workout.totalReps,
          setCount: workout.sets.length
        };
      });
    });
    
    return sessionData;
  };

  const calculateMuscleGroupProgression = (setsData: any[]) => {
    const muscleGroupData: Record<string, any> = {};
    
    setsData.forEach(set => {
      const muscleGroupId = set.muscle_group_id;
      const date = set.date;
      
      if (!muscleGroupData[muscleGroupId]) {
        muscleGroupData[muscleGroupId] = {
          id: muscleGroupId,
          workouts: {},
          progression: []
        };
      }
      
      // Group by workout date
      if (!muscleGroupData[muscleGroupId].workouts[date]) {
        muscleGroupData[muscleGroupId].workouts[date] = {
          date,
          sets: [],
          totalVolume: 0,
          maxWeight: 0,
          totalReps: 0,
          exercises: new Set()
        };
      }
      
      const volume = set.reps * set.weight;
      muscleGroupData[muscleGroupId].workouts[date].sets.push(set);
      muscleGroupData[muscleGroupId].workouts[date].totalVolume += volume;
      muscleGroupData[muscleGroupId].workouts[date].maxWeight = Math.max(
        muscleGroupData[muscleGroupId].workouts[date].maxWeight, 
        set.weight
      );
      muscleGroupData[muscleGroupId].workouts[date].totalReps += set.reps;
      muscleGroupData[muscleGroupId].workouts[date].exercises.add(set.exercise_name);
    });
    
    // Calculate progression for each muscle group
    Object.keys(muscleGroupData).forEach(muscleGroupId => {
      const muscleGroup = muscleGroupData[muscleGroupId];
      const workoutDates = Object.keys(muscleGroup.workouts).sort();
      
      muscleGroup.progression = workoutDates.map(date => {
        const workout = muscleGroup.workouts[date];
        return {
          date,
          totalVolume: workout.totalVolume,
          maxWeight: workout.maxWeight,
          totalReps: workout.totalReps,
          setCount: workout.sets.length,
          exerciseCount: workout.exercises.size
        };
      });
    });
    
    return muscleGroupData;
  };

  const calculateExerciseProgression = (setsData: any[]) => {
    const exerciseData: Record<string, any> = {};
    
    setsData.forEach(set => {
      const exerciseName = set.exercise_name;
      const date = set.date;
      
      if (!exerciseData[exerciseName]) {
        exerciseData[exerciseName] = {
          name: exerciseName,
          muscleGroupId: set.muscle_group_id,
          workouts: {},
          progression: []
        };
      }
      
      // Group by workout date
      if (!exerciseData[exerciseName].workouts[date]) {
        exerciseData[exerciseName].workouts[date] = {
          date,
          sets: [],
          totalVolume: 0,
          maxWeight: 0,
          totalReps: 0,
          avgWeight: 0
        };
      }
      
      const volume = set.reps * set.weight;
      exerciseData[exerciseName].workouts[date].sets.push(set);
      exerciseData[exerciseName].workouts[date].totalVolume += volume;
      exerciseData[exerciseName].workouts[date].maxWeight = Math.max(
        exerciseData[exerciseName].workouts[date].maxWeight, 
        set.weight
      );
      exerciseData[exerciseName].workouts[date].totalReps += set.reps;
    });
    
    // Calculate progression for each exercise
    Object.keys(exerciseData).forEach(exerciseName => {
      const exercise = exerciseData[exerciseName];
      const workoutDates = Object.keys(exercise.workouts).sort();
      
      exercise.progression = workoutDates.map(date => {
        const workout = exercise.workouts[date];
        const avgWeight = workout.sets.length > 0 
          ? workout.sets.reduce((sum: number, set: any) => sum + set.weight, 0) / workout.sets.length
          : 0;
        
        return {
          date,
          totalVolume: workout.totalVolume,
          maxWeight: workout.maxWeight,
          totalReps: workout.totalReps,
          setCount: workout.sets.length,
          avgWeight: Math.round(avgWeight * 10) / 10
        };
      });
    });
    
    return exerciseData;
  };

  const getIntensityColor = (intensity: number): string => {
    switch (intensity) {
      case 4: return '#FF4444'; // Red - Meget høj intensitet (12+ øvelser/time, 30+ sæt/time)
      case 3: return '#FF8800'; // Orange - Høj intensitet (8+ øvelser/time, 20+ sæt/time)  
      case 2: return '#FFDD00'; // Yellow - Medium intensitet (5+ øvelser/time, 12+ sæt/time)
      case 1: return '#88FF88'; // Light green - Lav intensitet (lavere effektivitet)
      default: return '#E0E0E0'; // Gray - Ingen aktivitet
    }
  };

  const getTrainingStats = () => {
    const totalExercises = exercises.length;
    const totalSessions = trainingSessions.length;
    const uniqueMuscleGroups = new Set(exercises.map(e => e.muscle_group_id)).size;
    
    // Calculate real workout stats
    const completedWorkouts = workouts.filter(w => w.completed);
    const totalWorkouts = completedWorkouts.length;
    
    // Calculate total volume and average weight from progress data
    const totalVolume = progressData.reduce((sum, p) => sum + p.totalVolume, 0);
    const averageWeight = progressData.length > 0 
      ? progressData.reduce((sum, p) => sum + p.maxWeight, 0) / progressData.length 
      : 0;
    
    // Calculate this week's workouts
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const thisWeekWorkouts = completedWorkouts.filter(w => 
      new Date(w.date) >= startOfWeek
    ).length;
    
    return {
      totalExercises,
      totalSessions,
      uniqueMuscleGroups,
      totalWorkouts,
      totalVolume: Math.round(totalVolume),
      averageWeight: Math.round(averageWeight * 10) / 10,
      thisWeekWorkouts,
    };
  };

  // Generate chart data for weight progression
  const getWeightProgressionData = () => {
    if (progressData.length === 0) return null;

    // Group by exercise and get last 7 data points
    const exerciseGroups = progressData.reduce((groups, data) => {
      const exerciseName = exercises.find(e => e.id === data.exerciseId)?.name || 'Unknown';
      if (!groups[exerciseName]) {
        groups[exerciseName] = [];
      }
      groups[exerciseName].push(data);
      return groups;
    }, {} as Record<string, any[]>);

    // Get the most active exercise (most data points)
    const mostActiveExercise = Object.keys(exerciseGroups).reduce((max, current) => 
      exerciseGroups[current].length > exerciseGroups[max].length ? current : max
    );

    const exerciseData = exerciseGroups[mostActiveExercise]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-7); // Last 7 data points

    return {
      labels: exerciseData.map(d => d.date.toLocaleDateString('da-DK', { month: 'short', day: 'numeric' })),
      datasets: [{
        data: exerciseData.map(d => d.maxWeight),
        color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  // Generate chart data for volume progression
  const getVolumeProgressionData = () => {
    if (progressData.length === 0) return null;

    // Group by date and sum total volume
    const dailyVolume = progressData.reduce((groups, data) => {
      const date = new Date(data.date);
      const dateKey = date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = { date: date, totalVolume: 0 };
      }
      groups[dateKey].totalVolume += data.totalVolume;
      return groups;
    }, {} as Record<string, any>);

    const volumeData = Object.values(dailyVolume)
      .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
      .slice(-7); // Last 7 days

    return {
      labels: volumeData.map((d: any) => d.date.toLocaleDateString('da-DK', { month: 'short', day: 'numeric' })),
      datasets: [{
        data: volumeData.map((d: any) => d.totalVolume),
        color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  // Generate chart data for workout frequency
  const getWorkoutFrequencyData = () => {
    if (recentWorkouts.length === 0) return null;

    // Group workouts by week
    const weeklyWorkouts = recentWorkouts.reduce((groups, workout) => {
      const weekStart = new Date(workout.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toDateString();
      
      if (!groups[weekKey]) {
        groups[weekKey] = { week: weekStart, count: 0 };
      }
      groups[weekKey].count++;
      return groups;
    }, {} as Record<string, any>);

    const frequencyData = Object.values(weeklyWorkouts)
      .sort((a: any, b: any) => a.week.getTime() - b.week.getTime())
      .slice(-4); // Last 4 weeks

    return {
      labels: frequencyData.map((d: any) => `Uge ${d.week.getWeek()}`),
      datasets: [{
        data: frequencyData.map((d: any) => d.count),
        color: (opacity = 1) => `rgba(69, 183, 209, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };


  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Træningsoversigt</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Din træningsaktivitet og fremskridt</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="fitness" size={24} color={theme.colors.primary} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{getTrainingStats().totalExercises}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Øvelser</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="calendar" size={24} color={theme.colors.secondary} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{getTrainingStats().totalSessions}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Sessioner</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="body" size={24} color={theme.colors.accent} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{getTrainingStats().uniqueMuscleGroups}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Muskelgrupper</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="star" size={24} color={theme.colors.secondary} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{getTrainingStats().totalWorkouts}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Workouts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="trending-up" size={24} color={theme.colors.accent} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{getTrainingStats().thisWeekWorkouts}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Denne uge</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="barbell" size={24} color={theme.colors.primary} />
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{getTrainingStats().totalWorkouts}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Træninger</Text>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Seneste Aktivitet</Text>
        {recentWorkouts.length > 0 ? (
          recentWorkouts.slice(0, 3).map((workout, index) => (
            <TouchableOpacity 
              key={workout.id} 
              style={[styles.activityCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
              onPress={() => handleWorkoutPress(workout)}
            >
              <View style={styles.activityItem}>
                <Ionicons name="fitness" size={16} color={theme.colors.primary} />
                <Text style={[styles.activityText, { color: theme.colors.text }]}>{workout.name}</Text>
                <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>
                  {new Date(workout.date).toLocaleDateString('da-DK')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </View>
              <View style={styles.activityStats}>
                <Text style={[styles.activityStat, { color: theme.colors.textSecondary }]}>
                  {workout.completed_exercises}/{workout.exercise_count} øvelser
                </Text>
                {workout.duration && (
                  <Text style={[styles.activityStat, { color: theme.colors.textSecondary }]}>
                    {workout.duration} min
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={[styles.activityCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <View style={styles.activityItem}>
              <Ionicons name="time" size={16} color={theme.colors.secondary} />
              <Text style={[styles.activityText, { color: theme.colors.text }]}>Ingen seneste aktivitet</Text>
              <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>Start din første træning</Text>
            </View>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Hurtige Handlinger</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
            onPress={() => navigation.navigate('Training', { initialTab: 'sessions' })}
          >
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Start Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
            onPress={() => setActiveTab('analytics')}
          >
            <Ionicons name="stats-chart" size={24} color={theme.colors.secondary} />
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Se Analyser</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
            onPress={() => setActiveTab('achievements')}
          >
            <Ionicons name="trophy" size={24} color={theme.colors.secondary} />
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Præstationer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
            onPress={() => {
              Alert.alert(
                'Del Fremskridt',
                'Denne funktion kommer snart! Du vil kunne dele dine træningsresultater på sociale medier.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Ionicons name="share" size={24} color={theme.colors.accent} />
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Del Fremskridt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAnalyticsTab = () => {
    try {
      const stats = getTrainingStats();
      
      return (
        <View style={styles.tabContent}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Detaljerede Analyser</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Træningsstatistikker og fremskridt</Text>
          </View>

          {/* Volume Tracking */}
          <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>Trænings Statistik</Text>
            <View style={styles.analyticsRow}>
              <Text style={[styles.analyticsLabel, { color: theme.colors.text }]}>Gennemsnitlige Sets:</Text>
              <Text style={[styles.analyticsValue, { color: theme.colors.primary }]}>
                {stats.totalWorkouts > 0 ? Math.round(stats.totalVolume / stats.totalWorkouts) : 0}
              </Text>
            </View>
            <View style={styles.analyticsRow}>
              <Text style={[styles.analyticsLabel, { color: theme.colors.text }]}>Gennemsnit Vægt:</Text>
              <Text style={[styles.analyticsValue, { color: theme.colors.primary }]}>{stats.averageWeight} kg</Text>
            </View>
            <View style={styles.analyticsRow}>
              <Text style={[styles.analyticsLabel, { color: theme.colors.text }]}>Træningsfrekvens:</Text>
              <Text style={[styles.analyticsValue, { color: theme.colors.primary }]}>{stats.thisWeekWorkouts} gange/uge</Text>
            </View>
          </View>

      {/* Muscle Group Distribution */}
      <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
        <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>Muskelgruppe Fordeling</Text>
        <Text style={[styles.analyticsSubtitle, { color: theme.colors.textSecondary }]}>Hvor meget du træner hver muskelgruppe</Text>
        
        {muscleGroups.length > 0 ? muscleGroups.map((muscleGroup) => {
          const groupExercises = exercises.filter(e => e.muscle_group_id === muscleGroup.id);
          const percentage = exercises.length > 0 ? Math.round((groupExercises.length / exercises.length) * 100) : 0;
          
          return (
            <View key={muscleGroup.id} style={styles.muscleGroupProgress}>
              <View style={styles.muscleGroupProgressHeader}>
                <View style={[styles.muscleGroupColor, { backgroundColor: muscleGroup.color || '#ccc' }]} />
                <Text style={[styles.muscleGroupName, { color: theme.colors.text }]}>{muscleGroup.name || 'Unknown'}</Text>
                <Text style={[styles.muscleGroupPercentage, { color: theme.colors.textSecondary }]}>{percentage}%</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.divider }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${percentage}%`, 
                      backgroundColor: muscleGroup.color || '#ccc' 
                    }
                  ]} 
                />
              </View>
            </View>
          );
        }) : (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Ingen muskelgrupper fundet
          </Text>
        )}
      </View>

      {/* Progress Charts */}
      <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
        <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>Fremskridt Grafer</Text>
        <Text style={[styles.analyticsSubtitle, { color: theme.colors.textSecondary }]}>Vægt og volumen over tid</Text>
        
        {progressData.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartsContainer}>
              {/* Weight Progression Chart */}
              {getWeightProgressionData() && (
                <View style={styles.chartContainer}>
                  <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Vægt Progression</Text>
                  <LineChart
                    data={getWeightProgressionData()!}
                    width={screenWidth - 80}
                    height={200}
                    chartConfig={{
                      backgroundColor: theme.colors.card,
                      backgroundGradientFrom: theme.colors.card,
                      backgroundGradientTo: theme.colors.card,
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
                      style: {
                        borderRadius: 16
                      },
                      propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: "#FF6B35"
                      }
                    }}
                    bezier
                    style={styles.chart}
                  />
                </View>
              )}

              {/* Volume Progression Chart */}
              {getVolumeProgressionData() && (
                <View style={styles.chartContainer}>
                  <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Volumen Progression</Text>
                  <LineChart
                    data={getVolumeProgressionData()!}
                    width={screenWidth - 80}
                    height={200}
                    chartConfig={{
                      backgroundColor: theme.colors.card,
                      backgroundGradientFrom: theme.colors.card,
                      backgroundGradientTo: theme.colors.card,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
                      style: {
                        borderRadius: 16
                      },
                      propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: "#4ECDC4"
                      }
                    }}
                    bezier
                    style={styles.chart}
                  />
                </View>
              )}

              {/* Workout Frequency Chart */}
              {getWorkoutFrequencyData() && (
                <View style={styles.chartContainer}>
                  <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Træningsfrekvens</Text>
                  <BarChart
                    data={getWorkoutFrequencyData()!}
                    width={screenWidth - 80}
                    height={200}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: theme.colors.card,
                      backgroundGradientFrom: theme.colors.card,
                      backgroundGradientTo: theme.colors.card,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(69, 183, 209, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
                      style: {
                        borderRadius: 16
                      }
                    }}
                    style={styles.chart}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.chartPlaceholder}>
            <Ionicons name="bar-chart" size={48} color={theme.colors.textTertiary} />
            <Text style={[styles.chartPlaceholderText, { color: theme.colors.textSecondary }]}>Ingen data endnu</Text>
            <Text style={[styles.chartPlaceholderSubtext, { color: theme.colors.textTertiary }]}>Start med at træne for at se fremskridt</Text>
          </View>
        )}
      </View>
        </View>
      );
    } catch (error) {
      console.error('Error rendering analytics tab:', error);
      return (
        <View style={styles.tabContent}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Analyser</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Der opstod en fejl</Text>
          </View>
          <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>Fejl</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Kunne ikke indlæse analyser. Prøv igen senere.
            </Text>
          </View>
        </View>
      );
    }
  };

  const renderAchievementsTab = () => {
    const unlockedAchievements = getUnlockedAchievements();
    const totalPoints = unlockedAchievements.reduce((sum, achievement) => sum + achievement.points, 0);
    
    const exerciseAchievements = getAchievementsByCategory('exercises');
    const consistencyAchievements = getAchievementsByCategory('consistency');
    const strengthAchievements = getAchievementsByCategory('strength');
    const specialAchievements = getAchievementsByCategory('special');
    
    const unlockedExercise = exerciseAchievements.filter(a => a.isUnlocked).length;
    const unlockedConsistency = consistencyAchievements.filter(a => a.isUnlocked).length;
    const unlockedStrength = strengthAchievements.filter(a => a.isUnlocked).length;
    const unlockedSpecial = specialAchievements.filter(a => a.isUnlocked).length;

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Præstationer & Milepæle</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            {unlockedAchievements.length} opnået • {totalPoints} point
          </Text>
        </View>

        {/* User Stats Summary */}
        <View style={[styles.statsSummary, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Text style={[styles.statsSummaryTitle, { color: theme.colors.text }]}>Din Statistik</Text>
          <View style={styles.statsSummaryGrid}>
            <View style={styles.statsSummaryItem}>
              <Text style={[styles.statsSummaryValue, { color: theme.colors.primary }]}>{userStats.totalWorkouts}</Text>
              <Text style={[styles.statsSummaryLabel, { color: theme.colors.textSecondary }]}>Workouts</Text>
            </View>
            <View style={styles.statsSummaryItem}>
              <Text style={[styles.statsSummaryValue, { color: theme.colors.secondary }]}>{userStats.currentStreak}</Text>
              <Text style={[styles.statsSummaryLabel, { color: theme.colors.textSecondary }]}>Dage Streak</Text>
            </View>
            <View style={styles.statsSummaryItem}>
              <Text style={[styles.statsSummaryValue, { color: theme.colors.accent }]}>{userStats.maxWeightLifted}kg</Text>
              <Text style={[styles.statsSummaryLabel, { color: theme.colors.textSecondary }]}>Max Vægt</Text>
            </View>
            <View style={styles.statsSummaryItem}>
              <Text style={[styles.statsSummaryValue, { color: theme.colors.primary }]}>{Math.round(userStats.averageWeight)}kg</Text>
              <Text style={[styles.statsSummaryLabel, { color: theme.colors.textSecondary }]}>Gennemsnit Vægt</Text>
            </View>
          </View>
        </View>

        {/* Achievement Categories */}
        <View style={styles.achievementsGrid}>
          <View style={[styles.achievementCategory, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="fitness" size={32} color={theme.colors.primary} />
            <Text style={[styles.achievementCategoryTitle, { color: theme.colors.text }]}>Øvelser</Text>
            <Text style={[styles.achievementCategorySubtitle, { color: theme.colors.textSecondary }]}>
              {unlockedExercise}/{exerciseAchievements.length} opnået
            </Text>
          </View>
          <View style={[styles.achievementCategory, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="calendar" size={32} color={theme.colors.secondary} />
            <Text style={[styles.achievementCategoryTitle, { color: theme.colors.text }]}>Konsistens</Text>
            <Text style={[styles.achievementCategorySubtitle, { color: theme.colors.textSecondary }]}>
              {unlockedConsistency}/{consistencyAchievements.length} opnået
            </Text>
          </View>
          <View style={[styles.achievementCategory, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="trophy" size={32} color={theme.colors.secondary} />
            <Text style={[styles.achievementCategoryTitle, { color: theme.colors.text }]}>Styrke</Text>
            <Text style={[styles.achievementCategorySubtitle, { color: theme.colors.textSecondary }]}>
              {unlockedStrength}/{strengthAchievements.length} opnået
            </Text>
          </View>
          <View style={[styles.achievementCategory, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="star" size={32} color={theme.colors.accent} />
            <Text style={[styles.achievementCategoryTitle, { color: theme.colors.text }]}>Special</Text>
            <Text style={[styles.achievementCategorySubtitle, { color: theme.colors.textSecondary }]}>
              {unlockedSpecial}/{specialAchievements.length} opnået
            </Text>
          </View>
        </View>

        {/* Recent Achievements */}
        {unlockedAchievements.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Seneste Præstationer</Text>
            {unlockedAchievements.slice(0, 3).map((achievement) => (
              <View key={achievement.id} style={[styles.achievementCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
                <View style={styles.achievementHeader}>
                  <View style={[styles.achievementIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Ionicons name={achievement.icon as any} size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.achievementInfo}>
                    <Text style={[styles.achievementTitle, { color: theme.colors.text }]}>{achievement.title}</Text>
                    <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>
                      {achievement.description}
                    </Text>
                  </View>
                  <View style={[styles.achievementPoints, { backgroundColor: theme.colors.accent }]}>
                    <Text style={styles.achievementPointsText}>+{achievement.points}</Text>
                  </View>
                </View>
                {achievement.unlockedAt && (
                  <Text style={[styles.achievementUnlockedAt, { color: theme.colors.textTertiary }]}>
                    Opnået {new Date(achievement.unlockedAt).toLocaleDateString('da-DK')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Next Milestones */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Næste Milepæle</Text>
          {achievements.filter(a => !a.isUnlocked).slice(0, 3).map((achievement) => {
            const progressPercentage = Math.min((achievement.currentProgress / achievement.requirement) * 100, 100);
            
            return (
              <View key={achievement.id} style={[styles.milestoneCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
                <View style={styles.milestoneHeader}>
                  <Ionicons name={achievement.icon as any} size={20} color={theme.colors.secondary} />
                  <Text style={[styles.milestoneTitle, { color: theme.colors.text }]}>{achievement.title}</Text>
                  <Text style={[styles.milestonePoints, { color: theme.colors.accent }]}>+{achievement.points}</Text>
                </View>
                <Text style={[styles.milestoneDescription, { color: theme.colors.textSecondary }]}>
                  {achievement.description}
                </Text>
                <View style={styles.milestoneProgress}>
                  <View style={[styles.progressBar, { backgroundColor: theme.colors.divider }]}>
                    <View style={[styles.progressFill, { 
                      width: `${progressPercentage}%`, 
                      backgroundColor: theme.colors.secondary 
                    }]} />
                  </View>
                  <Text style={[styles.milestoneProgressText, { color: theme.colors.textSecondary }]}>
                    {achievement.currentProgress}/{achievement.requirement}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderProgressionTab = () => {
    // Add error boundary and loading check
    if (isLoading) {
      return (
        <View style={styles.tabContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Loader progression data...</Text>
        </View>
      );
    }

    try {
      return (
        <View style={styles.tabContent}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Progression Tracking</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Se dit fremskridt over tid
            </Text>
          </View>

        {/* Progression Sub-Tabs */}
        <View style={[styles.progressionTabNavigation, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <TouchableOpacity
            style={[styles.progressionTabButton, progressionTab === 'general' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setProgressionTab('general')}
          >
            <Text 
              style={[styles.progressionTabText, { color: progressionTab === 'general' ? '#fff' : theme.colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              Generel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.progressionTabButton, progressionTab === 'sessions' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setProgressionTab('sessions')}
          >
            <Text 
              style={[styles.progressionTabText, { color: progressionTab === 'sessions' ? '#fff' : theme.colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              Sessioner
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.progressionTabButton, progressionTab === 'musclegroups' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setProgressionTab('musclegroups')}
          >
            <Text 
              style={[styles.progressionTabText, { color: progressionTab === 'musclegroups' ? '#fff' : theme.colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              Muskler
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.progressionTabButton, progressionTab === 'exercises' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setProgressionTab('exercises')}
          >
            <Text 
              style={[styles.progressionTabText, { color: progressionTab === 'exercises' ? '#fff' : theme.colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              Øvelser
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progression Content */}
        {progressionTab === 'general' && renderGeneralProgression()}
        {progressionTab === 'sessions' && renderSessionProgression()}
        {progressionTab === 'musclegroups' && renderMuscleGroupProgression()}
        {progressionTab === 'exercises' && renderExerciseProgression()}
      </View>
      );
    } catch (error) {
      console.error('Error rendering progression tab:', error);
      return (
        <View style={styles.tabContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Fejl</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Der opstod en fejl ved indlæsning af progression data. Prøv igen senere.
          </Text>
        </View>
      );
    }
  };

  // Helper function to calculate percentage improvement
  const calculatePercentageImprovement = (data: any[], valueKey: string) => {
    if (!data || data.length < 2) return data?.map(() => 0) || [0];
    
    const baseValue = data[0]?.[valueKey];
    if (!baseValue || baseValue === 0) return data.map(() => 0);
    
    return data.map((item: any) => {
      if (!item || typeof item[valueKey] !== 'number') return 0;
      const improvement = ((item[valueKey] - baseValue) / baseValue) * 100;
      return Math.round(improvement * 10) / 10; // Round to 1 decimal place
    });
  };

  const renderGeneralProgression = () => {
    try {
      // Get session-level data instead of general exercise data
      const sessionsData = progressionData.sessions || {};
      const sessionKeys = Object.keys(sessionsData);
      
      // Filter sessions that have at least 2 workouts (needed for progression)
      const validSessions = sessionKeys.filter(sessionId => {
        const session = sessionsData[sessionId];
        return session.progression && session.progression.length >= 2;
      });

      if (validSessions.length === 0) {
        return (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="trending-up-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
              Ingen generel progression endnu
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
              Lav hver session mindst 2 gange for at se generel tendens
            </Text>
          </View>
        );
      }

      // Combine all valid session progressions into a unified timeline
      const allSessionProgressions: any[] = [];
      validSessions.forEach(sessionId => {
        const session = sessionsData[sessionId];
        session.progression.forEach((item: any, index: number) => {
          if (index > 0) { // Skip first workout as we need a baseline for percentage
            const previousItem = session.progression[index - 1];
            const percentageImprovement = previousItem.maxWeight > 0 
              ? ((item.maxWeight - previousItem.maxWeight) / previousItem.maxWeight) * 100 
              : 0;
            
            allSessionProgressions.push({
              date: item.date,
              sessionName: session.name,
              sessionId: sessionId,
              maxWeight: item.maxWeight,
              percentageImprovement: percentageImprovement,
              cumulativeProgress: 0 // Will calculate below
            });
          }
        });
      });

      // Sort by date
      allSessionProgressions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (allSessionProgressions.length === 0) {
        return (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="trending-up-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
              For få data til generel progression
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
              Fortsæt med at træne for at se den generelle tendens
            </Text>
          </View>
        );
      }

      // Calculate cumulative progression (running average of improvements)
      let cumulativeSum = 0;
      allSessionProgressions.forEach((item, index) => {
        cumulativeSum += item.percentageImprovement;
        item.cumulativeProgress = cumulativeSum / (index + 1); // Running average
      });

      // Prepare chart data for general progression trend
      const generalProgressionData = {
        labels: allSessionProgressions.slice(-10).map((item: any) => 
          new Date(item.date).toLocaleDateString('da-DK', { month: 'short', day: 'numeric' })
        ),
        datasets: [
          {
            data: allSessionProgressions.slice(-10).map((item: any) => 
              Math.round(item.cumulativeProgress * 10) / 10
            ),
            color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
            strokeWidth: 3
          }
        ]
      };

      // Calculate session-specific stats
      const sessionStats = validSessions.map(sessionId => {
        const session = sessionsData[sessionId];
        const sessionProgressions = allSessionProgressions.filter(p => p.sessionId === sessionId);
        const avgImprovement = sessionProgressions.length > 0 
          ? sessionProgressions.reduce((sum, p) => sum + p.percentageImprovement, 0) / sessionProgressions.length 
          : 0;
        
        return {
          name: session.name,
          avgImprovement: Math.round(avgImprovement * 10) / 10,
          workouts: session.progression.length
        };
      });

      return (
        <View style={styles.progressionContent}>
          {/* General Progression Trend Chart */}
          <View style={[styles.chartContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Generel Progression Tendens</Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
              Gennemsnitlig forbedring på tværs af alle sessioner ({validSessions.length} aktive sessioner)
            </Text>
            <LineChart
              data={generalProgressionData}
              width={screenWidth - 80}
              height={220}
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: theme.colors.card,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 212, 255, ${opacity})`,
                labelColor: (opacity = 1) => theme.colors.text,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: theme.colors.primary
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>

          {/* Session Breakdown */}
          <View style={[styles.chartContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Session Progression Oversigt</Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>
              Gennemsnitlig forbedring per session type
            </Text>
            
            {sessionStats.map((stat, index) => (
              <View key={index} style={styles.sessionProgressRow}>
                <View style={styles.sessionProgressInfo}>
                  <Text style={[styles.sessionProgressName, { color: theme.colors.text }]}>{stat.name}</Text>
                  <Text style={[styles.sessionProgressWorkouts, { color: theme.colors.textSecondary }]}>
                    {stat.workouts} træninger
                  </Text>
                </View>
                <View style={styles.sessionProgressValue}>
                  <Text style={[
                    styles.sessionProgressPercent, 
                    { color: stat.avgImprovement >= 0 ? theme.colors.primary : theme.colors.error }
                  ]}>
                    {stat.avgImprovement >= 0 ? '+' : ''}{stat.avgImprovement}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Aktive Sessioner</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{validSessions.length}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Gennemsnitlig Tendens</Text>
              <Text style={[styles.statValue, { 
                color: allSessionProgressions[allSessionProgressions.length - 1]?.cumulativeProgress >= 0 
                  ? theme.colors.primary 
                  : theme.colors.error 
              }]}>
                {allSessionProgressions[allSessionProgressions.length - 1]?.cumulativeProgress >= 0 ? '+' : ''}
                {Math.round((allSessionProgressions[allSessionProgressions.length - 1]?.cumulativeProgress || 0) * 10) / 10}%
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Træninger</Text>
              <Text style={[styles.statValue, { color: theme.colors.accent }]}>{allSessionProgressions.length}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Bedste Session</Text>
              <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
                {sessionStats.length > 0 
                  ? sessionStats.reduce((best, current) => 
                      current.avgImprovement > best.avgImprovement ? current : best
                    ).name.split(' ')[0] // First word only
                  : 'N/A'
                }
              </Text>
            </View>
          </View>
        </View>
      );
    } catch (error) {
      console.error('Error rendering general progression:', error);
      return (
        <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
            Fejl ved indlæsning af general progression
          </Text>
        </View>
      );
    }
  };

  const renderSessionProgression = () => {
    try {
      const sessionsData = progressionData.sessions || {};
      const sessionKeys = Object.keys(sessionsData);
      
      if (sessionKeys.length === 0) {
        return (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="list-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
              Ingen session data endnu
            </Text>
          </View>
        );
      }

      // Set default selected session if none selected
      const currentSelectedSession = selectedSession || sessionKeys[0];
      if (!selectedSession && sessionKeys.length > 0) {
        setSelectedSession(sessionKeys[0]);
      }

      const selectedSessionData = sessionsData[currentSelectedSession];
      
      if (!selectedSessionData || !selectedSessionData.progression || selectedSessionData.progression.length < 2) {
        return (
          <View style={styles.progressionContent}>
            {/* Session Selector */}
            <View style={[styles.selectorContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Vælg Session:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                {sessionKeys.map(sessionId => {
                  const session = sessionsData[sessionId];
                  return (
                    <TouchableOpacity
                      key={sessionId}
                      style={[
                        styles.selectorButton,
                        { backgroundColor: currentSelectedSession === sessionId ? theme.colors.primary : theme.colors.card },
                        { borderColor: theme.colors.border }
                      ]}
                      onPress={() => setSelectedSession(sessionId)}
                    >
                      <Text style={[
                        styles.selectorButtonText,
                        { color: currentSelectedSession === sessionId ? '#fff' : theme.colors.text }
                      ]}>
                        {session.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="list-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
                For få data til graf for {selectedSessionData?.name || 'denne session'}
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                Lav flere træninger med denne session for at se progression
              </Text>
            </View>
          </View>
        );
      }

      // Calculate percentage improvements for selected session
      const sessionPercentages = calculatePercentageImprovement(selectedSessionData.progression.slice(-10), 'maxWeight');
      const sessionChartData = {
        labels: selectedSessionData.progression.slice(-10).map((item: any) => 
          new Date(item.date).toLocaleDateString('da-DK', { month: 'short', day: 'numeric' })
        ),
        datasets: [
          {
            data: sessionPercentages,
            color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
            strokeWidth: 3
          }
        ]
      };

      return (
        <View style={styles.progressionContent}>
          {/* Session Selector */}
          <View style={[styles.selectorContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Vælg Session:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
              {sessionKeys.map(sessionId => {
                const session = sessionsData[sessionId];
                return (
                  <TouchableOpacity
                    key={sessionId}
                    style={[
                      styles.selectorButton,
                      { backgroundColor: currentSelectedSession === sessionId ? theme.colors.primary : theme.colors.card },
                      { borderColor: theme.colors.border }
                    ]}
                    onPress={() => setSelectedSession(sessionId)}
                  >
                    <Text style={[
                      styles.selectorButtonText,
                      { color: currentSelectedSession === sessionId ? '#fff' : theme.colors.text }
                    ]}>
                      {session.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Selected Session Progression Chart */}
          <View style={[styles.chartContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.chartTitle, { color: theme.colors.text }]}>{selectedSessionData.name} Forbedring</Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>Procent forbedring i maksimal vægt ({selectedSessionData.progression.length} træninger)</Text>
            <LineChart
              data={sessionChartData}
              width={screenWidth - 80}
              height={220}
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: theme.colors.card,
                backgroundGradientFrom: theme.colors.card,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
                labelColor: (opacity = 1) => theme.colors.text,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#FF6B35"
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Træninger</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{selectedSessionData.progression.length}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Seneste Max</Text>
              <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
                {selectedSessionData.progression[selectedSessionData.progression.length - 1]?.maxWeight || 0}kg
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Første Max</Text>
              <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                {selectedSessionData.progression[0]?.maxWeight || 0}kg
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Forbedring</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {sessionPercentages[sessionPercentages.length - 1] || 0}%
              </Text>
            </View>
          </View>
        </View>
      );
    } catch (error) {
      console.error('Error rendering session progression:', error);
      return (
        <View style={styles.tabContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Fejl</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Der opstod en fejl ved indlæsning af session data. Prøv igen senere.
          </Text>
        </View>
      );
    }
  };

  const renderMuscleGroupProgression = () => {
    try {
      const muscleGroupsData = progressionData.muscleGroups || {};
      const muscleGroupKeys = Object.keys(muscleGroupsData);
      
      if (muscleGroupKeys.length === 0) {
        return (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="body-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
              Ingen muskelgruppe data endnu
            </Text>
          </View>
        );
      }

      // Set default selected muscle group if none selected
      const currentSelectedMuscleGroup = selectedMuscleGroup || muscleGroupKeys[0];
      if (!selectedMuscleGroup && muscleGroupKeys.length > 0) {
        setSelectedMuscleGroup(muscleGroupKeys[0]);
      }

      const selectedMuscleGroupData = muscleGroupsData[currentSelectedMuscleGroup];
      const muscleGroupInfo = muscleGroups.find(mg => 
        mg.id === currentSelectedMuscleGroup || mg.id === parseInt(currentSelectedMuscleGroup) || mg.id.toString() === currentSelectedMuscleGroup
      );
      
      if (!selectedMuscleGroupData || !selectedMuscleGroupData.progression || selectedMuscleGroupData.progression.length < 2) {
        return (
          <View style={styles.progressionContent}>
            {/* Muscle Group Selector */}
            <View style={[styles.selectorContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Vælg Muskelgruppe:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                {muscleGroupKeys.map(muscleGroupId => {
                  const muscleGroup = muscleGroupsData[muscleGroupId];
                  const muscleInfo = muscleGroups.find(mg => 
                    mg.id === muscleGroupId || mg.id === parseInt(muscleGroupId) || mg.id.toString() === muscleGroupId
                  );
                  return (
                    <TouchableOpacity
                      key={muscleGroupId}
                      style={[
                        styles.selectorButton,
                        { backgroundColor: currentSelectedMuscleGroup === muscleGroupId ? theme.colors.primary : theme.colors.card },
                        { borderColor: theme.colors.border }
                      ]}
                      onPress={() => setSelectedMuscleGroup(muscleGroupId)}
                    >
                      <Text style={[
                        styles.selectorButtonText,
                        { color: currentSelectedMuscleGroup === muscleGroupId ? '#fff' : theme.colors.text }
                      ]}>
                        {muscleInfo?.name || `Muskel ${muscleGroupId}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="body-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
                For få data til graf for {muscleGroupInfo?.name || 'denne muskelgruppe'}
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                Træn denne muskelgruppe flere gange for at se progression
              </Text>
            </View>
          </View>
        );
      }

      // Calculate percentage improvements for selected muscle group
      const musclePercentages = calculatePercentageImprovement(selectedMuscleGroupData.progression.slice(-10), 'maxWeight');
      const muscleChartData = {
        labels: selectedMuscleGroupData.progression.slice(-10).map((item: any) => 
          new Date(item.date).toLocaleDateString('da-DK', { month: 'short', day: 'numeric' })
        ),
        datasets: [
          {
            data: musclePercentages,
            color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
            strokeWidth: 3
          }
        ]
      };

      return (
        <View style={styles.progressionContent}>
          {/* Muscle Group Selector */}
          <View style={[styles.selectorContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Vælg Muskelgruppe:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
              {muscleGroupKeys.map(muscleGroupId => {
                const muscleGroup = muscleGroupsData[muscleGroupId];
                const muscleInfo = muscleGroups.find(mg => 
                  mg.id === muscleGroupId || mg.id === parseInt(muscleGroupId) || mg.id.toString() === muscleGroupId
                );
                return (
                  <TouchableOpacity
                    key={muscleGroupId}
                    style={[
                      styles.selectorButton,
                      { backgroundColor: currentSelectedMuscleGroup === muscleGroupId ? theme.colors.primary : theme.colors.card },
                      { borderColor: theme.colors.border }
                    ]}
                    onPress={() => setSelectedMuscleGroup(muscleGroupId)}
                  >
                    <Text style={[
                      styles.selectorButtonText,
                      { color: currentSelectedMuscleGroup === muscleGroupId ? '#fff' : theme.colors.text }
                    ]}>
                      {muscleInfo?.name || `Muskel ${muscleGroupId}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Selected Muscle Group Progression Chart */}
          <View style={[styles.chartContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.chartTitle, { color: theme.colors.text }]}>{muscleGroupInfo?.name || 'Muskelgruppe'} Forbedring</Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>Procent forbedring i maksimal vægt ({selectedMuscleGroupData.progression.length} træninger)</Text>
            <LineChart
              data={muscleChartData}
              width={screenWidth - 80}
              height={220}
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: theme.colors.card,
                backgroundGradientFrom: theme.colors.card,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(78, 205, 196, ${opacity})`,
                labelColor: (opacity = 1) => theme.colors.text,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#4ECDC4"
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Træninger</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{selectedMuscleGroupData.progression.length}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Seneste Max</Text>
              <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
                {selectedMuscleGroupData.progression[selectedMuscleGroupData.progression.length - 1]?.maxWeight || 0}kg
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Første Max</Text>
              <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                {selectedMuscleGroupData.progression[0]?.maxWeight || 0}kg
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Forbedring</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {musclePercentages[musclePercentages.length - 1] || 0}%
              </Text>
            </View>
          </View>
        </View>
      );
    } catch (error) {
      console.error('Error rendering muscle group progression:', error);
      return (
        <View style={styles.tabContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Fejl</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Der opstod en fejl ved indlæsning af muskelgruppe data. Prøv igen senere.
          </Text>
        </View>
      );
    }
  };

  const renderExerciseProgression = () => {
    try {
      const exercisesData = progressionData.exercises || {};
      const exerciseKeys = Object.keys(exercisesData);
      
      if (exerciseKeys.length === 0) {
        return (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="fitness-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
              Ingen øvelse data endnu
            </Text>
          </View>
        );
      }

      // Set default selected exercise if none selected
      const currentSelectedExercise = selectedExercise || exerciseKeys[0];
      if (!selectedExercise && exerciseKeys.length > 0) {
        setSelectedExercise(exerciseKeys[0]);
      }

      const selectedExerciseData = exercisesData[currentSelectedExercise];
      
      if (!selectedExerciseData || !selectedExerciseData.progression || selectedExerciseData.progression.length < 2) {
        return (
          <View style={styles.progressionContent}>
            {/* Exercise Selector */}
            <View style={[styles.selectorContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Vælg Øvelse:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                {exerciseKeys.slice(0, 15).map(exerciseName => {
                  const exercise = exercisesData[exerciseName];
                  return (
                    <TouchableOpacity
                      key={exerciseName}
                      style={[
                        styles.selectorButton,
                        { backgroundColor: currentSelectedExercise === exerciseName ? theme.colors.primary : theme.colors.card },
                        { borderColor: theme.colors.border }
                      ]}
                      onPress={() => setSelectedExercise(exerciseName)}
                    >
                      <Text style={[
                        styles.selectorButtonText,
                        { color: currentSelectedExercise === exerciseName ? '#fff' : theme.colors.text }
                      ]}>
                        {exercise.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="fitness-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
                For få data til graf for {selectedExerciseData?.name || 'denne øvelse'}
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                Lav denne øvelse flere gange for at se progression
              </Text>
            </View>
          </View>
        );
      }

      // Calculate percentage improvements for selected exercise
      const exercisePercentages = calculatePercentageImprovement(selectedExerciseData.progression.slice(-10), 'maxWeight');
      const exerciseChartData = {
        labels: selectedExerciseData.progression.slice(-10).map((item: any) => 
          new Date(item.date).toLocaleDateString('da-DK', { month: 'short', day: 'numeric' })
        ),
        datasets: [
          {
            data: exercisePercentages,
            color: (opacity = 1) => `rgba(150, 206, 180, ${opacity})`,
            strokeWidth: 3
          }
        ]
      };

      return (
        <View style={styles.progressionContent}>
          {/* Exercise Selector */}
          <View style={[styles.selectorContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Vælg Øvelse:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
              {exerciseKeys.slice(0, 15).map(exerciseName => {
                const exercise = exercisesData[exerciseName];
                return (
                  <TouchableOpacity
                    key={exerciseName}
                    style={[
                      styles.selectorButton,
                      { backgroundColor: currentSelectedExercise === exerciseName ? theme.colors.primary : theme.colors.card },
                      { borderColor: theme.colors.border }
                    ]}
                    onPress={() => setSelectedExercise(exerciseName)}
                  >
                    <Text style={[
                      styles.selectorButtonText,
                      { color: currentSelectedExercise === exerciseName ? '#fff' : theme.colors.text }
                    ]}>
                      {exercise.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Selected Exercise Progression Chart */}
          <View style={[styles.chartContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.chartTitle, { color: theme.colors.text }]}>{selectedExerciseData.name} Forbedring</Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textSecondary }]}>Procent forbedring i maksimal vægt ({selectedExerciseData.progression.length} træninger)</Text>
            <LineChart
              data={exerciseChartData}
              width={screenWidth - 80}
              height={220}
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: theme.colors.card,
                backgroundGradientFrom: theme.colors.card,
                backgroundGradientTo: theme.colors.card,
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(150, 206, 180, ${opacity})`,
                labelColor: (opacity = 1) => theme.colors.text,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#96CEB4"
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Træninger</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{selectedExerciseData.progression.length}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Seneste Max</Text>
              <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
                {selectedExerciseData.progression[selectedExerciseData.progression.length - 1]?.maxWeight || 0}kg
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Første Max</Text>
              <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                {selectedExerciseData.progression[0]?.maxWeight || 0}kg
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Forbedring</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {exercisePercentages[exercisePercentages.length - 1] || 0}%
              </Text>
            </View>
          </View>
        </View>
      );
    } catch (error) {
      console.error('Error rendering exercise progression:', error);
      return (
        <View style={styles.tabContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Fejl</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Der opstod en fejl ved indlæsning af øvelse data. Prøv igen senere.
          </Text>
        </View>
      );
    }
  };

  const renderCalendarTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Træningskalender</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Se din træningsintensitet over tid
          </Text>
        </View>

        {/* Heat Map Legend */}
        <View style={[styles.heatMapLegend, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Text style={[styles.legendTitle, { color: theme.colors.text }]}>Træningsintensitet</Text>
          <Text style={[styles.legendSubtitle, { color: theme.colors.textSecondary }]}>
            Baseret på varighed, antal øvelser og sæt
          </Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#E0E0E0' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Ingen</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#88FF88' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Lav</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FFDD00' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Medium</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF8800' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Høj</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF4444' }]} />
              <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Meget høj</Text>
            </View>
          </View>
        </View>

        {/* Calendar */}
        <View style={[styles.calendarContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Calendar
            onDayPress={(day) => {
              const dateString = day.dateString;
              setSelectedDate(dateString);
              
              // Find workouts for selected date
              const dayWorkouts = workouts.filter(workout => workout.date === dateString);
              setSelectedDateWorkouts(dayWorkouts);
            }}
            markedDates={heatMapData}
            theme={{
              backgroundColor: theme.colors.card,
              calendarBackground: theme.colors.card,
              textSectionTitleColor: theme.colors.textSecondary,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.text,
              textDisabledColor: theme.colors.textTertiary,
              dotColor: theme.colors.primary,
              selectedDotColor: '#ffffff',
              arrowColor: theme.colors.primary,
              monthTextColor: theme.colors.text,
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '500',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 14
            }}
          />
        </View>

        {/* Selected Date Workouts */}
        {selectedDate && (
          <View style={[styles.selectedDateContainer, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.selectedDateTitle, { color: theme.colors.text }]}>
              {new Date(selectedDate).toLocaleDateString('da-DK', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            
            {selectedDateWorkouts.length > 0 ? (
              selectedDateWorkouts.map((workout, index) => (
                <TouchableOpacity 
                  key={workout.id || index} 
                  style={[styles.workoutCard, { backgroundColor: theme.colors.background }]}
                  onPress={() => handleWorkoutPress(workout)}
                >
                  <View style={styles.workoutHeader}>
                    <Ionicons name="fitness" size={20} color={theme.colors.primary} />
                    <Text style={[styles.workoutName, { color: theme.colors.text }]}>
                      {workout.name || 'Workout'}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }} />
                  </View>
                  
                  {workout.duration && (
                    <View style={styles.workoutDetail}>
                      <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.workoutDetailText, { color: theme.colors.textSecondary }]}>
                        {workout.duration} minutter
                      </Text>
                    </View>
                  )}
                  
                  {workout.exercise_count && (
                    <View style={styles.workoutDetail}>
                      <Ionicons name="barbell" size={16} color={theme.colors.textSecondary} />
                      <Text style={[styles.workoutDetailText, { color: theme.colors.textSecondary }]}>
                        {workout.completed_exercises || workout.exercise_count} øvelser
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.noWorkoutCard, { backgroundColor: theme.colors.background }]}>
                <Ionicons name="calendar-outline" size={24} color={theme.colors.textTertiary} />
                <Text style={[styles.noWorkoutText, { color: theme.colors.textSecondary }]}>
                  Ingen træning denne dag
                </Text>
                <Text style={[styles.noWorkoutSubtext, { color: theme.colors.textTertiary }]}>
                  Klik på andre datoer for at se dine træninger
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Workout Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>📈 Træningsstatistik</Text>
          <View style={styles.workoutStatsGrid}>
            <View style={[styles.workoutStatCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Ionicons name="calendar" size={24} color={theme.colors.primary} />
              <Text style={[styles.workoutStatValue, { color: theme.colors.text }]}>
                {Object.keys(heatMapData).length}
              </Text>
              <Text style={[styles.workoutStatLabel, { color: theme.colors.textSecondary }]}>
                Træningsdage
              </Text>
            </View>
            <View style={[styles.workoutStatCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <Ionicons name="fitness" size={24} color={theme.colors.secondary} />
              <Text style={[styles.workoutStatValue, { color: theme.colors.text }]}>
                {workouts.length}
              </Text>
              <Text style={[styles.workoutStatLabel, { color: theme.colors.textSecondary }]}>
                Total Workouts
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

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
              <Text style={styles.headerTitle}>Fremskridt</Text>
              <Text style={styles.headerSubtitle}>Spor dit fremskridt og analyser</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={[styles.tabNavigation, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'overview' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons 
            name={activeTab === 'overview' ? 'eye' : 'eye-outline'} 
            size={20} 
            color={activeTab === 'overview' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text 
            style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'overview' && { color: theme.colors.primary, fontWeight: '600' }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Oversigt
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'analytics' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('analytics')}
        >
          <Ionicons 
            name={activeTab === 'analytics' ? 'stats-chart' : 'stats-chart-outline'} 
            size={20} 
            color={activeTab === 'analytics' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text 
            style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'analytics' && { color: theme.colors.primary, fontWeight: '600' }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Analyser
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'achievements' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('achievements')}
        >
          <Ionicons 
            name={activeTab === 'achievements' ? 'trophy' : 'trophy-outline'} 
            size={20} 
            color={activeTab === 'achievements' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text 
            style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'achievements' && { color: theme.colors.primary, fontWeight: '600' }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Præstationer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'calendar' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('calendar')}
        >
          <Ionicons 
            name={activeTab === 'calendar' ? 'calendar' : 'calendar-outline'} 
            size={20} 
            color={activeTab === 'calendar' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text 
            style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'calendar' && { color: theme.colors.primary, fontWeight: '600' }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Kalender
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'progression' && { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() => setActiveTab('progression')}
        >
          <Ionicons 
            name={activeTab === 'progression' ? 'trending-up' : 'trending-up-outline'} 
            size={20} 
            color={activeTab === 'progression' ? theme.colors.primary : theme.colors.textSecondary} 
          />
          <Text 
            style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'progression' && { color: theme.colors.primary, fontWeight: '600' }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Progression
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'achievements' && renderAchievementsTab()}
        {activeTab === 'calendar' && renderCalendarTab()}
        {activeTab === 'progression' && renderProgressionTab()}
      </ScrollView>

      {/* Workout Details Modal */}
      <Modal
        visible={showWorkoutDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWorkoutDetailsModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selectedWorkout?.name || 'Træning Detaljer'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowWorkoutDetailsModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Workout Info */}
              <View style={[styles.workoutInfoSection, { backgroundColor: theme.colors.card }]}>
                <View style={styles.workoutInfoRow}>
                  <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                  <Text style={[styles.workoutInfoText, { color: theme.colors.text }]}>
                    {selectedWorkout?.date ? new Date(selectedWorkout.date).toLocaleDateString('da-DK') : ''}
                  </Text>
                </View>
                {selectedWorkout?.duration && (
                  <View style={styles.workoutInfoRow}>
                    <Ionicons name="time" size={20} color={theme.colors.primary} />
                    <Text style={[styles.workoutInfoText, { color: theme.colors.text }]}>
                      {selectedWorkout.duration} minutter
                    </Text>
                  </View>
                )}
              </View>

              {/* Sets */}
              <Text style={[styles.setsTitle, { color: theme.colors.text }]}>Sæt og Reps</Text>
              {workoutSets.length > 0 ? (
                (() => {
                  // Group sets by exercise
                  const exerciseGroups = workoutSets.reduce((groups: any, set: any) => {
                    if (!groups[set.exercise_id]) {
                      groups[set.exercise_id] = {
                        exercise_name: set.exercise_name,
                        sets: []
                      };
                    }
                    groups[set.exercise_id].sets.push(set);
                    return groups;
                  }, {});

                  return Object.entries(exerciseGroups).map(([exerciseId, group]: [string, any]) => (
                    <View key={exerciseId} style={[styles.exerciseGroup, { backgroundColor: theme.colors.card }]}>
                      <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{group.exercise_name}</Text>
                      {group.sets.map((set: any, index: number) => (
                        <SetEditRow 
                          key={set.id} 
                          set={set} 
                          index={index}
                          theme={theme}
                          onUpdate={handleUpdateSet}
                          editingWorkout={editingWorkout}
                        />
                      ))}
                    </View>
                  ));
                })()
              ) : (
                <Text style={[styles.noSetsText, { color: theme.colors.textSecondary }]}>
                  Ingen sæt fundet
                </Text>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setEditingWorkout(!editingWorkout)}
              >
                <Ionicons name={editingWorkout ? "checkmark" : "create"} size={20} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {editingWorkout ? "Gem" : "Rediger"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton, { backgroundColor: theme.colors.error || '#FF3B30' }]}
                onPress={handleDeleteWorkout}
              >
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Slet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Set Edit Row Component
const SetEditRow: React.FC<{
  set: any;
  index: number;
  theme: any;
  onUpdate: (setId: string, reps: number, weight: number) => void;
  editingWorkout: boolean;
}> = ({ set, index, theme, onUpdate, editingWorkout }) => {
  const [reps, setReps] = useState(set.reps.toString());
  const [weight, setWeight] = useState(set.weight.toString());

  const handleSave = () => {
    const newReps = parseInt(reps);
    const newWeight = parseFloat(weight);
    
    if (isNaN(newReps) || isNaN(newWeight) || newReps <= 0 || newWeight <= 0) {
      Alert.alert('Fejl', 'Indtast gyldige værdier for reps og vægt');
      return;
    }
    
    onUpdate(set.id, newReps, newWeight);
  };

  return (
    <View style={[styles.setRow, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.setNumber, { color: theme.colors.primary }]}>Sæt {index + 1}</Text>
      
      {editingWorkout ? (
        <View style={styles.setEditInputs}>
          <View style={styles.setInput}>
            <Text style={[styles.setInputLabel, { color: theme.colors.textSecondary }]}>Reps</Text>
            <TextInput
              style={[styles.setTextInput, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
              value={reps}
              onChangeText={setReps}
              keyboardType="numeric"
              onBlur={handleSave}
            />
          </View>
          <View style={styles.setInput}>
            <Text style={[styles.setInputLabel, { color: theme.colors.textSecondary }]}>Kg</Text>
            <TextInput
              style={[styles.setTextInput, { backgroundColor: theme.colors.card, color: theme.colors.text }]}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              onBlur={handleSave}
            />
          </View>
        </View>
      ) : (
        <View style={styles.setValues}>
          <Text style={[styles.setValue, { color: theme.colors.text }]}>{set.reps} reps</Text>
          <Text style={[styles.setValue, { color: theme.colors.text }]}>{set.weight} kg</Text>
        </View>
      )}
    </View>
  );
};

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
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
    minWidth: 0,
  },
  activeTabButton: {
    backgroundColor: '#f0f8ff',
  },
  tabText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 12,
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
    marginBottom: 25,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  activityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  activityStat: {
    fontSize: 12,
    color: '#666',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  analyticsCard: {
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
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  analyticsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  analyticsLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  analyticsValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  muscleGroupProgress: {
    marginBottom: 15,
  },
  muscleGroupProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  muscleGroupColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  muscleGroupName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  muscleGroupPercentage: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  chartPlaceholder: {
    alignItems: 'center',
    padding: 40,
  },
  chartPlaceholderText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  chartPlaceholderSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  chartsContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  achievementCategory: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementCategorySubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  milestoneCard: {
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
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  milestoneProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestoneProgressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  // Achievements Styles
  statsSummary: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsSummaryItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 15,
  },
  statsSummaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsSummaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  achievementCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  achievementPoints: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  achievementPointsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  achievementUnlockedAt: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  milestonePoints: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Heat Map Calendar Styles
  heatMapLegend: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  legendSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
  },
  calendarContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDateContainer: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  workoutCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  workoutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  workoutDetailText: {
    fontSize: 14,
    marginLeft: 6,
  },
  noWorkoutCard: {
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  noWorkoutText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  noWorkoutSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  workoutStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  workoutStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  workoutStatLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalScrollContent: {
    flex: 1,
  },
  workoutInfoSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  workoutInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutInfoText: {
    fontSize: 16,
    marginLeft: 12,
  },
  setsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  exerciseGroup: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 50,
  },
  setValues: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  setValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  setEditInputs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  setInput: {
    alignItems: 'center',
  },
  setInputLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  setTextInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    padding: 8,
    minWidth: 60,
    textAlign: 'center',
  },
  noSetsText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
  },
  editButton: {
    // backgroundColor will be set dynamically
  },
  deleteButton: {
    // backgroundColor will be set dynamically
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  // Progression Styles
  progressionTabNavigation: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressionTabButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 0,
  },
  progressionTabText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
  },
  progressionContent: {
    paddingHorizontal: 16,
  },
  progressionStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  progressionStatCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressionStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  progressionStatLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  progressionItemCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressionItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressionItemSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressionItemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressionItemStat: {
    fontSize: 14,
    fontWeight: '500',
  },
  chartContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  selectorContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectorScroll: {
    flexDirection: 'row',
  },
  selectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sessionProgressInfo: {
    flex: 1,
  },
  sessionProgressName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionProgressWorkouts: {
    fontSize: 12,
  },
  sessionProgressValue: {
    alignItems: 'flex-end',
  },
  sessionProgressPercent: {
    fontSize: 18,
    fontWeight: '700',
  },
});
