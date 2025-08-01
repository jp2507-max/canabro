/**
 * Profanity and inappropriate content configuration loader.
 *
 * Loads lists from Expo public env (if provided) or falls back to repo JSON.
 * This avoids embedding raw words in source files which can trigger content filters.
 *
 * Env override (stringified JSON):
 *   EXPO_PUBLIC_MODERATION_PROFANITY_EN={"profanity":{"critical":[],"high":[],"medium":[]},"cannabis_inappropriate":{"illegal_activities":[],"harmful_practices":[],"off_topic":[]}}
 */

export type ProfanityLevels = 'critical' | 'high' | 'medium';

export interface ProfanityConfig {
  profanity: Record<ProfanityLevels, string[]>;
  cannabis_inappropriate: {
    illegal_activities: string[];
    harmful_practices: string[];
    off_topic: string[];
  };
}

const DEFAULT_LOCALE = 'en';

function getEnvKey(locale: string) {
  // Expo public env must be prefixed with EXPO_PUBLIC_
  // Keep locale uppercased for clarity.
  return `EXPO_PUBLIC_MODERATION_PROFANITY_${locale.toUpperCase()}`;
}

function safeParseJSON<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getProfanityConfig(locale: string = DEFAULT_LOCALE): ProfanityConfig {
  // 1) Try env override first
  const envKey = getEnvKey(locale);
  const fromEnv = safeParseJSON<ProfanityConfig>((process as any)?.env?.[envKey]);
  if (fromEnv && isValidConfig(fromEnv)) {
    return fromEnv;
  }

  // 2) Fallback to repo JSON
  // For now only en.json is provided. Extend with additional locales if needed.
  switch (locale.toLowerCase()) {
    case 'en':
    default:
      // Importing JSON keeps the words out of TS source
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./en.json') as ProfanityConfig;
  }
}

function isValidConfig(cfg: any): cfg is ProfanityConfig {
  if (!cfg || typeof cfg !== 'object') return false;
  if (!cfg.profanity || !cfg.cannabis_inappropriate) return false;

  const levels: ProfanityLevels[] = ['critical', 'high', 'medium'];
  const hasAllLevels = levels.every(l => Array.isArray(cfg.profanity?.[l]));
  if (!hasAllLevels) return false;

  const ci = cfg.cannabis_inappropriate;
  if (!Array.isArray(ci.illegal_activities)) return false;
  if (!Array.isArray(ci.harmful_practices)) return false;
  if (!Array.isArray(ci.off_topic)) return false;

  return true;
}
