/**
 * CanaBro Theme Configuration
 *
 * This file provides centralized theme tokens to maintain a consistent
 * design language across the entire application.
 */

import { TextStyle } from 'react-native';

export interface Theme {
  colors: {
    primary: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    neutral: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    yellow: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    status: {
      success: string;
      warning: string;
      danger: string;
      info: string;
    };
    special: {
      watering: string;
      feeding: string;
      harvesting: string;
    };
    background: string;
  };
  typography: {
    fontFamily: {
      regular: string;
      medium: string;
      bold: string;
    };
    fontSize: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
      '2xl': number;
      '3xl': number;
      '4xl': number;
    };
    lineHeight: {
      none: number;
      tight: number;
      normal: number;
      relaxed: number;
    };
    fontWeight: {
      regular: TextStyle['fontWeight'];
      medium: TextStyle['fontWeight'];
      bold: TextStyle['fontWeight'];
    };
  };
  spacing: {
    '0': number;
    px: number;
    '0.5': number;
    '1': number;
    '1.5': number;
    '2': number;
    '2.5': number;
    '3': number;
    '3.5': number;
    '4': number;
    '5': number;
    '6': number;
    '7': number;
    '8': number;
    '9': number;
    '10': number;
    '11': number;
    '12': number;
    '14': number;
    '16': number;
    '20': number;
    '24': number;
    '28': number;
    '32': number;
    '36': number;
    '40': number;
    '44': number;
    '48': number;
    '52': number;
    '56': number;
    '60': number;
    '64': number;
    '72': number;
    '80': number;
    '96': number;
  };
  borderRadius: {
    none: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    full: number;
  };
  shadows: {
    none: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
  components: {
    button: {
      primary: {
        backgroundColor: string;
        textColor: string;
        borderRadius: number;
      };
      secondary: {
        backgroundColor: string;
        textColor: string;
        borderColor: string;
        borderWidth: number;
        borderRadius: number;
      };
      outline: {
        backgroundColor: string;
        textColor: string;
        borderColor: string;
        borderWidth: number;
        borderRadius: number;
      };
      danger: {
        backgroundColor: string;
        textColor: string;
        borderRadius: number;
      };
    };
    input: {
      backgroundColor: string;
      textColor: string;
      placeholderColor: string;
      borderRadius: number;
      padding: number;
    };
    card: {
      backgroundColor: string;
      borderRadius: number;
      borderColor: string;
      borderWidth: number;
    };
  };
}

// Light Theme Definition
export const theme: Theme = {
  colors: {
    // Primary palette - greens
    primary: {
      50: '#f0fdf4', // Very light mint - backgrounds
      100: '#dcfce7', // Light mint - secondary backgrounds
      200: '#bbf7d0', // Light green - highlighted sections
      300: '#86efac', // Medium green
      400: '#4ade80', // Bright green
      500: '#16a34a', // Primary green
      600: '#059669', // Dark green - active states
      700: '#047857', // Deeper green
      800: '#065f46', // Very dark green
      900: '#064e3b', // Almost black green
    },

    // Neutral palette - warmer beige/earthy tones
    neutral: {
      50: '#fdfbf7', // Very light beige/off-white
      100: '#fbf6ef', // Light beige
      200: '#f5eadc', // Soft beige
      300: '#e9d8c0', // Light warm gray/beige
      400: '#d3bfa8', // Warm gray/light brown
      500: '#b8a18a', // Muted brown
      600: '#9c846e', // Medium brown
      700: '#7f6a56', // Darker brown
      800: '#615141', // Dark brown
      900: '#4b3f33', // Very dark brown
    },

    // Yellow palette
    yellow: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E42',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },

    // Status colors
    status: {
      success: '#22c55e', // Success green
      warning: '#f59e0b', // Warning yellow/orange
      danger: '#ef4444', // Error/danger red
      info: '#3b82f6', // Info blue
    },

    // Special colors for specific features
    special: {
      watering: '#3b82f6', // Blue for watering
      feeding: '#8b5cf6', // Purple for feeding
      harvesting: '#f59e0b', // Orange/yellow for harvesting
    },
    background: '#fdfbf7', // Use lightest beige for background
  },

  // Typography - consistent text styling
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    fontWeight: {
      regular: 'normal',
      medium: '500',
      bold: 'bold',
    },
  },

  // Spacing - standardized space values
  spacing: {
    '0': 0,
    px: 1,
    '0.5': 2,
    '1': 4,
    '1.5': 6,
    '2': 8,
    '2.5': 10,
    '3': 12,
    '3.5': 14,
    '4': 16,
    '5': 20,
    '6': 24,
    '7': 28,
    '8': 32,
    '9': 36,
    '10': 40,
    '11': 44,
    '12': 48,
    '14': 56,
    '16': 64,
    '20': 80,
    '24': 96,
    '28': 112,
    '32': 128,
    '36': 144,
    '40': 160,
    '44': 176,
    '48': 192,
    '52': 208,
    '56': 224,
    '60': 240,
    '64': 256,
    '72': 288,
    '80': 320,
    '96': 384,
  },

  // Border Radius - consistent corner rounding
  borderRadius: {
    none: 0,
    sm: 2,
    md: 4,
    lg: 8,
    xl: 12,
    '2xl': 16,
    '3xl': 24,
    full: 9999,
  },

  // Shadows - consistent elevation
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
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 3,
    },
  },

  // Component-specific style tokens
  components: {
    button: {
      primary: {
        backgroundColor: '#16a34a',
        textColor: '#ffffff',
        borderRadius: 9999, // Pill shape
      },
      secondary: {
        backgroundColor: '#fdfbf7', // Lightest beige background
        textColor: '#16a34a', // Keep primary green text
        borderColor: '#e9d8c0', // Light warm beige border
        borderWidth: 1,
        borderRadius: 9999,
      },
      outline: {
        backgroundColor: 'transparent',
        textColor: '#16a34a',
        borderColor: '#16a34a',
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
      backgroundColor: '#fbf6ef', // Light beige background
      textColor: '#4b3f33', // Dark brown text
      placeholderColor: '#b8a18a', // Muted brown placeholder
      borderRadius: 9999,
      padding: 16,
    },
    card: {
      backgroundColor: '#fdfbf7', // Lightest beige background
      borderRadius: 16,
      borderColor: '#f5eadc', // Soft beige border
      borderWidth: 1,
    },
  },
};

// Export named exports for easier access
export const colors = theme.colors;
export const spacing = theme.spacing;
export const typography = theme.typography;
export const shadows = theme.shadows;

// Export light theme as default
export default theme;
