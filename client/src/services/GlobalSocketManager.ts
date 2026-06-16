import { io, Socket } from 'socket.io-client';

//const AVEROX_WS_URL = 'wss://mk1.averox.com/';
const AVEROX_WS_URL = 'wss://lk.curaemr.ai/';
const AVEROX_API_KEY = import.meta.env.VITE_AVEROX_API_KEY;

export interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-start' | 'call-end' | 'call-rejected';
  from: string;
  to: string;
  data?: any;
  roomId?: string;
  callerName?: string;
}

export interface IncomingCall {
  from: string;
  roomId: string;
  callerName: string;
}

type CallEventHandler = (data: any) => void;

class GlobalSocketManager {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private eventHandlers: Map<string, Set<CallEventHandler>> = new Map();
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection() {
    if (!AVEROX_API_KEY) {
      console.error('[GlobalSocketManager] VITE_AVEROX_API_KEY not configured');
      return;
    }

    try {
      this.socket = io(AVEROX_WS_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        auth: {
          token: AVEROX_API_KEY,
        },
        query: {
          apiKey: AVEROX_API_KEY,
        },
      });

      this.setupEventListeners();
      console.log('[GlobalSocketManager] WebSocket connection initialized with API key');
    } catch (error) {
      console.error('[GlobalSocketManager] Connection error:', error);
    }
  }

  public registerUser(userId: string, userName: string) {
    this.currentUserId = userId;
    this.currentUserName = userName;
    
    if (this.isConnected && this.socket) {
      this.socket.emit('register-user', {
        userId,
        userName,
      });
      console.log('[GlobalSocketManager] User registered:', userId, userName);
    }
  }

  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[GlobalSocketManager] Connected to Averox WebSocket');
      
      if (this.currentUserId && this.currentUserName) {
        this.socket?.emit('register-user', {
          userId: this.currentUserId,
          userName: this.currentUserName,
        });
        console.log('[GlobalSocketManager] Auto-registered user on reconnect');
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('[GlobalSocketManager] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[GlobalSocketManager] Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[GlobalSocketManager] Max reconnection attempts reached');
      }
    });

    this.socket.on('incoming-call', (data: IncomingCall) => {
      console.log('[GlobalSocketManager] Incoming call:', data);
      this.emit('incoming-call', data);
    });

    this.socket.on('call-signal', (signal: CallSignal) => {
      console.log('[GlobalSocketManager] Call signal received:', signal.type);
      this.emit('call-signal', signal);
    });

    this.socket.on('call-ended', (data: any) => {
      console.log('[GlobalSocketManager] Call ended:', data);
      this.emit('call-ended', data);
    });

    this.socket.on('call-rejected', (data: any) => {
      console.log('[GlobalSocketManager] Call rejected:', data);
      this.emit('call-rejected', data);
    });
  }

  public on(event: string, handler: CallEventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  public off(event: string, handler: CallEventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  public sendSignal(signal: CallSignal) {
    if (!this.isConnected || !this.socket) {
      console.error('[GlobalSocketManager] Cannot send signal: not connected');
      return;
    }

    this.socket.emit('call-signal', signal);
    console.log('[GlobalSocketManager] Signal sent:', signal.type);
  }

  public initiateCall(to: string, roomId: string, callerName: string) {
    if (!this.isConnected || !this.socket) {
      console.error('[GlobalSocketManager] Cannot initiate call: not connected');
      return;
    }

    this.socket.emit('initiate-call', {
      to,
      roomId,
      callerName,
    });
    console.log('[GlobalSocketManager] Call initiated to:', to);
  }

  public endCall(roomId: string) {
    if (!this.isConnected || !this.socket) {
      console.error('[GlobalSocketManager] Cannot end call: not connected');
      return;
    }

    this.socket.emit('end-call', { roomId });
    console.log('[GlobalSocketManager] Call ended for room:', roomId);
  }

  public rejectCall(roomId: string, callerId: string) {
    if (!this.isConnected || !this.socket) {
      console.error('[GlobalSocketManager] Cannot reject call: not connected');
      return;
    }

    this.socket.emit('reject-call', { roomId, callerId });
    console.log('[GlobalSocketManager] Call rejected for room:', roomId);
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      console.log('[GlobalSocketManager] Manually disconnected');
    }
  }

  public reconnect() {
    if (this.socket) {
      this.socket.connect();
      console.log('[GlobalSocketManager] Manual reconnection initiated');
    }
  }
}

let globalSocketManagerInstance: GlobalSocketManager | null = null;

export const getGlobalSocketManager = (): GlobalSocketManager => {
  if (!globalSocketManagerInstance) {
    globalSocketManagerInstance = new GlobalSocketManager();
  }
  return globalSocketManagerInstance;
};
