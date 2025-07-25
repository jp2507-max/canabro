/**
 * Template Editor Test Runner
 * 
 * Validates TemplateEditor implementation against task 3.2 requirements
 * Uses validation functions from TemplateEditor.validation.ts
 */

import { 
  TemplateEditorData,
  createTestTemplateData,
  validateTemplateEditor,
  validateFeatures,
  runTemplateEditorTests 
} from './components/schedule-templates/TemplateEditor.validation';

// Import types for TypeScript
import { TaskType } from './lib/types/taskTypes';

// Test data using the imported factory function
const testTemplateData: TemplateEditorData = createTestTemplateData();

// Feature validation using imported functions
const validateTemplateFeatures = (data: TemplateEditorData) => ({
  weekByWeekPlanning: validateFeatures.hasWeekByWeekPlanning(data),
  dragAndDropScheduling: validateFeatures.supportsDragAndDrop(data),
  taskTemplateLibrary: validateFeatures.hasTaskTemplateLibrary(data),
  templateValidation: validateFeatures.hasTemplateValidation(data),
  previewFunctionality: validateFeatures.hasPreviewFunctionality(data),
});

// Main test function with TypeScript types
const runTests = (): boolean => {
  console.log('🧪 Running TemplateEditor validation tests...');

  // Use imported validation functions
  const basicValidation = validateTemplateEditor.validateBasicInfo(testTemplateData);
  const taskValidation = validateTemplateEditor.validateTaskData(testTemplateData.templateData);
  
  // Check feature support
  const features = validateTemplateFeatures(testTemplateData);

  const allValid = basicValidation.isValid && taskValidation.isValid && Object.values(features).every(f => f);
  const allErrors = [...basicValidation.errors, ...taskValidation.errors];

  // Test results output
  console.log('📊 Test Results:');
  console.log(`✅ Overall Valid: ${allValid}`);
  console.log(`📝 Errors: ${allErrors.length === 0 ? 'None' : allErrors.join(', ')}`);
  
  console.log('🎯 Task 3.2 Requirements:');
  console.log(`  - Week-by-week planning interface: ${features.weekByWeekPlanning ? '✅' : '❌'}`);
  console.log(`  - Drag-and-drop task scheduling: ${features.dragAndDropScheduling ? '✅' : '❌'}`);
  console.log(`  - Task template library: ${features.taskTemplateLibrary ? '✅' : '❌'}`);
  console.log(`  - Template validation: ${features.templateValidation ? '✅' : '❌'}`);
  console.log(`  - Preview functionality: ${features.previewFunctionality ? '✅' : '❌'}`);

  if (allValid) {
    console.log('🎉 All tests passed! TemplateEditor meets task 3.2 requirements.');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }

  return allValid;
};

// Run the tests using the imported test runner for consistency
const runTestSuite = (): void => {
  try {
    // First run our custom test output
    const success = runTests();
    
    // Then run the standard test suite for additional validation
    console.log('\n🏃 Running standard test suite...');
    runTemplateEditorTests();
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  }
};

// Execute the test suite
runTestSuite();
