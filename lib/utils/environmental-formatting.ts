/**
 * Shared utility functions for formatting environmental metric values
 */

/**
 * Format environmental metric values with appropriate units
 * @param metric - The metric name (case-insensitive)
 * @param value - The numeric value to format
 * @returns Formatted string with units
 */
export const formatEnvironmentalValue = (metric: string, value: number): string => {
  // Convert metric to lowercase for case-insensitive comparison
  const normalizedMetric = metric.toLowerCase();
  
  switch (normalizedMetric) {
    case 'temperature':
      return `${value.toFixed(1)}°C`;
    case 'humidity':
      return `${value.toFixed(1)}%`;
    case 'ph':
    case 'pH':
      return value.toFixed(2);
    case 'vpd':
    case 'VPD':
      return `${value.toFixed(2)} kPa`;
    case 'ec':
    case 'EC':
      return `${value.toFixed(0)} ppm`;
    case 'co2':
    case 'CO2':
      return `${value.toFixed(0)} ppm`;
    default:
      return value.toFixed(1);
  }
};
