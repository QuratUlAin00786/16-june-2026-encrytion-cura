import { db } from "./db";
import { scheduledVideoCalls, users, notifications } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";
import { createBulkNotifications } from "./notification-helper";
import { resolveLiveKitServerUrl } from "./livekit-url";
import { emailService } from "./services/email";
import { storage } from "./storage";
//const MK1_BASE_URL = "https://mk1.averox.com/api";
const MK1_BASE_URL = "https://lk.curaemr.ai/api/";
const MK1_API_KEY = "3a7520ec8dd5de7bf74e2f791b14167773cd747cf8f4f452f3f473251a1c803d";

interface CreateRemoteRoomResponse {
  token: string;
  serverUrl: string;
  e2eeKey?: string;
  roomId: string;
  participants?: Array<{
    userId: string;
    username: string;
    isOnline: boolean;
  }>;
}

async function createRemoteLiveKitRoom(params: {
  roomId: string;
  fromUsername: string;
  toUsers: Array<{ identifier: string; displayName: string }>;
  isVideo: boolean;
  groupName?: string;
}): Promise<CreateRemoteRoomResponse> {
  const toUserIds = params.toUsers.map((user) => user.identifier);
  const toUsernames = Object.fromEntries(
    params.toUsers.map((user) => [user.identifier, user.displayName]),
  );

  const payload: Record<string, unknown> = {
    roomId: params.roomId,
    toUserIds,
    toUsernames,
    isVideo: params.isVideo,
    fromUsername: params.fromUsername,
  };

  if (params.groupName) {
    payload.groupName = params.groupName;
  }

  const response = await fetch(`${MK1_BASE_URL}/create-room`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": MK1_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log("[Video Call Scheduler] LiveKit room response:", text);
  if (!response.ok) {
    throw new Error(`${response.status}: ${text || response.statusText}`);
  }

  try {
    const parsed = JSON.parse(text) as CreateRemoteRoomResponse;
    return {
      ...parsed,
      serverUrl: resolveLiveKitServerUrl(parsed.serverUrl),
    };
  } catch (error) {
    throw new Error("Failed to parse LiveKit room response");
  }
}

// Helper function to build participant identifier (same as in messaging.tsx)
function buildSocketUserIdentifier(user: { id: number; firstName?: string; lastName?: string; email?: string; role?: string }) {
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const email = user.email || '';
  const role = user.role || 'user';
  
  // Create a consistent identifier
  if (firstName && lastName) {
    return `${firstName}_${lastName}_${user.id}_${role}`.toLowerCase().replace(/\s+/g, '_');
  } else if (email) {
    return `${email}_${user.id}_${role}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  } else {
    return `user_${user.id}_${role}`;
  }
}

function buildParticipantIdentifier(entity: any, defaultRole = "participant") {
  let firstName = entity?.firstName;
  let lastName = entity?.lastName;
  
  if (!firstName && !lastName && entity?.name) {
    const nameParts = entity.name.split(" ");
    firstName = nameParts[0] || entity.name;
    lastName = nameParts.slice(1).join(" ") || "";
  }
  
  return buildSocketUserIdentifier({
    id: entity?.id,
    firstName,
    lastName,
    email: entity?.email,
    role: entity?.role || defaultRole,
  });
}

function getDisplayName(entity: any) {
  const name = [entity?.firstName, entity?.lastName].filter(Boolean).join(" ").trim();
  return name || entity?.name || entity?.email || `user-${entity?.id}`;
}

export async function startScheduledVideoCalls() {
  try {
    console.log("[Video Call Scheduler] Checking for scheduled video calls...");
    
    const now = new Date();
    // Check for calls scheduled within the next 2 minutes (to account for processing time)
    const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);
    // Also check for calls that were due in the last 5 minutes (in case scheduler was down or delayed)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Query scheduled calls that are due (between 5 minutes ago and 2 minutes from now)
    const dueCalls = await db
      .select()
      .from(scheduledVideoCalls)
      .where(
        and(
          eq(scheduledVideoCalls.status, "scheduled"),
          sql`${scheduledVideoCalls.scheduledAt} <= ${twoMinutesFromNow.toISOString()}`,
          sql`${scheduledVideoCalls.scheduledAt} >= ${fiveMinutesAgo.toISOString()}`
        )
      );
    
    if (dueCalls.length === 0) {
      console.log("[Video Call Scheduler] No scheduled video calls due.");
      return;
    }
    
    console.log(`[Video Call Scheduler] Found ${dueCalls.length} scheduled video calls to start.`);
    
    for (const scheduledCall of dueCalls) {
      try {
        // Get creator and participant details
        const creator = await db
          .select()
          .from(users)
          .where(eq(users.id, scheduledCall.createdBy))
          .limit(1)
          .then(results => results[0]);
        
        let participant: any;
        if (scheduledCall.participantRole === 'patient') {
          participant = await storage.getPatient(
            scheduledCall.participantId,
            scheduledCall.organizationId,
          );
          
          // If patient has a userId, get the user record too
          if (participant?.userId) {
            const participantUser = await db
              .select()
              .from(users)
              .where(eq(users.id, participant.userId))
              .limit(1)
              .then(results => results[0]);
            if (participantUser) {
              participant = { ...participant, ...participantUser };
            }
          }
        } else {
          participant = await db
            .select()
            .from(users)
            .where(eq(users.id, scheduledCall.participantId))
            .limit(1)
            .then(results => results[0]);
        }
        
        if (!creator || !participant) {
          console.log(`[Video Call Scheduler] Missing creator or participant for call ${scheduledCall.id}`);
          continue;
        }
        
        // Build participant identifiers
        const fromIdentifier = buildParticipantIdentifier(creator, creator.role || "user");
        const toIdentifier = buildParticipantIdentifier(participant, scheduledCall.participantRole || "participant");
        
        if (!fromIdentifier || !toIdentifier) {
          console.log(`[Video Call Scheduler] Failed to build identifiers for call ${scheduledCall.id}`);
          continue;
        }
        
        // Create LiveKit room
        const roomName = `scheduled-video-${scheduledCall.id}-${Date.now()}`;
        
        console.log(`[Video Call Scheduler] Creating LiveKit room for call ${scheduledCall.id}...`);
        
        const liveKitRoom = await createRemoteLiveKitRoom({
          roomId: roomName,
          fromUsername: fromIdentifier,
          toUsers: [
            {
              identifier: toIdentifier,
              displayName: scheduledCall.participantName,
            },
          ],
          isVideo: true,
          groupName: "Scheduled Video Call",
        });
        
        const finalRoomId = liveKitRoom.roomId || roomName;
        
        // Update scheduled call with room name and status
        await db
          .update(scheduledVideoCalls)
          .set({
            status: "started",
            roomName: finalRoomId,
            startedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(scheduledVideoCalls.id, scheduledCall.id));
        
        // Send notifications to both users
        const notificationsToCreate = [];
        
        // Notify creator
        notificationsToCreate.push({
          organizationId: scheduledCall.organizationId,
          userId: scheduledCall.createdBy,
          title: "Video Call Started",
          message: `Your scheduled video call with ${scheduledCall.participantName} has started. Join the call now.`,
          type: "video_call" as const,
          priority: "high" as const,
          actionUrl: `/messaging?videoCall=${finalRoomId}`,
          metadata: {
            scheduledCallId: scheduledCall.id,
            roomName: finalRoomId,
            participantName: scheduledCall.participantName,
            token: liveKitRoom.token,
            serverUrl: liveKitRoom.serverUrl,
          }
        });
        
        // Notify participant
        if (participant.userId || scheduledCall.participantId) {
          notificationsToCreate.push({
            organizationId: scheduledCall.organizationId,
            userId: participant.userId || scheduledCall.participantId,
            title: "Video Call Started",
            message: `Your scheduled video call with ${getDisplayName(creator)} has started. Join the call now.`,
            type: "video_call" as const,
            priority: "high" as const,
            actionUrl: `/messaging?videoCall=${finalRoomId}`,
            metadata: {
              scheduledCallId: scheduledCall.id,
              roomName: finalRoomId,
              participantName: getDisplayName(creator),
              token: liveKitRoom.token,
              serverUrl: liveKitRoom.serverUrl,
            }
          });
        }
        
        if (notificationsToCreate.length > 0) {
          await createBulkNotifications(notificationsToCreate);
        }
        
        // Send email notifications
        const creatorName = getDisplayName(creator);
        const participantName = scheduledCall.participantName;
        
        // Email to creator
        try {
          await emailService.sendEmail({
            to: creator.email || '',
            subject: `Video Call Started: ${participantName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4F46E5;">Video Call Started</h2>
                <p>Hello ${creatorName},</p>
                <p>Your scheduled video call has started:</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Participant:</strong> ${participantName}</p>
                  <p><strong>Scheduled Time:</strong> ${new Date(scheduledCall.scheduledAt).toLocaleString()}</p>
                </div>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/messaging?videoCall=${finalRoomId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">Join Video Call</a></p>
                <p>Best regards,<br>Cura EMR Platform</p>
              </div>
            `,
            text: `Video Call Started\n\nHello ${creatorName},\n\nYour scheduled video call with ${participantName} has started.\n\nJoin the call: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/messaging?videoCall=${finalRoomId}\n\nBest regards,\nCura EMR Platform`
          });
        } catch (emailError) {
          console.error(`[Video Call Scheduler] Error sending email to creator:`, emailError);
        }
        
        // Email to participant
        try {
          await emailService.sendEmail({
            to: scheduledCall.participantEmail,
            subject: `Video Call Started: ${creatorName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4F46E5;">Video Call Started</h2>
                <p>Hello ${participantName},</p>
                <p>Your scheduled video call has started:</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>With:</strong> ${creatorName}</p>
                  <p><strong>Scheduled Time:</strong> ${new Date(scheduledCall.scheduledAt).toLocaleString()}</p>
                </div>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/messaging?videoCall=${finalRoomId}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">Join Video Call</a></p>
                <p>Best regards,<br>Cura EMR Platform</p>
              </div>
            `,
            text: `Video Call Started\n\nHello ${participantName},\n\nYour scheduled video call with ${creatorName} has started.\n\nJoin the call: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/messaging?videoCall=${finalRoomId}\n\nBest regards,\nCura EMR Platform`
          });
        } catch (emailError) {
          console.error(`[Video Call Scheduler] Error sending email to participant:`, emailError);
        }
        
        console.log(`[Video Call Scheduler] Successfully started video call ${scheduledCall.id} with room ${finalRoomId}`);
        
      } catch (error) {
        console.error(`[Video Call Scheduler] Error starting video call ${scheduledCall.id}:`, error);
        // Update status to failed
        await db
          .update(scheduledVideoCalls)
          .set({
            status: "failed",
            updatedAt: new Date()
          })
          .where(eq(scheduledVideoCalls.id, scheduledCall.id));
      }
    }
    
  } catch (error) {
    console.error("[Video Call Scheduler] Error checking scheduled video calls:", error);
  }
}

// Run the scheduler check every minute
export function startVideoCallScheduler() {
  console.log("[Video Call Scheduler] Starting video call scheduler...");
  
  // Run immediately on startup
  startScheduledVideoCalls();
  
  // Then run every minute to check for due calls
  setInterval(() => {
    startScheduledVideoCalls();
  }, 60 * 1000); // 1 minute in milliseconds
}
