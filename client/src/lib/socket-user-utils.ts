/**
 * Utility functions for parsing Socket.IO user identifiers
 * Format: "id_name_role" (e.g., "38_Paul-Smith_doctor")
 */

/**
 * Extract user ID from socket user identifier
 * @param identifier - Socket user identifier in format "id_name_role"
 * @returns User ID as number or null if parsing fails
 */
export function extractUserIdFromIdentifier(identifier: string): number | null {
  try {
    const parts = identifier.split('_');
    if (parts.length >= 1) {
      const userId = parseInt(parts[0], 10);
      return isNaN(userId) ? null : userId;
    }
    return null;
  } catch (error) {
    console.error('Error extracting user ID from identifier:', error);
    return null;
  }
}

/**
 * Extract user name from socket user identifier
 * @param identifier - Socket user identifier in format "id_name_role"
 * @returns User name or null if parsing fails
 */
export function extractUserNameFromIdentifier(identifier: string): string | null {
  try {
    const parts = identifier.split('_');
    if (parts.length >= 2) {
      return parts[1].replace(/-/g, ' '); // Replace hyphens with spaces
    }
    return null;
  } catch (error) {
    console.error('Error extracting user name from identifier:', error);
    return null;
  }
}

/**
 * Extract user role from socket user identifier
 * @param identifier - Socket user identifier in format "id_name_role"
 * @returns User role or null if parsing fails
 */
export function extractUserRoleFromIdentifier(identifier: string): string | null {
  try {
    const parts = identifier.split('_');
    if (parts.length >= 3) {
      return parts.slice(2).join('_'); // Role might contain underscores
    }
    return null;
  } catch (error) {
    console.error('Error extracting user role from identifier:', error);
    return null;
  }
}

/**
 * Check if a user ID is in the online users list
 * @param userId - User ID to check
 * @param onlineUserIdentifiers - Array of online user identifiers
 * @returns true if user is online, false otherwise
 */
export function isUserOnline(userId: number, onlineUserIdentifiers: string[]): boolean {
  return onlineUserIdentifiers.some((identifier) => {
    const id = extractUserIdFromIdentifier(identifier);
    return id !== null && id === userId;
  });
}

/**
 * Get online user IDs from identifiers
 * @param onlineUserIdentifiers - Array of online user identifiers
 * @returns Set of online user IDs
 */
export function getOnlineUserIds(onlineUserIdentifiers: string[]): Set<number> {
  const userIds = new Set<number>();
  onlineUserIdentifiers.forEach((identifier) => {
    const id = extractUserIdFromIdentifier(identifier);
    if (id !== null) {
      userIds.add(id);
    }
  });
  return userIds;
}

