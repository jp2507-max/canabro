# Advanced Community Features - Real-time Infrastructure (2025)

This directory contains the enhanced real-time infrastructure implementation for CanaBro's Advanced Community Features, optimized for 2025 standards.

## 🚀 Features

### Core Real-time Capabilities
- **Direct Messaging**: Private conversations with real-time delivery
- **Group Chat**: Community discussions with member management
- **Live Notifications**: Real-time community alerts and updates
- **User Presence**: Online status tracking and activity indicators
- **Live Events**: Real-time community events and participation
- **Community Polls**: Live voting and result visualization

### 2025 Enhancements
- **Enhanced WebSocket Management**: Automatic reconnection with exponential backoff
- **Message Batching**: Intelligent batching with rate limiting (100 msgs/sec)
- **Offline-First Architecture**: Message queuing and sync when reconnected
- **Connection Pooling**: Optimized connection management
- **Memory Management**: Proper cleanup and resource management
- **Performance Monitoring**: Real-time connection health tracking

## 📁 File Structure

```
lib/services/
├── realtimeService.ts          # Enhanced Realtime service with 2025 features
├── realtimeConfig.ts           # Configuration management for Realtime
└── realtime/
    └── README.md              # This file

lib/hooks/
└── useRealtime.ts             # Enhanced React hooks for Realtime

lib/models/
├── ConversationThread.ts      # Direct messaging and group conversations
├── Message.ts                 # Chat messages with attachments
├── LiveNotification.ts        # Real-time community alerts
├── UserPresence.ts           # Online status tracking
├── FollowRelationship.ts     # User following system
├── SocialGroup.ts            # Interest-based communities
├── GroupMember.ts            # Group membership management
├── LiveEvent.ts              # Community events
├── EventParticipant.ts       # Event participation
└── CommunityPoll.ts          # Live polling system

supabase/migrations/
└── 20250130_advanced_community_features.sql  # Database schema and RLS policies
```

## 🔧 Configuration

### Rate Limiting (2025 Standards)
```typescript
const config = {
    maxMessagesPerSecond: 100,    // Per user (Supabase quota)
    maxChannelsPerUser: 100,      // Per user
    maxConcurrentUsers: 200,      // Per channel
    batchSize: 10,                // Message batching
    batchTimeout: 100,            // 100ms batch timeout
};
```

### Connection Management
```typescript
const connectionConfig = {
    maxRetries: 5,
    baseRetryDelay: 1000,         // 1 second
    maxRetryDelay: 30000,         // 30 seconds max
    heartbeatInterval: 30,        // 30 seconds
    connectionTimeout: 30000,     // 30 seconds
};
```

## 🎯 Usage Examples

### Basic Real-time Subscription
```typescript
import { useRealtime } from '@/lib/hooks';

const MyComponent = () => {
    const { isConnected, broadcast, presenceState } = useRealtime(
        {
            channelName: 'my-channel',
            table: 'messages',
            filter: 'thread_id=eq.123'
        },
        {
            onInsert: (payload) => console.log('New message:', payload),
            onUpdate: (payload) => console.log('Message updated:', payload),
            onPresenceSync: (state) => console.log('Presence:', state),
        },
        {
            autoReconnect: true,
            pauseOnBackground: true,
            enableBatching: true
        }
    );

    return (
        <View>
            <Text>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
            <Button 
                title="Send Message" 
                onPress={() => broadcast({ 
                    type: 'message', 
                    payload: { text: 'Hello!' } 
                })} 
            />
        </View>
    );
};
```

### Conversation Messaging
```typescript
import { useConversationRealtime } from '@/lib/hooks';

const ChatScreen = ({ conversationId }: { conversationId: string }) => {
    const [messages, setMessages] = useState([]);
    
    const { isConnected, broadcast } = useConversationRealtime(
        conversationId,
        {
            onNewMessage: (message) => {
                setMessages(prev => [...prev, message.new]);
            },
            onTyping: (payload) => {
                // Handle typing indicators
            },
            onPresenceChange: (state) => {
                // Handle user presence
            }
        }
    );

    const sendMessage = async (text: string) => {
        await broadcast({
            type: 'message',
            payload: { text, userId: 'current-user-id' },
            timestamp: Date.now()
        });
    };

    return (
        <MessageList 
            messages={messages}
            onSendMessage={sendMessage}
            isConnected={isConnected}
        />
    );
};
```

