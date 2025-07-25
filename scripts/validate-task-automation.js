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
    let validationErrors = [];

    try {
        // Test 1: Validate growth stage configurations
        console.log('🔍 Test 1: Validating growth stage configurations...');
        const growthStageConfigs = TaskAutomationService.getGrowthStageConfigs();
        if (!growthStageConfigs || Object.keys(growthStageConfigs).length === 0) {
            validationErrors.push('Growth stage configs not loaded');
        }
        
        // Validate specific growth stages
        const requiredStages = Object.values(GrowthStage);
        for (const stage of requiredStages) {
            if (!growthStageConfigs[stage]) {
                validationErrors.push(`Missing config for growth stage: ${stage}`);
            } else {
                const config = growthStageConfigs[stage];
                if (!config.taskPriorities || Object.keys(config.taskPriorities).length === 0) {
                    validationErrors.push(`Missing task priorities for stage: ${stage}`);
                }
                if (!config.recommendedTasks || config.recommendedTasks.length === 0) {
                    validationErrors.push(`Missing recommended tasks for stage: ${stage}`);
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
                validationErrors.push(`Missing strain config for: ${strainType}`);
            } else {
                const config = strainConfigs[strainType];
                if (typeof config.wateringFrequency !== 'number' || config.wateringFrequency <= 0) {
                    validationErrors.push(`Invalid watering frequency for ${strainType}`);
                }
                if (typeof config.feedingFrequency !== 'number' || config.feedingFrequency <= 0) {
                    validationErrors.push(`Invalid feeding frequency for ${strainType}`);
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
                validationErrors.push('Task generation did not return array');
            } else if (tasks.length === 0) {
                validationErrors.push('No tasks generated for vegetative stage');
            } else {
                // Validate task structure
                const validTask = tasks[0];
                if (!validTask.type || !validTask.dueDate || !validTask.priority) {
                    validationErrors.push('Generated task missing required fields');
                }
            }
            console.log(`✅ Task generation validated (${tasks.length} tasks generated)`);
        } catch (error) {
            validationErrors.push(`Task generation failed: ${error.message}`);
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
                validationErrors.push('Recurring task generation did not return array');
            } else if (recurringTasks.length < 8) { // Should generate at least 8 tasks for 30 days
                validationErrors.push('Insufficient recurring tasks generated');
            } else {
                // Validate interval consistency
                const intervals = recurringTasks.map(task => new Date(task.dueDate));
                const expectedInterval = 3 * 24 * 60 * 60 * 1000; // 3 days in ms
                
                for (let i = 1; i < intervals.length; i++) {
                    const actualInterval = intervals[i].getTime() - intervals[i-1].getTime();
                    if (Math.abs(actualInterval - expectedInterval) > 1000 * 60 * 60) { // Allow 1 hour tolerance
                        validationErrors.push('Recurring task intervals inconsistent');
                        break;
                    }
                }
            }
            console.log(`✅ Recurring task logic validated (${recurringTasks.length} tasks)`);
        } catch (error) {
            validationErrors.push(`Recurring task generation failed: ${error.message}`);
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
                        validationErrors.push(`Humidity adjustment incorrect: expected ${condition.expectedAdjustment}, got ${adjustment.rescheduleHours}`);
                    }
                }
                if (condition.pH !== undefined) {
                    if (adjustment.newPriority !== condition.expectedPriority) {
                        validationErrors.push(`pH priority adjustment incorrect: expected ${condition.expectedPriority}, got ${adjustment.newPriority}`);
                    }
                }
            } catch (error) {
                validationErrors.push(`Environmental adjustment failed: ${error.message}`);
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
                validationErrors.push('Integration result invalid');
            } else {
                if (!Array.isArray(integrationResult.tasks)) {
                    validationErrors.push('Integration tasks not array');
                }
                if (typeof integrationResult.errors !== 'object') {
                    validationErrors.push('Integration errors not object');
                }
            }
            console.log(`✅ Integration components validated (${integrationResult.tasks.length} tasks)`);
        } catch (error) {
            validationErrors.push(`Integration validation failed: ${error.message}`);
        }

        // Test 7: Validate 5-day workflow optimization
        console.log('🔍 Test 7: Validating 5-day workflow optimization...');
        try {
            const fiveDayTasks = await PlantTaskIntegration.getTasksFor5DayView([mockPlant.id]);
            
            if (!Array.isArray(fiveDayTasks)) {
                validationErrors.push('5-day view tasks not array');
            } else {
                // Validate all tasks are within 5-day window
                const now = new Date();
                const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
                
                for (const task of fiveDayTasks) {
                    const dueDate = new Date(task.dueDate);
                    if (dueDate < now || dueDate > fiveDaysLater) {
                        validationErrors.push('Task outside 5-day window in optimized view');
                        break;
                    }
                }
            }
            console.log(`✅ 5-day workflow optimization validated (${fiveDayTasks.length} tasks)`);
        } catch (error) {
            validationErrors.push(`5-day optimization validation failed: ${error.message}`);
        }

        // Summary
        if (validationErrors.length > 0) {
            console.error(`❌ Validation failed with ${validationErrors.length} errors:`);
            validationErrors.forEach(error => console.error(`  - ${error}`));
            console.log('\n📊 Validation Results:');
            console.log('- ❌ Growth stage configurations: Some issues found');
            console.log('- ❌ Strain-specific scheduling: Some issues found');
            console.log('- ❌ Task generation patterns: Some issues found');
            console.log('- ❌ Recurring task logic: Some issues found');
            console.log('- ❌ Environmental adjustments: Some issues found');
            console.log('- ❌ Integration components: Some issues found');
            console.log('- ❌ 5-day workflow optimization: Some issues found');
            return false;
        }

        console.log('\n🎉 All Task Automation Service validations passed!');
        console.log('\n📊 Validation Results:');
        console.log('- ✅ Growth stage configurations: Validated');
        console.log('- ✅ Strain-specific scheduling: Validated');
        console.log('- ✅ Task generation patterns: Validated');
        console.log('- ✅ Recurring task logic: Validated');
        console.log('- ✅ Environmental adjustments: Validated');
        console.log('- ✅ Integration components: Validated');
        console.log('- ✅ 5-day workflow optimization: Validated');

        return true;
    } catch (error) {
        console.error('❌ Validation failed:', error);
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