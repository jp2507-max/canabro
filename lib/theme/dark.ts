/**
 * CanaBro Dark Theme Configuration
 *
 * This file provides centralized dark theme tokens to maintain a consistent
 * design language across the entire application.
 */

import { theme as lightTheme, Theme } from './index';

// Create the dark theme based on the light theme
const darkTheme: Theme = {
  colors: {
    // Primary palette - shift to darker green shades with better contrast
    primary: {
      50: '#0d2f23', // Very dark mint - backgrounds
      100: '#113a2c', // Dark mint - secondary backgrounds
      200: '#174c3a', // Darker mint - highlighted sections
      300: '#226c54', // Medium dark mint
      400: '#2e8c6d', // Dark green
      500: '#16a34a', // Keep primary green for buttons same for recognition
      600: '#059669', // Keep dark green - active states
      700: '#047857', // Deeper green
      800: '#065f46', // Very dark green
      900: '#064e3b', // Almost black green
    },

    // Neutral palette - less dark green instead of black/gray for a softer dark mode with better contrast
    neutral: {
      50: '#0f3d2d', // Dark green background (replaces almost black)
      100: '#164e3a', // Less dark green (replaces very dark gray)
      200: '#1e6349', // Medium dark green (replaces dark gray)
      300: '#297a5d', // Medium green (replaces medium dark gray)
      400: '#34916e', // Light medium green (replaces medium gray)
      500: '#3fa87f', // Light green (replaces light gray)
      600: '#4abe91', // Medium light green (replaces medium light gray)
      700: '#60d3a7', // Light green (replaces light gray)
      800: '#e2f0eb', // Very light green (replaces very light gray)
      900: '#f3f9f7', // Almost white with green tint (replaces almost white)
    },

    // Status colors - maintain recognition but adjust for dark mode
    status: {
      success: '#22c55e', // Brighter success green
      warning: '#fbbf24', // Brighter warning yellow/orange
      danger: '#ef4444', // Keep error/danger red
      info: '#60a5fa', // Brighter info blue
    },

    // Special colors - slightly brightened for dark mode
    special: {
      watering: '#3b82f6', // Brighter blue for watering
      feeding: '#a855f7', // Brighter purple for feeding
      harvesting: '#f97316', // Brighter orange for harvesting
    },

    // Background color for the app
    background: '#0f3d2d', // Dark green background for the app
  },

  // Typography - keep the same type system
  typography: lightTheme.typography,

  // Spacing - keep the same spacing system
  spacing: lightTheme.spacing,

  // Border radius - keep the same border radius system
  borderRadius: lightTheme.borderRadius,

  // Shadows - adjust for dark mode
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 5,
      elevation: 3,
    },
  },

  // Component-specific styles - adapt for dark mode with better contrast
  components: {
    button: {
      primary: {
        backgroundColor: '#16a34a',
        textColor: '#ffffff',
        borderRadius: 9999, // Pill shape
      },
      secondary: {
        backgroundColor: '#1e6349', // Medium dark green instead of dark gray
        textColor: '#ffffff', // White text for better readability
        borderColor: '#297a5d',
        borderWidth: 1,
        borderRadius: 9999,
      },
      outline: {
        backgroundColor: 'transparent',
        textColor: '#4abe91', // Brighter green for better visibility
        borderColor: '#4abe91',
        borderWidth: 1,
        borderRadius: 9999,
      },
      danger: {
        backgroundColor: '#ef4444',
        textColor: '#ffffff',
        borderRadius: 9999,
      },
    },
    input: {
      backgroundColor: '#164e3a', // Less dark green instead of dark gray
      textColor: '#ffffff', // White text for better readability
      placeholderColor: '#60d3a7', // Light green for better visibility
      borderRadius: 9999,
      padding: 16,
    },
    card: {
      backgroundColor: '#164e3a', // Less dark green instead of dark gray
      borderRadius: 16,
      borderColor: '#297a5d', // Medium green border for better definition
      borderWidth: 1,
    },
  },
};

// Export named exports for easier access
export const colors = darkTheme.colors;
export const spacing = darkTheme.spacing;
export const typography = darkTheme.typography;
export const shadows = darkTheme.shadows;

// Export default
export default darkTheme;
