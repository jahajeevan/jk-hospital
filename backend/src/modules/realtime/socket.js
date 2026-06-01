import { Server } from 'socket.io';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let io;

export const initRealtime = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true }
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'socket connected');
    socket.on('join:user', (userId) => userId && socket.join(`user:${userId}`));
    socket.on('join:admin', () => socket.join('admin'));
    socket.on('disconnect', () => logger.debug({ socketId: socket.id }, 'socket disconnected'));
  });

  return io;
};

export const emitToUser = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);
export const emitToAdmins = (event, payload) => io?.to('admin').emit(event, payload);

