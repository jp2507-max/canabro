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

    // Neutral palette - dark versions of the warm beige/earthy tones
    neutral: {
      50: '#4b3f33', // Very dark brown (was 900 light)
      100: '#615141', // Dark brown (was 800 light)
      200: '#7f6a56', // Darker brown (was 700 light)
      300: '#9c846e', // Medium brown (was 600 light)
      400: '#b8a18a', // Muted brown (was 500 light)
      500: '#d3bfa8', // Warm gray/light brown (was 400 light) - Use for text
      600: '#e9d8c0', // Light warm gray/beige (was 300 light) - Use for text/borders
      700: '#f5eadc', // Soft beige (was 200 light) - Use for lighter elements
      800: '#fbf6ef', // Light beige (was 100 light)
      900: '#fdfbf7', // Very light beige/off-white (was 50 light) - Use for high contrast text
    },

    // Yellow palette - darker/muted yellow shades
    yellow: {
      50: '#FDF6B2',
      100: '#FCE96A',
      200: '#FACA15',
      300: '#E3A008',
      400: '#C27803',
      500: '#9F580A',
      600: '#8E4B10',
      700: '#723B13',
      800: '#633112',
      900: '#422006',
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
    background: '#4b3f33', // Use darkest brown for background
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
        backgroundColor: '#615141', // Dark brown background
        textColor: '#fdfbf7', // Lightest beige text
        borderColor: '#7f6a56', // Darker brown border
        borderWidth: 1,
        borderRadius: 9999,
      },
      outline: {
        backgroundColor: 'transparent',
        textColor: '#e9d8c0', // Light warm beige text
        borderColor: '#e9d8c0', // Light warm beige border
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
      backgroundColor: '#615141', // Dark brown background
      textColor: '#fdfbf7', // Lightest beige text
      placeholderColor: '#b8a18a', // Muted brown placeholder
      borderRadius: 9999,
      padding: 16,
    },
    card: {
      backgroundColor: '#615141', // Dark brown background
      borderRadius: 16,
      borderColor: '#7f6a56', // Darker brown border
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
