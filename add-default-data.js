// Add default muscle groups to Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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

async function addDefaultData() {
  try {
    console.log('🚀 Adding default data to Firebase...');

    // Add default muscle groups
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

    console.log('🎉 Default data added successfully!');
    console.log('🎯 Your Firebase database is now ready!');

  } catch (error) {
    console.error('❌ Failed to add default data:', error);
  }
}

addDefaultData();

