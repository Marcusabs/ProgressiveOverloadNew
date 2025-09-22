interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class DatabaseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const dbCache = new DatabaseCache();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  dbCache.cleanup();
}, 10 * 60 * 1000);

// Cache keys
export const CACHE_KEYS = {
  EXERCISES: 'exercises',
  MUSCLE_GROUPS: 'muscle_groups',
  TRAINING_SESSIONS: 'training_sessions',
  WORKOUTS: 'workouts',
  USER_PROFILE: 'user_profile',
  EXERCISE_BY_ID: (id: string) => `exercise:${id}`,
  EXERCISES_BY_MUSCLE_GROUP: (muscleGroupId: string) => `exercises:muscle_group:${muscleGroupId}`,
  EXERCISES_BY_SESSION: (sessionId: string) => `exercises:session:${sessionId}`,
  PROGRESS_BY_EXERCISE: (exerciseId: string) => `progress:exercise:${exerciseId}`,
  RECENT_WORKOUTS: (limit: number) => `workouts:recent:${limit}`,
};
