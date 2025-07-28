/**
 * Simple integration test for StrainCalendarIntegrationService
 * 
 * This file can be run to verify the service works correctly
 */

import { StrainCalendarIntegrationService } from './StrainCalendarIntegrationService';
import { getStrainById } from '../data/strains';

async function testStrainCalendarIntegration() {
  console.log('🧪 Testing Strain Calendar Integration Service...\n');

  // Test 1: Get strain characteristics
  console.log('1. Testing strain data retrieval...');
  const strain = getStrainById('123e4567-e89b-12d3-a456-426614174000'); // OG Kush
  if (strain) {
    console.log(`✅ Found strain: ${strain.name} (${strain.type})`);
    console.log(`   Flowering time: ${(strain as any).floweringTime || 'unknown'} weeks`);
  } else {
    console.log('❌ Strain not found');
  }

  // Test 2: Template recommendations
  console.log('\n2. Testing template recommendations...');
  try {
    const recommendations = await StrainCalendarIntegrationService.getStrainBasedTemplateRecommendations(
      '123e4567-e89b-12d3-a456-426614174000',
      'indoor'
    );
    console.log(`✅ Generated ${recommendations.length} template recommendations`);
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.templateName} (${rec.matchScore}% match)`);
    });
  } catch (error) {
    console.log(`❌ Template recommendations failed: ${error}`);
  }

  // Test 3: Flowering prediction (mock plant)
  console.log('\n3. Testing flowering prediction...');
  const mockPlant = {
    id: 'test-plant',
    name: 'Test Plant',
    strainId: '123e4567-e89b-12d3-a456-426614174000',
    strain: 'OG Kush',
    plantedDate: new Date().toISOString(),
    growthStage: 'vegetative',
    userId: 'test-user',
  } as any;

  try {
    const prediction = await StrainCalendarIntegrationService.predictFloweringAndHarvest(mockPlant);
    if (prediction) {
      console.log(`✅ Flowering prediction generated`);
      console.log(`   Strain: ${prediction.strainName}`);
      console.log(`   Flowering start: ${prediction.expectedFloweringStart.toDateString()}`);
      console.log(`   Harvest date: ${prediction.expectedHarvestDate.toDateString()}`);
      console.log(`   Confidence: ${prediction.confidenceLevel}`);
    } else {
      console.log('❌ No flowering prediction available');
    }
  } catch (error) {
    console.log(`❌ Flowering prediction failed: ${error}`);
  }

  // Test 4: Strain comparison
  console.log('\n4. Testing strain comparison...');
  try {
    const comparison = await StrainCalendarIntegrationService.compareStrainSchedules(
      '123e4567-e89b-12d3-a456-426614174000', // OG Kush
      '123e4567-e89b-12d3-a456-426614174001'  // Blue Dream
    );
    if (comparison) {
      console.log(`✅ Strain comparison completed`);
      console.log(`   Comparing: ${comparison.strainA.name} vs ${comparison.strainB.name}`);
      console.log(`   Timeline difference: ${comparison.timelineDifferences.totalCycle} days`);
      console.log(`   Recommendations: ${comparison.recommendations.length}`);
    } else {
      console.log('❌ Strain comparison failed');
    }
  } catch (error) {
    console.log(`❌ Strain comparison failed: ${error}`);
  }

  console.log('\n🎉 Integration test completed!');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testStrainCalendarIntegration().catch(console.error);
}

export { testStrainCalendarIntegration };