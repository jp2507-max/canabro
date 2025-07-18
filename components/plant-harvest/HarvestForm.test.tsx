/**
 * Basic test file to verify HarvestForm component functionality
 * This ensures the component can be imported and basic props work correctly
 */

import React from 'react';
import { HarvestForm, HarvestFormProps, HarvestFormData } from './HarvestForm';
import { Plant as PlantModel } from '../../lib/models/Plant';

// Mock plant data for testing
const mockPlant = {
  id: 'test-plant-1',
  name: 'Test Plant',
  strain: 'Test Strain',
  plantedDate: '2024-01-01',
  growthStage: 'flowering',
  userId: 'test-user',
  journalId: 'test-journal',
  createdAt: new Date(),
  updatedAt: new Date(),
} as PlantModel;

// Mock handlers for testing
const mockOnSubmit = async (data: HarvestFormData) => {
  console.log('Harvest form submitted with data:', data);
  // In a real implementation, this would save to database
};

const mockOnCancel = () => {
  console.log('Harvest form cancelled');
  // In a real implementation, this would navigate back or close modal
};

// Test component props
const testProps: HarvestFormProps = {
  plant: mockPlant,
  onSubmit: mockOnSubmit,
  onCancel: mockOnCancel,
};

/**
 * Test component to verify HarvestForm can be rendered
 * This would be used in a test environment or development
 */
export const HarvestFormTest: React.FC = () => {
  return <HarvestForm {...testProps} />;
};

// Export test utilities for use in other test files
export { mockPlant, mockOnSubmit, mockOnCancel, testProps };

// Type verification - ensures all required types are properly exported
export type TestHarvestFormProps = HarvestFormProps;
export type TestHarvestFormData = HarvestFormData;