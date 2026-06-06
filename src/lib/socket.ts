import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinBiddingRoom = (procurementId: string): void => {
  if (socket) {
    socket.emit('bidding:join', procurementId);
  }
};

export const leaveBiddingRoom = (procurementId: string): void => {
  if (socket) {
    socket.emit('bidding:leave', procurementId);
  }
};

export const onBidUpdate = (callback: (data: { procurementId: string }) => void): void => {
  if (socket) {
    socket.on('bid:update', callback);
  }
};

export const offBidUpdate = (callback: (data: { procurementId: string }) => void): void => {
  if (socket) {
    socket.off('bid:update', callback);
  }
};
