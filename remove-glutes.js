// Script to remove Glutes muscle group from SQLite database
import { openDatabaseSync } from 'expo-sqlite';

// Initialize SQLite
const db = openDatabaseSync('progressive_overload.db');

async function removeGlutes() {
  try {
    console.log('🔍 Looking for Glutes muscle group...');
    
    // Find the Glutes muscle group
    const glutesGroup = db.getFirstSync('SELECT * FROM muscle_groups WHERE name = ? OR name = ?', ['Glutes', 'glutes']);
    
    if (!glutesGroup) {
      console.log('✅ Glutes muscle group not found - nothing to remove');
      return;
    }
    
    console.log('🎯 Found Glutes muscle group:', glutesGroup);
    
    // Check if there are any exercises using this muscle group
    const exercisesWithGlutes = db.getAllSync('SELECT * FROM exercises WHERE muscle_group_id = ?', [glutesGroup.id]);
    
    if (exercisesWithGlutes.length > 0) {
      console.log(`⚠️ Found ${exercisesWithGlutes.length} exercises using Glutes muscle group:`);
      exercisesWithGlutes.forEach(exercise => {
        console.log(`   - ${exercise.name}`);
      });
      
      // Move these exercises to 'Ben' muscle group instead
      const benGroup = db.getFirstSync('SELECT * FROM muscle_groups WHERE name = ?', ['Ben']);
      
      if (benGroup) {
        console.log('🔄 Moving exercises to Ben muscle group...');
        db.runSync('UPDATE exercises SET muscle_group_id = ? WHERE muscle_group_id = ?', [benGroup.id, glutesGroup.id]);
        console.log('✅ Exercises moved successfully');
      } else {
        console.log('❌ Ben muscle group not found - cannot move exercises');
        return;
      }
    }
    
    // Remove the Glutes muscle group
    console.log('🗑️ Removing Glutes muscle group...');
    db.runSync('DELETE FROM muscle_groups WHERE id = ?', [glutesGroup.id]);
    
    console.log('🎉 Glutes muscle group removed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to remove Glutes:', error);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  removeGlutes();
}

export default removeGlutes;
