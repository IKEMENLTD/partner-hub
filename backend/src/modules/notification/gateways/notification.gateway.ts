import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { InAppNotification } from '../entities/in-app-notification.entity';
import { SupabaseService } from '../../supabase/supabase.service';

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // Socket.io CORS allows the upgrade request; origin is re-validated
      // in handleConnection() using the configured allowed origins list
      callback(null, true);
    },
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();
  private allowedOrigins: string[] = [];

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    // Build allowed origins list
    const nodeEnv = this.configService.get<string>('app.nodeEnv') || 'development';
    if (nodeEnv === 'production') {
      const corsOrigin = this.configService.get<string>('app.corsOrigin') || '';
      this.allowedOrigins = corsOrigin
        ? corsOrigin.split(',').map((o) => o.trim())
        : [];
    } else {
      this.allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
      ];
    }
  }

  async handleConnection(client: Socket) {
    try {
      // Validate origin
      const origin = client.handshake.headers.origin;
      if (
        this.allowedOrigins.length > 0 &&
        origin &&
        !this.allowedOrigins.includes(origin)
      ) {
        this.logger.warn(`Rejected connection from unauthorized origin: ${origin}`);
        client.disconnect(true);
        return;
      }

      // Extract token from auth or query
      const token =
        client.handshake.auth?.token ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Connection rejected: no auth token from ${client.id}`);
        client.disconnect(true);
        return;
      }

      // Verify JWT with Supabase
      const { data, error } = await this.supabaseService.admin.auth.getUser(token);

      if (error || !data?.user) {
        this.logger.warn(`Connection rejected: invalid token from ${client.id}`);
        client.disconnect(true);
        return;
      }

      // Store authenticated userId on socket
      (client as any).userId = data.user.id;
      this.logger.log(`Client connected: ${client.id} (user: ${data.user.id})`);
    } catch (err) {
      this.logger.error(`Connection error: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove client from all user rooms
    this.userSockets.forEach((sockets, userId) => {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, userId: string) {
    const authenticatedUserId = (client as any).userId;

    if (!authenticatedUserId) {
      this.logger.warn(`Subscribe rejected: unauthenticated client ${client.id}`);
      return { success: false, error: 'Not authenticated' };
    }

    // Prevent subscribing to other users' notifications
    if (userId !== authenticatedUserId) {
      this.logger.warn(
        `Subscribe rejected: user ${authenticatedUserId} tried to subscribe to ${userId}`,
      );
      return { success: false, error: 'Cannot subscribe to other users' };
    }

    // Join user-specific room
    client.join(`user:${userId}`);

    // Track socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    this.logger.log(`Client ${client.id} subscribed to user:${userId}`);

    return { success: true };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, userId: string) {
    if (!userId) return;

    client.leave(`user:${userId}`);

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client ${client.id} unsubscribed from user:${userId}`);

    return { success: true };
  }

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: string, notification: InAppNotification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`Notification sent to user:${userId}`);
  }

  /**
   * Send unread count update to a specific user
   */
  sendUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unreadCount', { count });
  }

  /**
   * Check if user is currently connected
   */
  isUserConnected(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }
}
