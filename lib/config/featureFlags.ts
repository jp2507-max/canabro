export const FEATURE_FLAGS = {
  // Existing
  flashListPerf: process.env.EXPO_PUBLIC_FLASHLIST_PERF === 'true',

  // Task 14: Telemetry & feature flags
  flushTask: process.env.EXPO_PUBLIC_FLAG_FLUSH === 'true',
  darkPeriodTask: process.env.EXPO_PUBLIC_FLAG_DARK_PERIOD === 'true',
  learningLoop: process.env.EXPO_PUBLIC_FLAG_LEARNING_LOOP !== 'false',
  advancedTips: process.env.EXPO_PUBLIC_FLAG_ADVANCED_TIPS === 'true',

  // Template version used for auto-generated tasks
  templateVersion: Number(process.env.EXPO_PUBLIC_TEMPLATE_VERSION) || 1,
};