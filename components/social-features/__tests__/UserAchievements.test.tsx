/**
 * UserAchievements Component Tests
 * 
 * Tests for the achievement system, leaderboard, and user statistics
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import UserAchievements from '../UserAchievements';
import { useAchievements } from '@/lib/hooks/useAchievements';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { UserStats } from '@/lib/models/UserStats';

// Mock dependencies
jest.mock('@/lib/hooks/useAchievements');
jest.mock('@/lib/hooks/useNotifications');
jest.mock('@/lib/utils/haptics');
jest.mock('@/lib/utils/logger');

const mockUseAchievements = useAchievements as jest.MockedFunction<typeof useAchievements>;
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

// Mock data
const mockUserStats: UserStats = {
  userId: 'test-user',
  totalPoints: 1200,
  level: 8,
  experiencePoints: 7200,
  pointsToNextLevel: 800,
  achievementsUnlocked: 3,
  leaderboardRank: 5,
  statsBreakdown: {
    growing: { plantsGrown: 5, harvestsCompleted: 2, strainsGrown: 3, daysActive: 45 },
    community: { postsCreated: 12, commentsPosted: 25, likesReceived: 48, helpfulAnswers: 8 },
    social: { followersCount: 15, followingCount: 22, groupsJoined: 3, eventsAttended: 2 },
    knowledge: { strainsReviewed: 4, questionsAnswered: 18, guidesShared: 2, expertRating: 7 },
  },
  lastActivity: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  get levelProgress() { return 75; },
  get primaryExpertise() { return 'community'; },
  get isActive() { return true; },
  get userTitle() { return 'Community Helper'; },
} as UserStats;

const mockAchievements = [
  {
    id: '1',
    achievementId: 'first_plant',
    title: 'Green Thumb',
    description: 'Add your first plant to the garden',
    metadata: {
      category: 'growing' as const,
      difficulty: 'bronze' as const,
      points: 100,
      iconName: 'leaf-outline',
    },
    pointsEarned: 100,
    isUnlocked: true,
    progressPercentage: 100,
    unlockedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    achievementId: 'first_harvest',
    title: 'Harvest Master',
    description: 'Complete your first harvest',
    metadata: {
      category: 'growing' as const,
      difficulty: 'silver' as const,
      points: 250,
      iconName: 'flower-outline',
    },
    pointsEarned: 0,
    isUnlocked: false,
    progressPercentage: 75,
  },
];

const mockLeaderboard = [
  {
    userId: 'user1',
    username: 'GrowMaster420',
    totalPoints: 2500,
    level: 15,
    rank: 1,
    title: 'Master Grower',
    isCurrentUser: false,
  },
  {
    userId: 'test-user',
    username: 'You',
    totalPoints: 1200,
    level: 8,
    rank: 5,
    title: 'Community Helper',
    isCurrentUser: true,
  },
];

// Test wrapper with QueryClient
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('UserAchievements', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAchievements.mockReturnValue({
      achievements: mockAchievements,
      userStats: mockUserStats,
      leaderboard: mockLeaderboard,
      isLoadingAchievements: false,
      isLoadingStats: false,
      isLoadingLeaderboard: false,
      updateStats: jest.fn(),
      unlockAchievement: jest.fn(),
      refreshData: jest.fn(),
      achievementsError: null,
      statsError: null,
      leaderboardError: null,
    });

    mockUseNotifications.mockReturnValue({
      permissionStatus: 'granted',
      isLoading: false,
      requestPermissions: jest.fn(),
      scheduleNotification: jest.fn(),
      scheduleRecurringNotification: jest.fn(),
      cancelNotification: jest.fn(),
      cancelAllNotifications: jest.fn(),
      openSettings: jest.fn(),
    });
  });

  it('renders achievements tab by default', () => {
    render(
      <TestWrapper>
        <UserAchievements userId="test-user" userStats={mockUserStats} />
      </TestWrapper>
    );

    expect(screen.getByText('Achievements & Progress')).toBeTruthy();
    expect(screen.getByText('Green Thumb')).toBeTruthy();
    expect(screen.getByText('Harvest Master')).toBeTruthy();
  });

  it('displays achievement progress correctly', () => {
    render(
      <TestWrapper>
        <UserAchievements userId="test-user" userStats={mockUserStats} />
      </TestWrapper>
    );

    // Check unlocked achievement
    expect(screen.getByText('Green Thumb')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();

    // Check in-progress achievement
    expect(screen.getByText('Harvest Master')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('switches to leaderboard tab', async () => {
    render(
      <TestWrapper>
        <UserAchievements userId="test-user" userStats={mockUserStats} />
      </TestWrapper>
    );

    const leaderboardTab = screen.getByText('Leaderboard');
    fireEvent.press(leaderboardTab);

    await waitFor(() => {
      expect(screen.getByText('GrowMaster420')).toBeTruthy();
      expect(screen.getByText('#1')).toBeTruthy();
      expect(screen.getByText('#5')).toBeTruthy(); // Current user rank
    });
  });

  it('switches to stats tab', async () => {
    render(
      <TestWrapper>
        <UserAchievements userId="test-user" userStats={mockUserStats} />
      </TestWrapper>
    );

    const statsTab = screen.getByText('Statistics');
    fireEvent.press(statsTab);

    await waitFor(() => {
      expect(screen.getByText('Level 8')).toBeTruthy();
      expect(screen.getByText('Community Helper')).toBeTruthy();
      expect(screen.getByText('75%')).toBeTruthy(); // Level progress
    });
  });

  it('filters achievements by category', async () => {
    render(
      <TestWrapper>
        <UserAchievements userId="test-user" userStats={mockUserStats} />
      </TestWrapper>
    );

    // Filter by growing category
    const growingFilter = screen.getByText('Growing');
    fireEvent.press(growingFilter);

    await waitFor(() => {
      expect(screen.getByText('Green Thumb')).toBeTruthy();
      expect(screen.getByText('Harvest Master')).toBeTruthy();
    });
  });

  it('handles achievement unlock', async () => {
    const mockUnlockAchievement = jest.fn().mockResolvedValue(mockAchievements[1]);
    const mockOnAchievementUnlocked = jest.fn();

    mockUseAchievements.mockReturnValue({
      achievements: mockAchievements,
      userStats: mockUserStats,
      leaderboard: mockLeaderboard,
      isLoadingAchievements: false,
      isLoadingStats: false,
      isLoadingLeaderboard: false,
      updateStats: jest.fn(),
      unlockAchievement: mockUnlockAchievement,
      refreshData: jest.fn(),
      achievementsError: null,
      statsError: null,
      leaderboardError: null,
    });

    render(
      <TestWrapper>
        <UserAchievements 
          userId="test-user" 
          userStats={mockUserStats}
          onAchievementUnlocked={mockOnAchievementUnlocked}
        />
      </TestWrapper>
    );

    // Press on an achievement that's ready to unlock (75% progress)
    const harvestAchievement = screen.getByText('Harvest Master');
    fireEvent.press(harvestAchievement);

    await waitFor(() => {
      expect(mockOnAchievementUnlocked).toHaveBeenCalledWith(mockAchievements[1]);
    });
  });

  it('displays user stats correctly', () => {
    render(
      <TestWrapper>
        <UserAchievements userId="test-user" userStats={mockUserStats} />
      </TestWrapper>
    );

    const statsTab = screen.getByText('Statistics');
    fireEvent.press(statsTab);

    expect(screen.getByText('1,200')).toBeTruthy(); // Total points
    expect(screen.getByText('Level 8')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy(); // Achievements unlocked
    expect(screen.getByText('#5')).toBeTruthy(); // Rank
  });

  it('handles loading states', () => {
    mockUseAchievements.mockReturnValue({
      achievements: [],
      userStats: null,
      leaderboard: [],
      isLoadingAchievements: true,
      isLoadingStats: true,
      isLoadingLeaderboard: true,
      updateStats: jest.fn(),
      unlockAchievement: jest.fn(),
      refreshData: jest.fn(),
      achievementsError: null,
      statsError: null,
      leaderboardError: null,
    });

    render(
      <TestWrapper>
        <UserAchievements userId="test-user" />
      </TestWrapper>
    );

    // Component should render without crashing during loading
    expect(screen.getByText('Achievements & Progress')).toBeTruthy();
  });

  it('highlights current user in leaderboard', () => {
    render(
      <TestWrapper>
        <UserAchievements userId="test-user" userStats={mockUserStats} />
      </TestWrapper>
    );

    const leaderboardTab = screen.getByText('Leaderboard');
    fireEvent.press(leaderboardTab);

    // Current user should be highlighted (You)
    expect(screen.getByText('You')).toBeTruthy();
  });

  it('displays achievement difficulty badges', () => {
    render(
      <TestWrapper>
        <UserAchievements userId="test-user" userStats={mockUserStats} />
      </TestWrapper>
    );

    expect(screen.getByText('Bronze')).toBeTruthy();
    expect(screen.getByText('Silver')).toBeTruthy();
  });

  it('shows category breakdown in stats', () => {
    render(
      <TestWrapper>
        <UserAchievements userId="test-user" userStats={mockUserStats} />
      </TestWrapper>
    );

    const statsTab = screen.getByText('Statistics');
    fireEvent.press(statsTab);

    expect(screen.getByText('Category Breakdown')).toBeTruthy();
    expect(screen.getByText('Growing')).toBeTruthy();
    expect(screen.getByText('Community')).toBeTruthy();
    expect(screen.getByText('Social')).toBeTruthy();
    expect(screen.getByText('Knowledge')).toBeTruthy();
  });
});