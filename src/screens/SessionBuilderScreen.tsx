import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useExerciseStore } from '../stores/exerciseStore';
import { TrainingSession, Exercise, MuscleGroup } from '../types';

export default function SessionBuilderScreen() {
  const { 
    trainingSessions, 
    exercises, 
    muscleGroups,
    loadTrainingSessions, 
    loadExercises,
    loadMuscleGroups,
    addTrainingSession,
    updateTrainingSession,
    deleteTrainingSession,
  } = useExerciseStore();
  
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showEditSession, setShowEditSession] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [editSessionForm, setEditSessionForm] = useState({
    name: '',
    description: '',
    muscle_group_id: ''
  });

  useEffect(() => {
    loadTrainingSessions();
    loadExercises();
    loadMuscleGroups();
  }, []);

  const handleCreateSession = () => {
    if (!sessionName.trim()) {
      Alert.alert('Fejl', 'Indtast venligst et session navn');
      return;
    }
    if (selectedMuscleGroups.length === 0) {
      Alert.alert('Fejl', 'Vælg venligst mindst én muskelgruppe');
      return;
    }

    // Create session with first selected muscle group as primary
    const primaryMuscleGroup = selectedMuscleGroups[0];
    
    addTrainingSession({
      name: sessionName.trim(),
      muscle_group_id: primaryMuscleGroup,
      description: `Session med fokus på: ${selectedMuscleGroups.map(id => 
        muscleGroups.find(g => g.id === id)?.name
      ).join(', ')}`,
      is_active: true
    });

    setSessionName('');
    setSelectedMuscleGroups([]);
    setShowSessionModal(false);
    Alert.alert('Succes', 'Session oprettet!');
  };

  const getExercisesByMuscleGroup = (muscleGroupId: string): Exercise[] => {
    return exercises.filter(exercise => exercise.muscle_group_id === muscleGroupId);
  };

  const getMuscleGroupColor = (muscleGroupId: string): string => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const index = parseInt(muscleGroupId) % colors.length;
    return colors[index];
  };

  const toggleMuscleGroupSelection = (muscleGroupId: string) => {
    setSelectedMuscleGroups(prev => 
      prev.includes(muscleGroupId) 
        ? prev.filter(id => id !== muscleGroupId)
        : [...prev, muscleGroupId]
    );
  };

  const handleEditSession = (session: TrainingSession) => {
    setSelectedSession(session);
    setEditSessionForm({
      name: session.name,
      description: session.description || '',
      muscle_group_id: session.muscle_group_id
    });
    setShowEditSession(true);
  };

  const handleSaveSession = async () => {
    if (!selectedSession || !editSessionForm.name.trim()) {
      Alert.alert('Fejl', 'Session navn er påkrævet');
      return;
    }

    if (!editSessionForm.muscle_group_id) {
      Alert.alert('Fejl', 'Vælg venligst en muskelgruppe');
      return;
    }

    try {
      await updateTrainingSession(selectedSession.id, {
        name: editSessionForm.name,
        description: editSessionForm.description,
        muscle_group_id: editSessionForm.muscle_group_id
      });
      
      Alert.alert('Succes', 'Session opdateret!');
      loadTrainingSessions();
      setShowEditSession(false);
      setSelectedSession(null);
    } catch (error) {
      Alert.alert('Fejl', 'Kunne ikke opdatere session');
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const session = trainingSessions.find(s => s.id === sessionId);
    const sessionName = session?.name || 'denne session';
    
    Alert.alert(
      'Slet session',
      `Er du sikker på at du vil slette ${sessionName}?`,
      [
        { text: 'Annuller', style: 'cancel' },
        { 
          text: 'Slet', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrainingSession(sessionId);
              Alert.alert('Succes', 'Session slettet!');
              loadTrainingSessions();
            } catch (error) {
              Alert.alert('Fejl', 'Kunne ikke slette session');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Session Builder</Text>
        <Text style={styles.headerSubtitle}>Byg dine træningssessioner</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Create New Session Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowSessionModal(true)}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Opret Ny Session</Text>
        </TouchableOpacity>

        {/* Existing Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eksisterende Sessioner</Text>
        </View>

        {trainingSessions.map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View style={[styles.muscleGroupIndicator, { backgroundColor: getMuscleGroupColor(session.muscle_group_id) }]} />
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionName}>{session.name}</Text>
                <Text style={styles.sessionDescription}>{session.description}</Text>
              </View>
              <View style={styles.sessionActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditSession(session)}
                >
                  <Ionicons name="pencil" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteSession(session.id)}
                >
                  <Ionicons name="trash" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.exerciseList}>
              <Text style={styles.exerciseListTitle}>Øvelser i denne session:</Text>
              {getExercisesByMuscleGroup(session.muscle_group_id).map((exercise) => (
                <View key={exercise.id} style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Exercise Library by Muscle Group */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Øvelsesbibliotek</Text>
          <Text style={styles.sectionSubtitle}>Organiseret efter muskelgruppe</Text>
        </View>

        {muscleGroups.map((muscleGroup) => (
          <View key={muscleGroup.id} style={styles.muscleGroupCard}>
            <View style={styles.muscleGroupHeader}>
              <View style={[styles.muscleGroupColor, { backgroundColor: muscleGroup.color }]} />
              <Text style={styles.muscleGroupName}>{muscleGroup.name}</Text>
            </View>
            
            <View style={styles.exerciseGrid}>
              {getExercisesByMuscleGroup(muscleGroup.id).map((exercise) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <Text style={styles.exerciseCardName}>{exercise.name}</Text>
                  <Text style={styles.exerciseCardEquipment}>{exercise.equipment || 'Ingen udstyr'}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Session Creation Modal */}
      {showSessionModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Opret Ny Session</Text>
            
            <Text style={styles.modalLabel}>Session Navn:</Text>
            <TextInput
              style={styles.input}
              placeholder="Indtast session navn"
              value={sessionName}
              onChangeText={setSessionName}
            />

            <Text style={styles.modalLabel}>Vælg Muskelgrupper:</Text>
            <View style={styles.muscleGroupSelection}>
              {muscleGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.muscleGroupOption,
                    selectedMuscleGroups.includes(group.id) && styles.muscleGroupOptionSelected
                  ]}
                  onPress={() => toggleMuscleGroupSelection(group.id)}
                >
                  <Text style={[
                    styles.muscleGroupOptionText,
                    selectedMuscleGroups.includes(group.id) && styles.muscleGroupOptionTextSelected
                  ]}>
                    {group.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowSessionModal(false);
                  setSessionName('');
                  setSelectedMuscleGroups([]);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCreateSession}
              >
                <Text style={styles.confirmButtonText}>Opret Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Edit Session Modal */}
      {showEditSession && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rediger Session</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Session navn"
              value={editSessionForm.name}
              onChangeText={(text) => setEditSessionForm({ ...editSessionForm, name: text })}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Beskrivelse (valgfri)"
              value={editSessionForm.description}
              onChangeText={(text) => setEditSessionForm({ ...editSessionForm, description: text })}
              multiline
              numberOfLines={3}
            />

            {/* Muscle Group Selector */}
            <View style={styles.muscleGroupSection}>
              <Text style={styles.muscleGroupTitle}>Vælg Muskelgruppe:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleGroupScrollView}>
                {muscleGroups.map(group => (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.muscleGroupChip,
                      { backgroundColor: group.color },
                      editSessionForm.muscle_group_id === group.id && styles.muscleGroupChipSelected
                    ]}
                    onPress={() => setEditSessionForm({ ...editSessionForm, muscle_group_id: group.id })}
                  >
                    <Text style={[
                      styles.muscleGroupChipText,
                      editSessionForm.muscle_group_id === group.id && styles.muscleGroupChipTextSelected
                    ]}>
                      {group.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditSession(false);
                  setSelectedSession(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuller</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveSession}
              >
                <Text style={styles.confirmButtonText}>Gem Ændringer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
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
  content: {
    padding: 20,
  },
  createButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 20,
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
  sessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  muscleGroupIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#666',
  },
  exerciseList: {
    marginTop: 10,
  },
  exerciseListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  exerciseItem: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 5,
  },
  exerciseName: {
    fontSize: 14,
    color: '#333',
  },
  muscleGroupCard: {
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
  muscleGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  muscleGroupColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  muscleGroupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exerciseCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  exerciseCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  exerciseCardEquipment: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  muscleGroupSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  muscleGroupSection: {
    marginBottom: 20,
  },
  muscleGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  muscleGroupScrollView: {
    maxHeight: 60,
  },
  muscleGroupChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    opacity: 0.8,
  },
  muscleGroupChipSelected: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  muscleGroupChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  muscleGroupChipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  muscleGroupOption: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  muscleGroupOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  muscleGroupOptionText: {
    color: '#333',
    fontSize: 14,
  },
  muscleGroupOptionTextSelected: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
