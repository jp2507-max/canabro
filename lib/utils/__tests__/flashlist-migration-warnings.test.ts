/**
 * Tests for FlashList v2 migration warnings
 */

import { 
  detectDeprecatedFlashListProps, 
  logDeprecationWarnings, 
  validateFlashListProps,
  clearDeprecationWarningCache,
  type DeprecatedPropWarning 
} from '../flashlist-performance';

// Mock console methods
const mockConsole = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn(),
};

beforeEach(() => {
  // Clear warning cache before each test
  clearDeprecationWarningCache();
  
  // Reset console mocks
  Object.keys(mockConsole).forEach(key => {
    (mockConsole as any)[key].mockClear();
  });
  
  // Mock console methods
  Object.assign(console, mockConsole);
});

describe('detectDeprecatedFlashListProps', () => {
  it('should detect estimatedItemSize as deprecated', () => {
    const props = { estimatedItemSize: 50 };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      propName: 'estimatedItemSize',
      severity: 'warning',
      reason: expect.stringContaining('automatic sizing'),
      migration: expect.stringContaining('Remove this prop')
    });
  });

  it('should detect estimatedListSize as deprecated', () => {
    const props = { estimatedListSize: { height: 400, width: 300 } };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      propName: 'estimatedListSize',
      severity: 'warning',
      reason: expect.stringContaining('automatic sizing')
    });
  });

  it('should detect estimatedFirstItemOffset as deprecated', () => {
    const props = { estimatedFirstItemOffset: 0 };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      propName: 'estimatedFirstItemOffset',
      severity: 'warning'
    });
  });

  it('should detect inverted prop as deprecated', () => {
    const props = { inverted: true };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      propName: 'inverted',
      severity: 'warning',
      migration: expect.stringContaining('maintainVisibleContentPosition')
    });
  });

  it('should detect onBlankArea as unsupported error', () => {
    const props = { onBlankArea: () => {} };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      propName: 'onBlankArea',
      severity: 'error',
      reason: expect.stringContaining('no longer supported')
    });
  });

  it('should detect disableHorizontalListHeightMeasurement as info', () => {
    const props = { disableHorizontalListHeightMeasurement: true };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      propName: 'disableHorizontalListHeightMeasurement',
      severity: 'info'
    });
  });

  it('should detect disableAutoLayout as info', () => {
    const props = { disableAutoLayout: true };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      propName: 'disableAutoLayout',
      severity: 'info'
    });
  });

  it('should detect MasonryFlashList component usage', () => {
    const props = { _componentName: 'MasonryFlashList' };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      propName: 'MasonryFlashList',
      severity: 'warning',
      migration: expect.stringContaining('masonry={true}')
    });
  });

  it('should detect getColumnFlex as error', () => {
    const props = { getColumnFlex: () => 1 };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      propName: 'getColumnFlex',
      severity: 'error'
    });
  });

  it('should detect overrideItemLayout as info', () => {
    const props = { overrideItemLayout: () => {} };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      propName: 'overrideItemLayout',
      severity: 'info',
      migration: expect.stringContaining('only set layout.span')
    });
  });

  it('should detect multiple deprecated props', () => {
    const props = {
      estimatedItemSize: 50,
      inverted: true,
      onBlankArea: () => {},
      disableAutoLayout: true
    };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(4);
    expect(warnings.map(w => w.propName)).toEqual([
      'estimatedItemSize',
      'inverted', 
      'onBlankArea',
      'disableAutoLayout'
    ]);
  });

  it('should return empty array for valid v2 props', () => {
    const props = {
      data: [],
      renderItem: () => null,
      maintainVisibleContentPosition: { startRenderingFromBottom: true },
      masonry: true,
      numColumns: 2
    };
    const warnings = detectDeprecatedFlashListProps(props);
    
    expect(warnings).toHaveLength(0);
  });
});

describe('logDeprecationWarnings', () => {
  it('should log warnings grouped by severity', () => {
    const warnings: DeprecatedPropWarning[] = [
      {
        propName: 'onBlankArea',
        reason: 'Not supported',
        migration: 'Remove it',
        severity: 'error'
      },
      {
        propName: 'estimatedItemSize',
        reason: 'Not needed',
        migration: 'Remove it',
        severity: 'warning'
      },
      {
        propName: 'disableAutoLayout',
        reason: 'Not needed',
        migration: 'Remove it',
        severity: 'info'
      }
    ];

    logDeprecationWarnings(warnings, 'TestComponent');

    expect(mockConsole.group).toHaveBeenCalledWith('🚨 FlashList v2 Migration Warnings for TestComponent');
    expect(mockConsole.error).toHaveBeenCalledWith('• onBlankArea: Not supported');
    expect(mockConsole.warn).toHaveBeenCalledWith('• estimatedItemSize: Not needed');
    expect(mockConsole.info).toHaveBeenCalledWith('• disableAutoLayout: Not needed');
    expect(mockConsole.groupEnd).toHaveBeenCalled();
  });

  it('should not log if no warnings', () => {
    logDeprecationWarnings([], 'TestComponent');
    
    expect(mockConsole.group).not.toHaveBeenCalled();
    expect(mockConsole.warn).not.toHaveBeenCalled();
    expect(mockConsole.error).not.toHaveBeenCalled();
    expect(mockConsole.info).not.toHaveBeenCalled();
  });

  it('should not log same warning twice', () => {
    const warnings: DeprecatedPropWarning[] = [
      {
        propName: 'estimatedItemSize',
        reason: 'Not needed',
        migration: 'Remove it',
        severity: 'warning'
      }
    ];

    // Log twice
    logDeprecationWarnings(warnings, 'TestComponent');
    logDeprecationWarnings(warnings, 'TestComponent');

    // Should only warn once
    expect(mockConsole.warn).toHaveBeenCalledTimes(2); // Once for prop, once for migration
  });
});

describe('validateFlashListProps', () => {
  it('should detect and log deprecated props', () => {
    const props = { estimatedItemSize: 50, inverted: true };
    
    validateFlashListProps(props, 'TestComponent');
    
    expect(mockConsole.group).toHaveBeenCalledWith('🚨 FlashList v2 Migration Warnings for TestComponent');
    expect(mockConsole.warn).toHaveBeenCalledWith('• estimatedItemSize: FlashList v2 uses automatic sizing and no longer requires size estimates');
    expect(mockConsole.warn).toHaveBeenCalledWith('• inverted: The inverted prop is deprecated in favor of maintainVisibleContentPosition');
  });
});