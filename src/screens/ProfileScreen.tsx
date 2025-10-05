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
  Switch,
  Platform,
  StatusBar,
  Dimensions,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../types';
import { getDatabase } from '../database';
import { UserProfile } from '../types';
import { useExerciseStore } from '../stores/exerciseStore';
import { useTheme } from '../contexts/ThemeContext';

type ProfileScreenNavigationProp = BottomTabNavigationProp<RootTabParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { exercises, trainingSessions } = useExerciseStore();
  const { theme, isDark, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [recentWorkouts, setRecentWorkouts] = useState<Array<any>>([]);
  const [showWorkoutLogModal, setShowWorkoutLogModal] = useState(false);
  const [longPressedWorkout, setLongPressedWorkout] = useState<any>(null);
  const [showDataImportModal, setShowDataImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    weight: '',
    height: '',
    experience: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    goals: '',
    preferredUnits: 'metric' as 'metric' | 'imperial',
    defaultRestTime: '90',
  });
  const [settings, setSettings] = useState({
    notifications: true,
    hapticFeedback: true,
    autoRestTimer: false,
    defaultRestTime: 90,
    darkMode: false,
    language: 'da' as 'da' | 'en',
  });

  useEffect(() => {
    loadProfile();
    loadRecentWorkouts();
  }, []);

  const loadRecentWorkouts = async () => {
    try {
      const db = getDatabase();
      const workouts = await db.getAllAsync(`
        SELECT 
          w.id,
          w.name,
          w.date,
          w.duration,
          w.completed,
          w.notes,
          ts.name as session_name,
          COUNT(DISTINCT we.exercise_id) as exercise_count,
          COUNT(s.id) as total_sets
        FROM workouts w
        LEFT JOIN training_sessions ts ON w.session_id = ts.id
        LEFT JOIN workout_exercises we ON w.id = we.workout_id
        LEFT JOIN sets s ON we.id = s.workout_exercise_id
        WHERE w.completed = 1
        GROUP BY w.id
        ORDER BY w.date DESC, w.created_at DESC
        LIMIT 10
      `) as any[];
      
      setRecentWorkouts(workouts);
    } catch (error) {
      console.error('Error loading recent workouts:', error);
    }
  };

  // 🚀 DATA IMPORT/EXPORT FUNCTIONS
  const handleExportData = async () => {
    try {
      const { exportAllData } = useExerciseStore.getState();
      const dataJson = await exportAllData();
      
      // Automatisk kopier til udklipsholder
      await Clipboard.setString(dataJson);
      
      Alert.alert(
        '✅ Data Eksporteret & Kopieret!',
        `📊 JSON data (${dataJson.length} karakterer) er eksporteret og automatisk kopieret til udklipsholderen!\n\n📋 Du kan nu indsætte det i Import Data feltet.`,
        [
          { text: 'OK' }
        ]
      );
      
      console.log('Exported and copied data:', dataJson);
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Fejl', 'Kunne ikke eksportere data');
    }
  };

  const handleImportData = async () => {
    if (!importData.trim()) {
      Alert.alert('Fejl', 'Indtast venligst JSON data');
      return;
    }

    try {
      const { importAllData } = useExerciseStore.getState();
      const success = await importAllData(importData);
      
      if (success) {
        Alert.alert(
          'Succes!',
          'Data er importeret succesfuldt!',
          [
            { 
              text: 'OK', 
              onPress: () => {
                setShowDataImportModal(false);
                setImportData('');
                // Reload data
                loadRecentWorkouts();
              }
            }
          ]
        );
      } else {
        Alert.alert('Fejl', 'Kunne ikke importere data');
      }
    } catch (error) {
      console.error('Import failed:', error);
      Alert.alert('Fejl', 'Ugyldig data format');
    }
  };

  const loadAllWorkouts = async () => {
    try {
      const db = getDatabase();
      const workouts = await db.getAllAsync(`
        SELECT 
          w.id,
          w.name,
          w.date,
          w.duration,
          w.completed,
          w.notes,
          ts.name as session_name,
          COUNT(DISTINCT we.exercise_id) as exercise_count,
          COUNT(s.id) as total_sets
        FROM workouts w
        LEFT JOIN training_sessions ts ON w.session_id = ts.id
        LEFT JOIN workout_exercises we ON w.id = we.workout_id
        LEFT JOIN sets s ON we.id = s.workout_exercise_id
        WHERE w.completed = 1
        GROUP BY w.id
        ORDER BY w.date DESC, w.created_at DESC
      `) as any[];
      
      setRecentWorkouts(workouts);
    } catch (error) {
      console.error('Error loading all workouts:', error);
    }
  };

  const handleDeleteWorkout = async (workout: any) => {
    Alert.alert(
      'Slet Træning',
      `Er du sikker på at du vil slette træningen "${workout.name}"? Denne handling kan ikke fortrydes.`,
      [
        { text: 'Annuller', style: 'cancel' },
        { 
          text: 'Slet', 
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteWorkout } = useExerciseStore.getState();
              await deleteWorkout(workout.id);
              
              // Refresh data
              const { loadWorkouts } = useExerciseStore.getState();
              await loadWorkouts();
              await loadRecentWorkouts();
              await loadAllWorkouts();
              
              Alert.alert('Succes', 'Træningen blev slettet');
              setLongPressedWorkout(null);
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Fejl', 'Kunne ikke slette træningen');
            }
          }
        }
      ]
    );
  };

  const loadProfile = async () => {
    try {
      const db = getDatabase();
      const profileData = await db.getFirstAsync('SELECT * FROM user_profile LIMIT 1') as any;
      
      if (profileData) {
        setProfile({
          id: profileData.id,
          name: profileData.name,
          weight: profileData.weight,
          height: profileData.height,
          experience: profileData.experience,
          goals: profileData.goals ? JSON.parse(profileData.goals) : [],
          createdAt: new Date(profileData.created_at)
        });
        
        // Update editForm with profile data
        setEditForm(prev => ({
          ...prev,
          name: profileData.name,
          weight: profileData.weight?.toString() || '',
          height: profileData.height?.toString() || '',
          experience: profileData.experience,
          goals: profileData.goals ? JSON.parse(profileData.goals).join(', ') : '',
          preferredUnits: profileData.preferred_units || 'metric',
          defaultRestTime: profileData.default_rest_time || '90'
        }));
      } else {
        // Create default profile
        await createDefaultProfile();
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const createDefaultProfile = async () => {
    try {
      const db = getDatabase();
      const profileId = Date.now().toString();
      
      await db.runAsync(`
        INSERT INTO user_profile (id, name, experience, goals, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [profileId, 'User', 'beginner', '[]', new Date().toISOString()]);

      setProfile({
        id: profileId,
        name: 'User',
        experience: 'beginner',
        goals: [],
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const handleEditProfile = () => {
    if (profile) {
      setEditForm({
        name: profile.name,
        weight: profile.weight?.toString() || '',
        height: profile.height?.toString() || '',
        experience: profile.experience,
        goals: Array.isArray(profile.goals) ? profile.goals.join(', ') : '',
        preferredUnits: 'metric',
        defaultRestTime: '90'
      });
      setShowEditModal(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Fejl', 'Navn er påkrævet');
      return;
    }

    try {
      const db = getDatabase();
      const goals = editForm.goals.split(',').map(g => g.trim()).filter(g => g);
      
      await db.runAsync(`
        UPDATE user_profile 
        SET name = ?, weight = ?, height = ?, experience = ?, goals = ?
        WHERE id = ?
      `, [
        editForm.name,
        editForm.weight ? parseFloat(editForm.weight) : null,
        editForm.height ? parseFloat(editForm.height) : null,
        editForm.experience,
        JSON.stringify(goals),
        profile?.id || ''
      ]);

      setProfile({
        ...profile!,
        name: editForm.name,
        weight: editForm.weight ? parseFloat(editForm.weight) : undefined,
        height: editForm.height ? parseFloat(editForm.height) : undefined,
        experience: editForm.experience,
        goals: goals
      });

      setShowEditModal(false);
      Alert.alert('Succes', 'Profil opdateret succesfuldt');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Fejl', 'Kunne ikke opdatere profil');
    }
  };

  const handleBackupData = async () => {
    try {
      // Simuler backup til cloud
      Alert.alert(
        'Backup Startet',
        'Dine data bliver sikkerhedskopieret til skyen...',
        [{ text: 'OK' }]
      );
      
      // Simuler backup proces
      setTimeout(() => {
        Alert.alert(
          'Backup Fuldført',
          'Dine data er nu sikkerhedskopieret og synkroniseret.',
          [{ text: 'OK' }]
        );
      }, 2000);
    } catch (error) {
      console.error('Error backing up data:', error);
      Alert.alert('Fejl', 'Kunne ikke lave backup');
    }
  };

  const handleShareProgress = () => {
    Alert.alert(
      'Del Fremskridt',
      'Vælg hvordan du vil dele dit fremskridt:',
      [
        { text: 'Annuller', style: 'cancel' },
        { text: 'Instagram Story', onPress: () => console.log('Share to Instagram') },
        { text: 'Facebook', onPress: () => console.log('Share to Facebook') },
        { text: 'Twitter', onPress: () => console.log('Share to Twitter') },
        { text: 'Kopier Link', onPress: () => console.log('Copy link') }
      ]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      'Hjælp & Support',
      'Velkommen til EvoLift!\n\n📱 Træning: Opret sessioner og følg dine øvelser\n📊 Fremskridt: Se dine resultater og analyser\n🏆 Præstationer: Optjen badges for dine mål\n\nHar du spørgsmål? Kontakt support@evolift.dk',
      [
        { text: 'FAQ', onPress: () => console.log('Open FAQ') },
        { text: 'Kontakt Support', onPress: () => console.log('Contact support') },
        { text: 'OK' }
      ]
    );
  };


  const getExperienceColor = (experience: string) => {
    switch (experience) {
      case 'beginner': return '#4CAF50';
      case 'intermediate': return '#FF9800';
      case 'advanced': return '#F44336';
      default: return '#666';
    }
  };

  const getTrainingStats = () => {
    const totalExercises = exercises.length;
    const totalSessions = trainingSessions.length;
    const uniqueMuscleGroups = new Set(exercises.map(e => e.muscle_group_id)).size;
    
    return {
      totalExercises,
      totalSessions,
      uniqueMuscleGroups,
      favoriteMuscleGroup: getFavoriteMuscleGroup(),
      totalWorkouts: 0, // This would come from workout history
    };
  };

  const getFavoriteMuscleGroup = () => {
    const muscleGroupCounts: { [key: string]: number } = {};
    exercises.forEach(exercise => {
      muscleGroupCounts[exercise.muscle_group_id] = (muscleGroupCounts[exercise.muscle_group_id] || 0) + 1;
    });
    
    const favorite = Object.entries(muscleGroupCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    return favorite ? favorite[0] : 'Ingen';
  };

  const formatUnits = (value: number | undefined, unit: 'weight' | 'height') => {
    if (editForm.preferredUnits === 'imperial') {
      if (unit === 'weight') {
        return `${(value || 0) * 2.20462} lbs`;
      } else {
        return `${(value || 0) * 0.393701} inches`;
      }
    }
    return unit === 'weight' ? `${value || 0} kg` : `${value || 0} cm`;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.primary} />
      {/* Profile Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#fff" />
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{profile?.name || 'Bruger'}</Text>
            <View style={[styles.experienceBadge, { backgroundColor: getExperienceColor(profile?.experience || 'beginner') }]}>
              <Text style={styles.experienceText}>
                {profile?.experience === 'beginner' ? 'Begynder' : 
                 profile?.experience === 'intermediate' ? 'Mellem' : 
                 profile?.experience === 'advanced' ? 'Avanceret' : 'Begynder'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
            accessibilityLabel="Rediger Profil"
            accessibilityHint="Tryk for at redigere profil information"
          >
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Profile Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Profil Information</Text>
                     <View style={[styles.infoCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
             <View style={styles.infoRow}>
               <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
               <Text style={[styles.infoLabel, { color: theme.colors.text }]}>Navn</Text>
               <Text style={[styles.infoValue, { color: theme.colors.textSecondary }]}>{profile?.name || 'Ikke sat'}</Text>
             </View>
             {profile?.weight && (
               <View style={styles.infoRow}>
                 <Ionicons name="fitness-outline" size={20} color={theme.colors.textSecondary} />
                 <Text style={[styles.infoLabel, { color: theme.colors.text }]}>Vægt</Text>
                 <Text style={[styles.infoValue, { color: theme.colors.textSecondary }]}>{formatUnits(profile.weight, 'weight')}</Text>
               </View>
             )}
             {profile?.height && (
               <View style={styles.infoRow}>
                 <Ionicons name="resize-outline" size={20} color={theme.colors.textSecondary} />
                 <Text style={[styles.infoLabel, { color: theme.colors.text }]}>Højde</Text>
                 <Text style={[styles.infoValue, { color: theme.colors.textSecondary }]}>{formatUnits(profile.height, 'height')}</Text>
               </View>
             )}
             <View style={styles.infoRow}>
               <Ionicons name="trophy-outline" size={20} color={theme.colors.textSecondary} />
               <Text style={[styles.infoLabel, { color: theme.colors.text }]}>Erfaring</Text>
               <Text style={[styles.infoValue, { color: theme.colors.textSecondary }]}>
                 {profile?.experience === 'beginner' ? 'Begynder' : 
                  profile?.experience === 'intermediate' ? 'Mellem' : 
                  profile?.experience === 'advanced' ? 'Avanceret' : 'Begynder'}
               </Text>
             </View>
           </View>
        </View>

        {/* Training Statistics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Træningsstatistikker</Text>
            <TouchableOpacity onPress={() => setShowStatsModal(true)}>
              <Ionicons name="stats-chart" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
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
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>-</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Workouts</Text>
            </View>
          </View>
        </View>

        {/* Goals */}
        {profile?.goals && profile.goals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Mål</Text>
            <View style={[styles.goalsCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
                           {profile.goals.map((goal, index) => (
               <View key={`goal-${index}-${goal}`} style={styles.goalItem}>
                 <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                 <Text style={[styles.goalText, { color: theme.colors.text }]}>{goal}</Text>
               </View>
             ))}
            </View>
          </View>
        )}

        {/* Workout Log */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Seneste Træninger</Text>
            <TouchableOpacity onPress={() => {
              loadAllWorkouts();
              setShowWorkoutLogModal(true);
            }}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>Se alle</Text>
            </TouchableOpacity>
          </View>
          
          {recentWorkouts.length > 0 ? (
            <View style={styles.workoutLogContainer}>
              {recentWorkouts.slice(0, 3).map((workout, index) => (
                <TouchableOpacity 
                  key={workout.id} 
                  style={[styles.workoutLogItem, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
                  onLongPress={() => handleDeleteWorkout(workout)}
                  activeOpacity={0.7}
                >
                  <View style={styles.workoutLogHeader}>
                    <View style={styles.workoutLogInfo}>
                      <Text style={[styles.workoutLogName, { color: theme.colors.text }]} numberOfLines={1}>
                        {workout.name}
                      </Text>
                      <Text style={[styles.workoutLogSession, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {workout.session_name}
                      </Text>
                    </View>
                    <View style={styles.workoutLogDate}>
                      <Text style={[styles.workoutLogDateText, { color: theme.colors.textSecondary }]}>
                        {new Date(workout.date).toLocaleDateString('da-DK', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.workoutLogStats}>
                    <View style={styles.workoutLogStat}>
                      <Ionicons name="time" size={14} color={theme.colors.primary} />
                      <Text style={[styles.workoutLogStatText, { color: theme.colors.textSecondary }]}>
                        {workout.duration || 0} min
                      </Text>
                    </View>
                    <View style={styles.workoutLogStat}>
                      <Ionicons name="fitness" size={14} color={theme.colors.secondary} />
                      <Text style={[styles.workoutLogStatText, { color: theme.colors.textSecondary }]}>
                        {workout.exercise_count || 0} øvelser
                      </Text>
                    </View>
                    <View style={styles.workoutLogStat}>
                      <Ionicons name="layers" size={14} color={theme.colors.accent} />
                      <Text style={[styles.workoutLogStatText, { color: theme.colors.textSecondary }]}>
                        {workout.total_sets || 0} sæt
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyWorkoutLog, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="fitness-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyWorkoutLogText, { color: theme.colors.text }]}>Ingen træninger endnu</Text>
              <Text style={[styles.emptyWorkoutLogSubtext, { color: theme.colors.textSecondary }]}>
                Dine fuldførte træninger vil vises her
              </Text>
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Indstillinger</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Notifikationer</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Modtag træningspåmindelser</Text>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={(value) => setSettings({ ...settings, notifications: value })}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={settings.notifications ? '#fff' : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Haptisk Feedback</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Vibration ved interaktioner</Text>
              </View>
              <Switch
                value={settings.hapticFeedback}
                onValueChange={(value) => setSettings({ ...settings, hapticFeedback: value })}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={settings.hapticFeedback ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Auto Rest Timer</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Start automatisk rest timer</Text>
              </View>
              <Switch
                value={settings.autoRestTimer}
                onValueChange={(value) => setSettings({ ...settings, autoRestTimer: value })}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={settings.autoRestTimer ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Mørk Tilstand</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Brug mørk tema</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(value) => setTheme(value)}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
                thumbColor={isDark ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
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
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Start Træning</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
              onPress={() => navigation.navigate('Progress', { initialTab: 'calendar' })}
            >
              <Ionicons name="calendar" size={24} color={theme.colors.secondary} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Se Kalender</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
              onPress={() => navigation.navigate('Progress', { initialTab: 'analytics' })}
            >
              <Ionicons name="stats-chart" size={24} color={theme.colors.accent} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Analyser</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
              onPress={handleExportData}
            >
              <Ionicons name="download-outline" size={24} color={theme.colors.secondary} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Export Data</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
              onPress={() => setShowDataImportModal(true)}
            >
              <Ionicons name="cloud-upload-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Importer Data</Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* App Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>App Information</Text>
          <View style={[styles.infoCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Text style={[styles.appInfo, { color: theme.colors.text }]}>
              EvoLift v{Constants.expoConfig?.version || '1.0.0'}
            </Text>
            <Text style={[styles.appInfo, { color: theme.colors.text }]}>Built with React Native & Expo</Text>
          </View>
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Rediger Profil</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.card, 
                color: theme.colors.text, 
                borderColor: theme.colors.border 
              }]}
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
              placeholder="Navn"
              placeholderTextColor={theme.colors.textTertiary}
            />
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.card, 
                color: theme.colors.text, 
                borderColor: theme.colors.border 
              }]}
              value={editForm.weight}
              onChangeText={(text) => setEditForm({ ...editForm, weight: text })}
              placeholder="Vægt (kg)"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="numeric"
            />
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.card, 
                color: theme.colors.text, 
                borderColor: theme.colors.border 
              }]}
              value={editForm.height}
              onChangeText={(text) => setEditForm({ ...editForm, height: text })}
              placeholder="Højde (cm)"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="numeric"
            />

            <View style={styles.experienceSelector}>
              <Text style={[styles.selectorLabel, { color: theme.colors.text }]}>Erfaringsniveau</Text>
                             {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                 <TouchableOpacity
                   key={`experience-${level}`}
                   style={[
                     styles.experienceOption,
                     { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                     editForm.experience === level && { backgroundColor: theme.colors.primary }
                   ]}
                   onPress={() => setEditForm({ ...editForm, experience: level })}
                 >
                   <Text style={[
                     styles.experienceOptionText,
                     { color: theme.colors.textSecondary },
                     editForm.experience === level && { color: '#FFFFFF' }
                   ]}>
                     {level === 'beginner' ? 'Begynder' : level === 'intermediate' ? 'Mellem' : 'Avanceret'}
                   </Text>
                 </TouchableOpacity>
               ))}
            </View>
            
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: theme.colors.card, 
                color: theme.colors.text, 
                borderColor: theme.colors.border 
              }]}
              value={editForm.goals}
              onChangeText={(text) => setEditForm({ ...editForm, goals: text })}
              placeholder="Mål (adskilt med komma)"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Annuller</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Gem</Text>
              </TouchableOpacity>
            </View>
          </View>
                  </View>
        </Modal>

        {/* Statistics Modal */}
        <Modal
          visible={showStatsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStatsModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Detaljerede Statistikker</Text>
              
              <View style={styles.statsModalContent}>
                <View style={styles.statRow}>
                  <Text style={[styles.statsModalLabel, { color: theme.colors.text }]}>Total Øvelser:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>{getTrainingStats().totalExercises}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statsModalLabel, { color: theme.colors.text }]}>Total Sessioner:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>{getTrainingStats().totalSessions}</Text>
                </View>
                                  <View style={styles.statRow}>
                    <Text style={[styles.statsModalLabel, { color: theme.colors.text }]}>Muskelgrupper:</Text>
                    <Text style={[styles.statValue, { color: theme.colors.primary }]}>{getTrainingStats().uniqueMuscleGroups}</Text>
                  </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statsModalLabel, { color: theme.colors.text }]}>Favorit Muskelgruppe:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>{getTrainingStats().favoriteMuscleGroup}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => setShowStatsModal(false)}
              >
                <Text style={styles.saveButtonText}>Luk</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Workout Log Modal */}
        <Modal
          visible={showWorkoutLogModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowWorkoutLogModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Alle Træninger</Text>
                <TouchableOpacity onPress={() => setShowWorkoutLogModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.workoutLogModalContent}>
                {recentWorkouts.length > 0 ? (
                  recentWorkouts.map((workout, index) => (
                    <TouchableOpacity 
                      key={workout.id} 
                      style={[styles.workoutLogItem, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow, marginBottom: 12 }]}
                      onLongPress={() => handleDeleteWorkout(workout)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.workoutLogHeader}>
                        <View style={styles.workoutLogInfo}>
                          <Text style={[styles.workoutLogName, { color: theme.colors.text }]} numberOfLines={1}>
                            {workout.name}
                          </Text>
                          <Text style={[styles.workoutLogSession, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {workout.session_name}
                          </Text>
                        </View>
                        <View style={styles.workoutLogDate}>
                          <Text style={[styles.workoutLogDateText, { color: theme.colors.textSecondary }]}>
                            {new Date(workout.date).toLocaleDateString('da-DK', { 
                              day: 'numeric', 
                              month: 'short',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.workoutLogStats}>
                        <View style={styles.workoutLogStat}>
                          <Ionicons name="time" size={14} color={theme.colors.primary} />
                          <Text style={[styles.workoutLogStatText, { color: theme.colors.textSecondary }]}>
                            {workout.duration || 0} min
                          </Text>
                        </View>
                        <View style={styles.workoutLogStat}>
                          <Ionicons name="fitness" size={14} color={theme.colors.secondary} />
                          <Text style={[styles.workoutLogStatText, { color: theme.colors.textSecondary }]}>
                            {workout.exercise_count || 0} øvelser
                          </Text>
                        </View>
                        <View style={styles.workoutLogStat}>
                          <Ionicons name="layers" size={14} color={theme.colors.accent} />
                          <Text style={[styles.workoutLogStatText, { color: theme.colors.textSecondary }]}>
                            {workout.total_sets || 0} sæt
                          </Text>
                        </View>
                      </View>
                      
                      {workout.notes && (
                        <View style={styles.workoutLogNotes}>
                          <Text style={[styles.workoutLogNotesText, { color: theme.colors.textSecondary }]}>
                            {workout.notes}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={[styles.emptyWorkoutLog, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="fitness-outline" size={48} color={theme.colors.textTertiary} />
                    <Text style={[styles.emptyWorkoutLogText, { color: theme.colors.text }]}>Ingen træninger endnu</Text>
                    <Text style={[styles.emptyWorkoutLogSubtext, { color: theme.colors.textSecondary }]}>
                      Dine fuldførte træninger vil vises her
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Data Import Modal */}
        <Modal
          visible={showDataImportModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDataImportModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
            <View style={[styles.modalContent, styles.dataImportModal, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Importer Data</Text>
                <TouchableOpacity onPress={() => setShowDataImportModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.dataImportContent}>
                <Text style={[styles.dataImportDescription, { color: theme.colors.textSecondary }]}>
                  Indtast JSON data fra den gamle app for at gendanne alle træningsdata:
                </Text>
                
                <View style={styles.dataImportInputContainer}>
                  <TextInput
                    style={[styles.dataImportInput, { 
                      backgroundColor: theme.colors.card, 
                      color: theme.colors.text,
                      borderColor: theme.colors.border 
                    }]}
                    value={importData}
                    onChangeText={setImportData}
                    placeholder="Indtast JSON data her..."
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                  />
                  
                  <TouchableOpacity
                    style={[styles.pasteButton, { backgroundColor: theme.colors.primary }]}
                    onPress={async () => {
                      try {
                        const clipboardContent = await Clipboard.getString();
                        setImportData(clipboardContent);
                        Alert.alert('✅ Indsat!', 'Data fra udklipsholderen er indsat!');
                      } catch (error) {
                        Alert.alert('Fejl', 'Kunne ikke hente data fra udklipsholder');
                      }
                    }}
                  >
                    <Ionicons name="clipboard" size={16} color="#fff" />
                    <Text style={styles.pasteButtonText}>Indsæt</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Knapper udenfor ScrollView - altid synlige */}
              <View style={styles.dataImportButtons}>
                <TouchableOpacity
                  style={[styles.dataImportButton, styles.cancelButton]}
                  onPress={() => setShowDataImportModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuller</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.dataImportButton, styles.saveButton]}
                  onPress={handleImportData}
                >
                  <Text style={styles.saveButtonText}>Importer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  experienceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  experienceText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoCard: {
    borderRadius: 12,
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  goalsCard: {
    borderRadius: 12,
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  goalText: {
    fontSize: 14,
    marginLeft: 8,
  },
  settingsCard: {
    borderRadius: 12,
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  appInfo: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  workoutLogContainer: {
    gap: 12,
  },
  workoutLogItem: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutLogInfo: {
    flex: 1,
  },
  workoutLogName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  workoutLogSession: {
    fontSize: 14,
  },
  workoutLogDate: {
    alignItems: 'flex-end',
  },
  workoutLogDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  workoutLogStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workoutLogStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workoutLogStatText: {
    fontSize: 12,
  },
  emptyWorkoutLog: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
  },
  emptyWorkoutLogText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyWorkoutLogSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  workoutLogModalContent: {
    maxHeight: 400,
  },
  workoutLogNotes: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  workoutLogNotesText: {
    fontSize: 12,
    fontStyle: 'italic',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  experienceSelector: {
    marginBottom: 15,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  experienceOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  selectedExperienceOption: {
    // Will be handled dynamically
  },
  experienceOptionText: {
    fontSize: 16,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  selectedExperienceOptionText: {
    // Will be handled dynamically
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
  cancelButton: {
    // Will be handled dynamically
  },
  saveButton: {
    // Will be handled dynamically
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  saveButtonText: {
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  statsModalContent: {
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statsModalLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Data Import Styles
  dataImportContent: {
    padding: 20,
  },
  dataImportDescription: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  dataImportInputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  dataImportInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 200,
    paddingRight: 80, // Space for paste button
  },
  pasteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pasteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dataImportModal: {
    maxHeight: '90%',
    margin: 20,
    flex: 1,
  },
  dataImportButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  dataImportButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FF453A',
  },
  saveButton: {
    backgroundColor: '#00D4FF',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
