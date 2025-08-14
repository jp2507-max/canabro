import { describe, it, expect, afterEach, beforeEach } from '@jest/globals';
import { WeedDbService } from '../weed-db.service';

// Minimal mocks to isolate HTTP and native modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));

describe('WeedDbService mapping - flowering_type snake_case', () => {
  let getSpy: jest.SpyInstance;

  beforeEach(() => {
    getSpy = jest.spyOn(WeedDbService.axiosInstance, 'get');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('maps flowering_type -> floweringType (autoflower)', async () => {
    getSpy.mockResolvedValue({
      data: [
        {
          api_id: 'api-1',
          name: 'Auto Test',
          flowering_type: 'autoflower',
        },
      ],
    } as any);

    const result = await WeedDbService.getById('api-1');

    expect(result).not.toBeNull();
    expect(result?.floweringType).toBe('autoflower');
    expect((result as any).flowering_type).toBeUndefined();
  });

  it('maps flowering_type -> floweringType (photoperiod)', async () => {
    getSpy.mockResolvedValue({
      data: [
        {
          api_id: 'api-2',
          name: 'Photo Test',
          flowering_type: 'photoperiod',
        },
      ],
    } as any);

    const result = await WeedDbService.getById('api-2');

    expect(result).not.toBeNull();
    expect(result?.floweringType).toBe('photoperiod');
    expect((result as any).flowering_type).toBeUndefined();
  });

  it('omits floweringType when flowering_type is missing', async () => {
    getSpy.mockResolvedValue({
      data: [
        {
          api_id: 'api-3',
          name: 'No FT Test',
          // flowering_type intentionally omitted
        },
      ],
    } as any);

    const result = await WeedDbService.getById('api-3');

    expect(result).not.toBeNull();
    expect(result?.floweringType).toBeUndefined();
    expect((result as any).flowering_type).toBeUndefined();
  });
});


