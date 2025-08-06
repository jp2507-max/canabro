/**
 * DirectMessaging Component Validation Script
 * 
 * Validates that the DirectMessaging component is properly implemented
 * according to the task requirements.
 */

const { readFileSync } = require('fs');
const { join } = require('path');

function validateDirectMessaging() {
  const results = [];
  
  try {
    // Read the DirectMessaging component file
    const componentPath = join(process.cwd(), 'components/messaging/DirectMessaging.tsx');
    const componentContent = readFileSync(componentPath, 'utf-8');
    
    // Check for FlashListWrapper usage with estimatedItemSize: 80
    const hasFlashListWrapper = componentContent.includes('FlashListWrapper') && 
                               componentContent.includes('estimatedItemSize={80}');
    results.push({
      requirement: 'Build messaging interface using existing FlashListWrapper for message virtualization (estimatedItemSize: 80)',
      status: hasFlashListWrapper ? 'PASS' : 'FAIL',
      details: hasFlashListWrapper ? 
        'FlashListWrapper is used with correct estimatedItemSize' : 
        'FlashListWrapper not found or incorrect estimatedItemSize'
    });
    
    // Check for Supabase Realtime v2 and Broadcast API usage
    const hasRealtimeService = componentContent.includes('realtimeService') &&
                              componentContent.includes('subscribeToConversation') &&
                              componentContent.includes('broadcast');
    results.push({
      requirement: 'Implement real-time message delivery with Supabase Realtime v2 and Broadcast API',
      status: hasRealtimeService ? 'PASS' : 'FAIL',
      details: hasRealtimeService ? 
        'Realtime service integration found with broadcast functionality' : 
        'Realtime service integration missing or incomplete'
    });
    
    // Check for error handling with existing errorHandler and logging
    const hasErrorHandling = componentContent.includes('globalErrorHandler') &&
                            componentContent.includes('log.error') &&
                            componentContent.includes('safeAsync');
    results.push({
      requirement: 'Add error handling using existing lib/utils/errorHandler and logging with custom logger',
      status: hasErrorHandling ? 'PASS' : 'FAIL',
      details: hasErrorHandling ? 
        'Error handling and logging properly implemented' : 
        'Error handling or logging missing'
    });
    
    // Check for message status indicators with animation utilities
    const hasMessageStatus = componentContent.includes('useButtonAnimation') &&
                            componentContent.includes('MessageStatus') &&
                            componentContent.includes('renderMessageStatus');
    results.push({
      requirement: 'Add message status indicators using existing animation utilities from lib/animations/useButtonAnimation',
      status: hasMessageStatus ? 'PASS' : 'FAIL',
      details: hasMessageStatus ? 
        'Message status indicators with animations implemented' : 
        'Message status indicators or animations missing'
    });
    
    // Check for haptic feedback integration
    const hasHapticFeedback = componentContent.includes('import * as haptics') &&
                             componentContent.includes('haptics.light') &&
                             componentContent.includes('haptics.success');
    results.push({
      requirement: 'Integrate haptic feedback using existing lib/utils/haptics for message interactions',
      status: hasHapticFeedback ? 'PASS' : 'FAIL',
      details: hasHapticFeedback ? 
        'Haptic feedback properly integrated for interactions' : 
        'Haptic feedback missing or incomplete'
    });
    
    // Check for typing indicators and online presence
    const hasPresenceFeatures = componentContent.includes('TypingIndicator') &&
                               componentContent.includes('OnlineStatus') &&
                               componentContent.includes('UserPresence') &&
                               componentContent.includes('isTyping');
    results.push({
      requirement: 'Create typing indicators and online presence with Presence v2',
      status: hasPresenceFeatures ? 'PASS' : 'FAIL',
      details: hasPresenceFeatures ? 
        'Typing indicators and presence features implemented' : 
        'Typing indicators or presence features missing'
    });
    
    // Check for EnhancedKeyboardWrapper usage
    const hasKeyboardWrapper = componentContent.includes('EnhancedKeyboardWrapper') &&
                              componentContent.includes('import') &&
                              componentContent.includes('@/components/keyboard/EnhancedKeyboardWrapper');
    results.push({
      requirement: 'Use existing EnhancedKeyboardWrapper for enhanced keyboard handling',
      status: hasKeyboardWrapper ? 'PASS' : 'FAIL',
      details: hasKeyboardWrapper ? 
        'EnhancedKeyboardWrapper properly imported and used' : 
        'EnhancedKeyboardWrapper missing or not imported correctly'
    });
    
    // Check for NetworkResilientImage usage
    const hasNetworkImage = componentContent.includes('NetworkResilientImage') &&
                           componentContent.includes('optimize={true}') &&
                           componentContent.includes('enableRetry={true}');
    results.push({
      requirement: 'Use existing NetworkResilientImage for optimized message media loading',
      status: hasNetworkImage ? 'PASS' : 'FAIL',
      details: hasNetworkImage ? 
        'NetworkResilientImage properly used with optimization' : 
        'NetworkResilientImage missing or not optimized'
    });
    
    // Check for proper TypeScript interfaces
    const hasProperTypes = componentContent.includes('export interface DirectMessagingProps') &&
                          componentContent.includes('export interface MessageBubbleProps') &&
                          componentContent.includes('export interface TypingIndicatorProps');
    results.push({
      requirement: 'Proper TypeScript interfaces and type safety',
      status: hasProperTypes ? 'PASS' : 'FAIL',
      details: hasProperTypes ? 
        'TypeScript interfaces properly exported' : 
        'TypeScript interfaces missing or not exported'
    });
    
    // Check for React.memo optimization
    const hasOptimization = componentContent.includes('React.memo') &&
                           componentContent.includes('useCallback') &&
                           componentContent.includes('useMemo');
    results.push({
      requirement: 'Performance optimization with React.memo and hooks',
      status: hasOptimization ? 'PASS' : 'FAIL',
      details: hasOptimization ? 
        'Performance optimizations properly implemented' : 
        'Performance optimizations missing'
    });
    
  } catch (error) {
    results.push({
      requirement: 'Component file exists and is readable',
      status: 'FAIL',
      details: `Error reading component file: ${error.message}`
    });
  }
  
  return results;
}

