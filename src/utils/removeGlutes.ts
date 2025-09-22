// Utility to remove Glutes muscle group from database
import { getDatabase } from '../database';

export const removeGlutesFromDatabase = async (): Promise<void> => {
  try {
    const db = getDatabase();
    console.log('🗑️ Starting removal of Glutes muscle group...');
    
    // Find the Glutes muscle group
    const glutesGroup = await db.getFirstAsync(
      'SELECT * FROM muscle_groups WHERE name = ? OR name = ?', 
      ['Glutes', 'glutes']
    );
    
    if (!glutesGroup) {
      console.log('✅ Glutes muscle group not found - already removed');
      return;
    }
    
    const glutes = glutesGroup as any;
    console.log('🎯 Found Glutes muscle group:', glutes.name);
    
    // Check if there are any exercises using this muscle group
    const exercisesWithGlutes = await db.getAllAsync(
      'SELECT * FROM exercises WHERE muscle_group_id = ?', 
      [glutes.id]
    );
    
    if (exercisesWithGlutes.length > 0) {
      console.log(`⚠️ Found ${exercisesWithGlutes.length} exercises using Glutes muscle group`);
      
      // Move these exercises to 'Ben' muscle group instead
      const benGroup = await db.getFirstAsync(
        'SELECT * FROM muscle_groups WHERE name = ?', 
        ['Ben']
      );
      
      if (benGroup) {
        console.log('🔄 Moving exercises to Ben muscle group...');
        await db.runAsync(
          'UPDATE exercises SET muscle_group_id = ? WHERE muscle_group_id = ?', 
          [(benGroup as any).id, glutes.id]
        );
        console.log('✅ Exercises moved successfully');
      } else {
        console.log('❌ Ben muscle group not found - cannot move exercises');
        return;
      }
    }
    
    // Check if there are any training sessions using this muscle group
    const sessionsWithGlutes = await db.getAllAsync(
      'SELECT * FROM training_sessions WHERE muscle_group_id = ?', 
      [glutes.id]
    );
    
    if (sessionsWithGlutes.length > 0) {
      console.log(`⚠️ Found ${sessionsWithGlutes.length} training sessions using Glutes muscle group`);
      
      // Move these sessions to 'Ben' muscle group instead
      const benGroup = await db.getFirstAsync(
        'SELECT * FROM muscle_groups WHERE name = ?', 
        ['Ben']
      );
      
      if (benGroup) {
        console.log('🔄 Moving training sessions to Ben muscle group...');
        await db.runAsync(
          'UPDATE training_sessions SET muscle_group_id = ? WHERE muscle_group_id = ?', 
          [(benGroup as any).id, glutes.id]
        );
        console.log('✅ Training sessions moved successfully');
      }
    }
    
    // Remove the Glutes muscle group
    console.log('🗑️ Removing Glutes muscle group...');
    await db.runAsync('DELETE FROM muscle_groups WHERE id = ?', [glutes.id]);
    
    console.log('🎉 Glutes muscle group removed successfully!');
    console.log('📱 Please refresh the app to see changes');
    
  } catch (error) {
    console.error('❌ Failed to remove Glutes:', error);
    throw error;
  }
};
