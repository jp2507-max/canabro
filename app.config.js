import 'dotenv/config';

export default {
  expo: {
    name: "canabro",
    slug: "canabro",
    version: "1.0.0",
    web: {
      favicon: "./assets/favicon.png"
    },
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff"
        }
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            deploymentTarget: "15.1",
            extraPodspecDependencies: {
              simdjson: "../node_modules/@nozbe/simdjson"
            }
          }
        }
      ]
    ],
    scheme: "canabro",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.canabro.app",
      "buildNumber": "1.0.0",
      "deploymentTarget": "15.1",
      "config": {
        "usesNonExemptEncryption": false
      },
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSCameraUsageDescription": "Allow $(PRODUCT_NAME) to access your camera",
        "NSMicrophoneUsageDescription": "Allow $(PRODUCT_NAME) to access your microphone"
      },
      "associatedDomains": [
        "applinks:YOUR_APP_LINK_DOMAIN"
      ]
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.canabro.app"
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      router: {
        origin: false
      },
      eas: {
        projectId: "f04ff5d3-6a5d-4abf-8ac4-e471877b69e3"
      }
    },
    newArchEnabled: true,
    owner: "jan_100"
  }
};
