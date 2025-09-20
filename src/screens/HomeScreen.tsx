import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../types';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../stores/workoutStore';
import { useExerciseStore } from '../stores/exerciseStore';
import { useTheme } from '../contexts/ThemeContext';
import { TrainingSession, Exercise } from '../types';
import * as Updates from 'expo-updates';

const { width } = Dimensions.get('window');

type HomeScreenNavigationProp = BottomTabNavigationProp<RootTabParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const { 
    trainingSessions, 
    exercises, 
    muscleGroups,
    loadTrainingSessions, 
    loadExercises,
    loadMuscleGroups,
    startWorkout,
    endWorkout,
    addSetToExercise,
    getProgressiveOverloadSuggestions,
    workouts,
    loadWorkouts,
    currentWorkout
  } = useExerciseStore();

  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    thisWeekWorkouts: 0,
    totalExercises: 0,
    favoriteMuscleGroup: 'Ingen'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const checkForUpdates = async () => {
    try {
      setIsCheckingUpdate(true);
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert(
          'Update tilgængelig',
          'Der er en ny opdatering tilgængelig. Vil du hente den nu?',
          [
            { text: 'Senere', style: 'cancel' },
            { 
              text: 'Hent nu', 
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert('Update hentet', 'Appen genstarter nu med den nye version.');
                  await Updates.reloadAsync();
                } catch (error) {
                  Alert.alert('Fejl', 'Kunne ikke hente opdateringen.');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Ingen opdatering', 'Du har allerede den nyeste version.');
      }
    } catch (error) {
      Alert.alert('Fejl', 'Kunne ikke tjekke for opdateringer.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  useEffect(() => {
    loadTrainingSessions();
    loadExercises();
    loadMuscleGroups();
    loadWorkouts();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [workouts, exercises, muscleGroups]);

  // Debug currentWorkout changes
  useEffect(() => {
    console.log('Current workout changed:', currentWorkout);
  }, [currentWorkout]);

  const calculateStats = () => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    
    const thisWeekWorkouts = workouts.filter(workout => 
      new Date(workout.date) >= startOfWeek
    ).length;

    const muscleGroupCounts = muscleGroups.map(group => ({
      name: group.name,
      count: exercises.filter(ex => ex.muscle_group_id === group.id).length
    }));

    const favoriteMuscleGroup = muscleGroupCounts.reduce((max, current) => 
      current.count > max.count ? current : max, 
      { name: 'Ingen', count: 0 }
    ).name;

    setStats({
      totalWorkouts: workouts.length,
      thisWeekWorkouts,
      totalExercises: exercises.length,
      favoriteMuscleGroup
    });
  };


  const handleContinueWorkout = () => {
    // Navigate to workout screen
    navigation.navigate('Training', { initialTab: 'sessions' });
  };

  // Navigate to Training screen and start training there
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
      
      // Start workout in store
      const workout = await startWorkout(sessionId);
      console.log('Workout started:', workout);
      
      // Navigate to Training screen where live training will auto-start
      navigation.navigate('Training', { initialTab: 'sessions' });
    } catch (error) {
      console.error('Error starting training:', error);
      Alert.alert('Fejl', `Kunne ikke starte træning: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    }
  };


  const getMuscleGroupColor = (muscleGroupId: string): string => {
    const group = muscleGroups.find(mg => mg.id === muscleGroupId);
    return group?.color || '#FF6B6B';
  };

  const getMuscleGroupName = (muscleGroupId: string): string => {
    const group = muscleGroups.find(mg => mg.id === muscleGroupId);
    return group?.name || 'Ukendt';
  };


  const getExercisesForSession = (sessionId: string) => {
    console.log('=== GET EXERCISES FOR SESSION ===');
    console.log('Looking for session ID:', sessionId);
    console.log('All training sessions:', trainingSessions.map(s => ({ id: s.id, name: s.name, muscle_group_id: s.muscle_group_id })));
    console.log('All exercises:', exercises.map(e => ({ id: e.id, name: e.name, session_id: e.session_id, muscle_group_id: e.muscle_group_id })));
    
    const session = trainingSessions.find(s => s.id === sessionId);
    console.log('Found session:', session);
    
    if (!session) {
      console.log('❌ SESSION NOT FOUND');
      return [];
    }
    
    // First try to find exercises by session_id (preferred method)
    let sessionExercises = exercises.filter(exercise => exercise.session_id === sessionId);
    console.log('Exercises found by session_id:', sessionExercises.length, sessionExercises);
    
    // If no exercises found by session_id, fall back to muscle_group_id
    if (sessionExercises.length === 0) {
      console.log('No exercises found by session_id, trying muscle_group_id:', session.muscle_group_id);
      sessionExercises = exercises.filter(exercise => exercise.muscle_group_id === session.muscle_group_id);
      console.log('Exercises found by muscle_group_id:', sessionExercises.length, sessionExercises);
    }
    
    console.log('Final result:', sessionExercises.length, 'exercises');
    return sessionExercises;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
              <Text style={styles.headerTitle}>Progressive Overload</Text>
              <Text style={styles.headerSubtitle}>
                {new Date().toLocaleDateString('da-DK', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.devButton}
              onPress={checkForUpdates}
              disabled={isCheckingUpdate}
            >
              <Ionicons 
                name={isCheckingUpdate ? "refresh" : "download"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="person-circle" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Current Workout Status */}
        {currentWorkout && (
          <View style={[styles.currentWorkoutCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <View style={styles.currentWorkoutHeader}>
              <View style={styles.currentWorkoutInfo}>
                <Text style={[styles.currentWorkoutTitle, { color: theme.colors.text }]}>Aktiv Træning</Text>
                <Text style={[styles.currentWorkoutName, { color: theme.colors.text }]}>{currentWorkout.name}</Text>
                <Text style={[styles.currentWorkoutTime, { color: theme.colors.textSecondary }]}>
                  Startet: {new Date(currentWorkout.date).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={[styles.activeIndicator, { backgroundColor: theme.colors.accent }]} />
            </View>
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleContinueWorkout}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.continueButtonText}>Fortsæt Træning</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Din Statistik</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="fitness" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.totalWorkouts}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Træninger</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.secondary + '20' }]}>
                <Ionicons name="calendar" size={24} color={theme.colors.secondary} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.thisWeekWorkouts}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Denne uge</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="library" size={24} color={theme.colors.accent} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.totalExercises}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Øvelser</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.info + '20' }]}>
                <Ionicons name="trophy" size={24} color={theme.colors.info} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.favoriteMuscleGroup}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Favorit</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Hurtige Handlinger</Text>
          <View style={styles.quickActionsGrid}>
           <TouchableOpacity 
             style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
              onPress={() => navigation.navigate('Training', { initialTab: 'exercises' })}
           >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="library" size={28} color={theme.colors.primary} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Øvelser</Text>
              <Text style={[styles.quickActionSubtext, { color: theme.colors.textSecondary }]}>Administrer øvelser</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
              onPress={() => navigation.navigate('Training', { initialTab: 'builder' })}
           >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.secondary + '20' }]}>
                <Ionicons name="build" size={28} color={theme.colors.secondary} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Session Opretter</Text>
              <Text style={[styles.quickActionSubtext, { color: theme.colors.textSecondary }]}>Opret sessioner</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
              onPress={() => navigation.navigate('Progress')}
           >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="stats-chart" size={28} color={theme.colors.accent} />
              </View>
             <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Fremskridt</Text>
             <Text style={[styles.quickActionSubtext, { color: theme.colors.textSecondary }]}>Se statistikker</Text>
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
              onPress={() => navigation.navigate('Profile')}
           >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.info + '20' }]}>
                <Ionicons name="person" size={28} color={theme.colors.info} />
              </View>
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Profil</Text>
              <Text style={[styles.quickActionSubtext, { color: theme.colors.textSecondary }]}>Indstillinger</Text>
           </TouchableOpacity>
         </View>
       </View>

        {/* Training Sessions - Copied from TrainingScreen */}
        <View style={styles.sessionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Træningssessioner</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('Training', { initialTab: 'builder' })}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {trainingSessions && trainingSessions.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionsScroll}>
              {trainingSessions.map((session) => (
                  <TouchableOpacity
                  key={session.id}
                  style={[styles.sessionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
                  onPress={() => handleStartTraining(session.id)}
                >
                  <View style={styles.sessionHeader}>
                    <View style={[styles.muscleGroupIndicator, { backgroundColor: getMuscleGroupColor(session.muscle_group_id) }]} />
                    <View style={styles.sessionInfo}>
                      <Text style={[styles.sessionName, { color: theme.colors.text }]}>{session.name}</Text>
                      <Text style={[styles.sessionDescription, { color: theme.colors.textSecondary }]}>
                        {session.description || 'Ingen beskrivelse'}
                      </Text>
                      <View style={styles.sessionMeta}>
                        <View style={styles.sessionMetaItem}>
                          <Ionicons name="fitness" size={14} color={theme.colors.textTertiary} />
                          <Text style={[styles.sessionMetaText, { color: theme.colors.textTertiary }]}>
                            {getExercisesForSession(session.id).length} øvelser
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.playButton, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Ionicons name="play" size={20} color={theme.colors.primary} />
                    </View>
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
              
                  <TouchableOpacity
                    style={[styles.startButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleStartTraining(session.id)}
                  >
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={styles.startButtonText}>Start Træning</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="fitness-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>Ingen sessioner endnu</Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                Opret din første træningssession for at komme i gang
              </Text>
                  <TouchableOpacity
                style={[styles.createFirstButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('Training', { initialTab: 'builder' })}
                  >
                <Text style={styles.createFirstButtonText}>Opret Session</Text>
                  </TouchableOpacity>
            </View>
          )}
                    </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  currentWorkoutCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currentWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  currentWorkoutInfo: {
    flex: 1,
  },
  currentWorkoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentWorkoutName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  currentWorkoutTime: {
    fontSize: 14,
  },
  activeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 60) / 2,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  sessionsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  sessionCard: {
    width: width * 0.7,
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 2,
  },
  sessionDescription: {
    fontSize: 14,
  },
  exercisePreview: {
    marginBottom: 15,
  },
  exercisePreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  exerciseSeparator: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  moreExercises: {
    fontSize: 12,
    marginLeft: 6,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
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
    marginBottom: 20,
    lineHeight: 20,
  },
  createFirstButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // New UI Improvement Styles
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
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  // Session Card Improvements
  sessionMeta: {
    flexDirection: 'row',
    marginTop: 8,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  sessionMetaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});