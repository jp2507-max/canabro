/**
 * Tests for FlashList v2 Hook Wrappers
 */

import { renderHook, act } from '@testing-library/react-native';
import {
  useFlashListV2State,
  useFlashListLayout,
  useFlashListCombinedState,
  useFlashListItemState,
  type FlashListV2StateConfig,
  type FlashListLayoutConfig
} from '../flashlist-v2-hooks';

// Mock FlashList hooks
jest.mock('@shopify/flash-list', () => ({
  useRecyclingState: jest.fn(),
  useLayoutState: jest.fn()
}));

import { useRecyclingState, useLayoutState } from '@shopify/flash-list';

const mockUseRecyclingState = useRecyclingState as jest.MockedFunction<typeof useRecyclingState>;
const mockUseLayoutState = useLayoutState as jest.MockedFunction<typeof useLayoutState>;

describe('FlashList v2 Hook Wrappers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log to avoid test output noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useFlashListV2State', () => {
    it('should initialize with correct parameters', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([false, mockSetState]);

      const config: FlashListV2StateConfig<boolean> = {
        initialState: false,
        dependencies: ['item-1'],
        resetCallback: jest.fn()
      };

      renderHook(() => useFlashListV2State(config));

      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        false,
        ['item-1'],
        expect.any(Function)
      );
    });

    it('should return state and setState function', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([true, mockSetState]);

      const config: FlashListV2StateConfig<boolean> = {
        initialState: false
      };

      const { result } = renderHook(() => useFlashListV2State(config));
      const [state, setState] = result.current;

      expect(state).toBe(true);
      expect(typeof setState).toBe('function');
    });

    it('should call resetCallback when dependencies change', () => {
      const resetCallback = jest.fn();
      const mockSetState = jest.fn();
      let capturedResetCallback: (() => void) | undefined;

      mockUseRecyclingState.mockImplementation((initialState, deps, callback) => {
        capturedResetCallback = callback;
        return [initialState, mockSetState];
      });

      const config: FlashListV2StateConfig<boolean> = {
        initialState: false,
        dependencies: ['item-1'],
        resetCallback
      };

      renderHook(() => useFlashListV2State(config));

      // Simulate dependency change triggering reset
      act(() => {
        capturedResetCallback?.();
      });

      expect(resetCallback).toHaveBeenCalled();
    });

    it('should log debug information when debug is enabled', () => {
      const mockSetState = jest.fn();
      let capturedResetCallback: (() => void) | undefined;

      mockUseRecyclingState.mockImplementation((initialState, deps, callback) => {
        capturedResetCallback = callback;
        return [initialState, mockSetState];
      });

      const config: FlashListV2StateConfig<boolean> = {
        initialState: false,
        dependencies: ['item-1'],
        debug: true
      };

      const { result } = renderHook(() => useFlashListV2State(config));

      // Test debug logging on reset
      act(() => {
        capturedResetCallback?.();
      });

      expect(console.log).toHaveBeenCalledWith(
        '[FlashListV2State] State reset triggered',
        expect.objectContaining({
          dependencies: ['item-1'],
          timestamp: expect.any(String)
        })
      );

      // Test debug logging on setState
      const [, setState] = result.current;
      act(() => {
        setState(true);
      });

      expect(console.log).toHaveBeenCalledWith(
        '[FlashListV2State] State update',
        expect.objectContaining({
          newValue: true,
          dependencies: ['item-1'],
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle function-based setState', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([0, mockSetState]);

      const config: FlashListV2StateConfig<number> = {
        initialState: 0,
        debug: true
      };

      const { result } = renderHook(() => useFlashListV2State(config));
      const [, setState] = result.current;

      act(() => {
        setState(prev => prev + 1);
      });

      expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
      expect(console.log).toHaveBeenCalledWith(
        '[FlashListV2State] State update',
        expect.objectContaining({
          newValue: 'function'
        })
      );
    });

    it('should work with empty dependencies array', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([false, mockSetState]);

      const config: FlashListV2StateConfig<boolean> = {
        initialState: false
      };

      renderHook(() => useFlashListV2State(config));

      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        false,
        [],
        expect.any(Function)
      );
    });
  });

  describe('useFlashListLayout', () => {
    it('should initialize with correct parameters', () => {
      const mockSetState = jest.fn();
      mockUseLayoutState.mockReturnValue([100, mockSetState]);

      const config: FlashListLayoutConfig<number> = {
        initialState: 100
      };

      renderHook(() => useFlashListLayout(config));

      expect(mockUseLayoutState).toHaveBeenCalledWith(100);
    });

    it('should return state and setState function', () => {
      const mockSetState = jest.fn();
      mockUseLayoutState.mockReturnValue([150, mockSetState]);

      const config: FlashListLayoutConfig<number> = {
        initialState: 100
      };

      const { result } = renderHook(() => useFlashListLayout(config));
      const [state, setState] = result.current;

      expect(state).toBe(150);
      expect(typeof setState).toBe('function');
    });

    it('should log debug information when debug is enabled', () => {
      const mockSetState = jest.fn();
      mockUseLayoutState.mockReturnValue([100, mockSetState]);

      const config: FlashListLayoutConfig<number> = {
        initialState: 100,
        debug: true
      };

      const { result } = renderHook(() => useFlashListLayout(config));
      const [, setState] = result.current;

      act(() => {
        setState(200);
      });

      expect(console.log).toHaveBeenCalledWith(
        '[FlashListLayout] Layout state update',
        expect.objectContaining({
          newValue: 200,
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle function-based setState', () => {
      const mockSetState = jest.fn();
      mockUseLayoutState.mockReturnValue([100, mockSetState]);

      const config: FlashListLayoutConfig<number> = {
        initialState: 100,
        debug: true
      };

      const { result } = renderHook(() => useFlashListLayout(config));
      const [, setState] = result.current;

      act(() => {
        setState(prev => prev * 2);
      });

      expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
      expect(console.log).toHaveBeenCalledWith(
        '[FlashListLayout] Layout state update',
        expect.objectContaining({
          newValue: 'function'
        })
      );
    });
  });

  describe('useFlashListCombinedState', () => {
    it('should return both recycling and layout state', () => {
      const mockRecyclingSetState = jest.fn();
      const mockLayoutSetState = jest.fn();
      
      mockUseRecyclingState.mockReturnValue([{ expanded: false }, mockRecyclingSetState]);
      mockUseLayoutState.mockReturnValue([100, mockLayoutSetState]);

      const recyclingConfig: FlashListV2StateConfig<{ expanded: boolean }> = {
        initialState: { expanded: false },
        dependencies: ['item-1']
      };

      const layoutConfig: FlashListLayoutConfig<number> = {
        initialState: 100
      };

      const { result } = renderHook(() => 
        useFlashListCombinedState(recyclingConfig, layoutConfig)
      );

      const { recycling, layout } = result.current;
      const [recyclingState, setRecyclingState] = recycling;
      const [layoutState, setLayoutState] = layout;

      expect(recyclingState).toEqual({ expanded: false });
      expect(layoutState).toBe(100);
      expect(typeof setRecyclingState).toBe('function');
      expect(typeof setLayoutState).toBe('function');
    });

    it('should call both underlying hooks with correct parameters', () => {
      const mockRecyclingSetState = jest.fn();
      const mockLayoutSetState = jest.fn();
      
      mockUseRecyclingState.mockReturnValue([false, mockRecyclingSetState]);
      mockUseLayoutState.mockReturnValue([100, mockLayoutSetState]);

      const recyclingConfig: FlashListV2StateConfig<boolean> = {
        initialState: false,
        dependencies: ['item-1'],
        resetCallback: jest.fn()
      };

      const layoutConfig: FlashListLayoutConfig<number> = {
        initialState: 100,
        debug: true
      };

      renderHook(() => useFlashListCombinedState(recyclingConfig, layoutConfig));

      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        false,
        ['item-1'],
        expect.any(Function)
      );
      expect(mockUseLayoutState).toHaveBeenCalledWith(100);
    });
  });

  describe('useFlashListItemState', () => {
    const mockItem = {
      id: 'item-1',
      version: 2,
      updatedAt: '2024-01-01T00:00:00Z',
      title: 'Test Item'
    };

    it('should initialize with factory function result', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([
        { expanded: false, selected: false },
        mockSetState
      ]);

      const initialStateFactory = (item: typeof mockItem) => ({
        expanded: false,
        selected: false
      });

      const { result } = renderHook(() =>
        useFlashListItemState(mockItem, initialStateFactory)
      );

      const [state] = result.current;
      expect(state).toEqual({ expanded: false, selected: false });
    });

    it('should track common item properties as dependencies', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([{}, mockSetState]);

      const initialStateFactory = () => ({});

      renderHook(() =>
        useFlashListItemState(mockItem, initialStateFactory)
      );

      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        {},
        ['item-1', 2, '2024-01-01T00:00:00Z'],
        expect.any(Function)
      );
    });

    it('should include custom dependencies', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([{}, mockSetState]);

      const initialStateFactory = () => ({});

      renderHook(() =>
        useFlashListItemState(mockItem, initialStateFactory, {
          customDependencies: ['custom-dep-1', 'custom-dep-2']
        })
      );

      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        {},
        ['item-1', 2, '2024-01-01T00:00:00Z', 'custom-dep-1', 'custom-dep-2'],
        expect.any(Function)
      );
    });

    it('should provide manual reset function', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([
        { expanded: true },
        mockSetState
      ]);

      const initialStateFactory = () => ({ expanded: false });

      const { result } = renderHook(() =>
        useFlashListItemState(mockItem, initialStateFactory)
      );

      const [, , resetState] = result.current;

      act(() => {
        resetState();
      });

      expect(mockSetState).toHaveBeenCalledWith({ expanded: false });
    });

    it('should handle items with missing optional properties', () => {
      const itemWithMissingProps = {
        id: 'item-2',
        title: 'Test Item 2'
      };

      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue([{}, mockSetState]);

      const initialStateFactory = () => ({});

      renderHook(() =>
        useFlashListItemState(itemWithMissingProps, initialStateFactory)
      );

      expect(mockUseRecyclingState).toHaveBeenCalledWith(
        {},
        ['item-2'], // Only id is included since other properties are undefined
        expect.any(Function)
      );
    });

    it('should pass through debug and resetCallback options', () => {
      const mockSetState = jest.fn();
      const resetCallback = jest.fn();
      let capturedResetCallback: (() => void) | undefined;

      mockUseRecyclingState.mockImplementation((initialState, deps, callback) => {
        capturedResetCallback = callback;
        return [initialState, mockSetState];
      });

      const initialStateFactory = () => ({ test: true });

      renderHook(() =>
        useFlashListItemState(mockItem, initialStateFactory, {
          debug: true,
          resetCallback
        })
      );

      // Trigger reset to test callback
      act(() => {
        capturedResetCallback?.();
      });

      expect(resetCallback).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        '[FlashListV2State] State reset triggered',
        expect.any(Object)
      );
    });
  });

  describe('Type Safety', () => {
    it('should maintain proper TypeScript types', () => {
      const mockSetState = jest.fn();
      mockUseRecyclingState.mockReturnValue(['test', mockSetState]);

      const config: FlashListV2StateConfig<string> = {
        initialState: 'initial'
      };

      const { result } = renderHook(() => useFlashListV2State(config));
      const [state, setState] = result.current;

      // These should compile without TypeScript errors
      expect(typeof state).toBe('string');
      
      act(() => {
        setState('new value');
        setState(prev => prev + ' updated');
      });

      expect(mockSetState).toHaveBeenCalledTimes(2);
    });
  });
});