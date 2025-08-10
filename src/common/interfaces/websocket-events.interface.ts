import { Socket } from 'socket.io';
export interface WebSocketResponse<T = unknown> {
  event: string;
  data: T;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: 'driver' | 'rider';
  isAuthenticated: boolean;
}
