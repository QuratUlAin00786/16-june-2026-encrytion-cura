# Real-Time Currency Update System

## Architecture Overview

This document describes the professional, scalable real-time currency update system implemented using Socket.IO for the SaaS platform.

### System Components

1. **Server-Side Broadcasting** (`server/saas-routes.ts`)
   - `broadcastCurrencyUpdate()` function broadcasts currency updates via Socket.IO
   - Uses organization-based rooms for efficient targeted broadcasting
   - Falls back to global broadcast for clients not yet in rooms

2. **Client-Side Socket Manager** (`client/src/lib/socket-manager.ts`)
   - Manages Socket.IO connection lifecycle
   - Listens for currency update events
   - Provides event subscription API for React hooks

3. **React Hooks Integration**
   - `TenantProvider` (`client/src/hooks/use-tenant.tsx`) - Listens for Socket.IO events and refreshes tenant data
   - `useCurrency` (`client/src/hooks/use-currency.tsx`) - Listens for Socket.IO events and updates currency display
   - `SocketProvider` (`client/src/components/socket-provider.tsx`) - Registers users with organization ID for room-based updates

4. **Fallback Mechanisms**
   - Window events (same-tab updates)
   - localStorage events (cross-tab updates)
   - Polling mechanism (backup for missed events)

## How It Works

### 1. Currency Update Flow

```
SaaS Portal (Update Country/Currency)
    ↓
Server API (PATCH /api/saas/customers/:id)
    ↓
Database Update
    ↓
broadcastCurrencyUpdate() called
    ↓
Socket.IO Broadcast (room: org:{organizationId} + global)
    ↓
Connected Clients Receive Event
    ↓
TenantProvider & useCurrency hooks update
    ↓
UI Components Re-render with new currency
```

### 2. Organization Room-Based Broadcasting

When a user connects via Socket.IO:
- User registers with `organizationId`
- Server automatically joins user to room: `org:{organizationId}`
- Currency updates are broadcast to the specific room
- Only users in that organization receive the update

### 3. Event Types

- **`currency-updated`**: Room-based event (sent to `org:{organizationId}` room)
- **`organization-currency-updated`**: Global event (sent to all connected clients)
- Both events contain the same data structure for consistency

## Server-Side Implementation

### Broadcasting Function

```typescript
function broadcastCurrencyUpdate(
  app: Express,
  organizationId: number,
  currencyData: {
    organizationId: number;
    organizationSubdomain?: string;
    countryCode?: string | null;
    countryName?: string | null;
    currencyCode?: string | null;
    currencySymbol?: string | null;
  }
)
```

**Location**: `server/saas-routes.ts`

**Usage**: Called automatically when organization currency is updated via the SaaS API.

### Socket.IO Room Setup

**Location**: `server/routes.ts`

When a user registers via `add_user` event:
```typescript
socket.on('add_user', (data: { userId: string; deviceId?: string; organizationId?: number }) => {
  // ... user registration logic ...
  
  // Join organization room for targeted updates
  if (organizationId) {
    const roomName = `org:${organizationId}`;
    socket.join(roomName);
  }
});
```

## Client-Side Implementation

### Socket Manager

**Location**: `client/src/lib/socket-manager.ts`

The `SocketManager` class:
- Manages Socket.IO connection
- Listens for currency update events
- Provides subscription API via `.on()` method
- Handles reconnection automatically

### React Hooks

#### TenantProvider Hook

**Location**: `client/src/hooks/use-tenant.tsx`

Listens for Socket.IO currency updates and refreshes tenant data:
```typescript
socketManager.on(SocketEvents.CURRENCY_UPDATED, handleSocketCurrencyUpdate);
socketManager.on(SocketEvents.ORGANIZATION_CURRENCY_UPDATED, handleSocketCurrencyUpdate);
```

#### useCurrency Hook

**Location**: `client/src/hooks/use-currency.tsx`

