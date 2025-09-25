import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Optimized quick action card component
interface QuickActionCardProps {
  title: string;
  icon: string;
  gradient: string[];
  onPress: () => void;
}

export const QuickActionCard = memo<QuickActionCardProps>(({ title, icon, gradient, onPress }) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
    <LinearGradient colors={gradient as any} style={styles.quickActionGradient}>
      <Ionicons name={icon as any} size={24} color="#fff" />
      <Text style={styles.quickActionText}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
));

// Optimized stats card component
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

export const StatsCard = memo<StatsCardProps>(({ title, value, icon, color }) => (
  <View style={styles.statsCard}>
    <View style={[styles.statsIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <View style={styles.statsContent}>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  </View>
));

// Optimized workout item component
interface WorkoutItemProps {
  title: string;
  exercises: number;
  duration: string;
  date: string;
  onPress: () => void;
}

export const WorkoutItem = memo<WorkoutItemProps>(({ title, exercises, duration, date, onPress }) => (
  <TouchableOpacity style={styles.workoutItem} onPress={onPress}>
    <View style={styles.workoutIcon}>
      <Ionicons name="barbell" size={20} color="#007AFF" />
    </View>
    <View style={styles.workoutContent}>
      <Text style={styles.workoutTitle}>{title}</Text>
      <Text style={styles.workoutDetails}>{exercises} øvelser • {duration} • {date}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#999" />
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  quickActionCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  quickActionGradient: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statsContent: {
    flex: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statsTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  workoutItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  workoutContent: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  workoutDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
