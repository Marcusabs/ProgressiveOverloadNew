import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../design/DesignSystem';

interface CalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  theme: any; // Theme object from ThemeContext
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect, theme }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate days for the current month
  const generateDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Days from previous month to fill the first week
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const dateString = currentDate.toISOString().split('T')[0];
      const isCurrentMonth = currentDate.getMonth() === month;
      const isSelected = selectedDate === dateString;
      const isToday = dateString === new Date().toISOString().split('T')[0];
      const isPast = currentDate < new Date() && !isToday;
      
      days.push({
        date: currentDate.getDate(),
        dateString,
        isCurrentMonth,
        isSelected,
        isToday,
        isPast,
        fullDate: new Date(currentDate)
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('da-DK', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(today.toISOString().split('T')[0]);
  };

  const goToYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setCurrentMonth(yesterday);
    onDateSelect(yesterday.toISOString().split('T')[0]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Header with Month Navigation */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.colors.card }]}
          onPress={() => navigateMonth('prev')}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
          {getMonthName(currentMonth)}
        </Text>

        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.colors.card }]}
          onPress={() => navigateMonth('next')}
        >
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Quick Date Options */}
      <View style={styles.quickDateOptions}>
        <TouchableOpacity
          style={[styles.quickDateButton, { backgroundColor: theme.colors.primary }]}
          onPress={goToToday}
        >
          <Text style={styles.quickDateButtonText}>I dag</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickDateButton, { backgroundColor: theme.colors.secondary }]}
          onPress={goToYesterday}
        >
          <Text style={styles.quickDateButtonText}>I går</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdaysHeader}>
        {['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'].map((day, index) => (
          <Text key={index} style={[styles.weekdayText, { color: theme.colors.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.daysGrid}>
        {generateDaysInMonth().map((dayData, index) => {
          const { dateString, date, isSelected, isToday, isPast, isCurrentMonth } = dayData;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                styles.dayButton,
                { backgroundColor: theme.colors.card },
                isSelected && {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                },
                isToday && !isSelected && {
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                },
                !isCurrentMonth && {
                  opacity: 0.3,
                }
              ]}
              onPress={() => onDateSelect(dateString)}
              disabled={isPast && !isToday}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: theme.colors.text },
                  isSelected && { color: '#fff', fontWeight: 'bold' },
                  isPast && !isToday && { color: theme.colors.textTertiary },
                  !isCurrentMonth && { color: theme.colors.textTertiary }
                ]}
              >
                {date}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickDateOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  quickDateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickDateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  weekdaysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    borderRadius: 8,
    margin: 2,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Calendar;