function validateIndexFile() {
  const results = [];
  
  try {
    // Read the index file
    const indexPath = join(process.cwd(), 'components/messaging/index.ts');
    const indexContent = readFileSync(indexPath, 'utf-8');
    
    // Check for proper exports
    const hasProperExports = indexContent.includes('export { DirectMessaging }') &&
                            indexContent.includes('export type');
    results.push({
      requirement: 'Proper module exports in index file',
      status: hasProperExports ? 'PASS' : 'FAIL',
      details: hasProperExports ? 
        'Index file properly exports component and types' : 
        'Index file missing or incomplete exports'
    });
    
  } catch (error) {
    results.push({
      requirement: 'Index file exists and is readable',
      status: 'FAIL',
      details: `Error reading index file: ${error.message}`
    });
  }
  
  return results;
}

function printResults(results) {
  console.log('\n🔍 DirectMessaging Component Validation Results\n');
  console.log('='.repeat(80));
  
  let passCount = 0;
  let failCount = 0;
  
  results.forEach((result, index) => {
    const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    const statusColor = result.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    
    console.log(`\n${index + 1}. ${result.requirement}`);
    console.log(`   Status: ${statusColor}${status}${resetColor}`);
    console.log(`   Details: ${result.details}`);
    
    if (result.status === 'PASS') {
      passCount++;
    } else {
      failCount++;
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Summary: ${passCount} passed, ${failCount} failed out of ${results.length} requirements`);
  
  if (failCount === 0) {
    console.log('\n🎉 All requirements satisfied! DirectMessaging component is ready.');
  } else {
    console.log('\n⚠️  Some requirements need attention. Please review the failed items above.');
  }
  
  console.log('\n');
}

// Run validation
function main() {
  console.log('Starting DirectMessaging component validation...');
  
  const componentResults = validateDirectMessaging();
  const indexResults = validateIndexFile();
  const allResults = [...componentResults, ...indexResults];
  
  printResults(allResults);
  
  // Exit with error code if any validations failed
  const hasFailures = allResults.some(result => result.status === 'FAIL');
  process.exit(hasFailures ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = { validateDirectMessaging, validateIndexFile };