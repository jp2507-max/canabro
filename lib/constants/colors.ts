/**
 * Color tokens for React Native components
 * Maps CSS variables to actual color values for use in React Native components
 * that don't support CSS variables (like RefreshControl)
 */

// Helper function to convert RGB values to hex
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Primary color palette
export const primaryColors = {
  50: rgbToHex(240, 253, 244),
  100: rgbToHex(220, 252, 231),
  200: rgbToHex(187, 247, 208),
  300: rgbToHex(134, 239, 172),
  400: rgbToHex(74, 222, 128),
  500: rgbToHex(22, 163, 74),
  600: rgbToHex(5, 150, 105),
  700: rgbToHex(4, 120, 87),
  800: rgbToHex(6, 95, 70),
  900: rgbToHex(6, 78, 59),
} as const;

// Neutral color palette (light mode)
export const neutralColors = {
  50: rgbToHex(253, 251, 247),
  100: rgbToHex(251, 246, 239),
  200: rgbToHex(245, 234, 220),
  300: rgbToHex(233, 216, 192),
  400: rgbToHex(211, 191, 168),
  500: rgbToHex(184, 161, 138),
  600: rgbToHex(156, 132, 110),
  700: rgbToHex(127, 106, 86),
  800: rgbToHex(97, 81, 65),
  900: rgbToHex(75, 63, 51),
} as const;

// Dark mode neutral colors
export const darkNeutralColors = {
  50: rgbToHex(75, 63, 51),
  100: rgbToHex(97, 81, 65),
  200: rgbToHex(127, 106, 86),
  300: rgbToHex(156, 132, 110),
  400: rgbToHex(184, 161, 138),
  500: rgbToHex(211, 191, 168),
  600: rgbToHex(233, 216, 192),
  700: rgbToHex(245, 234, 220),
  800: rgbToHex(251, 246, 239),
  900: rgbToHex(253, 251, 247),
} as const;

// Semantic color aliases
export const semanticColors = {
  success: {
    50: rgbToHex(240, 253, 244),
    100: rgbToHex(220, 252, 231),
    200: rgbToHex(187, 247, 208),
    300: rgbToHex(134, 239, 172),
    400: rgbToHex(74, 222, 128),
    500: rgbToHex(34, 197, 94),
    600: rgbToHex(22, 163, 74),
    700: rgbToHex(21, 128, 61),
    800: rgbToHex(22, 101, 52),
    900: rgbToHex(20, 83, 45),
  },
  danger: {
    50: rgbToHex(254, 242, 242),
    100: rgbToHex(254, 226, 226),
    200: rgbToHex(254, 202, 202),
    300: rgbToHex(252, 165, 165),
    400: rgbToHex(248, 113, 113),
    500: rgbToHex(239, 68, 68),
    600: rgbToHex(220, 38, 38),
    700: rgbToHex(185, 28, 28),
    800: rgbToHex(153, 27, 27),
    900: rgbToHex(127, 29, 29),
  },
  warning: {
    50: rgbToHex(255, 251, 235),
    100: rgbToHex(254, 243, 199),
    200: rgbToHex(253, 230, 138),
    300: rgbToHex(252, 211, 77),
    400: rgbToHex(251, 191, 36),
    500: rgbToHex(245, 158, 11),
    600: rgbToHex(217, 119, 6),
    700: rgbToHex(180, 83, 9),
    800: rgbToHex(146, 64, 14),
    900: rgbToHex(120, 53, 15),
  },
  info: {
    50: rgbToHex(239, 246, 255),
    100: rgbToHex(219, 234, 254),
    200: rgbToHex(191, 219, 254),
    300: rgbToHex(147, 197, 253),
    400: rgbToHex(96, 165, 250),
    500: rgbToHex(59, 130, 246),
    600: rgbToHex(37, 99, 235),
    700: rgbToHex(29, 78, 216),
    800: rgbToHex(30, 64, 175),
    900: rgbToHex(30, 58, 138),
  },
} as const;

// Convenience exports for most commonly used colors
export const colors = {
  primary: primaryColors,
  neutral: neutralColors,
  darkNeutral: darkNeutralColors,
  semantic: semanticColors,
} as const;

// Helper function to get primary color with fallback
export const getPrimaryColor = (shade: keyof typeof primaryColors = 500): string => {
  return primaryColors[shade];
};

// Helper function to get semantic color with fallback
export const getSemanticColor = (
  type: keyof typeof semanticColors,
  shade: keyof typeof semanticColors.success = 500
): string => {
  return semanticColors[type][shade];
};

// Default color for RefreshControl components
export const refreshControlColors = {
  tintColor: primaryColors[500],
  colors: [primaryColors[500]],
};
