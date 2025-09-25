import { create } from 'zustand';
import { getDatabase } from '../database';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'exercises' | 'consistency' | 'strength' | 'special';
  icon: string;
  requirement: number;
  currentProgress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  points: number;
}

export interface UserStats {
  totalWorkouts: number;
  totalExercises: number;
  totalSets: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  thisWeekWorkouts: number;
  thisMonthWorkouts: number;
  maxWeightLifted: number;
  totalWorkoutTime: number;
}

interface AchievementsState {
  achievements: Achievement[];
  userStats: UserStats;
  isLoading: boolean;
  totalPoints: number;
  
  // Actions
  loadAchievements: () => Promise<void>;
  loadUserStats: () => Promise<void>;
  checkAchievements: () => Promise<void>;
  unlockAchievement: (achievementId: string) => Promise<void>;
  getAchievementsByCategory: (category: string) => Achievement[];
  getUnlockedAchievements: () => Achievement[];
  getLockedAchievements: () => Achievement[];
}

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  achievements: [],
  userStats: {
    totalWorkouts: 0,
    totalExercises: 0,
    totalSets: 0,
    totalVolume: 0,
    currentStreak: 0,
    longestStreak: 0,
    thisWeekWorkouts: 0,
    thisMonthWorkouts: 0,
    maxWeightLifted: 0,
    totalWorkoutTime: 0,
  },
  isLoading: false,
  totalPoints: 0,

  loadAchievements: async () => {
    set({ isLoading: true });
    try {
      const db = getDatabase();
      
      // Get all achievements from database
      const achievementsData = await db.getAllAsync(`
        SELECT * FROM achievements ORDER BY category, requirement
      `);

      const achievements: Achievement[] = achievementsData.map((achievement: any) => ({
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        icon: achievement.icon,
        requirement: achievement.requirement,
        currentProgress: achievement.current_progress || 0,
        isUnlocked: achievement.is_unlocked === 1,
        unlockedAt: achievement.unlocked_at,
        points: achievement.points,
      }));

      // If no achievements exist, create default ones
      if (achievements.length === 0) {
        await createDefaultAchievements(db);
        await get().loadAchievements();
        return;
      }

      set({ achievements });
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadUserStats: async () => {
    try {
      const db = getDatabase();
      
      // Get workout statistics
      const workoutStats = await db.getFirstAsync(`
        SELECT 
          COUNT(*) as totalWorkouts,
          SUM(duration) as totalWorkoutTime
        FROM workouts 
        WHERE completed = 1
      `);

      // Get exercise statistics
      const exerciseStats = await db.getFirstAsync(`
        SELECT 
          COUNT(DISTINCT we.exercise_id) as totalExercises,
          COUNT(s.id) as totalSets,
          SUM(s.weight * s.reps) as totalVolume,
          MAX(s.weight) as maxWeightLifted
        FROM workout_exercises we
        JOIN sets s ON we.id = s.workout_exercise_id
        JOIN workouts w ON we.workout_id = w.id
        WHERE w.completed = 1 AND s.completed = 1
      `);

      // Get streak data
      const streakData = await db.getAllAsync(`
        SELECT date FROM workouts 
        WHERE completed = 1 
        ORDER BY date DESC
      `);

      const currentStreak = calculateCurrentStreak(streakData);
      const longestStreak = calculateLongestStreak(streakData);

      // Get this week's workouts
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const thisWeekWorkouts = await db.getFirstAsync(`
        SELECT COUNT(*) as count FROM workouts 
        WHERE completed = 1 AND date >= ?
      `, [startOfWeek.toISOString()]);

      // Get this month's workouts
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthWorkouts = await db.getFirstAsync(`
        SELECT COUNT(*) as count FROM workouts 
        WHERE completed = 1 AND date >= ?
      `, [startOfMonth.toISOString()]);

      const userStats: UserStats = {
        totalWorkouts: (workoutStats as any)?.totalWorkouts || 0,
        totalExercises: (exerciseStats as any)?.totalExercises || 0,
        totalSets: (exerciseStats as any)?.totalSets || 0,
        totalVolume: (exerciseStats as any)?.totalVolume || 0,
        currentStreak,
        longestStreak,
        thisWeekWorkouts: (thisWeekWorkouts as any)?.count || 0,
        thisMonthWorkouts: (thisMonthWorkouts as any)?.count || 0,
        maxWeightLifted: (exerciseStats as any)?.maxWeightLifted || 0,
        totalWorkoutTime: (workoutStats as any)?.totalWorkoutTime || 0,
      };

      set({ userStats });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  },

  checkAchievements: async () => {
    const { achievements, userStats } = get();
    
    for (const achievement of achievements) {
      if (achievement.isUnlocked) continue;

      let progress = 0;
      
      switch (achievement.id) {
        case 'first_workout':
          progress = userStats.totalWorkouts >= 1 ? 1 : 0;
          break;
        case 'first_exercise':
          progress = userStats.totalExercises >= 1 ? 1 : 0;
          break;
        case 'first_set':
          progress = userStats.totalSets >= 1 ? 1 : 0;
          break;
        case 'first_week':
          progress = userStats.thisWeekWorkouts >= 1 ? 1 : 0;
          break;
        case 'first_month':
          progress = userStats.thisMonthWorkouts >= 1 ? 1 : 0;
          break;
        case 'workout_streak_3':
          progress = Math.min(userStats.currentStreak, 3);
          break;
        case 'workout_streak_7':
          progress = Math.min(userStats.currentStreak, 7);
          break;
        case 'workout_streak_30':
          progress = Math.min(userStats.currentStreak, 30);
          break;
        case 'workout_streak_100':
          progress = Math.min(userStats.currentStreak, 100);
          break;
        case 'total_workouts_10':
          progress = Math.min(userStats.totalWorkouts, 10);
          break;
        case 'total_workouts_50':
          progress = Math.min(userStats.totalWorkouts, 50);
          break;
        case 'total_workouts_100':
          progress = Math.min(userStats.totalWorkouts, 100);
          break;
        case 'total_workouts_500':
          progress = Math.min(userStats.totalWorkouts, 500);
          break;
        case 'max_weight_100':
          progress = Math.min(userStats.maxWeightLifted, 100);
          break;
        case 'max_weight_150':
          progress = Math.min(userStats.maxWeightLifted, 150);
          break;
        case 'max_weight_200':
          progress = Math.min(userStats.maxWeightLifted, 200);
          break;
        case 'max_weight_300':
          progress = Math.min(userStats.maxWeightLifted, 300);
          break;
        case 'total_volume_1000':
          progress = Math.min(userStats.totalVolume, 1000);
          break;
        case 'total_volume_10000':
          progress = Math.min(userStats.totalVolume, 10000);
          break;
        case 'total_volume_50000':
          progress = Math.min(userStats.totalVolume, 50000);
          break;
        case 'total_volume_100000':
          progress = Math.min(userStats.totalVolume, 100000);
          break;
        case 'workout_time_60':
          progress = Math.min(userStats.totalWorkoutTime, 60);
          break;
        case 'workout_time_300':
          progress = Math.min(userStats.totalWorkoutTime, 300);
          break;
        case 'workout_time_1000':
          progress = Math.min(userStats.totalWorkoutTime, 1000);
          break;
        case 'workout_time_5000':
          progress = Math.min(userStats.totalWorkoutTime, 5000);
          break;
        default:
          continue;
      }

      // Update achievement progress
      if (progress !== achievement.currentProgress) {
        await updateAchievementProgress(achievement.id, progress);
      }

      // Check if achievement should be unlocked
      if (progress >= achievement.requirement && !achievement.isUnlocked) {
        await get().unlockAchievement(achievement.id);
      }
    }
  },

  unlockAchievement: async (achievementId: string) => {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();
      
      await db.runAsync(`
        UPDATE achievements 
        SET is_unlocked = 1, unlocked_at = ?
        WHERE id = ?
      `, [now, achievementId]);

      // Reload achievements
      await get().loadAchievements();
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  },

  getAchievementsByCategory: (category: string) => {
    const { achievements } = get();
    return achievements.filter(a => a.category === category);
  },

  getUnlockedAchievements: () => {
    const { achievements } = get();
    return achievements.filter(a => a.isUnlocked);
  },

  getLockedAchievements: () => {
    const { achievements } = get();
    return achievements.filter(a => !a.isUnlocked);
  },
}));

