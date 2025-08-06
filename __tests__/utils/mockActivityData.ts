export const mockActivityData = {
  generateMockActivity: (overrides = {}) => ({
    activityId: 'test_activity',
    userId: 'test_user',
    activityType: 'post_created' as const,
    title: 'Test Activity',
    description: 'Test Description',
    metadata: {
      sourceId: 'test_source',
      sourceType: 'post',
      relatedUsers: [],
      tags: ['test'],
    },
    visibility: 'public' as const,
    engagementStats: {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      saves: 0,
    },
    createdAt: new Date(),
    user: {
      id: 'test_user',
      username: 'TestUser',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    ...overrides,
  }),
};
