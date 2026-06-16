import { useEffect, ReactNode } from "react";
import {
  socketManager,
  SocketEvents,
  buildSocketUserIdentifier,
} from "@/lib/socket-manager";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * Global Socket.IO Provider Component
 * Initializes Socket.IO connection on app startup and manages user registration
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const { tenant } = useTenant();

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !user?.id) {
      console.log(
        "[SocketProvider] User not authenticated, skipping Socket.IO connection",
      );
      return;
    }

    const userIdentifier = buildSocketUserIdentifier(user);
    if (!userIdentifier) {
      console.warn("[SocketProvider] Unable to build socket user identifier");
      return;
    }
    // Generate a unique device ID for this browser session
    const deviceId = `web-${window.location.hostname}-${Date.now()}`;

    console.log(
      "[SocketProvider] Initializing Socket.IO connection for user:",
      userIdentifier,
      "Organization:",
      tenant?.id,
    );

    // Connect to Socket.IO server
    socketManager.connect(userIdentifier, deviceId);

    // Register user with organization ID when tenant is available
    // Use a small delay to ensure connection is established first
    const registerUser = () => {
      if (tenant?.id && socketManager.isConnected()) {
        console.log("[SocketProvider] Registering user with organization:", tenant.id);
        socketManager.addUser(userIdentifier, deviceId, tenant.id);
      } else if (tenant?.id) {
        // If not connected yet, wait a bit and try again
        setTimeout(registerUser, 500);
      }
    };
    
    // Try to register immediately if already connected, otherwise wait for connection
    if (socketManager.isConnected()) {
      registerUser();
    } else {
      // Wait for connection, then register
      const checkConnection = setInterval(() => {
        if (socketManager.isConnected()) {
          clearInterval(checkConnection);
          registerUser();
        }
      }, 100);
      
      // Clear interval after 5 seconds to avoid infinite checking
      setTimeout(() => clearInterval(checkConnection), 5000);
    }

    // Set up global event listeners
    const unsubscribeOnlineUsers = socketManager.on(
      SocketEvents.ONLINE_USERS_UPDATE,
      (data: { onlineUsers: string[] }) => {
        console.log("[SocketProvider] Online users updated:", data.onlineUsers);
        // You can dispatch to a global state manager here if needed
        // For example: dispatch({ type: 'SET_ONLINE_USERS', payload: data.onlineUsers });
      },
    );

    // Cleanup on unmount or when user changes
    return () => {
      console.log("[SocketProvider] Cleaning up Socket.IO connection");
      unsubscribeOnlineUsers();
      socketManager.removeUser();
      // Note: We don't disconnect here to allow reconnection with new user
      // If you want to fully disconnect, call: socketManager.disconnect();
    };
  }, [
    user?.id,
    user?.firstName,
    user?.lastName,
    user?.email,
    user?.role,
    isAuthenticated,
    tenant?.id, // Re-register when tenant changes
  ]);

  // Handle user logout
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("[SocketProvider] User logged out, removing from Socket.IO");
      socketManager.removeUser();
    }
  }, [isAuthenticated]);

  return <>{children}</>;
}