// Helper functions
const calculateCurrentStreak = (workoutDates: any[]): number => {
  if (workoutDates.length === 0) return 0;
  
  const dates = workoutDates.map(w => new Date(w.date).toDateString());
  const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  let streak = 0;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  
  // Check if today or yesterday has a workout
  if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
    streak = 1;
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const previousDate = new Date(uniqueDates[i - 1]);
      const diffDays = (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
  }
  
  return streak;
};

const calculateLongestStreak = (workoutDates: any[]): number => {
  if (workoutDates.length === 0) return 0;
  
  const dates = workoutDates.map(w => new Date(w.date).toDateString());
  const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  let longestStreak = 0;
  let currentStreak = 1;
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i]);
    const previousDate = new Date(uniqueDates[i - 1]);
    const diffDays = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }
  
  return Math.max(longestStreak, currentStreak);
};

const updateAchievementProgress = async (achievementId: string, progress: number) => {
  try {
    const db = getDatabase();
    await db.runAsync(`
      UPDATE achievements 
      SET current_progress = ?
      WHERE id = ?
    `, [progress, achievementId]);
  } catch (error) {
    console.error('Error updating achievement progress:', error);
  }
};

const createDefaultAchievements = async (db: any) => {
  const achievements = [
    // Exercise achievements
    { id: 'first_exercise', title: 'Første Øvelse', description: 'Opret din første øvelse', category: 'exercises', icon: 'fitness', requirement: 1, points: 10 },
    { id: 'first_workout', title: 'Første Workout', description: 'Fuldfør din første træning', category: 'exercises', icon: 'play', requirement: 1, points: 25 },
    { id: 'first_set', title: 'Første Sæt', description: 'Lav dit første sæt', category: 'exercises', icon: 'barbell', requirement: 1, points: 5 },
    
    // Consistency achievements
    { id: 'first_week', title: 'Første Uge', description: 'Træn i en uge', category: 'consistency', icon: 'calendar', requirement: 1, points: 50 },
    { id: 'first_month', title: 'Første Måned', description: 'Træn i en måned', category: 'consistency', icon: 'calendar', requirement: 1, points: 100 },
    { id: 'workout_streak_3', title: '3-dages Streak', description: 'Træn 3 dage i træk', category: 'consistency', icon: 'flame', requirement: 3, points: 75 },
    { id: 'workout_streak_7', title: '7-dages Streak', description: 'Træn 7 dage i træk', category: 'consistency', icon: 'flame', requirement: 7, points: 150 },
    { id: 'workout_streak_30', title: '30-dages Streak', description: 'Træn 30 dage i træk', category: 'consistency', icon: 'flame', requirement: 30, points: 500 },
    { id: 'workout_streak_100', title: '100-dages Streak', description: 'Træn 100 dage i træk', category: 'consistency', icon: 'flame', requirement: 100, points: 1000 },
    
    // Strength achievements
    { id: 'total_workouts_10', title: '10 Workouts', description: 'Fuldfør 10 træninger', category: 'strength', icon: 'trophy', requirement: 10, points: 100 },
    { id: 'total_workouts_50', title: '50 Workouts', description: 'Fuldfør 50 træninger', category: 'strength', icon: 'trophy', requirement: 50, points: 250 },
    { id: 'total_workouts_100', title: '100 Workouts', description: 'Fuldfør 100 træninger', category: 'strength', icon: 'trophy', requirement: 100, points: 500 },
    { id: 'total_workouts_500', title: '500 Workouts', description: 'Fuldfør 500 træninger', category: 'strength', icon: 'trophy', requirement: 500, points: 1000 },
    { id: 'max_weight_100', title: '100kg Klubben', description: 'Løft 100kg', category: 'strength', icon: 'barbell', requirement: 100, points: 200 },
    { id: 'max_weight_150', title: '150kg Klubben', description: 'Løft 150kg', category: 'strength', icon: 'barbell', requirement: 150, points: 300 },
    { id: 'max_weight_200', title: '200kg Klubben', description: 'Løft 200kg', category: 'strength', icon: 'barbell', requirement: 200, points: 500 },
    { id: 'max_weight_300', title: '300kg Klubben', description: 'Løft 300kg', category: 'strength', icon: 'barbell', requirement: 300, points: 1000 },
    { id: 'total_volume_1000', title: '1.000kg Volumen', description: 'Løft 1.000kg i alt', category: 'strength', icon: 'stats-chart', requirement: 1000, points: 100 },
    { id: 'total_volume_10000', title: '10.000kg Volumen', description: 'Løft 10.000kg i alt', category: 'strength', icon: 'stats-chart', requirement: 10000, points: 250 },
    { id: 'total_volume_50000', title: '50.000kg Volumen', description: 'Løft 50.000kg i alt', category: 'strength', icon: 'stats-chart', requirement: 50000, points: 500 },
    { id: 'total_volume_100000', title: '100.000kg Volumen', description: 'Løft 100.000kg i alt', category: 'strength', icon: 'stats-chart', requirement: 100000, points: 1000 },
    
    // Special achievements
    { id: 'workout_time_60', title: '1 Time Træning', description: 'Træn i 1 time i alt', category: 'special', icon: 'time', requirement: 60, points: 50 },
    { id: 'workout_time_300', title: '5 Timer Træning', description: 'Træn i 5 timer i alt', category: 'special', icon: 'time', requirement: 300, points: 100 },
    { id: 'workout_time_1000', title: '16.7 Timer Træning', description: 'Træn i 16.7 timer i alt', category: 'special', icon: 'time', requirement: 1000, points: 250 },
    { id: 'workout_time_5000', title: '83.3 Timer Træning', description: 'Træn i 83.3 timer i alt', category: 'special', icon: 'time', requirement: 5000, points: 500 },
  ];

  for (const achievement of achievements) {
    await db.runAsync(`
      INSERT INTO achievements (id, title, description, category, icon, requirement, current_progress, is_unlocked, points, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `, [achievement.id, achievement.title, achievement.description, achievement.category, achievement.icon, achievement.requirement, achievement.points, new Date().toISOString()]);
  }
};
