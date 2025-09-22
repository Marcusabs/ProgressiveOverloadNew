// Simple migration script
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { openDatabaseSync } from 'expo-sqlite';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC4WDTzlirUEVHTHBTbfFHHOI-65tHfIgM",
  authDomain: "progressive-overload-appnew.firebaseapp.com",
  projectId: "progressive-overload-appnew",
  storageBucket: "progressive-overload-appnew.firebasestorage.app",
  messagingSenderId: "742273478022",
  appId: "1:742273478022:web:66621fb099ccb3ef4f5007",
  measurementId: "G-FQ3YFHM221"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize SQLite
const sqliteDb = openDatabaseSync('progressive_overload.db');

async function migrateData() {
  try {
    console.log('🚀 Starting migration...');

    // 1. Add default muscle groups
    console.log('📦 Adding default muscle groups...');
    const defaultMuscleGroups = [
      { name: 'Bryst', color: '#FF6B6B' },
      { name: 'Ryg', color: '#4ECDC4' },
      { name: 'Skulder', color: '#45B7D1' },
      { name: 'Biceps', color: '#96CEB4' },
      { name: 'Triceps', color: '#FFEAA7' },
      { name: 'Mave', color: '#DDA0DD' },
      { name: 'Ben', color: '#98D8C8' }
    ];

    for (const muscleGroup of defaultMuscleGroups) {
      try {
        await addDoc(collection(db, 'muscle_groups'), {
          ...muscleGroup,
          created_at: new Date().toISOString()
        });
        console.log(`✅ Added muscle group: ${muscleGroup.name}`);
      } catch (error) {
        console.log(`⚠️ Muscle group ${muscleGroup.name} might already exist`);
      }
    }

    // 2. Migrate exercises
    console.log('💪 Migrating exercises...');
    const exercises = sqliteDb.getAllSync('SELECT * FROM exercises');
    
    for (const exercise of exercises) {
      try {
        await addDoc(collection(db, 'exercises'), {
          name: exercise.name,
          description: exercise.description,
          muscle_group_id: exercise.muscle_group_id.toString(),
          session_id: exercise.session_id ? exercise.session_id.toString() : null,
          order_index: exercise.order_index,
          created_at: exercise.created_at
        });
        console.log(`✅ Migrated exercise: ${exercise.name}`);
      } catch (error) {
        console.error(`❌ Failed to migrate exercise ${exercise.name}:`, error);
      }
    }

    // 3. Migrate training sessions
    console.log('🏋️ Migrating training sessions...');
    const sessions = sqliteDb.getAllSync('SELECT * FROM training_sessions');
    
    for (const session of sessions) {
      try {
        await addDoc(collection(db, 'sessions'), {
          name: session.name,
          is_active: session.is_active,
          created_at: session.created_at
        });
        console.log(`✅ Migrated session: ${session.name}`);
      } catch (error) {
        console.error(`❌ Failed to migrate session ${session.name}:`, error);
      }
    }

    // 4. Migrate workouts
    console.log('📊 Migrating workouts...');
    const workouts = sqliteDb.getAllSync('SELECT * FROM workouts');
    
    for (const workout of workouts) {
      try {
        await addDoc(collection(db, 'workouts'), {
          session_id: workout.session_id.toString(),
          start_time: workout.start_time,
          end_time: workout.end_time,
          total_duration: workout.total_duration,
          estimated_calories: workout.estimated_calories,
          is_active: workout.is_active,
          created_at: workout.created_at
        });
        console.log(`✅ Migrated workout: ${workout.id}`);
      } catch (error) {
        console.error(`❌ Failed to migrate workout ${workout.id}:`, error);
      }
    }

    // 5. Migrate sets
    console.log('🔢 Migrating sets...');
    const sets = sqliteDb.getAllSync('SELECT * FROM sets');
    
    for (const set of sets) {
      try {
        await addDoc(collection(db, 'sets'), {
          workout_id: set.workout_id.toString(),
          exercise_id: set.exercise_id.toString(),
          reps: set.reps,
          weight: set.weight,
          timestamp: set.timestamp,
          created_at: set.created_at
        });
        console.log(`✅ Migrated set: ${set.id}`);
      } catch (error) {
        console.error(`❌ Failed to migrate set ${set.id}:`, error);
      }
    }

    console.log('🎉 Migration completed successfully!');
    console.log(`📊 Migrated:`);
    console.log(`   - ${defaultMuscleGroups.length} muscle groups`);
    console.log(`   - ${exercises.length} exercises`);
    console.log(`   - ${sessions.length} training sessions`);
    console.log(`   - ${workouts.length} workouts`);
    console.log(`   - ${sets.length} sets`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateData();