### Live Notifications
```typescript
import { useNotificationRealtime } from '@/lib/hooks';

const NotificationCenter = ({ userId }: { userId: string }) => {
    const [notifications, setNotifications] = useState([]);
    
    useNotificationRealtime(
        userId,
        {
            onNewNotification: (notification) => {
                setNotifications(prev => [notification.new, ...prev]);
                // Show push notification
                showPushNotification(notification.new);
            },
            onNotificationUpdate: (notification) => {
                setNotifications(prev => 
                    prev.map(n => 
                        n.id === notification.new.id ? notification.new : n
                    )
                );
            }
        }
    );

    return (
        <NotificationList notifications={notifications} />
    );
};
```

## 🔒 Security Features

### Row Level Security (RLS)
All tables have comprehensive RLS policies:
- Users can only access conversations they participate in
- Messages are filtered by conversation membership
- Notifications are user-specific
- Group content respects membership and privacy settings

### JWT Authentication
- All real-time connections require valid JWT tokens
- Automatic token refresh on expiration
- Secure channel access based on user permissions

### Rate Limiting
- Built-in protection against message spam
- Configurable limits per user and channel
- Automatic throttling and queuing

## 📊 Performance Optimizations

### Message Batching
- Intelligent batching of high-frequency messages
- Configurable batch size and timeout
- Reduces WebSocket overhead

### Connection Pooling
- Reuse connections when possible
- Automatic cleanup of idle connections
- Memory-efficient connection management

### Offline Support
- Message queuing when offline
- Automatic sync when reconnected
- Conflict resolution for concurrent edits

### Memory Management
- Proper cleanup of subscriptions
- Animation cleanup with `cancelAnimation`
- Resource monitoring and optimization

## 🚨 Error Handling

### Connection Errors
```typescript
const errorHandling = {
    retryableErrors: [
        'ConnectionRateLimitReached',
        'RealtimeNodeDisconnected',
        'DatabaseConnectionIssue'
    ],
    nonRetryableErrors: [
        'Unauthorized',
        'InvalidJWTExpiration',
        'MalformedJWT'
    ],
    errorActions: {
        'ConnectionRateLimitReached': 'backoff_and_retry',
        'Unauthorized': 'refresh_token',
        'DatabaseConnectionIssue': 'retry_with_delay'
    }
};
```

### Automatic Recovery
- Exponential backoff with jitter
- Automatic reconnection on network recovery
- Graceful degradation to offline mode

## 📱 Mobile Optimizations

### Background/Foreground Handling
- Automatic pause/resume based on app state
- Battery optimization for background processing
- Smart reconnection on app activation

### Network Awareness
- Detect network changes
- Adapt behavior based on connection quality
- Offline-first architecture

### Performance Monitoring
- Real-time connection health tracking
- Performance metrics collection
- Automatic optimization based on usage patterns

## 🧪 Testing

### Unit Tests
```bash
# Run realtime service tests
npm test -- lib/services/__tests__/realtimeService.test.ts

# Run hook tests
npm test -- lib/hooks/__tests__/useRealtime.test.ts
```

### Integration Tests
```bash
# Run full realtime integration tests
npm test -- lib/services/__tests__/realtime-integration.test.ts
```

### Load Testing
```bash
# Test with high message volume
npm run test:load-realtime
```

## 🔄 Migration Guide

### From Legacy Realtime
1. Update imports to use new enhanced services
2. Replace old subscription patterns with new hooks
3. Update error handling to use new error types
4. Configure rate limiting and batching settings

### Database Migration
```bash
# Apply the migration
supabase db push

# Verify tables and policies
supabase db diff
```

## 📈 Monitoring

### Connection Health
```typescript
const health = realtimeService.getConnectionHealth();
console.log({
    activeChannels: health.activeChannels,
    queuedMessages: health.queuedMessages,
    rateLimitedChannels: health.rateLimitedChannels,
    connectionRetries: health.connectionRetries
});
```

### Performance Metrics
- Message delivery latency
- Connection stability
- Memory usage
- Battery impact

## 🔮 Future Enhancements

### Planned Features
- [ ] Message encryption for enhanced privacy
- [ ] Voice message support
- [ ] File sharing with progress tracking
- [ ] Advanced presence states (typing, recording, etc.)
- [ ] Message reactions and threading
- [ ] Advanced moderation tools

### Performance Improvements
- [ ] WebRTC for peer-to-peer messaging
- [ ] Advanced compression algorithms
- [ ] Predictive message prefetching
- [ ] Machine learning for optimal batching

## 📚 Resources

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [React Native Performance Best Practices](https://reactnative.dev/docs/performance)
- [WebSocket Connection Management](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Real-time Application Architecture](https://martinfowler.com/articles/201701-event-driven.html)

## 🤝 Contributing

1. Follow the established patterns for new features
2. Add comprehensive tests for new functionality
3. Update documentation for API changes
4. Consider performance impact of new features
5. Ensure mobile optimization for all changes

## 📄 License

This implementation is part of the CanaBro application and follows the project's licensing terms.