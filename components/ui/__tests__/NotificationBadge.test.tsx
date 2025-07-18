import React from 'react';
import { render } from '@testing-library/react-native';
import { NotificationBadge, AttentionIndicator } from '../NotificationBadge';

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock OptimizedIcon
jest.mock('../OptimizedIcon', () => ({
  OptimizedIcon: ({ name, size, className }: any) => (
    <div data-testid="optimized-icon" data-name={name} data-size={size} className={className} />
  ),
}));

// Mock ThemedView and ThemedText
jest.mock('../ThemedView', () => ({ children, className }: any) => (
  <div data-testid="themed-view" className={className}>{children}</div>
));

jest.mock('../ThemedText', () => ({ children, className }: any) => (
  <div data-testid="themed-text" className={className}>{children}</div>
));

describe('NotificationBadge', () => {
  it('renders nothing when count is 0', () => {
    const { queryByTestId } = render(<NotificationBadge count={0} />);
    expect(queryByTestId('themed-view')).toBeNull();
  });

  it('renders badge with count when count > 0', () => {
    const { getByTestId } = render(<NotificationBadge count={5} />);
    expect(getByTestId('themed-view')).toBeTruthy();
    expect(getByTestId('themed-text')).toBeTruthy();
  });

  it('renders 99+ when count > 99', () => {
    const { getByText } = render(<NotificationBadge count={150} />);
    expect(getByText('99+')).toBeTruthy();
  });

  it('renders icon when count is 1 and showIcon is true', () => {
    const { getByTestId } = render(<NotificationBadge count={1} showIcon={true} />);
    expect(getByTestId('optimized-icon')).toBeTruthy();
  });

  it('applies correct priority colors', () => {
    const { getByTestId } = render(<NotificationBadge count={1} priority="urgent" />);
    const badge = getByTestId('themed-view');
    expect(badge.props.className).toContain('bg-status-danger');
  });

  it('applies correct size classes', () => {
    const { getByTestId } = render(<NotificationBadge count={1} size="large" />);
    const badge = getByTestId('themed-view');
    expect(badge.props.className).toContain('h-8 w-8');
  });
});

describe('AttentionIndicator', () => {
  it('renders with correct priority icon', () => {
    const { getByTestId } = render(<AttentionIndicator priority="urgent" />);
    const icon = getByTestId('optimized-icon');
    expect(icon.props['data-name']).toBe('warning');
  });

  it('applies correct priority colors', () => {
    const { getByTestId } = render(<AttentionIndicator priority="high" />);
    const indicator = getByTestId('themed-view');
    expect(indicator.props.className).toContain('bg-status-warning/10');
  });

  it('applies correct size classes', () => {
    const { getByTestId } = render(<AttentionIndicator priority="medium" size="small" />);
    const indicator = getByTestId('themed-view');
    expect(indicator.props.className).toContain('h-5 w-5');
  });
});