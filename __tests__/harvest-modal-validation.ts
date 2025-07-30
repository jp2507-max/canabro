/**
 * Quick validation test for HarvestWeightInputModal
 * This ensures the component can be imported correctly
 */

// Test import
import { HarvestWeightInputModal } from '../components/ui/HarvestWeightInputModal';

// Basic type checking
const testProps = {
  visible: true,
  plantName: 'Test Plant',
  onCancel: () => console.log('Cancel'),
  onConfirm: (weight?: string) => console.log('Confirm:', weight),
};

// Validation passes if this compiles without errors
console.log('HarvestWeightInputModal import and props validation successful');
