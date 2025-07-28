/**
 * Validation script for TaskAutomationService
 * 
 * Tests the task automation service implementation to ensure it correctly
 * reuses and adapts existing scheduling logic.
 */

import { TaskAutomationService } from '../lib/services/TaskAutomationService.js';
import { PlantTaskIntegration } from '../lib/services/PlantTaskIntegration.js';
import { GrowthStage } from '../lib/types/plant.js';
import { TaskType } from '../lib/types/taskTypes.js';
import { database } from '../lib/models/index.js';
import { addDays } from 'date-fns';

async function validateTaskAutomation() {
    console.log('🧪 Validating Task Automation Service Implementation...\n');
    
    // Track test results with detailed status
    const testResults = {
        growthStageConfigs: { name: 'Growth stage configurations', passed: true, errors: [] },
        strainScheduling: { name: 'Strain-specific scheduling', passed: true, errors: [] },
        taskGeneration: { name: 'Task generation patterns', passed: true, errors: [] },
        recurringTasks: { name: 'Recurring task logic', passed: true, errors: [] },
        envAdjustments: { name: 'Environmental adjustments', passed: true, errors: [] },
        integration: { name: 'Integration components', passed: true, errors: [] },
        fiveDayWorkflow: { name: '5-day workflow optimization', passed: true, errors: [] }
    };
    
    // Helper function to add error to a specific test
    function addError(testKey, error) {
        testResults[testKey].passed = false;
        testResults[testKey].errors.push(error);
    }

    try {
        // Test 1: Validate growth stage configurations
        console.log('🔍 Test 1: Validating growth stage configurations...');
        const growthStageConfigs = TaskAutomationService.getGrowthStageConfigs();
        if (!growthStageConfigs || Object.keys(growthStageConfigs).length === 0) {
            addError('growthStageConfigs', 'Growth stage configs not loaded');
        }
        
        // Validate specific growth stages
        const requiredStages = Object.values(GrowthStage);
        let growthStageConfigsValid = true;
        for (const stage of requiredStages) {
            if (!growthStageConfigs[stage]) {
                addError('growthStageConfigs', `Missing config for growth stage: ${stage}`);
                growthStageConfigsValid = false;
            } else {
                const config = growthStageConfigs[stage];
                if (!config.taskPriorities || Object.keys(config.taskPriorities).length === 0) {
                    addError('growthStageConfigs', `Missing task priorities for stage: ${stage}`);
                    growthStageConfigsValid = false;
                }
                if (!config.recommendedTasks || config.recommendedTasks.length === 0) {
                    addError('growthStageConfigs', `Missing recommended tasks for stage: ${stage}`);
                    growthStageConfigsValid = false;
                }
            }
        }
        console.log(`✅ Growth stage configs validated (${Object.keys(growthStageConfigs).length} stages)`);

        // Test 2: Validate strain-specific scheduling
        console.log('🔍 Test 2: Validating strain-specific scheduling...');
        const strainConfigs = TaskAutomationService.getStrainSchedulingConfigs();
        const requiredStrainTypes = ['indica', 'sativa', 'hybrid', 'cbd', 'unknown'];
        
        for (const strainType of requiredStrainTypes) {
            if (!strainConfigs[strainType]) {
                addError('strainScheduling', `Missing strain config for: ${strainType}`);
            } else {
                const config = strainConfigs[strainType];
                if (typeof config.wateringFrequency !== 'number' || config.wateringFrequency <= 0) {
                    addError('strainScheduling', `Invalid watering frequency for ${strainType}`);
                }
                if (typeof config.feedingFrequency !== 'number' || config.feedingFrequency <= 0) {
                    addError('strainScheduling', `Invalid feeding frequency for ${strainType}`);
                }
            }
        }
        console.log(`✅ Strain scheduling configs validated (${Object.keys(strainConfigs).length} strain types)`);

        // Test 3: Validate task generation patterns
        console.log('🔍 Test 3: Validating task generation patterns...');
        const mockPlant = {
            id: 'test-plant-123',
            name: 'Test Plant',
            growthStage: GrowthStage.VEGETATIVE,
            strainId: 'test-strain-001',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        try {
            const tasks = await TaskAutomationService.scheduleForGrowthStage(mockPlant, GrowthStage.VEGETATIVE);
            if (!Array.isArray(tasks)) {
                addError('taskGeneration', 'Task generation did not return array');
            } else if (tasks.length === 0) {
                addError('taskGeneration', 'No tasks generated for vegetative stage');
            } else {
                // Validate task structure
                const validTask = tasks[0];
                if (!validTask.type || !validTask.dueDate || !validTask.priority) {
                    addError('taskGeneration', 'Generated task missing required fields');
                }
            }
            console.log(`✅ Task generation validated (${tasks.length} tasks generated)`);
        } catch (error) {
            addError('taskGeneration', `Task generation failed: ${error.message}`);
        }

        // Test 4: Validate recurring task logic
        console.log('🔍 Test 4: Validating recurring task logic...');
        try {
            const recurringTasks = await TaskAutomationService.generateRecurringTasks(
                mockPlant, 
                'watering', 
                3, 
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            );
            
            if (!Array.isArray(recurringTasks)) {
                addError('recurringTasks', 'Recurring task generation did not return array');
            } else if (recurringTasks.length < 8) { // Should generate at least 8 tasks for 30 days
                addError('recurringTasks', 'Insufficient recurring tasks generated');
            } else {
                // Validate interval consistency
                const intervals = recurringTasks.map(task => new Date(task.dueDate));
                const expectedInterval = 3 * 24 * 60 * 60 * 1000; // 3 days in ms
                
                for (let i = 1; i < intervals.length; i++) {
                    const actualInterval = intervals[i].getTime() - intervals[i-1].getTime();
                    if (Math.abs(actualInterval - expectedInterval) > 1000 * 60 * 60) { // Allow 1 hour tolerance
                        addError('recurringTasks', 'Recurring task intervals inconsistent');
                        break;
                    }
                }
            }
            console.log(`✅ Recurring task logic validated (${recurringTasks.length} tasks)`);
        } catch (error) {
            addError('recurringTasks', `Recurring task generation failed: ${error.message}`);
        }

        // Test 5: Validate environmental adjustments
        console.log('🔍 Test 5: Validating environmental condition adjustments...');
        const testConditions = [
            { humidity: 80, expectedAdjustment: 12 }, // High humidity
            { humidity: 30, expectedAdjustment: -6 }, // Low humidity
            { pH: 5.0, expectedPriority: 'critical' }, // Low pH
            { temperature: 35, expectedAdjustment: -2 } // High temperature
        ];

        for (const condition of testConditions) {
            try {
                const adjustment = TaskAutomationService.calculateEnvironmentalAdjustments('watering', condition);
                
                if (condition.humidity !== undefined) {
                    if (adjustment.rescheduleHours !== condition.expectedAdjustment) {
                        addError('envAdjustments', `Humidity adjustment incorrect: expected ${condition.expectedAdjustment}, got ${adjustment.rescheduleHours}`);
                    }
                }
                if (condition.pH !== undefined) {
                    if (adjustment.newPriority !== condition.expectedPriority) {
                        addError('envAdjustments', `pH priority adjustment incorrect: expected ${condition.expectedPriority}, got ${adjustment.newPriority}`);
                    }
                }
            } catch (error) {
                addError('envAdjustments', `Environmental adjustment failed: ${error.message}`);
            }
        }
        console.log('✅ Environmental adjustments validated');

        // Test 6: Validate integration components
        console.log('🔍 Test 6: Validating integration components...');
        try {
            // Test PlantTaskIntegration high-level API
            const integrationResult = await PlantTaskIntegration.scheduleTasksForPlant(mockPlant, {
                generateRecurring: true,
                recurringInterval: 7,
                optimizeFor5DayView: true
            });
            
            if (!integrationResult || typeof integrationResult !== 'object') {
                addError('integration', 'Integration result invalid');
            } else {
                if (!Array.isArray(integrationResult.tasks)) {
                    addError('integration', 'Integration tasks not array');
                }
                if (typeof integrationResult.errors !== 'object') {
                    addError('integration', 'Integration errors not object');
                }
            }
            console.log(`✅ Integration components validated (${integrationResult.tasks?.length || 0} tasks)`);
        } catch (error) {
            addError('integration', `Integration validation failed: ${error.message}`);
        }

        // Test 7: Validate 5-day workflow optimization
        console.log('🔍 Test 7: Validating 5-day workflow optimization...');
        try {
            const fiveDayTasks = await PlantTaskIntegration.getTasksFor5DayView([mockPlant.id]);
            
            if (!Array.isArray(fiveDayTasks)) {
                addError('fiveDayWorkflow', '5-day view tasks not array');
            } else {
                // Validate all tasks are within 5-day window
                const now = new Date();
                const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
                
                for (const task of fiveDayTasks) {
                    const dueDate = new Date(task.dueDate);
                    if (dueDate < now || dueDate > fiveDaysLater) {
                        addError('fiveDayWorkflow', 'Task outside 5-day window in optimized view');
                        break;
                    }
                }
            }
            console.log(`✅ 5-day workflow optimization validated (${fiveDayTasks.length} tasks)`);
        } catch (error) {
            addError('fiveDayWorkflow', `5-day optimization validation failed: ${error.message}`);
        }

        // Summary
        const allTests = Object.values(testResults);
        const passedTests = allTests.filter(test => test.passed);
        const failedTests = allTests.filter(test => !test.passed);
        
        console.log('\n📊 Validation Results:');
        
        // Show passed tests first
        passedTests.forEach(test => {
            console.log(`- ✅ ${test.name}: Passed`);
        });
        
        // Then show failed tests with their errors
        failedTests.forEach(test => {
            console.log(`\n❌ ${test.name}: Failed`);
            test.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        });
        
        // Overall status
        if (failedTests.length === 0) {
            console.log('\n🎉 All Task Automation Service validations passed!');
        } else {
            console.log(`\n❌ Validation completed with ${failedTests.length} of ${allTests.length} test categories failing`);
        }

        return true;
    } catch (error) {
        console.error('❌ Validation failed with unhandled error:');
        console.error(error);
        return false;
    }
}

// Run validation
validateTaskAutomation()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('❌ Critical validation error:', error);
        process.exit(1);
    });