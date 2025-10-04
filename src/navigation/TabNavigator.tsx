import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { RootTabParamList } from '../types';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TrainingScreen from '../screens/TrainingScreen';
import ProgressScreen from '../screens/ProgressScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  const { theme, isDark } = useTheme();

  const tabBarBackground = theme.colors.surface;
  const tabActive = theme.colors.primary;
  const tabInactive = theme.colors.textTertiary;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Training') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Progress') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: tabActive,
        tabBarInactiveTintColor: tabInactive,
        tabBarStyle: {
          backgroundColor: tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: theme.colors.divider,
          paddingBottom: Platform.OS === 'android' ? 18 : 8,
          paddingTop: 6,
          height: Platform.OS === 'android' ? 76 : 64,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Hjem' }}
        listeners={{
          tabPress: async () => {
            try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          }
        }}
      />
      <Tab.Screen 
        name="Training" 
        component={TrainingScreen}
        options={{ title: 'Træning' }}
        listeners={{
          tabPress: async () => {
            try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          }
        }}
      />
      <Tab.Screen 
        name="Progress" 
        component={ProgressScreen}
        options={{ title: 'Fremskridt' }}
        listeners={{
          tabPress: async () => {
            try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          }
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profil' }}
        listeners={{
          tabPress: async () => {
            try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          }
        }}
      />
    </Tab.Navigator>
  );
}
