/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
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
      },
    },
  },
  plugins: [],
};
