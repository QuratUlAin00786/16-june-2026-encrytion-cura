import { useEffect, useState, useCallback } from "react";
import {
  socketManager,
  SocketEvents,
  type OnlineUsersUpdate,
} from "@/lib/socket-manager";

/**
 * Hook to use Socket.IO manager in React components
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(socketManager.isConnected());
  const [onlineUsers, setOnlineUsers] = useState<string[]>(
    socketManager.getOnlineUsers(),
  );

  useEffect(() => {
    // Update connection status
    const updateConnectionStatus = () => {
      setIsConnected(socketManager.isConnected());
    };

    // Update online users
    const handleOnlineUsersUpdate = (data: OnlineUsersUpdate) => {
      setOnlineUsers(data.onlineUsers);
    };

    // Subscribe to events
    const unsubscribeOnlineUsers = socketManager.on(
      SocketEvents.ONLINE_USERS_UPDATE,
      handleOnlineUsersUpdate,
    );

    // Check connection status periodically
    const statusInterval = setInterval(updateConnectionStatus, 1000);

    // Initial status check
    updateConnectionStatus();

    return () => {
      unsubscribeOnlineUsers();
      clearInterval(statusInterval);
    };
  }, []);

  const emit = useCallback((event: string, data: any) => {
    socketManager.emitToServer(event, data);
  }, []);

  const on = useCallback((event: string, callback: Function) => {
    return socketManager.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback: Function) => {
    socketManager.off(event, callback);
  }, []);

  return {
    isConnected,
    onlineUsers,
    emit,
    on,
    off,
    socketManager,
  };
}
