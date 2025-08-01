#!/usr/bin/env node

/**
 * Script to fix the remaining critical 'any' types that the first script missed
 */

const fs = require('fs');
const path = require('path');

// More specific patterns for remaining any types
const replacements = [
  // Function parameters with complex patterns
  { from: /data: any/g, to: 'data: Record<string, unknown>' },
  { from: /error: any/g, to: 'error: Error | unknown' },
  { from: /result: any/g, to: 'result: Record<string, unknown>' },
  { from: /response: any/g, to: 'response: Record<string, unknown>' },
  { from: /payload: any/g, to: 'payload: Record<string, unknown>' },
  { from: /config: any/g, to: 'config: Record<string, unknown>' },
  { from: /options: any/g, to: 'options: Record<string, unknown>' },
  { from: /params: any/g, to: 'params: Record<string, unknown>' },
  { from: /metadata: any/g, to: 'metadata: Record<string, unknown>' },
  { from: /item: any/g, to: 'item: Record<string, unknown>' },
  { from: /value: any/g, to: 'value: unknown' },
  { from: /obj: any/g, to: 'obj: Record<string, unknown>' },
  
  // Array types
  { from: /args: any\[\]/g, to: 'args: unknown[]' },
  { from: /items: any\[\]/g, to: 'items: unknown[]' },
  
  // Return types
  { from: /Promise<any>/g, to: 'Promise<unknown>' },
  
  // Generic catch-all for remaining cases
  { from: /= any>/g, to: '= unknown>' },
  { from: /\| any/g, to: '| unknown' },
  { from: /any \|/g, to: 'unknown |' },
];

function fixFile(filePath) {
  console.log(`Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  replacements.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Fixed ${filePath}`);
  } else {
    console.log(`  ⏭️  No changes needed for ${filePath}`);
  }
}

// Target the specific files that still have any types
const filesToFix = [
  'lib/services/EnvironmentalDataIntegrationService.ts',
  'lib/services/HarvestPredictionService.ts',
  'lib/services/HarvestPreparationAutomator.ts',
  'lib/services/NotificationService.ts',
  'lib/services/community-service.ts',
  'lib/services/communityService.ts',
  'lib/services/integration-test.ts',
  'lib/services/realtimeConfig.ts',
  'lib/services/realtimeService.ts',
  'lib/services/strain-search.service.ts',
  'lib/services/taskNotificationService.ts',
  'lib/services/user-reporting.service.ts',
  'lib/utils/logger.ts',
  'lib/utils/production-utils.ts',
  'lib/services/sync/cache.ts',
  'lib/services/sync/conflict-resolver.ts',
  'lib/services/sync/data-sanitizer.ts',
  'lib/services/sync/ensure-strain-exists.ts',
  'lib/services/sync/metrics.ts',
  'lib/services/sync/record-validator.ts',
  'lib/services/sync/strain-loader.ts',
  'lib/services/sync/types.ts',
  'lib/services/sync/utils.ts',
];

console.log('🔧 Starting targeted TypeScript any-type fixes...\n');

filesToFix.forEach(relativePath => {
  const fullPath = path.join(__dirname, relativePath);
  if (fs.existsSync(fullPath)) {
    fixFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${fullPath}`);
  }
});

console.log('\n✅ Targeted fixes complete!');
console.log('🔍 Run ESLint again to see remaining issues.');
