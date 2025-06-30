import 'react-native-gesture-handler';
import './global.css';

// Development-only keyboard debug helper to trace unexpected dismissals
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./lib/utils/keyboard-debug');
}

// Export the default layout - Expo Router will handle the rest
export { default } from './app/_layout';
