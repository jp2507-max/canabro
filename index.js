// Import gesture handler first before all other imports
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';

import 'expo-router/entry';
// Enable screens after gesture handler but before other components
enableScreens();
