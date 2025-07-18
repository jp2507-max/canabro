const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '../lib/locales');
const defaultLang = 'en';
const compareLangs = ['de'];

function flatten(obj, prefix = '') {
  const res = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(res, flatten(obj[key], prefix ? `${prefix}.${key}` : key)); 
    } else {
      res[prefix ? `${prefix}.${key}` : key] = obj[key];
    }
  }
  return res;
}

function validateTranslations() {
  const defaultFile = path.join(baseDir, `${defaultLang}.json`);
  const defaultData = JSON.parse(fs.readFileSync(defaultFile, 'utf8'));
  const defaultKeys = Object.keys(flatten(defaultData));

  let hasError = false;

  for (const lang of compareLangs) {
    const langFile = path.join(baseDir, `${lang}.json`);
    if (!fs.existsSync(langFile)) {
      console.error(`[ERROR] Missing translation file: ${langFile}`);
      hasError = true;
      continue;
    }
    const langData = JSON.parse(fs.readFileSync(langFile, 'utf8'));
    const langKeys = Object.keys(flatten(langData));
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
