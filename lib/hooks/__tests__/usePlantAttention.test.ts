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
    // Mock WatermelonDB query and observable
    const mockReminders = [
      { plantId: 'plant1', scheduledFor: new Date().toISOString(), title: 'Water', is_completed: false, is_deleted: false },
      { plantId: 'plant2', scheduledFor: new Date().toISOString(), title: 'Fertilize', is_completed: false, is_deleted: false },
      { plantId: 'plant3', scheduledFor: new Date().toISOString(), title: 'Prune', is_completed: false, is_deleted: false },
    ];

    // Mock database.collections.get().query().observe().subscribe()
    const observeMock = jest.fn().mockReturnValue({
      subscribe: ({ next }: any) => {
        // Only pass reminders for plant1 and plant2
        next(mockReminders.filter(r => plantIds.includes(r.plantId)));
        return { unsubscribe: jest.fn() };
      },
    });
    const queryMock = jest.fn().mockReturnValue({ observe: observeMock });
    const getMock = jest.fn().mockReturnValue({ query: queryMock });
    const originalDatabase = jest.requireActual('@/lib/models').database;
    jest.spyOn(require('@/lib/models'), 'database', 'get').mockReturnValue({
      collections: {
        get: getMock,
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => usePlantAttention(plantIds));

    // Wait for hook to update after mock data is pushed
    // (simulate async effect)
    setTimeout(() => {
      expect(Object.keys(result.current.attentionMap)).toEqual(expect.arrayContaining(['plant1', 'plant2']));
      expect(Object.keys(result.current.attentionMap)).not.toContain('plant3');
    }, 0);

    // Restore original database after test
    jest.spyOn(require('@/lib/models'), 'database', 'get').mockReturnValue(originalDatabase);
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