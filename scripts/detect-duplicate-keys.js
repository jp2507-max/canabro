// Detect duplicate keys within JSON objects without external deps
// Usage: node scripts/detect-duplicate-keys.js lib/locales/en.json lib/locales/de.json

const fs = require('fs');

function detectDuplicatesInJsonText(text) {
  const duplicates = [];

  let i = 0;
  let inString = false;
  let escapeNext = false;
  const objectKeyStacks = []; // stack of Map<string, number> for current object level
  const pathStack = []; // stack of path segments (keys) pointing to the current object
  let lastKeyForValue = null; // key whose value is about to be parsed

  function readString() {
    // assumes current char is '"'
    inString = true;
    let result = '';
    i++; // skip opening quote
    while (i < text.length) {
      const ch = text[i];
      if (escapeNext) {
        result += ch;
        escapeNext = false;
        i++;
        continue;
      }
      if (ch === '\\') {
        escapeNext = true;
        i++;
        continue;
      }
      if (ch === '"') {
        inString = false;
        i++; // consume closing quote
        break;
      }
      result += ch;
      i++;
    }
    return result;
  }

  function skipWhitespace() {
    while (i < text.length && /\s/.test(text[i])) i++;
  }

  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      // Shouldn't happen since readString handles the body, but safeguard
      i++;
      continue;
    }

    if (ch === '"') {
      // Potential key or string value. Read it, then inspect the next non-space char.
      const str = readString();
      const j = i; // position after closing quote
      skipWhitespace();
      if (text[i] === ':') {
        // It's a key
        if (objectKeyStacks.length > 0) {
          const top = objectKeyStacks[objectKeyStacks.length - 1];
          if (top.has(str)) {
            duplicates.push({ path: pathStack.join('.') || '<root>', key: str });
          } else {
            top.set(str, 1);
          }
        }
        lastKeyForValue = str;
      } else {
        // It's a string value in array or elsewhere; restore pointer to j
        i = j;
      }
      continue;
    }

    if (ch === '{') {
      // Enter object
      objectKeyStacks.push(new Map());
      // If we just read a key and now value starts with object, push to path
      if (lastKeyForValue != null) {
        pathStack.push(lastKeyForValue);
        lastKeyForValue = null;
      } else {
        // Anonymous object (e.g., array element)
        pathStack.push('');
      }
      i++;
      continue;
    }

    if (ch === '}') {
      // Exit object
      objectKeyStacks.pop();
      pathStack.pop();
      lastKeyForValue = null;
      i++;
      continue;
    }

    if (ch === '[') {
      // Enter array; push a placeholder on path if tied to a key
      if (lastKeyForValue != null) {
        pathStack.push(lastKeyForValue);
        lastKeyForValue = null;
      } else {
        pathStack.push('');
      }
      i++;
      continue;
    }

    if (ch === ']') {
      pathStack.pop();
      lastKeyForValue = null;
      i++;
      continue;
    }

    // Reset lastKeyForValue when encountering commas or primitives
    if (ch === ',' || ch === ':' || /[\-0-9tfn]/.test(ch)) {
      // t,f,n for true,false,null, or number start
      lastKeyForValue = null;
      i++;
      continue;
    }

    // Whitespace or other chars
    i++;
  }

  return duplicates;
}

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: node scripts/detect-duplicate-keys.js <file1.json> [file2.json ...]');
    process.exit(2);
  }
  let hadDuplicates = false;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const dups = detectDuplicatesInJsonText(text);
    if (dups.length) {
      hadDuplicates = true;
      console.log(`DUPLICATES in ${file}:`);
      for (const { path, key } of dups) {
        console.log(`  at ${path}: ${key}`);
      }
    } else {
      console.log(`No duplicates in ${file}`);
    }
  }
  if (hadDuplicates) process.exit(1);
}

main();


