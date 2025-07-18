# Plant Harvest Components

This directory contains components for managing plant harvest data, yield calculations, and harvest analysis.

## Components

### HarvestForm
A comprehensive form for recording harvest data including weights, photos, and notes.

**Props:**
- `plant: Plant` - The plant being harvested
- `onSubmit: (data: HarvestFormData) => Promise<void>` - Callback when form is submitted
- `onCancel: () => void` - Callback when form is cancelled

**Features:**
- Weight unit conversion (grams/ounces)
- Photo capture and upload
- Real-time yield metrics calculation
- Form validation with Zod schema
- Animated UI components

### YieldCalculator
Calculates and displays comprehensive yield metrics for a harvested plant.

**Props:**
- `plant: Plant` - The harvested plant
- `harvestData: HarvestData` - Harvest data including weights and dates
- `lightWattage?: number` - Optional light wattage for advanced metrics
- `growSpaceArea?: number` - Optional grow space area for density calculations
- `showAdvancedMetrics?: boolean` - Whether to show advanced metrics
- `className?: string` - Additional CSS classes

**Features:**
- Basic yield metrics (total yield, yield per day, drying efficiency)
- Advanced metrics (grams per watt, yield per square foot)
- Performance insights and recommendations
- Responsive metric cards with color-coded performance indicators

### HarvestHistory
Displays a timeline of all harvests with summary statistics and export functionality.

**Props:**
- `harvests: Array<{ plant: Plant; harvestData: HarvestData }>` - Array of harvest records
- `onExportData?: (format: 'csv' | 'json') => void` - Optional export callback
- `showComparison?: boolean` - Whether to show comparison statistics
- `className?: string` - Additional CSS classes

**Features:**
- Harvest timeline with ranking system
- Summary statistics (averages, best/worst yields)
- Data export to CSV and JSON formats
- Interactive harvest cards with detailed metrics

### PlantComparison
Compares yield performance across multiple plants with sorting and selection features.

**Props:**
- `harvests: Array<{ plant: Plant; harvestData: HarvestData }>` - Array of harvest records
- `selectedPlants?: string[]` - Array of selected plant IDs
- `onPlantSelect?: (plantId: string) => void` - Callback when plant is selected
- `sortBy?: 'totalYield' | 'yieldPerDay' | 'growDays' | 'dryingEfficiency'` - Sort criteria
- `className?: string` - Additional CSS classes

**Features:**
- Multi-plant yield comparison
- Sortable by various metrics
- Plant selection for detailed analysis
- Ranking system with visual indicators
- Performance metrics in comparison cards

## Utility Functions

### yield-calculator.ts
Contains utility functions for yield calculations and data processing:

- `calculateYieldMetrics()` - Calculate comprehensive yield metrics
- `comparePlantYields()` - Compare multiple plant yields
- `calculateAverageMetrics()` - Calculate average metrics across harvests
- `convertWeight()` - Convert between weight units
- `formatWeight()` - Format weight values for display
- `exportHarvestDataToCSV()` - Export data to CSV format
- `exportHarvestDataToJSON()` - Export data to JSON format

## Usage Examples

```tsx
import { 
  HarvestForm, 
  YieldCalculator, 
  HarvestHistory, 
  PlantComparison 
} from '@/components/plant-harvest';

// Record a new harvest
<HarvestForm
  plant={selectedPlant}
  onSubmit={handleHarvestSubmit}
  onCancel={handleCancel}
/>

// Display yield analysis
<YieldCalculator
  plant={plant}
  harvestData={harvestData}
  showAdvancedMetrics={true}
  lightWattage={600}
  growSpaceArea={4}
/>

// Show harvest history
<HarvestHistory
  harvests={allHarvests}
  showComparison={true}
  onExportData={handleExport}
/>

// Compare plant performance
<PlantComparison
  harvests={harvests}
  selectedPlants={selectedPlantIds}
  onPlantSelect={handlePlantSelect}
  sortBy="totalYield"
/>
```

## Data Types

```typescript
interface HarvestData {
  harvestDate: Date;
  wetWeight: number;
  dryWeight?: number;
  trimWeight?: number;
  weightUnit: 'grams' | 'ounces';
  dryingMethod?: string;
  curingNotes?: string;
  photos?: string[];
}

interface YieldMetrics {
  totalGrowDays: number;
  yieldPerDay: number;
  dryingEfficiency: number;
  totalYield: number;
  trimPercentage: number;
  gramsPerWatt?: number;
  yieldPerSquareFoot?: number;
}

interface PlantComparison {
  plantId: string;
  plantName: string;
  strain: string;
  totalYield: number;
  yieldPerDay: number;
  growDays: number;
  dryingEfficiency: number;
  harvestDate: Date;
}
```

## Requirements Satisfied

This implementation satisfies the following requirements from task 4.2:

- **Build yield calculation utilities** ✅
  - Comprehensive yield metrics calculation (yield per day, efficiency metrics)
  - Weight unit conversion utilities
  - Advanced metrics (grams per watt, yield per square foot)

- **Create harvest history display with timeline integration** ✅
  - Timeline view of all harvests with ranking
  - Summary statistics and averages
  - Interactive harvest cards with detailed metrics

- **Implement plant comparison features with yield statistics** ✅
  - Multi-plant comparison with sortable metrics
  - Plant selection for detailed analysis
  - Visual ranking system with performance indicators

- **Add data export functionality for harvest records** ✅
  - CSV export with comprehensive harvest data
  - JSON export with metadata and averages
  - Share functionality for data distribution

## Testing

Test files are included for all components with comprehensive coverage of functionality, edge cases, and user interactions.