const normalizeEnv = (value: string | undefined): string => (value ?? '').trim();

function toBool(envValue: string | undefined, defaultValue: boolean): boolean {
  const normalized = normalizeEnv(envValue);
  if (normalized === '') return defaultValue;
  switch (normalized.toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true;
    case '0':
    case 'false':
    case 'no':
    case 'off':
      return false;
    default:
      return defaultValue;
  }
}

function toNumber(envValue: string | undefined, defaultValue: number): number {
  const normalized = normalizeEnv(envValue);
  if (normalized === '') return defaultValue;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export const FEATURE_FLAGS: FeatureFlags = Object.freeze({
  // Existing
  flashListPerf: toBool(process.env.EXPO_PUBLIC_FLASHLIST_PERF, false),

  // Task 14: Telemetry & feature flags
  flushTask: toBool(process.env.EXPO_PUBLIC_FLAG_FLUSH, false),
  darkPeriodTask: toBool(process.env.EXPO_PUBLIC_FLAG_DARK_PERIOD, false),
  learningLoop: toBool(process.env.EXPO_PUBLIC_FLAG_LEARNING_LOOP, true),
  advancedTips: toBool(process.env.EXPO_PUBLIC_FLAG_ADVANCED_TIPS, false),

  // Template version used for auto-generated tasks
  templateVersion: toNumber(process.env.EXPO_PUBLIC_TEMPLATE_VERSION, 1),
});

export interface FeatureFlags {
  readonly flashListPerf: boolean;
  readonly flushTask: boolean;
  readonly darkPeriodTask: boolean;
  readonly learningLoop: boolean;
  readonly advancedTips: boolean;
  readonly templateVersion: number;
}