Listens for Socket.IO currency updates and updates currency display:
```typescript
socketManager.on(SocketEvents.CURRENCY_UPDATED, handleSocketCurrencyUpdate);
socketManager.on(SocketEvents.ORGANIZATION_CURRENCY_UPDATED, handleSocketCurrencyUpdate);
```

### Socket Provider

**Location**: `client/src/components/socket-provider.tsx`

Registers users with organization ID:
```typescript
if (tenant?.id) {
  socketManager.addUser(userIdentifier, deviceId, tenant.id);
}
```

## Scaling Considerations

### 1. Horizontal Scaling with Redis Adapter

For multiple server instances, use Socket.IO Redis Adapter:

```bash
npm install @socket.io/redis-adapter redis
```

**Server Setup**:
```typescript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

### 2. Load Balancing

When using multiple Socket.IO servers:
- Use sticky sessions (session affinity) for WebSocket connections
- Configure load balancer to route WebSocket connections to the same server
- Use Redis adapter for cross-server communication

### 3. Rate Limiting

Implement rate limiting for Socket.IO events:

```typescript
import rateLimit from "express-rate-limit";

const socketRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 4. Monitoring

Monitor Socket.IO connections:
- Track active connections per organization
- Monitor event broadcast latency
- Alert on high connection drop rates

### 5. Caching Strategy

For high-traffic scenarios:
- Cache organization currency data in Redis
- Invalidate cache on currency updates
- Use cache-aside pattern for reads

## Performance Optimizations

### 1. Room-Based Broadcasting

Instead of broadcasting to all clients, use organization-specific rooms:
- Reduces network traffic
- Improves scalability
- Better security (only relevant clients receive updates)

### 2. Event Debouncing

For rapid updates, debounce currency update broadcasts:

```typescript
let debounceTimer: NodeJS.Timeout | null = null;

function broadcastCurrencyUpdate(...args) {
  if (debounceTimer) clearTimeout(debounceTimer);
  
  debounceTimer = setTimeout(() => {
    // Actual broadcast logic
  }, 100); // 100ms debounce
}
```

### 3. Compression

Enable Socket.IO compression for large payloads:

```typescript
const io = new SocketIOServer(httpServer, {
  // ... other options ...
  compression: true, // Enable per-message compression
});
```

## Testing

### Unit Tests

Test currency update broadcasting:
```typescript
describe('broadcastCurrencyUpdate', () => {
  it('should broadcast to organization room', async () => {
    const mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    
    // Test implementation
  });
});
```

### Integration Tests

Test end-to-end currency update flow:
1. Update currency via SaaS API
2. Verify Socket.IO event is broadcast
3. Verify client receives update
4. Verify UI updates correctly

## Troubleshooting

### Currency Not Updating

1. **Check Socket.IO Connection**:
   - Verify client is connected: `socketManager.isConnected()`
   - Check browser console for connection errors

2. **Verify Room Membership**:
   - Check server logs for room join confirmation
   - Verify `organizationId` is sent during user registration

3. **Check Event Broadcasting**:
   - Verify `broadcastCurrencyUpdate()` is called
   - Check server logs for broadcast confirmation
   - Verify event data structure

4. **Fallback Mechanisms**:
   - Check if window events are working (same-tab)
   - Check if localStorage events are working (cross-tab)
   - Verify polling mechanism is active

### Performance Issues

1. **High Connection Count**:
   - Monitor active connections
   - Consider connection pooling
   - Implement connection limits per organization

2. **Slow Broadcasts**:
   - Check network latency
   - Verify Redis adapter (if using multiple servers)
   - Monitor server CPU/memory usage

## Security Considerations

1. **Authentication**: Socket.IO connections should be authenticated
2. **Authorization**: Verify users can only join their organization's room
3. **Rate Limiting**: Prevent abuse of currency update broadcasts
4. **Data Validation**: Validate currency data before broadcasting

## Future Enhancements

1. **WebSocket Compression**: Enable per-message compression
2. **Event Batching**: Batch multiple currency updates
3. **Selective Updates**: Only send changed fields
4. **Client-Side Caching**: Cache currency data locally
5. **Offline Support**: Queue updates when offline, sync when online
