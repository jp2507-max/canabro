import 'dotenv/config';

export default {
  expo: {
    jsEngine: 'hermes',
    name: 'canabro',
    slug: 'canabro',
    version: '1.0.0',
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true,
    },
    plugins: [
      'react-native-bottom-tabs',
      [
        'expo-router',
        {
          asyncRoutes: false, // Completely disable lazy loading to prevent bundling delays
        },
      ],
      'expo-font',
      'expo-secure-store',
      'expo-task-manager', // Required for background tasks
      'expo-background-task', // Add this back for the new background task library
      'expo-localization',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#ffffff',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            deploymentTarget: '16.0',
            extraPodspecDependencies: {
              simdjson: '../node_modules/@nozbe/simdjson',
            },
            // iOS Performance Optimizations
            bundler: 'metro',
            newArchEnabled: true,
            // Optimize for App Store submission
            privacyManifestPath: './ios-privacy-manifest.json',
          },
          android: {
            minSdkVersion: 23,
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            buildToolsVersion: '34.0.0',
            packagingOptions: {
              pickFirst: ['**/libc++_shared.so', '**/libjsc.so'],
            },
          },
        },
      ],
    ],
    scheme: 'canabro',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.canabro.app',
      deploymentTarget: '16.0',
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          'This app needs camera access to take photos of your plants for tracking and identification purposes.',
        NSMicrophoneUsageDescription:
          'This app may need microphone access for video recording features.',
        NSPhotoLibraryUsageDescription:
          'This app needs access to your photo library to select existing photos of your plants for tracking and identification purposes.',
        NSPhotoLibraryAddUsageDescription:
          'This app needs permission to save photos of your plants to your photo library.',
        UIBackgroundModes: ['fetch', 'processing'],
      },
      associatedDomains: ['applinks:YOUR_APP_LINK_DOMAIN'],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.canabro.app',
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_MEDIA_IMAGES', // Android 13+
        'android.permission.READ_EXTERNAL_STORAGE', // Android 12 and below
      ],
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      RAPIDAPI_KEY: process.env.EXPO_PUBLIC_RAPIDAPI_KEY,
      router: {
        origin: false,
      },
      eas: {
        projectId: 'f04ff5d3-6a5d-4abf-8ac4-e471877b69e3',
      },
    },
    newArchEnabled: true,
    owner: 'jan_100',
  },
};
