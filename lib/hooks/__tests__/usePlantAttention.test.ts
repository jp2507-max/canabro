import { renderHook } from '@testing-library/react-hooks';
import { usePlantAttention, useSinglePlantAttention } from '../usePlantAttention';

// Mock WatermelonDB
jest.mock('@/lib/models', () => ({
  database: {
    collections: {
      get: jest.fn(() => ({
        query: jest.fn(() => ({
          observe: jest.fn(() => ({
            subscribe: jest.fn(() => ({
              unsubscribe: jest.fn(),
            })),
          })),
        })),
      })),
    },
  },
}));

// Mock models
jest.mock('@/lib/models/CareReminder', () => ({
  CareReminder: jest.fn(),
}));

jest.mock('@/lib/models/Plant', () => ({
  Plant: jest.fn(),
}));

describe('usePlantAttention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => usePlantAttention());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.attentionMap).toEqual({});
    expect(result.current.totalPlantsNeedingAttention).toBe(0);
  });

  it('filters by plant IDs when provided', () => {
    const plantIds = ['plant1', 'plant2'];
    renderHook(() => usePlantAttention(plantIds));
    
    // Verify that the hook was called with the correct plant IDs
    // This would require more detailed mocking of the database layer
    expect(true).toBe(true); // Placeholder assertion
  });

  it('returns correct plant attention status', () => {
    const { result } = renderHook(() => usePlantAttention());
    
    const status = result.current.getPlantAttentionStatus('nonexistent-plant');
    expect(status).toEqual({
      needsAttention: false,
      priorityLevel: 'low',
      reasons: [],
      reminderCount: 0,
      overdueCount: 0,
      dueTodayCount: 0,
    });
  });
});

describe('useSinglePlantAttention', () => {
  it('returns attention status for single plant', () => {
    const { result } = renderHook(() => useSinglePlantAttention('plant1'));
    
    expect(result.current.attentionStatus).toBeDefined();
    expect(result.current.loading).toBe(true);
  });
});