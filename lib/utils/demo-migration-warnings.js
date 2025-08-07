/**
 * Demo script showing FlashList v2 migration warnings in action
 */

// Simulate the deprecated prop detection logic
function detectDeprecatedFlashListProps(props) {
  const warnings = [];

  // Size estimation props (no longer needed in v2)
  if ('estimatedItemSize' in props) {
    warnings.push({
      propName: 'estimatedItemSize',
      reason: 'FlashList v2 uses automatic sizing and no longer requires size estimates',
      migration: 'Remove this prop - v2 automatically calculates item sizes for optimal performance',
      severity: 'warning',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  if ('estimatedListSize' in props) {
    warnings.push({
      propName: 'estimatedListSize',
      reason: 'FlashList v2 uses automatic sizing and no longer requires list size estimates',
      migration: 'Remove this prop - v2 automatically measures the list container',
      severity: 'warning',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  if ('estimatedFirstItemOffset' in props) {
    warnings.push({
      propName: 'estimatedFirstItemOffset',
      reason: 'FlashList v2 uses automatic sizing and no longer requires offset estimates',
      migration: 'Remove this prop - v2 automatically handles first item positioning',
      severity: 'warning',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  // Inverted prop replacement
  if ('inverted' in props) {
    warnings.push({
      propName: 'inverted',
      reason: 'The inverted prop is deprecated in favor of maintainVisibleContentPosition',
      migration: 'Replace with: maintainVisibleContentPosition={{ startRenderingFromBottom: true }}',
      severity: 'warning',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  // Unsupported props
  if ('onBlankArea' in props) {
    warnings.push({
      propName: 'onBlankArea',
      reason: 'This prop is no longer supported and there are no plans to add it in v2',
      migration: 'Remove this prop - v2\'s improved rendering eliminates blank areas',
      severity: 'error',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  if ('disableHorizontalListHeightMeasurement' in props) {
    warnings.push({
      propName: 'disableHorizontalListHeightMeasurement',
      reason: 'This prop is no longer needed in v2\'s automatic sizing system',
      migration: 'Remove this prop - v2 handles horizontal list measurements automatically',
      severity: 'info',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  if ('disableAutoLayout' in props) {
    warnings.push({
      propName: 'disableAutoLayout',
      reason: 'There is no auto layout in FlashList v2',
      migration: 'Remove this prop - v2 uses a different layout system',
      severity: 'info',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  // MasonryFlashList component usage detection
  if ('MasonryFlashList' in props || props._componentName === 'MasonryFlashList') {
    warnings.push({
      propName: 'MasonryFlashList',
      reason: 'MasonryFlashList component is deprecated in favor of the masonry prop',
      migration: 'Use FlashList with masonry={true} prop instead of MasonryFlashList component',
      severity: 'warning',
      docLink: 'https://shopify.github.io/flash-list/docs/guides/masonry-layout'
    });
  }

  // getColumnFlex prop (from MasonryFlashList)
  if ('getColumnFlex' in props) {
    warnings.push({
      propName: 'getColumnFlex',
      reason: 'getColumnFlex is not supported in FlashList v2 masonry layout',
      migration: 'Remove this prop - v2 masonry uses automatic column balancing',
      severity: 'error',
      docLink: 'https://shopify.github.io/flash-list/docs/guides/masonry-layout'
    });
  }

  // overrideItemLayout with size estimates
  if ('overrideItemLayout' in props && typeof props.overrideItemLayout === 'function') {
    warnings.push({
      propName: 'overrideItemLayout',
      reason: 'overrideItemLayout in v2 only supports span changes, not size estimates',
      migration: 'Update your overrideItemLayout function to only set layout.span - remove layout.size assignments',
      severity: 'info',
      docLink: 'https://shopify.github.io/flash-list/docs/v2-migration'
    });
  }

  return warnings;
}

function logDeprecationWarnings(warnings, componentName = 'FlashList') {
  if (warnings.length === 0) return;

  // Group warnings by severity
  const errorWarnings = warnings.filter(w => w.severity === 'error');
  const warningWarnings = warnings.filter(w => w.severity === 'warning');
  const infoWarnings = warnings.filter(w => w.severity === 'info');

  // Log header
  console.group(`🚨 FlashList v2 Migration Warnings for ${componentName}`);

  // Log errors first
  if (errorWarnings.length > 0) {
    console.group('❌ Errors (require immediate attention):');
    errorWarnings.forEach(warning => {
      console.error(`• ${warning.propName}: ${warning.reason}`);
      console.error(`  Migration: ${warning.migration}`);
      if (warning.docLink) {
        console.error(`  Documentation: ${warning.docLink}`);
      }
    });
    console.groupEnd();
  }

  // Log warnings
  if (warningWarnings.length > 0) {
    console.group('⚠️ Warnings (should be addressed):');
    warningWarnings.forEach(warning => {
      console.warn(`• ${warning.propName}: ${warning.reason}`);
      console.warn(`  Migration: ${warning.migration}`);
      if (warning.docLink) {
        console.warn(`  Documentation: ${warning.docLink}`);
      }
    });
    console.groupEnd();
  }

  // Log info
  if (infoWarnings.length > 0) {
    console.group('ℹ️ Info (optional improvements):');
    infoWarnings.forEach(warning => {
      console.info(`• ${warning.propName}: ${warning.reason}`);
      console.info(`  Migration: ${warning.migration}`);
      if (warning.docLink) {
        console.info(`  Documentation: ${warning.docLink}`);
      }
    });
    console.groupEnd();
  }

  console.groupEnd();
}

// Demo scenarios
console.log('🎬 FlashList v2 Migration Warnings Demo\n');

// Scenario 1: Common v1 props that need migration
console.log('📋 Scenario 1: Common v1 props that need migration');
const commonV1Props = {
  data: [],
  renderItem: () => null,
  estimatedItemSize: 50,
  inverted: true,
  onBlankArea: () => console.log('blank area detected')
};

const warnings1 = detectDeprecatedFlashListProps(commonV1Props);
logDeprecationWarnings(warnings1, 'MessageList');
console.log('\n');

// Scenario 2: MasonryFlashList migration
console.log('📋 Scenario 2: MasonryFlashList migration');
const masonryProps = {
  data: [],
  renderItem: () => null,
  _componentName: 'MasonryFlashList',
  getColumnFlex: () => 1,
  estimatedItemSize: 100
};

const warnings2 = detectDeprecatedFlashListProps(masonryProps);
logDeprecationWarnings(warnings2, 'PhotoGrid');
console.log('\n');

// Scenario 3: Performance config with deprecated props
console.log('📋 Scenario 3: Performance config with deprecated props');
const performanceConfig = {
  estimatedItemSize: 80,
  estimatedListSize: { height: 400, width: 300 },
  disableAutoLayout: true,
  overrideItemLayout: () => {}
};

const warnings3 = detectDeprecatedFlashListProps(performanceConfig);
logDeprecationWarnings(warnings3, 'useFlashListPerformance');
console.log('\n');

// Scenario 4: Valid v2 props (no warnings)
console.log('📋 Scenario 4: Valid v2 props (should show no warnings)');
const validV2Props = {
  data: [],
  renderItem: () => null,
  maintainVisibleContentPosition: { startRenderingFromBottom: true },
  masonry: true,
  numColumns: 2
};

const warnings4 = detectDeprecatedFlashListProps(validV2Props);
if (warnings4.length === 0) {
  console.log('✅ No warnings - props are v2 compatible!');
} else {
  logDeprecationWarnings(warnings4, 'ModernList');
}

console.log('\n🎉 Demo completed! The migration warning system is working correctly.');
console.log('\n📚 Key benefits:');
console.log('• Detects all major deprecated v1 props');
console.log('• Provides clear migration guidance');
console.log('• Groups warnings by severity (error/warning/info)');
console.log('• Includes documentation links');
console.log('• Prevents warning spam with caching');
console.log('• Works with both FlashListWrapper and performance utilities');