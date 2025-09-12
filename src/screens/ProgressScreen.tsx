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
import { useExerciseStore } from '../stores/exerciseStore';
import { useTheme } from '../contexts/ThemeContext';

export default function ProgressScreen() {
  const { exercises, trainingSessions } = useExerciseStore();
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'achievements'>('overview');

  const getTrainingStats = () => {
    const totalExercises = exercises.length;
    const totalSessions = trainingSessions.length;
    const uniqueMuscleGroups = new Set(exercises.map(e => e.muscle_group_id)).size;
    
    return {
      totalExercises,
      totalSessions,
      uniqueMuscleGroups,
      totalWorkouts: 0, // TODO: Implement workout tracking
      totalVolume: 0, // TODO: Calculate from workout data
      averageWeight: 0, // TODO: Calculate from workout data
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
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Seneste Aktivitet</Text>
        <View style={[styles.activityCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <View style={styles.activityItem}>
            <Ionicons name="time" size={16} color={theme.colors.secondary} />
            <Text style={[styles.activityText, { color: theme.colors.text }]}>Ingen seneste aktivitet</Text>
            <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>Start din første træning</Text>
          </View>
        </View>
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
          <Text style={[styles.analyticsValue, { color: theme.colors.primary }]}>0 gange/uge</Text>
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

      {/* Progress Charts Placeholder */}
      <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
        <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>Fremskridt Grafer</Text>
        <Text style={[styles.analyticsSubtitle, { color: theme.colors.textSecondary }]}>Vægt og volumen over tid</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="bar-chart" size={48} color={theme.colors.textTertiary} />
          <Text style={[styles.chartPlaceholderText, { color: theme.colors.textSecondary }]}>Grafer kommer snart</Text>
          <Text style={[styles.chartPlaceholderSubtext, { color: theme.colors.textTertiary }]}>Start med at træne for at se fremskridt</Text>
        </View>
      </View>
    </View>
  );

  const renderAchievementsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Achievements & Milepæle</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Fejr dine træningspræstationer</Text>
      </View>

      {/* Achievement Categories */}
      <View style={styles.achievementsGrid}>
        <View style={[styles.achievementCategory, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="fitness" size={32} color={theme.colors.primary} />
          <Text style={[styles.achievementCategoryTitle, { color: theme.colors.text }]}>Øvelser</Text>
          <Text style={[styles.achievementCategorySubtitle, { color: theme.colors.textSecondary }]}>0/5 opnået</Text>
        </View>
        <View style={[styles.achievementCategory, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="calendar" size={32} color={theme.colors.secondary} />
          <Text style={[styles.achievementCategoryTitle, { color: theme.colors.text }]}>Konsistens</Text>
          <Text style={[styles.achievementCategorySubtitle, { color: theme.colors.textSecondary }]}>0/3 opnået</Text>
        </View>
        <View style={[styles.achievementCategory, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="trophy" size={32} color={theme.colors.secondary} />
          <Text style={[styles.achievementCategoryTitle, { color: theme.colors.text }]}>Styrke</Text>
          <Text style={[styles.achievementCategorySubtitle, { color: theme.colors.textSecondary }]}>0/4 opnået</Text>
        </View>
        <View style={[styles.achievementCategory, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <Ionicons name="star" size={32} color={theme.colors.accent} />
          <Text style={[styles.achievementCategoryTitle, { color: theme.colors.text }]}>Special</Text>
          <Text style={[styles.achievementCategorySubtitle, { color: theme.colors.textSecondary }]}>0/2 opnået</Text>
        </View>
      </View>

      {/* Specific Achievements */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Næste Milepæle</Text>
        <View style={[styles.milestoneCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <View style={styles.milestoneHeader}>
            <Ionicons name="flag" size={20} color={theme.colors.secondary} />
            <Text style={[styles.milestoneTitle, { color: theme.colors.text }]}>Første Øvelse</Text>
          </View>
          <Text style={[styles.milestoneDescription, { color: theme.colors.textSecondary }]}>
            Opret din første øvelse i øvelsesbiblioteket
          </Text>
          <View style={styles.milestoneProgress}>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.divider }]}>
              <View style={[styles.progressFill, { width: '0%', backgroundColor: theme.colors.secondary }]} />
            </View>
            <Text style={[styles.milestoneProgressText, { color: theme.colors.textSecondary }]}>0/1</Text>
          </View>
        </View>

        <View style={[styles.milestoneCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
          <View style={styles.milestoneHeader}>
            <Ionicons name="calendar" size={20} color={theme.colors.secondary} />
            <Text style={[styles.milestoneTitle, { color: theme.colors.text }]}>Første Session</Text>
          </View>
          <Text style={[styles.milestoneDescription, { color: theme.colors.textSecondary }]}>
            Opret din første træningssession
          </Text>
          <View style={styles.milestoneProgress}>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.divider }]}>
              <View style={[styles.progressFill, { width: '0%', backgroundColor: theme.colors.secondary }]} />
            </View>
            <Text style={[styles.milestoneProgressText, { color: theme.colors.textSecondary }]}>0/1</Text>
          </View>
        </View>
      </View>
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
});
