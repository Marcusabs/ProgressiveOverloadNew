import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  // Brand Colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  
  // Background Colors
  background: string;
  surface: string;
  card: string;
  
  // Text Colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Status Colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Border & Divider
  border: string;
  divider: string;
  
  // Shadow Colors
  shadow: string;
  
  // Special Colors
  overlay: string;
  backdrop: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

const lightTheme: Theme = {
  dark: false,
  colors: {
    // Brand Colors - Orange Fire/Sun Theme
    primary: '#FF6B35',
    primaryLight: '#FF8C42',
    primaryDark: '#E55A2B',
    secondary: '#FFD93D',
    accent: '#FF6B6B',
    
    // Background Colors
    background: '#F8F9FA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    
    // Text Colors
    text: '#1A1A1A',
    textSecondary: '#666666',
    textTertiary: '#999999',
    
    // Status Colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    
    // Border & Divider
    border: '#E0E0E0',
    divider: '#F0F0F0',
    
    // Shadow Colors
    shadow: 'rgba(0, 0, 0, 0.1)',
    
    // Special Colors
    overlay: 'rgba(0, 0, 0, 0.5)',
    backdrop: 'rgba(0, 0, 0, 0.3)',
  },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    // Brand Colors - Keep Orange for consistency
    primary: '#FF6B35',
    primaryLight: '#FF8C42',
    primaryDark: '#E55A2B',
    secondary: '#FFD93D',
    accent: '#FF6B6B',
    
    // Background Colors
    background: '#0A0A0A',
    surface: '#1A1A1A',
    card: '#2D2D2D',
    
    // Text Colors
    text: '#FFFFFF',
    textSecondary: '#E0E0E0',
    textTertiary: '#B0B0B0',
    
    // Status Colors
    success: '#66BB6A',
    warning: '#FFB74D',
    error: '#EF5350',
    info: '#64B5F6',
    
    // Border & Divider
    border: '#404040',
    divider: '#2A2A2A',
    
    // Shadow Colors
    shadow: 'rgba(0, 0, 0, 0.3)',
    
    // Special Colors
    overlay: 'rgba(0, 0, 0, 0.7)',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  // Default to dark mode, but allow user to override
  const [isDark, setIsDark] = useState(true);
  
  const theme = isDark ? darkTheme : lightTheme;
  
  const toggleTheme = () => {
    setIsDark(!isDark);
  };
  
  const setTheme = (dark: boolean) => {
    setIsDark(dark);
  };
  
  // Only auto-switch to system preference on first load if user hasn't made a choice
  // This could be enhanced with AsyncStorage to remember user preference
  useEffect(() => {
    // For now, we'll keep dark mode as default
    // In a real app, you'd check AsyncStorage for saved user preference first
  }, [systemColorScheme]);
  
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
