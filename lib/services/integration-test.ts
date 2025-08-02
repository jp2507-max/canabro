/**
 * Simple integration test for StrainCalendarIntegrationService
 * 
 * This file can be run to verify the service works correctly
 */

import { StrainCalendarIntegrationService } from './StrainCalendarIntegrationService';
import { getStrainById } from '../data/strains';

async function testStrainCalendarIntegration() {
  console.warn('🧪 Testing Strain Calendar Integration Service...\n');

  // Test 1: Get strain characteristics
  console.warn('1. Testing strain data retrieval...');
  const strain = getStrainById('123e4567-e89b-12d3-a456-426614174000'); // OG Kush
  if (strain) {
    console.warn(`✅ Found strain: ${strain.name} (${strain.type})`);
    // Narrow optional property safely without any
    const floweringWeeks =
      typeof (strain as unknown as Record<string, unknown>).floweringTime === 'number'
        ? (strain as unknown as Record<string, unknown>).floweringTime
        : 'unknown';
    console.warn(`   Flowering time: ${floweringWeeks} weeks`);
  } else {
    console.error('❌ Strain not found');
  }

  // Test 2: Template recommendations
  console.warn('\n2. Testing template recommendations...');
  try {
    const recommendations = await StrainCalendarIntegrationService.getStrainBasedTemplateRecommendations(
      '123e4567-e89b-12d3-a456-426614174000',
      'indoor'
    );
    console.warn(`✅ Generated ${recommendations.length} template recommendations`);
    recommendations.forEach((rec, index) => {
      console.warn(`   ${index + 1}. ${rec.templateName} (${rec.matchScore}% match)`);
    });
  } catch (error) {
    console.error(`❌ Template recommendations failed: ${String(error)}`);
  }

  // Test 3: Flowering prediction (mock plant)
  console.warn('\n3. Testing flowering prediction...');
  // Use the wide Plant type from project if available to satisfy service signature
  // Fallback to a partial shape with index signature to avoid excessive test typing
  type LoosePlant = {
    [key: string]: unknown;
    id: string;
    name: string;
    strainId: string;
    strain: string;
    plantedDate: string;
    growthStage: string;
    userId: string;
  };

  const mockPlant: LoosePlant = {
    id: 'test-plant',
    name: 'Test Plant',
    strainId: '123e4567-e89b-12d3-a456-426614174000',
    strain: 'OG Kush',
    plantedDate: new Date().toISOString(),
    growthStage: 'vegetative',
    userId: 'test-user',
  };

  try {
    // Cast to unknown first to avoid unsafe direct casting; this keeps test lightweight
    // Use a Plant-shaped stub that satisfies the service signature to avoid unsafe casts
    // Import the Plant type if available, otherwise define a minimal stub locally.
    const prediction = await StrainCalendarIntegrationService.predictFloweringAndHarvest(
      {
        id: mockPlant.id,
        journalId: 'test-journal',
        name: mockPlant.name,
        strain: mockPlant.strain,
        strainId: mockPlant.strainId,
        plantedDate: mockPlant.plantedDate,
        growthStage: mockPlant.growthStage,
        userId: mockPlant.userId,
      } as unknown as import('../models/Plant').Plant
    );
    if (prediction) {
      console.warn(`✅ Flowering prediction generated`);
      console.warn(`   Strain: ${prediction.strainName}`);
      console.warn(`   Flowering start: ${prediction.expectedFloweringStart.toDateString()}`);
      console.warn(`   Harvest date: ${prediction.expectedHarvestDate.toDateString()}`);
      console.warn(`   Confidence: ${prediction.confidenceLevel}`);
    } else {
      console.error('❌ No flowering prediction available');
    }
  } catch (error) {
    console.error(`❌ Flowering prediction failed: ${String(error)}`);
  }

  // Test 4: Strain comparison
  console.warn('\n4. Testing strain comparison...');
  try {
    const comparison = await StrainCalendarIntegrationService.compareStrainSchedules(
      '123e4567-e89b-12d3-a456-426614174000', // OG Kush
      '123e4567-e89b-12d3-a456-426614174001'  // Blue Dream
    );
    if (comparison) {
      console.warn(`✅ Strain comparison completed`);
      console.warn(`   Comparing: ${comparison.strainA.name} vs ${comparison.strainB.name}`);
      console.warn(`   Timeline difference: ${comparison.timelineDifferences.totalCycle} days`);
      console.warn(`   Recommendations: ${comparison.recommendations.length}`);
    } else {
      console.error('❌ Strain comparison failed');
    }
  } catch (error) {
    console.error(`❌ Strain comparison failed: ${String(error)}`);
  }

  console.warn('\n🎉 Integration test completed!');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testStrainCalendarIntegration().catch((e) => console.error(e));
}

export { testStrainCalendarIntegration };
