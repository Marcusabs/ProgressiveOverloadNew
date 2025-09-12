// Migration script to move data from SQLite to Firebase
import { migrateToFirebase, addDefaultMuscleGroups } from './src/utils/migrateToFirebase.js';

async function runMigration() {
  try {
    console.log('🚀 Starting data migration...');
    
    // First, add default muscle groups
    await addDefaultMuscleGroups();
    
    // Then migrate existing data
    await migrateToFirebase();
    
    console.log('✅ Migration completed successfully!');
    console.log('🎯 Your app is now ready to use Firebase!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

