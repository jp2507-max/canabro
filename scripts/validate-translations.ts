import fs from 'fs';
import path from 'path';
import { z } from 'zod';


const baseDir = path.join(__dirname, '../lib/locales');
const defaultLang = 'en';
const compareLangs = ['de'];


// Zod schema for translation object (recursive)
const TranslationValueSchema: z.ZodType<TranslationValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.string(), TranslationValueSchema),
  ])
);

type TranslationValue = string | number | boolean | { [key: string]: TranslationValue };
type TranslationObject = { [key: string]: TranslationValue };

/**
 * Flattens a nested translation object into a single-level record with dot-separated keys.
 *
 * Validates the input object against the translation schema before flattening. Nested keys are concatenated with dots to represent the hierarchy.
 *
 * @param obj - The translation object to flatten
 * @param prefix - Optional prefix for nested keys
 * @returns A flat record mapping dot-separated key paths to their corresponding string, number, or boolean values
 */
function flatten(obj: TranslationObject, prefix = ''): Record<string, string | number | boolean> {
  // Validate input using Zod
  TranslationValueSchema.parse(obj);
  const res: Record<string, string | number | boolean> = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(res, flatten(obj[key] as TranslationObject, prefix ? `${prefix}.${key}` : key));
    } else {
      res[prefix ? `${prefix}.${key}` : key] = obj[key] as string | number | boolean;
    }
  }
  return res;
}


/**
 * Validates that all translation files contain the same keys as the default language file.
 *
 * Reads the default language translation file and each comparison language file, validates their structure, and checks for missing translation keys. Logs errors for missing or invalid files and warnings for missing keys. Exits the process with a failure code if any issues are found.
 */
function validateTranslations(): void {
  let hasError = false;
  const defaultFile = path.join(baseDir, `${defaultLang}.json`);

  let defaultData: TranslationObject = {};
  let defaultKeys: string[] = [];
  try {
    const defaultFileContent = fs.readFileSync(defaultFile, 'utf8');
    const parsed = JSON.parse(defaultFileContent);
    // Validate and assign
    defaultData = TranslationValueSchema.parse(parsed) as TranslationObject;
    defaultKeys = Object.keys(flatten(defaultData));
  } catch (err) {
    console.error(`[ERROR] Failed to read or parse default translation file (${defaultFile}):`, err);
    process.exit(1);
    return;
  }

  for (const lang of compareLangs) {
    const langFile = path.join(baseDir, `${lang}.json`);
    if (!fs.existsSync(langFile)) {
      console.error(`[ERROR] Missing translation file: ${langFile}`);
      hasError = true;
      continue;
    }
    let langData: TranslationObject = {};
    let langKeys: string[] = [];
    try {
      const langFileContent = fs.readFileSync(langFile, 'utf8');
      const parsedLang = JSON.parse(langFileContent);
      langData = TranslationValueSchema.parse(parsedLang) as TranslationObject;
      langKeys = Object.keys(flatten(langData));
    } catch (err) {
      console.error(`[ERROR] Failed to read or parse translation file (${langFile}):`, err);
      hasError = true;
      continue;
    }
    const missing = defaultKeys.filter((k) => !langKeys.includes(k));
    if (missing.length > 0) {
      hasError = true;
      console.warn(`\n[WARN] Missing keys in ${lang}.json:`);
      missing.forEach((k) => console.warn(`  - ${k}`));
    } else {
      console.log(`[OK] All keys present in ${lang}.json`);
    }
  }

  if (hasError) {
    process.exit(1);
  } else {
    console.log('\nAll translations validated successfully.');
  }
}

validateTranslations();
