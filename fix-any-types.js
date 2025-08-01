#!/usr/bin/env node

/**
 * Script to automatically fix common 'any' type issues
 */

const fs = require('fs');
const path = require('path');

// Common patterns to replace
const replacements = [
  // Function parameters
  { from: /\(([^:)]*): any\)/g, to: '($1: Record<string, unknown>)' },
  { from: /\(([^:)]*): any,/g, to: '($1: Record<string, unknown>,' },
  
  // Variable declarations
  { from: /: any;/g, to: ': Record<string, unknown>;' },
  { from: /: any\[\]/g, to: ': unknown[]' },
  
  // Return types for simple cases
  { from: /\): any \{/g, to: '): Record<string, unknown> {' },
  
  // Generic types
  { from: /any>/g, to: 'unknown>' },
  { from: /<any/g, to: '<unknown' },
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

// Get all TypeScript files that have 'any' type issues
const filesToFix = [
  'lib/services/EnvironmentalDataIntegrationService.ts',
  'lib/services/HarvestDataIntegrator.ts',
  'lib/services/HarvestPredictionService.ts',
  'lib/services/HarvestPreparationAutomator.ts',
  'lib/services/NotificationService.ts',
  'lib/services/PostHarvestScheduler.ts',
  'lib/services/StrainCalendarIntegrationService.ts',
  'lib/services/TaskReminderIntegration5Day.ts',
  'lib/services/community-service.ts',
  'lib/services/communityService.ts',
  'lib/services/content-moderation.service.ts',
  'lib/services/diary-service.ts',
  'lib/services/integration-test.ts',
  'lib/services/notificationListenerService.ts',
  'lib/services/plant-service.ts',
  'lib/services/realtimeConfig.ts',
  'lib/services/realtimeService.ts',
  'lib/services/smart-cache-manager.ts',
  'lib/services/strain-search.service.ts',
  'lib/services/taskNotificationService.ts',
  'lib/services/template-sharing-service.ts',
  'lib/services/user-reporting.service.ts',
  'lib/utils/data-parsing.ts',
  'lib/utils/logger.ts',
  'lib/utils/production-utils.ts',
];

console.log('🔧 Starting automated TypeScript any-type fixes...\n');

filesToFix.forEach(relativePath => {
  const fullPath = path.join(__dirname, relativePath);
  if (fs.existsSync(fullPath)) {
    fixFile(fullPath);
  } else {
    console.log(`⚠️  File not found: ${fullPath}`);
  }
});

console.log('\n✅ Automated fixes complete!');
console.log('🔍 Run ESLint again to see remaining issues.');
