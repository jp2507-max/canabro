// Simplified icon configuration using Unicode symbols
// This reduces bundle size by ~3-4 MB and ensures consistent icon availability
// Migrated from @expo/vector-icons to OptimizedIcon for better performance

import { OptimizedIcon, IconName } from './OptimizedIcon';

// Mapping from semantic names to OptimizedIcon names
const IconMapping: Record<string, IconName> = {
  // Navigation icons
  home: 'home',
  calendar: 'calendar',
  community: 'people',
  profile: 'person-circle-outline',
  diagnosis: 'camera',
  strains: 'leaf',
  
  // Action icons
  add: 'add',
  edit: 'pencil',
  delete: 'trash',
  save: 'checkmark',
  cancel: 'close',
  
  // Plant related icons
  plant: 'leaf-outline',
  water: 'water-outline',
  fertilizer: 'flask-outline',
  growth: 'stats-chart-outline', // Using stats chart as trending-up is not available
  
  // Camera and media
  camera: 'camera',
  gallery: 'images-outline',
  photo: 'image-outline',
} as const;

// Type-safe icon names based on the mapping
export type AppIconName = keyof typeof IconMapping;

// Simplified icon component with proper type safety
interface IconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: any;
  accessibilityLabel?: string;
  testID?: string;
}

export function AppIcon({ 
  name, 
  size = 24, 
  color = '#000',
  style,
  accessibilityLabel,
  testID 
}: IconProps) {
  const optimizedIconName = IconMapping[name];
  
  // Fallback to default if the icon doesn't exist (this shouldn't happen with proper mapping)
  if (!optimizedIconName) {
    console.warn(`AppIcon: Unknown icon name "${name}", falling back to default`);
    return (
      <OptimizedIcon
        name="default"
        size={size}
        color={color}
        style={style}
        accessibilityLabel={accessibilityLabel || `Unknown icon: ${name}`}
        testID={testID}
      />
    );
  }
  
  return (
    <OptimizedIcon
      name={optimizedIconName}
      size={size}
      color={color}
      style={style}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
}

export default AppIcon;
