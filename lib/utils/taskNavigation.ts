import { Router } from 'expo-router';

/**
 * Utility function for navigating to task management routes
 * Uses type-safe navigation for Expo Router
 */
export const navigateToTaskRoute = {
  addTask: (router: Router, selectedDate: Date) => {
    router.push({
      pathname: '/(app)/(tabs)/calendar/add-task',
      params: {
        selectedDate: selectedDate.toISOString()
      }
    });
  },
  
  addPlantTask: (router: Router, selectedDate: Date) => {
    router.push({
      pathname: '/(app)/(tabs)/calendar/add-plant-task',
      params: {
        selectedDate: selectedDate.toISOString()
      }
    });
  },
};
