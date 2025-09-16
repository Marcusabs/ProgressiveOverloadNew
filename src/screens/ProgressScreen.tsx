import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useExerciseStore } from '../stores/exerciseStore';
import { useProgressStore } from '../stores/progressStore';
import { useAchievementsStore } from '../stores/achievementsStore';
import { useTheme } from '../contexts/ThemeContext';

export default function ProgressScreen() {
  const { exercises, trainingSessions, workouts } = useExerciseStore();
  const { progressData, getRecentWorkouts } = useProgressStore();
  const { achievements, userStats, loadAchievements, loadUserStats, checkAchievements, getAchievementsByCategory, getUnlockedAchievements } = useAchievementsStore();
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'achievements'>('overview');
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const workouts = await getRecentWorkouts(10);
      setRecentWorkouts(workouts);
      
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

  const getTrainingStats = () => {
    const totalExercises = exercises.length;
    const totalSessions = trainingSessions.length;
    const uniqueMuscleGroups = new Set(exercises.map(e => e.muscle_group_id)).size;
    
    // Calculate real workout stats
    const completedWorkouts = workouts.filter(w => w.completed);
    const totalWorkouts = completedWorkouts.length;
    
    // Calculate total volume and average weight from progress data
    const totalVolume = progressData.reduce((sum, p) => sum + p.total_volume, 0);
    const averageWeight = progressData.length > 0 
      ? progressData.reduce((sum, p) => sum + p.max_weight, 0) / progressData.length 
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
      const exerciseName = exercises.find(e => e.id === data.exercise_id)?.name || 'Unknown';
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
        data: exerciseData.map(d => d.max_weight),
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
      groups[dateKey].totalVolume += data.total_volume;
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

  const muscleGroups = [
    { id: '1', name: 'Bryst', color: '#FF6B6B' },
    { id: '2', name: 'Skulder', color: '#4ECDC4' },
    { id: '3', name: 'Triceps', color: '#45B7D1' },
    { id: '4', name: 'Ben', color: '#96CEB4' },
    { id: '5', name: 'Biceps', color: '#FFEAA7' },
    { id: '6', name: 'Ryg', color: '#DDA0DD' },
  ];

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
          <Text style={[styles.statNumber, { color: theme.colors.text }]}>{getTrainingStats().totalVolume}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Volumen</Text>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Seneste Aktivitet</Text>
        {recentWorkouts.length > 0 ? (
          recentWorkouts.slice(0, 3).map((workout, index) => (
            <View key={workout.id} style={[styles.activityCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
              <View style={styles.activityItem}>
                <Ionicons name="fitness" size={16} color={theme.colors.primary} />
                <Text style={[styles.activityText, { color: theme.colors.text }]}>{workout.name}</Text>
                <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>
                  {new Date(workout.date).toLocaleDateString('da-DK')}
                </Text>
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
            </View>
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
          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Start Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="stats-chart" size={24} color={theme.colors.secondary} />
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Se Analyser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="trophy" size={24} color={theme.colors.secondary} />
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Achievements</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
            <Ionicons name="share" size={24} color={theme.colors.accent} />
            <Text style={[styles.quickActionText, { color: theme.colors.text }]}>Del Progress</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAnalyticsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Detaljerede Analyser</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Træningsstatistikker og fremskridt</Text>
      </View>

      {/* Volume Tracking */}
      <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
        <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>Volumen Tracking</Text>
        <View style={styles.analyticsRow}>
          <Text style={[styles.analyticsLabel, { color: theme.colors.text }]}>Total Volumen:</Text>
          <Text style={[styles.analyticsValue, { color: theme.colors.primary }]}>{getTrainingStats().totalVolume} kg</Text>
        </View>
        <View style={styles.analyticsRow}>
          <Text style={[styles.analyticsLabel, { color: theme.colors.text }]}>Gennemsnit Vægt:</Text>
          <Text style={[styles.analyticsValue, { color: theme.colors.primary }]}>{getTrainingStats().averageWeight} kg</Text>
        </View>
        <View style={styles.analyticsRow}>
          <Text style={[styles.analyticsLabel, { color: theme.colors.text }]}>Træningsfrekvens:</Text>
          <Text style={[styles.analyticsValue, { color: theme.colors.primary }]}>{getTrainingStats().thisWeekWorkouts} gange/uge</Text>
        </View>
      </View>

      {/* Muscle Group Distribution */}
      <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
        <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>Muskelgruppe Fordeling</Text>
        <Text style={[styles.analyticsSubtitle, { color: theme.colors.textSecondary }]}>Hvor meget du træner hver muskelgruppe</Text>
        
        {muscleGroups.map((muscleGroup) => {
          const groupExercises = exercises.filter(e => e.muscle_group_id === muscleGroup.id);
          const percentage = exercises.length > 0 ? Math.round((groupExercises.length / exercises.length) * 100) : 0;
          
          return (
            <View key={muscleGroup.id} style={styles.muscleGroupProgress}>
              <View style={styles.muscleGroupProgressHeader}>
                <View style={[styles.muscleGroupColor, { backgroundColor: muscleGroup.color }]} />
                <Text style={[styles.muscleGroupName, { color: theme.colors.text }]}>{muscleGroup.name}</Text>
                <Text style={[styles.muscleGroupPercentage, { color: theme.colors.textSecondary }]}>{percentage}%</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.divider }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${percentage}%`, 
                      backgroundColor: muscleGroup.color 
                    }
                  ]} 
                />
              </View>
            </View>
          );
        })}
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Achievements & Milepæle</Text>
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
              <Text style={[styles.statsSummaryValue, { color: theme.colors.primary }]}>{Math.round(userStats.totalVolume)}kg</Text>
              <Text style={[styles.statsSummaryLabel, { color: theme.colors.textSecondary }]}>Total Volumen</Text>
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
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Seneste Achievements</Text>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.colors.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Progress</Text>
        <Text style={styles.headerSubtitle}>Spor dit fremskridt og analyser</Text>
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
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'overview' && { color: theme.colors.primary, fontWeight: '600' }]}>
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
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'analytics' && { color: theme.colors.primary, fontWeight: '600' }]}>
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
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'achievements' && { color: theme.colors.primary, fontWeight: '600' }]}>
            Achievements
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'achievements' && renderAchievementsTab()}
      </ScrollView>
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
  chartContainer: {
    marginRight: 20,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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
});
