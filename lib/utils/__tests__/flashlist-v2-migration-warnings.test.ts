/**
 * Comprehensive tests for FlashList v2 migration warning system
 * Tests deprecated prop detection, warning messages, and migration guidance
 */

import {
  detectDeprecatedFlashListProps,
  logDeprecationWarnings,
  validateFlashListProps,
  clearDeprecationWarningCache,
  type DeprecatedPropWarning,
} from '../flashlist-performance';

// Mock console methods
const mockConsole = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn(),
  log: jest.fn(),
};

describe('FlashList v2 Migration Warning System Tests', () => {
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

  describe('Deprecated Prop Detection', () => {
    it('should detect all size estimation props as deprecated', () => {
      const props = {
        estimatedItemSize: 50,
        estimatedListSize: { height: 400, width: 300 },
        estimatedFirstItemOffset: 0,
      };

      const warnings = detectDeprecatedFlashListProps(props);
      
      expect(warnings).toHaveLength(3);
      
      const propNames = warnings.map(w => w.propName);
      expect(propNames).toContain('estimatedItemSize');
      expect(propNames).toContain('estimatedListSize');
      expect(propNames).toContain('estimatedFirstItemOffset');
      
      warnings.forEach(warning => {
        expect(warning.severity).toBe('warning');
        expect(warning.reason).toContain('automatic sizing');
        expect(warning.migration).toContain('Remove this prop');
      });
    });

    it('should detect inverted prop with specific migration guidance', () => {
      const props = { inverted: true };
      const warnings = detectDeprecatedFlashListProps(props);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatchObject({
        propName: 'inverted',
        severity: 'warning',
        reason: 'The inverted prop is deprecated in favor of maintainVisibleContentPosition',
        migration: 'Replace with maintainVisibleContentPosition={{ startRenderingFromBottom: true }}',
      });
    });

    it('should detect unsupported props as errors', () => {
      const props = {
        onBlankArea: () => {},
        getColumnFlex: () => 1,
      };

      const warnings = detectDeprecatedFlashListProps(props);
      
      expect(warnings).toHaveLength(2);
      warnings.forEach(warning => {
        expect(warning.severity).toBe('error');
        expect(warning.reason).toContain('no longer supported');
      });
    });

    it('should detect MasonryFlashList component usage', () => {
      const props = { _componentName: 'MasonryFlashList' };
      const warnings = detectDeprecatedFlashListProps(props);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatchObject({
        propName: 'MasonryFlashList',
        severity: 'warning',
        reason: 'MasonryFlashList component is deprecated',
        migration: 'Use FlashList with masonry={true} prop instead',
      });
    });

    it('should detect overrideItemLayout with info severity', () => {
      const props = { overrideItemLayout: () => {} };
      const warnings = detectDeprecatedFlashListProps(props);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatchObject({
        propName: 'overrideItemLayout',
        severity: 'info',
        reason: 'overrideItemLayout behavior has changed in v2',
        migration: 'In v2, only set layout.span - size estimates are no longer supported',
      });
    });

    it('should detect multiple deprecated props with correct priorities', () => {
      const props = {
        estimatedItemSize: 50,
        inverted: true,
        onBlankArea: () => {},
        disableAutoLayout: true,
        overrideItemLayout: () => {},
      };

      const warnings = detectDeprecatedFlashListProps(props);
      
      expect(warnings).toHaveLength(5);
      
      // Check severity distribution
      const errorWarnings = warnings.filter(w => w.severity === 'error');
      const warningWarnings = warnings.filter(w => w.severity === 'warning');
      const infoWarnings = warnings.filter(w => w.severity === 'info');
      
      expect(errorWarnings).toHaveLength(1); // onBlankArea
      expect(warningWarnings).toHaveLength(2); // estimatedItemSize, inverted
      expect(infoWarnings).toHaveLength(2); // disableAutoLayout, overrideItemLayout
    });

    it('should return empty array for valid v2 props', () => {
      const props = {
        data: [],
        renderItem: () => null,
        maintainVisibleContentPosition: { startRenderingFromBottom: true },
        masonry: true,
        numColumns: 2,
        enableV2Optimizations: true,
      };

      const warnings = detectDeprecatedFlashListProps(props);
      expect(warnings).toHaveLength(0);
    });
  });

  describe('Warning Logging System', () => {
    it('should log warnings grouped by severity', () => {
      const warnings: DeprecatedPropWarning[] = [
        {
          propName: 'onBlankArea',
          reason: 'Not supported in v2',
          migration: 'Remove this prop',
          severity: 'error'
        },
        {
          propName: 'estimatedItemSize',
          reason: 'Automatic sizing in v2',
          migration: 'Remove this prop',
          severity: 'warning'
        },
        {
          propName: 'disableAutoLayout',
          reason: 'Not needed in v2',
          migration: 'Remove this prop',
          severity: 'info'
        }
      ];

      logDeprecationWarnings(warnings, 'TestComponent');

      expect(mockConsole.group).toHaveBeenCalledWith('🚨 FlashList v2 Migration Warnings for TestComponent');
      
      // Check error logging
      expect(mockConsole.error).toHaveBeenCalledWith('❌ onBlankArea: Not supported in v2');
      expect(mockConsole.error).toHaveBeenCalledWith('   Migration: Remove this prop');
      
      // Check warning logging
      expect(mockConsole.warn).toHaveBeenCalledWith('⚠️  estimatedItemSize: Automatic sizing in v2');
      expect(mockConsole.warn).toHaveBeenCalledWith('   Migration: Remove this prop');
      
      // Check info logging
      expect(mockConsole.info).toHaveBeenCalledWith('ℹ️  disableAutoLayout: Not needed in v2');
      expect(mockConsole.info).toHaveBeenCalledWith('   Migration: Remove this prop');
      
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it('should not log if no warnings', () => {
      logDeprecationWarnings([], 'TestComponent');
      
      expect(mockConsole.group).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
    });

    it('should cache warnings to prevent duplicate logging', () => {
      const warnings: DeprecatedPropWarning[] = [
        {
          propName: 'estimatedItemSize',
          reason: 'Not needed',
          migration: 'Remove it',
          severity: 'warning'
        }
      ];

      // Log twice with same component name
      logDeprecationWarnings(warnings, 'TestComponent');
      logDeprecationWarnings(warnings, 'TestComponent');

      // Should only log once due to caching
      expect(mockConsole.group).toHaveBeenCalledTimes(1);
    });

    it('should log for different components separately', () => {
      const warnings: DeprecatedPropWarning[] = [
        {
          propName: 'estimatedItemSize',
          reason: 'Not needed',
          migration: 'Remove it',
          severity: 'warning'
        }
      ];

      logDeprecationWarnings(warnings, 'ComponentA');
      logDeprecationWarnings(warnings, 'ComponentB');

      expect(mockConsole.group).toHaveBeenCalledTimes(2);
      expect(mockConsole.group).toHaveBeenCalledWith('🚨 FlashList v2 Migration Warnings for ComponentA');
      expect(mockConsole.group).toHaveBeenCalledWith('🚨 FlashList v2 Migration Warnings for ComponentB');
    });
  });

  describe('Warning Message Formatting', () => {
    it('should format warnings with proper documentation links', () => {
      const warnings = detectDeprecatedFlashListProps({
        estimatedItemSize: 50,
        inverted: true,
      });

      expect(warnings).toHaveLength(2);
      warnings.forEach(warning => {
        expect(warning.docLink).toContain('https://shopify.github.io/flash-list');
      });
    });

    it('should provide specific migration instructions', () => {
      const warnings = detectDeprecatedFlashListProps({
        inverted: true,
      });

      expect(warnings[0].migration).toContain('maintainVisibleContentPosition');
      expect(warnings[0].migration).toContain('startRenderingFromBottom: true');
    });

    it('should categorize warnings by severity appropriately', () => {
      const warnings = detectDeprecatedFlashListProps({
        estimatedItemSize: 50, // warning
        onBlankArea: () => {}, // error
        disableAutoLayout: true, // info
      });

      const severities = warnings.map(w => w.severity);
      expect(severities).toContain('warning');
      expect(severities).toContain('error');
      expect(severities).toContain('info');
    });
  });

  describe('Integration with validateFlashListProps', () => {
    it('should validate props and log warnings', () => {
      const props = {
        data: [],
        renderItem: () => null,
        estimatedItemSize: 50,
        inverted: true,
      };

      validateFlashListProps(props, 'IntegrationTest');

      expect(mockConsole.group).toHaveBeenCalledWith('🚨 FlashList v2 Migration Warnings for IntegrationTest');
      expect(mockConsole.warn).toHaveBeenCalledWith('⚠️  estimatedItemSize: FlashList v2 uses automatic sizing and no longer requires size estimates');
      expect(mockConsole.warn).toHaveBeenCalledWith('⚠️  inverted: The inverted prop is deprecated in favor of maintainVisibleContentPosition');
    });

    it('should not log for valid v2 props', () => {
      const props = {
        data: [],
        renderItem: () => null,
        maintainVisibleContentPosition: { startRenderingFromBottom: true },
      };

      validateFlashListProps(props, 'ValidV2Component');

      expect(mockConsole.group).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined props gracefully', () => {
      const warnings = detectDeprecatedFlashListProps(undefined as any);
      expect(warnings).toEqual([]);
    });

    it('should handle null props gracefully', () => {
      const warnings = detectDeprecatedFlashListProps(null as any);
      expect(warnings).toEqual([]);
    });

    it('should handle empty props object', () => {
      const warnings = detectDeprecatedFlashListProps({});
      expect(warnings).toEqual([]);
    });

    it('should handle props with undefined values', () => {
      const props = {
        estimatedItemSize: undefined,
        inverted: undefined,
        data: [],
      };

      const warnings = detectDeprecatedFlashListProps(props);
      expect(warnings).toEqual([]);
    });

    it('should handle complex nested prop values', () => {
      const props = {
        maintainVisibleContentPosition: {
          autoscrollToBottomThreshold: 0.2,
          startRenderingFromBottom: true,
          nested: {
            deepValue: 'test',
          },
        },
      };

      const warnings = detectDeprecatedFlashListProps(props);
      expect(warnings).toEqual([]);
    });
  });
});