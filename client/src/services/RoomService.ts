//const AVEROX_API_URL = 'https://mk1.averox.com/api';
const AVEROX_API_URL = 'https://lk.curaemr.ai/api/';
const AVEROX_API_KEY = import.meta.env.VITE_AVEROX_API_KEY;

export interface RoomCreateResponse {
  token: string;
  serverUrl: string;
  e2eeKey: string;
  roomId: string;
  participants?: Array<{
    userId: string;
    username: string;
    isOnline: boolean;
  }>;
}

export interface RoomError {
  error: string;
  message: string;
}

class RoomService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!AVEROX_API_KEY) {
      throw new Error('VITE_AVEROX_API_KEY not configured');
    }

    console.log('[RoomService] Making request:', {
      url: `${AVEROX_API_URL}${endpoint}`,
      method: options.method || 'GET',
      hasApiKey: !!AVEROX_API_KEY,
      body: options.body,
    });

    try {
      const response = await fetch(`${AVEROX_API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': AVEROX_API_KEY,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RoomService] API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: 'Unknown error', message: errorText || `HTTP ${response.status}` };
        }
        
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[RoomService] Request error:', error);
      console.error('[RoomService] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async createRoom(
    patientId: string,
    patientName: string,
    doctorId: string,
    doctorName: string
  ): Promise<RoomCreateResponse> {
    console.log('[RoomService] Creating room for:', {
      patientId,
      patientName,
      doctorId,
      doctorName,
    });

    // Generate unique roomId
    const roomId = `room_${Date.now()}_${doctorId}_${patientId}`;

    const response = await this.makeRequest<RoomCreateResponse>('/create-room', {
      method: 'POST',
      body: JSON.stringify({
        roomId: roomId,
        fromUsername: doctorName,
        toUserIds: [patientId],
        toUsernames: {
          [patientId]: patientName,
        },
        isVideo: false,
        groupName: null,
        checkOnly: false,
      }),
    });

    console.log('[RoomService] Room created:', response.roomId || response.token);
    return response;
  }

  async getRoomDetails(roomId: string): Promise<any> {
    console.log('[RoomService] Fetching room details:', roomId);
    
    const response = await this.makeRequest<any>(`/room/${roomId}`, {
      method: 'GET',
    });

    console.log('[RoomService] Room details fetched');
    return response;
  }

  async endRoom(roomId: string): Promise<void> {
    console.log('[RoomService] Ending room:', roomId);
    
    await this.makeRequest<void>(`/room/${roomId}/end`, {
      method: 'POST',
    });

    console.log('[RoomService] Room ended successfully');
  }

  async joinRoom(roomId: string, participantId: string): Promise<any> {
    console.log('[RoomService] Joining room:', { roomId, participantId });
    
    const response = await this.makeRequest<any>(`/room/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });

    console.log('[RoomService] Joined room successfully');
    return response;
  }

  async leaveRoom(roomId: string, participantId: string): Promise<void> {
    console.log('[RoomService] Leaving room:', { roomId, participantId });
    
    await this.makeRequest<void>(`/room/${roomId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });

    console.log('[RoomService] Left room successfully');
  }
}

export const roomService = new RoomService();
