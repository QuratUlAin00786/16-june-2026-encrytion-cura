import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { storage } from "./storage";
import { db } from "./db";
import nodemailer from "nodemailer";
import { saasOwners, organizations, users, saasPayments, saasInvoices, saasSubscriptions, saasPackages } from "@shared/schema";
import { eq } from "drizzle-orm";
import { emailService } from "./services/email";
import { sendReminderForSubscription } from "./services/subscription-reminders";
import {
  getOrCreateStripeCustomer,
  getStripePriceId,
  validateUsageBeforeDowngrade,
  updateSubscriptionFromStripe,
} from "./services/stripe-subscription";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

const SAAS_JWT_SECRET =
  process.env.SAAS_JWT_SECRET || "saas-super-secret-key-change-in-production";

// Email configuration for customer notifications
async function sendWelcomeEmail(organization: any, adminUser: any) {
  // Email validation function
  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  try {
    console.log("📧 sendWelcomeEmail called with:", {
      orgName: organization?.name,
      orgSubdomain: organization?.subdomain,
      adminEmail: adminUser?.email,
      adminName: `${adminUser?.firstName} ${adminUser?.lastName}`,
      hasTempPassword: !!adminUser?.tempPassword,
    });

    // Validate email address
    if (!adminUser?.email || !isValidEmail(adminUser.email)) {
      throw new Error(`Invalid email address: ${adminUser?.email}`);
    }

    // Create professional email content
    const loginUrl = `https://app.curaemr.ai/auth/login`;
    const supportEmail = "support@curaemr.ai";

    const emailOptions = {
      to: adminUser.email,
      subject: `Welcome to Cura EMR - Your ${organization.name} Account is Ready`,
      text: `Dear ${adminUser.firstName} ${adminUser.lastName},

Welcome to Cura EMR! Your account for ${organization.name} has been successfully created.

Your Login Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${adminUser.email}
Temporary Password: ${adminUser.tempPassword || "Please contact support"}
Organization: ${organization.name}
Login URL: ${loginUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT SECURITY NOTICE:
• Please change your password upon first login
• Keep your credentials secure and confidential
• Contact support if you experience any issues

Next Steps:
1. Visit your login URL above
2. Login with your email and temporary password
3. Set up your new secure password
4. Complete your profile setup

Need Help?
Contact our support team at ${supportEmail}

Best regards,
The Cura EMR Team
Cura Software Limited

© 2025 Cura Software Limited. All rights reserved.`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Cura EMR</title>
  <style>
    body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #4A7DFF 0%, #7279FB 100%); color: white; padding: 30px 20px; text-align: center; }
    .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
    .content { padding: 30px 20px; }
    .credentials-box { background-color: #f8f9fa; border: 2px solid #4A7DFF; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .credentials-title { font-size: 18px; font-weight: bold; color: #4A7DFF; margin-bottom: 15px; }
    .credential-item { margin: 10px 0; }
    .credential-label { font-weight: bold; color: #555; }
    .credential-value { color: #333; font-family: 'Courier New', monospace; background-color: #e9ecef; padding: 5px 8px; border-radius: 4px; }
    .security-notice { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
    .security-title { font-weight: bold; color: #856404; margin-bottom: 10px; }
    .steps { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0; }
    .steps-title { font-weight: bold; color: #155724; margin-bottom: 10px; }
    .step { margin: 8px 0; padding-left: 20px; }
    .footer { background-color: #f8f9fa; color: #666; text-align: center; padding: 20px; font-size: 12px; }
    .btn { display: inline-block; background-color: #4A7DFF; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
    .btn:hover { background-color: #3d6be8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Cura EMR</div>
      <h2>Welcome to Your Healthcare Management Platform</h2>
    </div>
    
    <div class="content">
      <h3>Dear ${adminUser.firstName} ${adminUser.lastName},</h3>
      
      <p>Welcome to Cura EMR! Your account for <strong>${organization.name}</strong> has been successfully created and is ready to use.</p>
      
      <div class="credentials-box">
        <div class="credentials-title">🔐 Your Login Credentials</div>
        <div class="credential-item">
          <span class="credential-label">Email:</span> 
          <span class="credential-value">${adminUser.email}</span>
        </div>
        <div class="credential-item">
          <span class="credential-label">Temporary Password:</span> 
          <span class="credential-value">${adminUser.tempPassword || "Contact Support"}</span>
        </div>
        <div class="credential-item">
          <span class="credential-label">Organization:</span> 
          <span class="credential-value">${organization.name}</span>
        </div>
        <div class="credential-item">
          <span class="credential-label">Login URL:</span> 
          <a href="${loginUrl}" class="btn">Access Your Account</a>
        </div>
      </div>

      <div class="security-notice">
        <div class="security-title">🔒 Important Security Notice</div>
        <ul>
          <li>Please change your password upon first login</li>
          <li>Keep your credentials secure and confidential</li>
          <li>Contact support if you experience any issues</li>
        </ul>
      </div>

      <div class="steps">
        <div class="steps-title">📋 Next Steps</div>
        <div class="step">1. Visit your login URL above</div>
        <div class="step">2. Login with your email and temporary password</div>
        <div class="step">3. Set up your new secure password</div>
        <div class="step">4. Complete your profile setup</div>
      </div>

      <p><strong>Need Help?</strong><br>
      Contact our support team at <a href="mailto:${supportEmail}">${supportEmail}</a></p>

      <p>Best regards,<br>
      <strong>The Cura EMR Team</strong><br>
      Cura Software Limited</p>
    </div>

    <div class="footer">
      <p>© 2025 Cura Software Limited. All rights reserved.</p>
      <p>Ground Floor Unit 2, Drayton Court, Drayton Road, Solihull, England B90 4NG</p>
    </div>
  </div>
</body>
</html>`,
    };

    console.log(
      "📧 About to send professional welcome email via centralized service:",
      {
        to: emailOptions.to,
        subject: emailOptions.subject,
        hasHtml: !!emailOptions.html,
      },
    );

    // Retry mechanism for reliability
    let emailResult = false;
    let attempt = 0;
    const maxAttempts = 3;

    while (!emailResult && attempt < maxAttempts) {
      attempt++;
      console.log(`📧 Email delivery attempt ${attempt}/${maxAttempts}`);

      try {
        emailResult = await emailService.sendEmail(emailOptions);
        if (emailResult) {
          console.log(`📧 ✅ Email sent successfully on attempt ${attempt}!`);
          break;
        } else {
          console.log(`📧 ⚠️ Email attempt ${attempt} failed, retrying...`);
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          }
        }
      } catch (attemptError) {
        console.error(`📧 ❌ Email attempt ${attempt} error:`, attemptError);
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }
    }

    console.log(
      `📧 Welcome email to ${adminUser.email} for organization ${organization.name} - Final result: ${emailResult}`,
    );

    if (!emailResult) {
      throw new Error(
        `Failed to send welcome email after ${maxAttempts} attempts`,
      );
    }

    return true;
  } catch (error) {
    console.error("📧 ❌ Error sending welcome email:", error);
    // Log the email content for debugging
    console.log("📧 📄 Failed email details:", {
      to: adminUser?.email,
      organization: organization?.name,
      tempPassword: adminUser?.tempPassword ? "Present" : "Missing",
    });
    throw error;
  }
}

// Middleware to verify SaaS owner token
interface SaaSRequest extends Request {
  saasOwner?: any;
}

const verifySaaSToken = async (req: SaaSRequest, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  console.log('🔐 verifySaaSToken check:', {
    hasAuthHeader: !!authHeader,
    authHeaderPreview: authHeader ? `${authHeader.substring(0, 20)}...` : 'none',
    hasToken: !!token,
    tokenLength: token?.length || 0,
    method: req.method,
    path: req.path
  });

  if (!token) {
    console.error('❌ No token provided in request headers');
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, SAAS_JWT_SECRET) as any;
    const saasUser = await storage.getUser(decoded.id, 0); // organizationId 0 = system-wide

    if (!saasUser || !saasUser.isSaaSOwner || !saasUser.isActive) {
      return res
        .status(401)
        .json({ message: "Invalid token or inactive owner" });
    }

    req.saasOwner = saasUser;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Enhanced test route to verify email functionality with reliability checks
async function testEmailConnection() {
  try {
    console.log("📧 TESTING EMAIL CONNECTION VIA CENTRALIZED SERVICE...");

    // Test email with retry mechanism
    let testResult = false;
    let attempt = 0;
    const maxAttempts = 2;

    while (!testResult && attempt < maxAttempts) {
      attempt++;
      console.log(`📧 Connection test attempt ${attempt}/${maxAttempts}`);

      try {
        testResult = await emailService.sendEmail({
          to: "test@example.com",
          subject: "Cura EMR Email Service Test",
          text: "This is a test email to verify the Cura EMR email service is working properly.",
          html: `
            <h3>Cura EMR Email Service Test</h3>
            <p>This is a test email to verify the Cura EMR email service is working properly.</p>
            <p><strong>Test Status:</strong> Connection Successful</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          `,
        });

        if (testResult) {
          console.log(`📧 ✅ EMAIL SERVICE VERIFIED on attempt ${attempt}`);
          break;
        } else if (attempt < maxAttempts) {
          console.log(`📧 ⚠️ Test attempt ${attempt} failed, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (attemptError) {
        console.error(`📧 ❌ Test attempt ${attempt} error:`, attemptError);
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    return testResult;
  } catch (error) {
    console.error("📧 ❌ EMAIL SERVICE FAILED:", error);
    return false;
  }
}

/**
 * Broadcast currency update to all connected clients for a specific organization
 * Uses Socket.IO rooms for efficient broadcasting
 */
function broadcastCurrencyUpdate(
  app: Express,
  organizationId: number,
  currencyData: {
    organizationId: number;
    organizationSubdomain?: string;
    countryCode?: string | null;
    countryName?: string | null;
    currencyCode?: string | null;
    currencySymbol?: string | null;
  }
) {
  try {
    const io = app.get('io') as any; // Socket.IO instance
    if (!io) {
      console.warn('[Currency Broadcast] Socket.IO not available, skipping broadcast');
      return;
    }

    const updateEvent = {
      type: 'currency-updated',
      organizationId: organizationId,
      organizationSubdomain: currencyData.organizationSubdomain,
      countryCode: currencyData.countryCode,
      countryName: currencyData.countryName,
      currencyCode: currencyData.currencyCode,
      currencySymbol: currencyData.currencySymbol,
      currencyUpdated: true, // Flag to indicate currency was updated
      timestamp: Date.now(),
    };

    // Broadcast to all clients in the organization's room
    // Room name format: `org:${organizationId}`
    const roomName = `org:${organizationId}`;
    
    // Get room size for logging
    const room = io.sockets.adapter.rooms.get(roomName);
    const roomSize = room ? room.size : 0;
    
    console.log(`[Currency Broadcast] 📡 Broadcasting to room ${roomName} (${roomSize} clients)`, {
      organizationId,
      currencyCode: currencyData.currencyCode,
      currencySymbol: currencyData.currencySymbol,
      countryCode: currencyData.countryCode,
      countryName: currencyData.countryName,
      roomSize
    });
    
    io.to(roomName).emit('currency-updated', updateEvent);
    
    // Also broadcast globally for clients that haven't joined the room yet
    // They can filter by organizationId on the client side
    const totalClients = io.sockets.sockets.size;
    console.log(`[Currency Broadcast] 📡 Also broadcasting globally to ${totalClients} total clients`);
    io.emit('organization-currency-updated', updateEvent);
    
    console.log(`[Currency Broadcast] ✅ Successfully broadcasted currency update for organization ${organizationId}`, {
      roomName,
      roomSize,
      totalClients,
      currencyCode: currencyData.currencyCode,
      currencySymbol: currencyData.currencySymbol,
      countryCode: currencyData.countryCode,
      countryName: currencyData.countryName
    });
  } catch (error) {
    console.error('[Currency Broadcast] ❌ Error broadcasting currency update:', error);
  }
}

export function registerSaaSRoutes(app: Express) {
  // Send email to specific customer by ID
  app.post(
    "/api/saas/send-email-to-customer/:customerId",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const customerId = parseInt(req.params.customerId);
        console.log(`📧 Sending welcome email to customer ID: ${customerId}`);

        // Get the organization
        const organization = await storage.getOrganization(customerId);
        if (!organization) {
          return res
            .status(404)
            .json({ success: false, message: "Customer not found" });
        }

        // Get the admin user for this organization
        const adminUsers = await storage.getUsersByRole("admin", customerId);
        if (!adminUsers || adminUsers.length === 0) {
          return res
            .status(404)
            .json({
              success: false,
              message: "No admin user found for this customer",
            });
        }

        const adminUser = adminUsers[0];

        console.log("📧 Sending welcome email to:", {
          organization: organization.name,
          adminEmail: adminUser.email,
          adminName: `${adminUser.firstName} ${adminUser.lastName}`,
        });

        // Send the welcome email
        await sendWelcomeEmail(organization, adminUser);

        res.json({
          success: true,
          message: `Welcome email sent successfully`,
          sentTo: adminUser.email,
          organization: organization.name,
        });
      } catch (error: any) {
        console.error("📧 ❌ Error sending welcome email to customer:", error);
        res.status(500).json({
          success: false,
          message: "Failed to send welcome email",
          error: error.message,
        });
      }
    },
  );

  // DIRECT EMAIL TEST - Bypasses all middleware
  app.get("/api/direct-email-test", async (req: Request, res: Response) => {
    try {
      console.log("🔥 DIRECT EMAIL TEST STARTING...");

      // Create test organization and user data with YOUR email
      const testOrganization = {
        id: 1,
        name: "Halo Healthcare",
        subdomain: "halo",
        createdAt: new Date(),
      };

      const testAdminUser = {
        id: 348,
        email: "admin@cura.com", // Using your real email from the customer list
        firstName: "Muhammad",
        lastName: "Younus",
        tempPassword: "temp123",
      };

      console.log("🔥 Sending test email to:", testAdminUser.email);
      console.log("🔥 Organization:", testOrganization.name);

      await sendWelcomeEmail(testOrganization, testAdminUser);

      console.log("🔥 ✅ DIRECT EMAIL TEST COMPLETED SUCCESSFULLY!");

      res.json({
        success: true,
        message: "Direct email test completed successfully",
        sentTo: testAdminUser.email,
        organization: testOrganization.name,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("🔥 ❌ DIRECT EMAIL TEST FAILED:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    }
  });
  // Production Setup Endpoint - Creates SaaS owner through normal user system
  app.post("/api/production-setup", async (req: Request, res: Response) => {
    try {
      // Check if SaaS owner already exists in regular users table
      const existingUser = await storage.getUserByEmail(
        "saas_admin@curaemr.ai",
        0,
      ); // organizationId 0 = system-wide

      if (existingUser) {
        return res.json({
          success: true,
          message: "SaaS admin already exists",
          alreadyExists: true,
        });
      }

      // Create SaaS owner as a special system user (organizationId: 0)
      const hashedPassword = await bcrypt.hash("admin123", 12);

      const saasOwnerUser = await storage.createUser({
        firstName: "SaaS",
        lastName: "Administrator",
        email: "saas_admin@curaemr.ai",
        username: "saas_admin",
        passwordHash: hashedPassword,
        role: "saas_owner", // Special role for SaaS owners
        organizationId: 0, // 0 = System-wide, hidden from regular organizations
        isActive: true,
        isSaaSOwner: true, // Flag to identify SaaS owners
      });

      console.log("✅ Production SaaS owner created as system user");

      res.json({
        success: true,
        message: "SaaS admin account created successfully",
        owner: {
          id: saasOwnerUser.id,
          username: saasOwnerUser.username,
          email: saasOwnerUser.email,
        },
      });
    } catch (error) {
      console.error("❌ Production setup failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create SaaS admin account",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // SaaS Owner Profile Management
  app.get(
    "/api/saas/owner/profile",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const saasOwner = (req as any).saasOwner;

        // Return SaaS owner without password
        const { password, ...ownerWithoutPassword } = saasOwner;
        res.json(ownerWithoutPassword);
      } catch (error) {
        console.error("Error fetching owner profile:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
      }
    },
  );

  app.put(
    "/api/saas/owner/profile",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const saasOwner = (req as any).saasOwner;
        const { email, firstName, lastName } = req.body;

        if (!email || !firstName || !lastName) {
          return res.status(400).json({ error: "All fields are required" });
        }

        const updatedOwner = await storage.updateUser(saasOwner.id, 0, {
          email,
          firstName,
          lastName,
        });

        if (!updatedOwner) {
          return res.status(404).json({ error: "Owner not found" });
        }

        // Return owner without password
        const { passwordHash, ...ownerWithoutPassword } = updatedOwner;
        res.json(ownerWithoutPassword);
      } catch (error) {
        console.error("Error updating owner profile:", error);
        res.status(500).json({ error: "Failed to update profile" });
      }
    },
  );

  app.put(
    "/api/saas/owner/password",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const saasOwner = (req as any).saasOwner;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
          return res
            .status(400)
            .json({ error: "Current password and new password are required" });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(
          currentPassword,
          saasOwner.passwordHash,
        );
        if (!isCurrentPasswordValid) {
          return res
            .status(400)
            .json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await storage.updateUser(saasOwner.id, 0, {
          passwordHash: hashedNewPassword,
        });

        res.json({ message: "Password updated successfully" });
      } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ error: "Failed to update password" });
      }
    },
  );

  // Create User
  app.post(
    "/api/saas/users/create",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const {
          firstName,
          lastName,
          email,
          username,
          password,
          role,
          organizationId,
        } = req.body;

        if (
          !firstName ||
          !lastName ||
          !email ||
          !username ||
          !password ||
          !role ||
          !organizationId
        ) {
          return res.status(400).json({ error: "All fields are required" });
        }

        // Validate organization exists
        const organization = await storage.getOrganization(
          parseInt(organizationId),
        );
        if (!organization) {
          return res
            .status(400)
            .json({ error: "Invalid organization selected" });
        }

        // Check if username or email already exists
        const existingUser = await storage.getUserByUsername(
          username,
          parseInt(organizationId),
        );
        if (existingUser) {
          return res.status(400).json({ error: "Username already exists" });
        }

        const existingEmail = await storage.getUserByEmail(
          email,
          parseInt(organizationId),
        );
        if (existingEmail) {
          return res.status(400).json({ error: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await storage.createUser({
          firstName,
          lastName,
          email,
          username,
          passwordHash: hashedPassword,
          role,
          organizationId: parseInt(organizationId),
          isActive: true,
        });

        // If role is patient, also create a patient record
        if (role === 'patient') {
          // Generate patient ID
          const patientCount = await storage.getPatientsByOrganization(parseInt(organizationId), 999999);
          const generatedPatientId = `P${(patientCount.length + 1).toString().padStart(6, '0')}`;

          // Create patient record
          await storage.createPatient({
            organizationId: parseInt(organizationId),
            patientId: generatedPatientId,
            firstName,
            lastName,
            email,
            dateOfBirth: null,
          });

          // Send email notification to the patient
          try {
            await emailService.sendEmail({
              to: email,
              subject: 'Your Patient Account Has Been Created Successfully',
              text: `Dear ${firstName} ${lastName},

Your patient account has been successfully created in the Cura EMR system.

Patient ID: ${generatedPatientId}
Email: ${email}

You can now log in to access your medical records and appointments.

Best regards,
The Cura EMR Team`,
              html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #4A7DFF 0%, #7279FB 100%); color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .info-box { background-color: #f8f9fa; border: 2px solid #4A7DFF; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .footer { background-color: #f8f9fa; color: #666; text-align: center; padding: 20px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎉 Patient Account Created</h2>
    </div>
    <div class="content">
      <h3>Dear ${firstName} ${lastName},</h3>
      <p>Your patient account has been successfully created in the Cura EMR system.</p>
      <div class="info-box">
        <p><strong>Patient ID:</strong> ${generatedPatientId}</p>
        <p><strong>Email:</strong> ${email}</p>
      </div>
      <p>You can now log in to access your medical records and appointments.</p>
      <p>Best regards,<br><strong>The Cura EMR Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2025 Cura Software Limited. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
            });
            console.log(`📧 ✅ Patient creation email sent successfully to ${email}`);
          } catch (emailError) {
            console.error('📧 ❌ Failed to send patient creation email:', emailError);
            // Don't fail the entire operation if email fails
          }
        }

        // Return user without password
        const { passwordHash: _, ...userWithoutPassword } = newUser;

        res.status(201).json(userWithoutPassword);
      } catch (error: any) {
        console.error("Error creating user:", error);

        // Handle specific database constraint errors
        if (error.code === "23505") {
          if (error.detail?.includes("username")) {
            return res.status(400).json({ error: "Username already exists" });
          }
          if (error.detail?.includes("email")) {
            return res.status(400).json({ error: "Email already exists" });
          }
        }

        res.status(500).json({ error: "Failed to create user" });
      }
    },
  );

  // Check username/email availability (no auth required - needed during user creation)
  app.get(
    "/api/saas/users/check-availability",
    async (req: Request, res: Response) => {
      try {
        const { username, email, organizationId } = req.query;

        if (!organizationId) {
          return res.status(400).json({ error: "Organization ID is required" });
        }

        const result: {
          usernameAvailable?: boolean;
          emailAvailable?: boolean;
        } = {};

        // Check username globally (usernames are globally unique across all organizations)
        if (username) {
          console.log(
            "[AVAILABILITY-CHECK] Checking username globally:",
            username,
          );
          const existingUser = await storage.getUserByUsernameGlobal(
            username as string,
          );
          console.log("[AVAILABILITY-CHECK] Username check result:", {
            username,
            found: !!existingUser,
            userId: existingUser?.id,
            orgId: existingUser?.organizationId,
          });
          result.usernameAvailable = !existingUser;
        }

        // Check email globally (independent of organization)
        if (email) {
          console.log(
            "[AVAILABILITY-CHECK] Checking email globally:",
            email,
          );
          const existingEmail = await storage.getUserByEmailGlobal(
            email as string,
          );
          console.log("[AVAILABILITY-CHECK] Email check result:", {
            email,
            found: !!existingEmail,
            userId: existingEmail?.id,
            orgId: existingEmail?.organizationId,
          });
          result.emailAvailable = !existingEmail;
        }

        // Prevent caching of availability checks
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        res.json(result);
      } catch (error) {
        console.error("Error checking availability:", error);
        res.status(500).json({ error: "Failed to check availability" });
      }
    },
  );

  // Check customer email availability in both users and organizations tables (no auth required)
  app.get(
    "/api/saas/customers/check-email",
    async (req: Request, res: Response) => {
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).json({ error: "Email is required" });
        }

        // Check if email exists in users table
        const existingUser = await storage.getUserByEmailGlobal(email as string);
        
        // Check if email exists in organizations table (email field)
        const [existingOrg] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.email, email as string));

        const emailAvailable = !existingUser && !existingOrg;

        // Prevent caching
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        res.json({ emailAvailable });
      } catch (error) {
        console.error("Error checking customer email availability:", error);
        res.status(500).json({ error: "Failed to check email availability" });
      }
    },
  );

  // SaaS diagnostic endpoint for production debugging
  // Test email connection
  app.get(
    "/api/saas/test-email",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        console.log("📧 Manual email test requested...");
        const result = await testEmailConnection();
        res.json({
          success: result,
          message: result
            ? "Email connection verified"
            : "Email connection failed",
        });
      } catch (error) {
        console.error("Error testing email:", error);
        res.status(500).json({ success: false, message: "Email test failed" });
      }
    },
  );

  // Send welcome email to last customer created
  app.post(
    "/api/saas/send-welcome-to-last-customer",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        console.log("📧 Manual welcome email requested for last customer...");

        // Get all organizations ordered by creation date (newest first)
        const organizations = await storage.getAllOrganizations();

        if (!organizations || organizations.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "No customers found" });
        }

        // Get the most recent organization (last created)
        const lastOrganization = organizations.sort(
          (a, b) =>
            new Date(b.createdAt || "").getTime() -
            new Date(a.createdAt || "").getTime(),
        )[0];

        console.log("📧 Last customer found:", {
          id: lastOrganization.id,
          name: lastOrganization.name,
          subdomain: lastOrganization.subdomain,
          createdAt: lastOrganization.createdAt,
        });

        // Get the admin user for this organization
        const adminUsers = await storage.getUsersByRole(
          "admin",
          lastOrganization.id,
        );

        if (!adminUsers || adminUsers.length === 0) {
          return res
            .status(404)
            .json({
              success: false,
              message: "No admin user found for last customer",
            });
        }

        const adminUser = adminUsers[0]; // Take the first admin

        console.log("📧 Admin user found:", {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
        });

        // Send the welcome email
        console.log("📧 About to send welcome email...");
        await sendWelcomeEmail(lastOrganization, adminUser);
        console.log("📧 ✅ Welcome email sent successfully!");

        res.json({
          success: true,
          message: `Welcome email sent to ${adminUser.email} for organization ${lastOrganization.name}`,
          organization: {
            name: lastOrganization.name,
            subdomain: lastOrganization.subdomain,
          },
          adminUser: {
            email: adminUser.email,
            name: `${adminUser.firstName} ${adminUser.lastName}`,
          },
        });
      } catch (error: any) {
        console.error(
          "📧 ❌ Error sending welcome email to last customer:",
          error,
        );
        res.status(500).json({
          success: false,
          message: "Failed to send welcome email",
          error: error.message,
        });
      }
    },
  );

  app.get("/api/saas/debug", async (req: Request, res: Response) => {
    try {
      const hasSaaSUser = await storage.getUserByUsername("saas_admin", 0);

      res.json({
        debug: true,
        environment: process.env.NODE_ENV || "unknown",
        hostname: req.hostname,
        headers: {
          host: req.get("host"),
          origin: req.get("origin"),
          referer: req.get("referer"),
          userAgent: req.get("user-agent"),
        },
        hasSaaSJWTSecret: !!process.env.SAAS_JWT_SECRET,
        jwtSecretLength: SAAS_JWT_SECRET.length,
        hasSaaSAdmin: !!hasSaaSUser,
        saasAdminActive: hasSaaSUser?.isActive || false,
        saasAdminEmail: hasSaaSUser?.email || "none",
        isSaaSOwner: hasSaaSUser?.isSaaSOwner || false,
        databaseConnected: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("SaaS debug error:", error);
      res
        .status(500)
        .json({
          error: "Debug endpoint failed",
          message: (error as Error).message,
        });
    }
  });

  // Production setup endpoint to ensure SaaS admin works in live environment
  app.post("/api/production-setup", async (req: Request, res: Response) => {
    try {
      console.log("🔧 Production setup requested...");

      // Get or create SaaS admin user
      let saasUser = await storage.getUserByUsername("saas_admin", 0);

      if (!saasUser) {
        console.log("🔧 Creating new SaaS admin user...");
        // Create new SaaS admin
        const hashedPassword = await bcrypt.hash("admin123", 12);
        const userData = {
          username: "saas_admin",
          email: "saas_admin@curaemr.ai",
          passwordHash: hashedPassword,
          firstName: "SaaS",
          lastName: "Administrator",
          role: "admin",
          organizationId: 0, // System-wide
          isActive: true,
          isSaaSOwner: true,
        };

        saasUser = await storage.createUser(userData);
        console.log("✅ Created new SaaS admin user");
      } else {
        console.log("🔧 Updating existing SaaS admin user...");
        // Update existing user to ensure it's properly configured
        const hashedPassword = await bcrypt.hash("admin123", 12);
        await storage.updateUser(saasUser.id, 0, {
          passwordHash: hashedPassword,
          isActive: true,
          isSaaSOwner: true,
        });
        console.log("✅ Updated existing SaaS admin user");
      }

      res.json({
        success: true,
        message: "Production setup completed successfully",
        saasAdmin: {
          id: saasUser.id,
          username: saasUser.username,
          email: saasUser.email,
          isActive: saasUser.isActive,
          isSaaSOwner: saasUser.isSaaSOwner,
        },
      });
    } catch (error) {
      console.error("Production setup error:", error);
      res.status(500).json({
        success: false,
        message: "Production setup failed",
        error: (error as Error).message,
      });
    }
  });

  // SaaS Owner Login
  app.post("/api/saas/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Username and password are required",
        });
      }

      // Check for SaaS owner in users table (organizationId = 0)
      const saasUser = await storage.getUserByUsername(username, 0);

      console.log("SaaS login attempt for username:", username);
      console.log("SaaS user found:", !!saasUser);
      console.log("Is SaaS owner:", saasUser?.isSaaSOwner || false);

      if (!saasUser || !saasUser.isSaaSOwner) {
        console.log("No SaaS owner found with username:", username);
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      console.log("Comparing password for SaaS user:", saasUser.username);
      const isValidPassword = await bcrypt.compare(
        password,
        saasUser.passwordHash,
      );
      console.log("Password valid:", isValidPassword);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      if (!saasUser.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      // Skip last login update to avoid SQL errors - not essential for SaaS login
      console.log(
        `Storage: SaaS user ${saasUser.id} login successful, skipping update`,
      );

      // Generate JWT token
      const token = jwt.sign(
        { id: saasUser.id, username: saasUser.username, isSaaSOwner: true },
        SAAS_JWT_SECRET,
        { expiresIn: "24h" },
      );

      res.json({
        success: true,
        token,
        owner: {
          id: saasUser.id,
          username: saasUser.username,
          email: saasUser.email,
          firstName: saasUser.firstName,
          lastName: saasUser.lastName,
        },
      });
    } catch (error) {
      console.error("SaaS login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // SaaS Dashboard Stats
  app.get(
    "/api/saas/stats",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const stats = await storage.getSaaSStats();
        res.json(stats);
      } catch (error) {
        console.error("Error fetching SaaS stats:", error);
        res.status(500).json({ message: "Failed to fetch stats" });
      }
    },
  );

  // Recent Activity
  app.get(
    "/api/saas/activity",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const activity = await storage.getRecentActivity(page, limit);
        res.json(activity);
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        res.status(500).json({ message: "Failed to fetch activity" });
      }
    },
  );

  // System Alerts
  app.get(
    "/api/saas/alerts",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const alerts = await storage.getSystemAlerts();
        res.json(alerts);
      } catch (error) {
        console.error("Error fetching alerts:", error);
        res.status(500).json({ message: "Failed to fetch alerts" });
      }
    },
  );

  // Subscription Contact Management (PRIVACY COMPLIANT)
  // SaaS owners should only see one subscription contact per organization, not all internal users
  app.get(
    "/api/saas/subscription-contacts",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { search } = req.query;
        // Only get subscription contacts (organization admins who subscribed)
        const contacts = await storage.getSubscriptionContacts(
          search as string,
        );
        res.json(contacts);
      } catch (error) {
        console.error("Error fetching subscription contacts:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch subscription contacts" });
      }
    },
  );

  app.post(
    "/api/saas/subscription-contacts/reset-password",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { contactId } = req.body;
        // Only allow password reset for subscription contacts (org admins), not all users
        const result =
          await storage.resetSubscriptionContactPassword(contactId);
        res.json(result);
      } catch (error) {
        console.error("Error resetting subscription contact password:", error);
        res.status(500).json({ message: "Failed to reset contact password" });
      }
    },
  );

  app.patch(
    "/api/saas/subscription-contacts/status",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { contactId, isActive } = req.body;
        // Only allow status changes for subscription contacts (org admins), not all users
        const result = await storage.updateSubscriptionContactStatus(
          contactId,
          isActive,
        );
        res.json(result);
      } catch (error) {
        console.error("Error updating subscription contact status:", error);
        res.status(500).json({ message: "Failed to update contact status" });
      }
    },
  );

  // Organizations/Customers Management
  // Users Management - Get all users across organizations
  app.get(
    "/api/saas/users",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { search, organizationId } = req.query;

        // Get all users with organization information
        const users = await storage.getAllUsers(
          search as string,
          organizationId as string,
        );
        res.json(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users" });
      }
    },
  );

  // User Status Management
  app.patch(
    "/api/saas/users/status",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { userId, isActive } = req.body;
        const result = await storage.updateUserStatus(userId, isActive);
        res.json(result);
      } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ message: "Failed to update user status" });
      }
    },
  );

  // User Password Reset
  app.post(
    "/api/saas/users/reset-password",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.body;
        const result = await storage.resetUserPassword(userId);
        res.json(result);
      } catch (error) {
        console.error("Error resetting user password:", error);
        res.status(500).json({ message: "Failed to reset user password" });
      }
    },
  );

  // Update User
  app.patch(
    "/api/saas/users/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { firstName, lastName, email, password } = req.body;

        if (!firstName || !lastName || !email) {
          return res.status(400).json({ message: "All fields are required" });
        }

        // Get user from database to get organizationId
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Prepare update data
        const updateData: any = {
          firstName,
          lastName,
          email,
        };

        // Only hash and update password if provided
        if (password && password.trim() !== '') {
          updateData.passwordHash = await bcrypt.hash(password, 10);
        }

        const result = await storage.updateUser(userId, user.organizationId, updateData);

        res.json(result);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Failed to update user" });
      }
    },
  );

  // Delete User
  app.delete(
    "/api/saas/users/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);

        // Get user from database to get organizationId before deletion
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // If user role is patient, also delete the patient record
        if (user.role === 'patient') {
          const patient = await storage.getPatientByUserId(userId, user.organizationId);
          if (patient) {
            await storage.deletePatient(patient.id, user.organizationId);
            console.log(`Deleted patient record ${patient.id} for user ${userId}`);
          }
        }

        // Delete the user
        await storage.deleteUser(userId, user.organizationId);

        res.json({ 
          success: true, 
          message: "User deleted successfully" 
        });
      } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Failed to delete user" });
      }
    },
  );

  app.get(
    "/api/saas/organizations",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const organizations = await storage.getAllOrganizations();
        res.json(organizations);
      } catch (error) {
        console.error("Error fetching organizations:", error);
        res.status(500).json({ message: "Failed to fetch organizations" });
      }
    },
  );

  // Get roles for an organization (SaaS admin access)
  app.get(
    "/api/saas/roles",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { organizationId } = req.query;
        if (!organizationId) {
          return res.status(400).json({ error: "organizationId is required" });
        }
        const roles = await storage.getRolesByOrganization(Number(organizationId));
        res.json(roles);
      } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ message: "Failed to fetch roles" });
      }
    },
  );

  app.get(
    "/api/saas/customers",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { search, status } = req.query;
        const customers = await storage.getAllCustomers(
          search as string,
          status as string,
        );
        res.json(customers);
      } catch (error: any) {
        console.error("Error fetching customers:", error);
        res.status(500).json({
          message: "Failed to fetch customers",
          error: error.message || String(error),
          errorName: error.name,
          errorStack:
            process.env.NODE_ENV === "production" ? undefined : error.stack,
          details: {
            search: req.query.search,
            status: req.query.status,
          },
        });
      }
    },
  );

  app.get(
    "/api/saas/customers/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const customerId = parseInt(req.params.id);
        
        if (isNaN(customerId)) {
          return res.status(400).json({ message: "Invalid customer ID" });
        }

        const customer = await storage.getCustomerById(customerId);
        
        if (!customer) {
          return res.status(404).json({ message: "Customer not found" });
        }

        res.json(customer);
      } catch (error: any) {
        console.error("Error fetching customer:", error);
        res.status(500).json({ 
          message: "Failed to fetch customer",
          error: error.message || String(error)
        });
      }
    },
  );

  app.get(
    "/api/saas/organizations/:id/subscription",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const organizationId = parseInt(req.params.id);
        
        if (isNaN(organizationId)) {
          return res.status(400).json({ message: "Invalid organization ID" });
        }

        const subscription = await storage.getOrganizationSubscription(organizationId);
        
        if (!subscription) {
          return res.status(404).json({ 
            message: "No subscription found for this organization",
            hasActiveSubscription: false 
          });
        }

        res.json({
          ...subscription,
          hasActiveSubscription: subscription.isActive
        });
      } catch (error: any) {
        console.error("Error fetching organization subscription:", error);
        res.status(500).json({ 
          message: "Failed to fetch subscription",
          error: error.message || String(error)
        });
      }
    },
  );

  app.post(
    "/api/saas/customers",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const customerData = req.body;

        // Validate required fields
        if (
          !customerData.name ||
          !customerData.subdomain ||
          !customerData.adminEmail
        ) {
          return res
            .status(400)
            .json({ message: "Name, subdomain, and admin email are required" });
        }

        // Validate and auto-populate country data
        if (customerData.country_code) {
          const { getCountryData, isCountrySupported } = await import('./lib/country-data.js');
          
          if (!isCountrySupported(customerData.country_code)) {
            return res
              .status(400)
              .json({ message: `Invalid or unsupported country code: ${customerData.country_code}` });
          }

          const countryData = getCountryData(customerData.country_code);
          if (countryData) {
            // Auto-populate currency and language if not already provided
            customerData.currency_code = customerData.currency_code || countryData.currency_code;
            customerData.currency_symbol = customerData.currency_symbol || countryData.currency_symbol;
            customerData.language_code = customerData.language_code || countryData.language_code;
          }
        }

        // Check if subdomain already exists
        const existingOrg = await storage.getOrganizationBySubdomain(
          customerData.subdomain,
        );
        if (existingOrg) {
          return res
            .status(400)
            .json({
              message: `Title '${customerData.subdomain}' is already taken. Please choose a different title.`,
            });
        }

        const result = await storage.createCustomerOrganization(customerData);

        // Send welcome email in the background so nginx/proxy timeouts are not hit
        if (result.success && result.adminUser) {
          const { organization, adminUser } = result;
          void sendWelcomeEmail(organization, adminUser)
            .then(() => {
              console.log(
                "📧 ✅ Welcome email sent successfully to:",
                adminUser.email,
              );
            })
            .catch((emailError: any) => {
              console.error("📧 ❌ Failed to send welcome email:", emailError);
            });
        }

        return res.json({ ...result, emailQueued: true });
      } catch (error: any) {
        console.error("❌ Error creating customer:", {
          message: error.message,
          code: error.code,
          detail: error.detail,
          hint: error.hint,
          stack: error.stack
        });

        // Handle specific errors with appropriate status codes
        if (
          error.message?.includes("already taken") ||
          error.message?.includes("already in use")
        ) {
          return res.status(400).json({ message: error.message });
        }

        // Handle database schema errors
        if (error.message?.includes("Database schema error") || 
            error.message?.includes("column") && error.message?.includes("does not exist")) {
          return res.status(500).json({ 
            message: error.message || "Database schema error. Please run the migration script.",
            error: "SCHEMA_ERROR"
          });
        }

        // Handle specific database errors
        if (error.code === "23505" && error.detail?.includes("subdomain")) {
          return res
            .status(400)
            .json({
              message: `Title '${req.body.subdomain}' is already taken. Please choose a different title.`,
            });
        }

        // Return more detailed error message
        const errorMessage = error.message || "Failed to create customer";
        res.status(500).json({ 
          message: errorMessage,
          error: error.code || "UNKNOWN_ERROR"
        });
      }
    },
  );

  app.patch(
    "/api/saas/customers/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const customerId = parseInt(req.params.id);
        const customerData = req.body;

        console.log("Customer update request:", { customerId, customerData });

        // Check if this is a status-only update and redirect to proper endpoint
        if (
          customerData.organizationId &&
          customerData.status &&
          Object.keys(customerData).length === 2
        ) {
          console.log("Redirecting to status update");
          const result = await storage.updateCustomerStatus(
            customerData.organizationId,
            customerData.status,
          );
          return res.json(result);
        }

        // Validate and auto-populate country data if country_code is provided
        if (customerData.country_code) {
          const { getCountryData, isCountrySupported } = await import('./lib/country-data.js');
          
          if (!isCountrySupported(customerData.country_code)) {
            return res
              .status(400)
              .json({ message: `Invalid or unsupported country code: ${customerData.country_code}` });
          }

          const countryData = getCountryData(customerData.country_code);
          if (countryData) {
            // Auto-populate currency and language if not already provided
            customerData.currency_code = customerData.currency_code || countryData.currency_code;
            customerData.currency_symbol = customerData.currency_symbol || countryData.currency_symbol;
            customerData.language_code = customerData.language_code || countryData.language_code;
          }
        }

        const result = await storage.updateCustomerOrganization(
          customerId,
          customerData,
        );
        
        // Broadcast currency update via Socket.IO if currency-related fields were updated
        if (result?.organization && (
          customerData.country_code || 
          customerData.currency_code || 
          customerData.currency_symbol
        )) {
          const org = result.organization;
          
          // Get country name if country code is available
          let countryName = null;
          if (org.country_code) {
            try {
              const { getCountryData } = await import('./lib/country-data.js');
              const countryData = getCountryData(org.country_code);
              countryName = countryData?.country_name || org.country_code;
            } catch (err) {
              console.warn('[Currency Broadcast] Could not get country name:', err);
            }
          }
          
          // Broadcast currency update to all connected clients
          broadcastCurrencyUpdate(app, customerId, {
            organizationId: customerId,
            organizationSubdomain: org.subdomain,
            countryCode: org.country_code,
            countryName: countryName,
            currencyCode: org.currency_code,
            currencySymbol: org.currency_symbol,
          });
        }
        
        res.json(result);
      } catch (error: any) {
        console.error("❌ Error updating customer:", {
          message: error.message,
          code: error.code,
          detail: error.detail,
          hint: error.hint,
          stack: error.stack
        });
        
        // Return more detailed error message
        const errorMessage = error.message || "Failed to update customer";
        res.status(500).json({ 
          message: errorMessage,
          error: error.code || "UNKNOWN_ERROR"
        });
      }
    },
  );

  app.patch(
    "/api/saas/customers/status",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { organizationId, status } = req.body;
        console.log("Status update request:", { organizationId, status });

        if (!organizationId || !status) {
          return res
            .status(400)
            .json({ message: "Organization ID and status are required" });
        }

        const result = await storage.updateCustomerStatus(
          organizationId,
          status,
        );
        res.json(result);
      } catch (error) {
        console.error("Error updating customer status:", error);
        res.status(500).json({ message: "Failed to update customer status" });
      }
    },
  );

  app.post(
    "/api/saas/organizations/:id/connect-stripe",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const organizationId = parseInt(req.params.id);
        
        if (isNaN(organizationId)) {
          return res.status(400).json({ message: "Invalid organization ID" });
        }

        // Get organization details from database
        const organization = await storage.getOrganization(organizationId);
        if (!organization) {
          return res.status(404).json({ message: "Organization not found" });
        }

        // Initialize Stripe first (needed for both new and existing accounts)
        const Stripe = (await import('stripe')).default;
        const stripe = process.env.STRIPE_SECRET_KEY
          ? new Stripe(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2025-07-30.basil',
            })
          : null;

        if (!stripe) {
          return res.status(500).json({ message: "Stripe is not configured" });
        }

        // Get platform's country from Stripe account to match connected account country
        // This prevents cross-border account creation errors
        let platformCountry = process.env.STRIPE_ACCOUNT_COUNTRY || null;
        if (!platformCountry) {
          try {
            const platformAccount = await stripe.accounts.retrieve();
            platformCountry = platformAccount.country || 'GB'; // Default to GB if not found
            console.log('🌍 [STRIPE-CONNECT] Platform country detected:', platformCountry);
          } catch (accountError: any) {
            console.warn('⚠️ [STRIPE-CONNECT] Could not retrieve platform account, defaulting to GB:', accountError.message);
            platformCountry = 'GB'; // Default fallback
          }
        }
        console.log('🌍 [STRIPE-CONNECT] Using country for connected account:', platformCountry);

        // Check if organization already has a Stripe account in the database
        console.log('💳 [STRIPE-CONNECT] Checking existing Stripe account for organization:', organizationId, 'Current stripeAccountId:', organization.stripeAccountId);
        
        // If organization already has a Stripe account, generate a new onboarding link
        if (organization.stripeAccountId) {
          console.log('⚠️ [STRIPE-CONNECT] Organization already has a Stripe account:', organization.stripeAccountId);
          
          // Generate a fresh onboarding link for existing account
          const baseUrl = process.env.FRONTEND_URL || req.protocol + '://' + req.get('host');
          const accountLink = await stripe.accountLinks.create({
            account: organization.stripeAccountId,
            refresh_url: `${baseUrl}/saas/customers?stripe_refresh=true&organization_id=${organizationId}`,
            return_url: `${baseUrl}/saas/customers?stripe_success=true&organization_id=${organizationId}`,
            type: "account_onboarding",
          });

          console.log('🔗 [STRIPE-CONNECT] Onboarding link generated for existing account:', organization.stripeAccountId);

          return res.json({
            success: true,
            stripeAccountId: organization.stripeAccountId,
            stripeStatus: organization.stripeStatus || 'pending',
            onboardingUrl: accountLink.url, // Return onboarding URL for immediate redirect
            message: 'Onboarding link generated. Please complete Stripe setup.'
          });
        }

        console.log('💳 [STRIPE-CONNECT] Creating Stripe Express account for organization:', organizationId);
        console.log('💳 [STRIPE-CONNECT] Stripe client initialized:', !!stripe);
        console.log('💳 [STRIPE-CONNECT] STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
        console.log('💳 [STRIPE-CONNECT] STRIPE_SECRET_KEY prefix:', process.env.STRIPE_SECRET_KEY?.substring(0, 7));
        
        try {
          console.log('🔧 [STRIPE-CONNECT] Creating account with capabilities:', {
            card_payments: { requested: true },
            transfers: { requested: true },
          });
          
          const stripeAccount = await stripe.accounts.create({
            type: "express",
            email: organization.email,
            country: platformCountry, // Use platform's country to avoid cross-border restrictions
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            metadata: {
              organization_name: organization.name,
              subdomain: organization.subdomain,
              organization_id: organizationId.toString(),
            },
          });
          
          console.log('✅ [STRIPE-CONNECT] Account created successfully:', stripeAccount.id);

          // Update organization with Stripe account ID and status
          await db.update(organizations)
            .set({
              stripeAccountId: stripeAccount.id,
              stripeStatus: 'pending', // Set to pending until onboarding is complete
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, organizationId));

          console.log('✅ [STRIPE-CONNECT] Stripe account created and linked:', stripeAccount.id);

          // Generate onboarding link for the organization to complete Stripe setup
          const baseUrl = process.env.FRONTEND_URL || req.protocol + '://' + req.get('host');
          const accountLink = await stripe.accountLinks.create({
            account: stripeAccount.id,
            refresh_url: `${baseUrl}/saas/customers?stripe_refresh=true&organization_id=${organizationId}`,
            return_url: `${baseUrl}/saas/customers?stripe_success=true&organization_id=${organizationId}`,
            type: "account_onboarding",
          });

          console.log('🔗 [STRIPE-CONNECT] Onboarding link generated for account:', stripeAccount.id);

          res.json({
            success: true,
            stripeAccountId: stripeAccount.id,
            stripeStatus: 'pending',
            onboardingUrl: accountLink.url, // Return onboarding URL for immediate redirect
            message: 'Stripe account created successfully. Please complete onboarding.'
          });
        } catch (stripeError: any) {
          console.error("❌ [STRIPE-CONNECT] Full error details:", {
            message: stripeError.message,
            type: stripeError.type,
            code: stripeError.code,
            statusCode: stripeError.statusCode,
            rawError: JSON.stringify(stripeError, Object.getOwnPropertyNames(stripeError), 2)
          });
          
          // Check if error is SPECIFICALLY about Connect not being enabled
          // Only flag as "Connect not enabled" for very specific error messages
          const isConnectNotEnabledError = 
            stripeError.message?.includes('signed up for Connect') ||
            stripeError.message?.includes('You can only create new accounts if you\'ve signed up for Connect') ||
            (stripeError.code === 'account_invalid' && 
             stripeError.message?.includes('Connect') && 
             !stripeError.message?.includes('restricted') &&
             !stripeError.message?.includes('verification'));
          
          if (isConnectNotEnabledError) {
            console.error('❌ [STRIPE-CONNECT] Stripe Connect not enabled. Error details:', {
              message: stripeError.message,
              type: stripeError.type,
              code: stripeError.code,
            });
            return res.status(400).json({ 
              message: "Stripe Connect is not enabled. Please enable Stripe Connect in your Stripe Dashboard.",
              error: "Stripe Connect not enabled",
              errorCode: stripeError.code || stripeError.type,
              helpUrl: "https://dashboard.stripe.com/settings/connect",
              documentationUrl: "https://stripe.com/docs/connect",
              details: "To enable Stripe Connect:\n1. Go to https://dashboard.stripe.com/settings/connect\n2. Click 'Get started' or 'Activate Connect'\n3. Complete the onboarding process\n4. Once enabled, you can create Express accounts via API\n\nNote: Stripe Connect must be enabled on your main Stripe account (the one with your API keys) before you can create connected accounts for organizations.",
              steps: [
                "Visit https://dashboard.stripe.com/settings/connect",
                "Click 'Get started' or 'Activate Connect'",
                "Complete the Stripe Connect onboarding",
                "Return here and try creating the Stripe account again"
              ],
              stripeError: stripeError.message
            });
          }
          
          // Generic error handling - return actual error for debugging
          console.error('❌ [STRIPE-CONNECT] Generic/other error (not Connect-related):', {
            message: stripeError.message,
            type: stripeError.type,
            code: stripeError.code,
            statusCode: stripeError.statusCode,
          });
          
          // Return the actual error so user can see what went wrong
          // This helps debug issues when Connect IS enabled but something else fails
          res.status(500).json({ 
            message: "Failed to create Stripe account",
            error: stripeError.message || String(stripeError),
            errorCode: stripeError.code || stripeError.type,
            stripeError: stripeError.message,
            debugInfo: {
              type: stripeError.type,
              code: stripeError.code,
              statusCode: stripeError.statusCode,
              note: "Check server console logs for full error details. If you see accounts in Stripe Dashboard, Connect is enabled and this is a different issue."
            }
          });
        }
      } catch (error: any) {
        console.error("Error connecting Stripe:", error);
        res.status(500).json({ 
          message: "Failed to connect Stripe account",
          error: error.message || String(error)
        });
      }
    },
  );

  app.delete(
    "/api/saas/customers/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const customerId = parseInt(req.params.id);
        console.log("Deleting customer:", customerId);

        const result = await storage.deleteCustomerOrganization(customerId);
        res.json(result);
      } catch (error) {
        console.error("Error deleting customer:", error);
        res.status(500).json({ message: "Failed to delete customer" });
      }
    },
  );

  app.delete(
    "/api/saas/billing/payments/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const paymentId = parseInt(req.params.id);
        if (isNaN(paymentId)) {
          return res.status(400).json({ error: "Invalid payment ID" });
        }
        const deleted = await storage.deletePayment(paymentId);
        if (!deleted) {
          return res.status(404).json({ error: "Payment not found" });
        }
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting payment:", error);
        res.status(500).json({ error: "Failed to delete payment" });
      }
    },
  );

  // Packages Management
  app.get(
    "/api/saas/packages",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const packages = await storage.getAllPackages();
        res.json(packages);
      } catch (error) {
        console.error("Error fetching packages:", error);
        res.status(500).json({ message: "Failed to fetch packages" });
      }
    },
  );

  app.get(
    "/api/saas/organizations/:id/delete-preview",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const organizationId = parseInt(req.params.id);
        if (Number.isNaN(organizationId)) {
          return res.status(400).json({ message: "Invalid organization ID" });
        }
        const preview = await storage.getOrganizationDeletionPreview(organizationId);
        res.json(preview);
      } catch (error) {
        console.error("Error fetching organization delete preview:", error);
        res.status(500).json({ message: "Failed to fetch delete preview" });
      }
    },
  );

  app.delete(
    "/api/saas/organizations/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const organizationId = parseInt(req.params.id);
        if (Number.isNaN(organizationId)) {
          return res.status(400).json({ message: "Invalid organization ID" });
        }
        console.log(`[DELETE-ORG] Starting deletion for organization ID: ${organizationId}`);
        const { success, deletedCounts } = await storage.deleteOrganizationAndData(organizationId);
        if (!success) {
          console.error(`[DELETE-ORG] Deletion returned success=false for organization ${organizationId}`);
          return res.status(500).json({ message: "Failed to delete organization data" });
        }
        console.log(`[DELETE-ORG] Successfully deleted organization ${organizationId}`, deletedCounts);
        res.json({ success: true, deletedCounts });
      } catch (error: any) {
        console.error("[DELETE-ORG] Error deleting organization:", error);
        console.error("[DELETE-ORG] Error details:", {
          message: error?.message,
          code: error?.code,
          detail: error?.detail,
          constraint: error?.constraint,
          table: error?.table,
        });
        const errorMessage = error?.message || "Failed to delete organization";
        const errorDetail = error?.detail || error?.constraint || "";
        res.status(500).json({ 
          message: errorMessage,
          detail: errorDetail,
          error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        });
      }
    },
  );

  // Get website-visible packages (public endpoint for pricing section)
  app.get("/api/website/packages", async (req: Request, res: Response) => {
    try {
      const packages = await storage.getWebsiteVisiblePackages();
      res.json(packages);
    } catch (error) {
      console.error("Error getting website packages:", error);
      res.status(500).json({ message: "Failed to get website packages" });
    }
  });

  app.post(
    "/api/saas/packages",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const packageData = req.body;
        const result = await storage.createPackage(packageData);
        res.json(result);
      } catch (error) {
        console.error("Error creating package:", error);
        res.status(500).json({ message: "Failed to create package" });
      }
    },
  );

  app.put(
    "/api/saas/packages/order",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { order } = req.body;
        if (!Array.isArray(order)) {
          return res.status(400).json({ message: "Order must be an array" });
        }
        const sanitized = order.map((entry: any) => ({
          id: Number(entry.id),
          displayOrder: Number(entry.displayOrder),
        }));
        await storage.reorderPackages(sanitized);
        res.json({ success: true });
      } catch (error) {
        console.error("Error reordering packages:", error);
        const message = (error instanceof Error ? error.message : "") as string;
        if (message.toLowerCase().includes("display_order")) {
          return res.status(500).json({
            message: "Missing database column `display_order`. Please run the migration before reordering packages.",
          });
        }
        res.status(500).json({ message: "Failed to reorder packages" });
      }
    },
  );

  app.put(
    "/api/saas/packages/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const packageId = parseInt(req.params.id);
        const packageData = req.body;
        const result = await storage.updatePackage(packageId, packageData);
        res.json(result);
      } catch (error) {
        console.error("Error updating package:", error);
        res.status(500).json({ message: "Failed to update package" });
      }
    },
  );

  app.delete(
    "/api/saas/packages/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const packageId = parseInt(req.params.id);
        const result = await storage.deletePackage(packageId);
        res.json(result);
      } catch (error) {
        console.error("Error deleting package:", error);
        res.status(500).json({ message: "Failed to delete package" });
      }
    },
  );

  // ============================================
  // COMPREHENSIVE BILLING & PAYMENT MANAGEMENT
  // ============================================

  // Get billing statistics
  app.get(
    "/api/saas/billing/stats",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { dateRange } = req.query;
        const stats = await storage.getBillingStats(dateRange as string);
        res.json(stats);
      } catch (error) {
        console.error("Error fetching billing stats:", error);
        res.status(500).json({ message: "Failed to fetch billing statistics" });
      }
    },
  );

  // Get billing data (payments/invoices) - Updated endpoint
  app.get(
    "/api/saas/billing/data",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { search, dateRange } = req.query;
        const billingData = await storage.getBillingData(
          search as string,
          dateRange as string,
        );
        res.json(billingData);
      } catch (error) {
        console.error("Error fetching billing data:", error);
        res.status(500).json({ message: "Failed to fetch billing data" });
      }
    },
  );

  // Legacy billing endpoint for backwards compatibility
  app.get(
    "/api/saas/billing",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { search, dateRange } = req.query;
        const billingData = await storage.getBillingData(
          search as string,
          dateRange as string,
        );
        res.json(billingData);
      } catch (error) {
        console.error("Error fetching billing data:", error);
        res.status(500).json({ message: "Failed to fetch billing data" });
      }
    },
  );

  // Get overdue invoices
  app.get(
    "/api/saas/billing/overdue",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const overdueInvoices = await storage.getOverdueInvoices();
        res.json(overdueInvoices);
      } catch (error) {
        console.error("Error fetching overdue invoices:", error);
        res.status(500).json({ message: "Failed to fetch overdue invoices" });
      }
    },
  );

  // Create a new payment
  app.post(
    "/api/saas/billing/payments",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const paymentData = req.body;

        // Validate required fields
        if (
          !paymentData.organizationId ||
          !paymentData.amount ||
          !paymentData.paymentMethod
        ) {
          return res.status(400).json({
            message: "Organization ID, amount, and payment method are required",
          });
        }

        // Ensure dates are properly formatted
        const currentTime = new Date();
        const potentialCreatedAt = paymentData.createdAt ? new Date(paymentData.createdAt) : null;
        const clientCreatedAt =
          potentialCreatedAt && !Number.isNaN(potentialCreatedAt.getTime())
            ? potentialCreatedAt
            : null;
        const createdAt = clientCreatedAt || currentTime;
        const dueDateObj = paymentData.dueDate
          ? new Date(paymentData.dueDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Set payment data with proper date handling
        const processedPaymentData = {
          organizationId: parseInt(paymentData.organizationId),
          invoiceNumber: paymentData.invoiceNumber || `INV-${Date.now()}`,
          amount: paymentData.amount.toString(),
          currency: paymentData.currency || "GBP",
          paymentMethod: paymentData.paymentMethod,
          paymentStatus: paymentData.paymentStatus || "pending",
          description:
            paymentData.description || "Payment for Cura EMR Services",
          dueDate: dueDateObj,
          paymentDate:
            paymentData.paymentStatus === "completed" ? currentTime : null,
          periodStart: currentTime,
          periodEnd: new Date(currentTime.getTime() + 30 * 24 * 60 * 60 * 1000),
          paymentProvider: paymentData.paymentMethod,
          metadata: paymentData.metadata || {},
          createdAt,
          updatedAt: createdAt,
        };

        const payment = await storage.createSaasPayment(processedPaymentData);

        res.status(201).json(payment);
      } catch (error) {
        console.error("Error creating payment:", error);
        res.status(500).json({ message: "Failed to create payment" });
      }
    },
  );

  // Update payment status
  app.put(
    "/api/saas/billing/payments/:paymentId/status",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { paymentId } = req.params;
        const { status, transactionId } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        // Validate status values
        const validStatuses = [
          "pending",
          "completed",
          "failed",
          "cancelled",
          "refunded",
        ];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
          });
        }

        const payment = await storage.updatePaymentStatus(
          parseInt(paymentId),
          status,
          transactionId,
        );

        res.json(payment);
      } catch (error) {
        console.error("Error updating payment status:", error);
        res.status(500).json({ message: "Failed to update payment status" });
      }
    },
  );

  // Create invoice
  app.post(
    "/api/saas/billing/invoices",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const invoiceData = req.body;

        if (!invoiceData.organizationId || !invoiceData.amount) {
          return res.status(400).json({
            message: "Organization ID and amount are required",
          });
        }

        const invoice = await storage.createInvoice({
          ...invoiceData,
          invoiceNumber: invoiceData.invoiceNumber || `INV-${Date.now()}`,
          currency: invoiceData.currency || "GBP",
          status: invoiceData.status || "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        res.status(201).json(invoice);
      } catch (error) {
        console.error("Error creating invoice:", error);
        res.status(500).json({ message: "Failed to create invoice" });
      }
    },
  );

  // Suspend unpaid subscriptions
  app.post(
    "/api/saas/billing/suspend-unpaid",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        await storage.suspendUnpaidSubscriptions();
        res.json({
          success: true,
          message: "Unpaid subscriptions have been suspended successfully",
        });
      } catch (error) {
        console.error("Error suspending unpaid subscriptions:", error);
        res
          .status(500)
          .json({ message: "Failed to suspend unpaid subscriptions" });
      }
    },
  );

  // Monthly recurring revenue calculation endpoint
  app.get(
    "/api/saas/billing/mrr",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const mrr = await storage.calculateMonthlyRecurring();
        res.json({
          monthlyRecurringRevenue: mrr,
          currency: "GBP",
          calculatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error calculating MRR:", error);
        res
          .status(500)
          .json({ message: "Failed to calculate monthly recurring revenue" });
      }
    },
  );

  // Generate payment report (CSV export)
  app.get(
    "/api/saas/billing/export",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const { dateRange, format = "csv" } = req.query;

        // Get billing data for export
        const billingData = await storage.getBillingData(
          "",
          dateRange as string,
        );

        if (format === "csv") {
          // Generate CSV content
          const headers = [
            "Invoice Number",
            "Customer",
            "Amount",
            "Currency",
            "Payment Method",
            "Status",
            "Created Date",
            "Due Date",
            "Description",
          ];

          let csvContent = headers.join(",") + "\n";

          billingData.invoices.forEach((invoice: any) => {
            const row = [
              invoice.invoiceNumber,
              invoice.organizationName || "Unknown",
              invoice.amount,
              invoice.currency,
              invoice.paymentMethod.replace("_", " "),
              invoice.paymentStatus,
              new Date(invoice.createdAt).toLocaleDateString(),
              invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString()
                : "",
              invoice.description || "",
            ];
            csvContent += row.map((field) => `"${field}"`).join(",") + "\n";
          });

          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="billing-report-${new Date().toISOString().split("T")[0]}.csv"`,
          );
          res.send(csvContent);
        } else {
          res.status(400).json({ message: "Unsupported export format" });
        }
      } catch (error) {
        console.error("Error exporting billing data:", error);
        res.status(500).json({ message: "Failed to export billing data" });
      }
    },
  );

  // Settings Management
  app.get(
    "/api/saas/settings",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const settings = await storage.getSaaSSettings();
        res.json(settings);
      } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ message: "Failed to fetch settings" });
      }
    },
  );

  app.put(
    "/api/saas/settings",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const settings = req.body;
        const result = await storage.updateSaaSSettings(settings);
        res.json(result);
      } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({ message: "Failed to update settings" });
      }
    },
  );

  app.post(
    "/api/saas/settings/test-email",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const result = await storage.testEmailSettings();
        res.json(result);
      } catch (error) {
        console.error("Error testing email:", error);
        res.status(500).json({ message: "Failed to test email" });
      }
    },
  );

  app.get(
    "/api/saas/billing/subscriptions",
    verifySaaSToken,
    async (_req: Request, res: Response) => {
      try {
        const subscriptions = await storage.getAllSaaSSubscriptions();
        res.json(subscriptions);
      } catch (error) {
        console.error("Error fetching subscriptions:", error);
        res.status(500).json({ error: "Failed to fetch subscriptions" });
      }
    },
  );

  app.post(
    "/api/saas/billing/subscriptions",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const data = req.body;
        if (!data.organizationId || !data.packageId) {
          return res.status(400).json({ error: "organizationId and packageId are required" });
        }

        const subscription = await storage.createSaaSSubscription({
          organizationId: Number(data.organizationId),
          packageId: Number(data.packageId),
          status: data.status || "active",
          paymentStatus: data.paymentStatus || "pending",
          currentPeriodStart: data.currentPeriodStart ? new Date(data.currentPeriodStart) : undefined,
          currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : undefined,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          details: data.details || null,
          maxUsers: data.maxUsers ?? null,
          maxPatients: data.maxPatients ?? null,
        });

        res.json({ success: true, subscription });
      } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({ error: "Failed to create subscription" });
      }
    },
  );

  app.patch(
    "/api/saas/billing/subscriptions/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const subscriptionId = parseInt(req.params.id);
        if (isNaN(subscriptionId)) {
          return res.status(400).json({ error: "Invalid subscription ID" });
        }

        const updates: any = { ...req.body };
        if (updates.currentPeriodStart) {
          updates.currentPeriodStart = new Date(updates.currentPeriodStart);
        }
        if (updates.currentPeriodEnd) {
          updates.currentPeriodEnd = new Date(updates.currentPeriodEnd);
        }
        if (updates.expiresAt) {
          updates.expiresAt = new Date(updates.expiresAt);
        }

        const updated = await storage.updateSaaSSubscription(subscriptionId, updates);
        if (!updated) {
          return res.status(404).json({ error: "Subscription not found" });
        }

        res.json({ success: true, updated });
      } catch (error) {
        console.error("Error updating subscription:", error);
        res.status(500).json({ error: "Failed to update subscription" });
      }
    },
  );

  app.delete(
    "/api/saas/billing/subscriptions/:id",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const subscriptionId = parseInt(req.params.id);
        if (isNaN(subscriptionId)) {
          return res.status(400).json({ error: "Invalid subscription ID" });
        }

        const deleted = await storage.deleteSaaSSubscription(subscriptionId);
        if (!deleted) {
          return res.status(404).json({ error: "Subscription not found" });
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting subscription:", error);
        res.status(500).json({ error: "Failed to delete subscription" });
      }
    },
  );

  app.post(
    "/api/saas/billing/reminders/:subscriptionId",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const subscriptionId = parseInt(req.params.subscriptionId);
        const { level } = req.body as { level?: string };
        if (isNaN(subscriptionId)) {
          return res.status(400).json({ error: "Invalid subscription ID" });
        }
        if (!level) {
          return res.status(400).json({ error: "Reminder level is required" });
        }

        await sendReminderForSubscription(subscriptionId, level);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error sending manual reminder:", error);
        res.status(500).json({ error: "Failed to send reminder", message: error.message });
      }
    },
  );

  app.post(
    "/api/saas/billing/payments/:id/share",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const paymentId = parseInt(req.params.id);
        const { email } = req.body;

        if (isNaN(paymentId)) {
          return res.status(400).json({ error: "Invalid payment ID" });
        }

        if (!email || typeof email !== "string") {
          return res.status(400).json({ error: "Recipient email is required" });
        }

        const [payment] = await db
          .select({
            id: saasPayments.id,
            invoiceNumber: saasPayments.invoiceNumber,
            amount: saasPayments.amount,
            currency: saasPayments.currency,
            description: saasPayments.description,
            paymentMethod: saasPayments.paymentMethod,
            paymentStatus: saasPayments.paymentStatus,
            dueDate: saasPayments.dueDate,
            paymentCreatedAt: saasPayments.createdAt,
            organizationName: organizations.name,
            organizationEmail: organizations.email,
            organizationRegion: organizations.region,
            invoiceAmount: saasInvoices.amount,
            invoiceCurrency: saasInvoices.currency,
            invoiceIssueDate: saasInvoices.issueDate,
            invoiceDueDate: saasInvoices.dueDate,
            invoicePeriodStart: saasInvoices.periodStart,
            invoicePeriodEnd: saasInvoices.periodEnd,
            invoiceLineItems: saasInvoices.lineItems,
          })
          .from(saasPayments)
          .leftJoin(organizations, eq(saasPayments.organizationId, organizations.id))
          .leftJoin(saasInvoices, eq(saasInvoices.invoiceNumber, saasPayments.invoiceNumber))
          .where(eq(saasPayments.id, paymentId))
          .limit(1);

        if (!payment) {
          return res.status(404).json({ error: "Payment not found" });
        }

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const formatCurrency = (value: number) =>
          new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: (payment.currency || "GBP") as "GBP",
          }).format(value);
        const formatDate = (value?: Date | string | null) => {
          const dateValue = value ? new Date(value) : new Date();
          return dateValue.toLocaleDateString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        };
        const drawRightAligned = (text: string, x: number, y: number, size: number) => {
          const textWidth = font.widthOfTextAtSize(text, size);
          page.drawText(text, { x: x - textWidth, y, size, font });
        };

        const vatRate = 0.2;
        const baseAmount = Number(payment.invoiceAmount ?? payment.amount ?? 0);
        const vatAmount = Number((baseAmount * vatRate).toFixed(2));
        const totalAmount = Number((baseAmount + vatAmount).toFixed(2));

        const lineItems =
          Array.isArray(payment.invoiceLineItems) && payment.invoiceLineItems.length > 0
            ? payment.invoiceLineItems
            : [
                {
                  description: payment.description || "Cura EMR Software Subscription",
                  quantity: 1,
                  rate: baseAmount,
                  amount: baseAmount,
                },
              ];
        const logoPath = path.join(process.cwd(), "client", "public", "cura-logo-chatbot.png");
        let logoImage: undefined | any;
        if (fs.existsSync(logoPath)) {
          try {
            const logoBytes = fs.readFileSync(logoPath);
            logoImage = await pdfDoc.embedPng(logoBytes);
          } catch (error) {
            console.warn("Failed to embed invoice logo", error);
          }
        }

        const margin = 45;
        const headerTop = 800;
        const logoSize = 48;
        if (logoImage) {
          const logoScale = logoSize / logoImage.width;
          const logoHeight = logoImage.height * logoScale;
          page.drawImage(logoImage, {
            x: margin,
            y: headerTop - logoHeight + 6,
            width: logoSize,
            height: logoHeight,
          });
        }
        const brandTextX = margin + (logoImage ? logoSize + 12 : 0);
        const brandTitleY = headerTop - 6;
        page.drawText("Cura Software Limited", {
          x: brandTextX,
          y: brandTitleY,
          size: 18,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.4),
        });
        page.drawText("Healthcare Management Solutions", {
          x: brandTextX,
          y: brandTitleY - 18,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        const invoiceInfoX = 420;
        page.drawText("INVOICE", {
          x: invoiceInfoX,
          y: headerTop + 4,
          size: 24,
          font: fontBold,
          color: rgb(0.05, 0.1, 0.3),
        });
        page.drawText(`Invoice #${payment.invoiceNumber}`, {
          x: invoiceInfoX,
          y: headerTop - 10,
          size: 11,
          font,
        });
        page.drawText(`Date: ${formatDate(payment.invoiceIssueDate || payment.paymentCreatedAt)}`, {
          x: invoiceInfoX,
          y: headerTop - 24,
          size: 11,
          font,
        });
        page.drawText(
          `Due: ${formatDate(payment.invoiceDueDate || payment.dueDate || payment.paymentCreatedAt)}`,
          {
            x: invoiceInfoX,
            y: headerTop - 38,
            size: 11,
            font,
          },
        );

        const blockY = 730;
        const blockGap = 150;
        const lineSpacing = 15;
        const paintBlock = (title: string, lines: string[], x: number) => {
          page.drawText(title, { x, y: blockY, size: 12, font: fontBold });
          lines.forEach((line, index) => {
            page.drawText(line, {
              x,
              y: blockY - lineSpacing * (index + 1),
              size: 10,
              font,
            });
          });
        };

        paintBlock(
          "From:",
          [
            "Cura Software Limited",
            "Company Registration: 16556912",
            "Ground Floor Unit 2",
            "Drayton Court, Drayton Road",
            "Solihull, England B90 4NG",
            "United Kingdom",
            "Email: billing@curaemr.ai",
            "Phone: +44 (0) 121 456 7890",
          ],
          margin,
        );

        paintBlock(
          "Bill To:",
          [
            payment.organizationName,
            payment.organizationEmail,
            payment.organizationRegion || "United Kingdom",
          ].filter(Boolean) as string[],
          margin + blockGap,
        );

        paintBlock(
          "Payment Info:",
          [
            `Status: ${payment.paymentStatus}`,
            `Method: ${payment.paymentMethod || "Unknown"}`,
          ],
          margin + blockGap * 2,
        );

        const tableStartY = 550;
        const headersY = tableStartY + 20;
        const columnPositions = {
          description: margin,
          qty: margin + 270,
          unit: margin + 330,
          total: margin + 430,
        };
        page.drawText("Description", { x: columnPositions.description, y: headersY, size: 11, font: fontBold });
        page.drawText("Qty", { x: columnPositions.qty, y: headersY, size: 11, font: fontBold });
        page.drawText("Unit Price", { x: columnPositions.unit, y: headersY, size: 11, font: fontBold });
        page.drawText("Total", { x: columnPositions.total, y: headersY, size: 11, font: fontBold });

        let currentY = headersY - 20;
        lineItems.forEach((item: any) => {
          page.drawText(String(item.description), { x: columnPositions.description, y: currentY, size: 10, font });
          page.drawText(String(item.quantity), { x: columnPositions.qty, y: currentY, size: 10, font });
          page.drawText(formatCurrency(Number(item.rate)), {
            x: columnPositions.unit,
            y: currentY,
            size: 10,
            font,
          });
          page.drawText(formatCurrency(Number(item.amount)), {
            x: columnPositions.total,
            y: currentY,
            size: 10,
            font,
          });
          currentY -= 18;
        });

        const pageWidth = 595;
        const minSummaryY = tableStartY - 150;
        const summaryBoxY = Math.min(currentY - 40, minSummaryY);
        const boxWidth = 170;
        const boxHeight = 70;
        const boxX = pageWidth - margin - boxWidth;
        const dividerY = summaryBoxY + boxHeight + 20;
        page.drawLine({
          start: { x: margin, y: dividerY },
          end: { x: pageWidth - margin, y: dividerY },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8),
        });
        page.drawRectangle({
          x: boxX,
          y: summaryBoxY,
          width: boxWidth,
          height: boxHeight,
          borderWidth: 0.5,
          borderColor: rgb(0.8, 0.8, 0.8),
          color: rgb(0.97, 0.97, 0.97),
        });
        page.drawText("Subtotal", { x: boxX + 12, y: summaryBoxY + 50, size: 10, font });
        drawRightAligned(formatCurrency(baseAmount), boxX + boxWidth - 12, summaryBoxY + 50, 10);
        page.drawText("VAT (20%)", { x: boxX + 12, y: summaryBoxY + 30, size: 10, font });
        drawRightAligned(formatCurrency(vatAmount), boxX + boxWidth - 12, summaryBoxY + 30, 10);
        page.drawText("Total Amount", { x: boxX + 12, y: summaryBoxY + 10, size: 11, font: fontBold });
        drawRightAligned(formatCurrency(totalAmount), boxX + boxWidth - 12, summaryBoxY + 10, 11);

        page.drawText("Payment Terms", { x: margin, y: summaryBoxY - 40, size: 12, font: fontBold });
        const terms = [
          "• Payment is due within 30 days of invoice date",
          "• Late payment charges may apply",
          "• For queries contact billing@curaemr.ai",
          "• Online payments available via customer portal",
        ];
        terms.forEach((term, index) => {
          page.drawText(term, {
            x: margin,
            y: summaryBoxY - 60 - index * 16,
            size: 10,
            font,
          });
        });

        const pdfBytes = await pdfDoc.save();

        await emailService.sendEmail({
          to: email,
          subject: `Invoice ${payment.invoiceNumber} from Cura EMR`,
          text: `Hello,

Attached is invoice ${payment.invoiceNumber} for ${payment.organizationName}.`,
          attachments: [
            {
              filename: `${payment.invoiceNumber}.pdf`,
              content: Buffer.from(pdfBytes),
              contentType: "application/pdf",
            },
          ],
        });

        res.json({ success: true });
      } catch (error: any) {
        console.error("Error sharing invoice:", error);
        res.status(500).json({ error: "Failed to share invoice" });
      }
    },
  );

  // Check Stripe Connect status
  app.get(
    "/api/saas/stripe/connect-status",
    verifySaaSToken,
    async (req: Request, res: Response) => {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = process.env.STRIPE_SECRET_KEY
          ? new Stripe(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2025-07-30.basil',
            })
          : null;

        if (!stripe) {
          return res.status(500).json({ 
            enabled: false,
            message: "Stripe is not configured",
            error: "STRIPE_SECRET_KEY environment variable is not set"
          });
        }

        // Try to retrieve the main account to check if Connect is available
        try {
          const account = await stripe.accounts.retrieve();
          
          // Try to list connected accounts (this will fail if Connect is not enabled)
          try {
            await stripe.accounts.list({ limit: 1 });
            return res.json({
              enabled: true,
              message: "Stripe Connect is enabled",
              accountId: account.id,
              accountType: account.type
            });
          } catch (listError: any) {
            // If listing fails with Connect-related error, Connect is not enabled
            if (listError.message?.includes('Connect') || 
                listError.code === 'account_invalid' ||
                listError.type === 'invalid_request_error') {
              return res.json({
                enabled: false,
                message: "Stripe Connect is not enabled",
                error: listError.message,
                helpUrl: "https://dashboard.stripe.com/settings/connect",
                steps: [
                  "Visit https://dashboard.stripe.com/settings/connect",
                  "Click 'Get started' or 'Activate Connect'",
                  "Complete the Stripe Connect onboarding"
                ]
              });
            }
            // If it's a different error, Connect might be enabled but there's another issue
            return res.json({
              enabled: true,
              message: "Stripe Connect appears to be enabled (but encountered an error)",
              accountId: account.id,
              warning: listError.message
            });
          }
        } catch (accountError: any) {
          return res.status(500).json({
            enabled: false,
            message: "Failed to retrieve Stripe account",
            error: accountError.message
          });
        }
      } catch (error: any) {
        console.error("Error checking Stripe Connect status:", error);
        return res.status(500).json({
          enabled: false,
          message: "Failed to check Stripe Connect status",
          error: error.message || String(error)
        });
      }
    }
  );

  // ============================================
  // SaaS Admin - Cancel Subscription Endpoint
  // ============================================
  // Allows SaaS admins to cancel any organization's subscription
  // NOTE: Using /api/saas/admin/billing/cancel to avoid conflict with regular user route
  app.post(
    "/api/saas/admin/billing/cancel",
    verifySaaSToken,
    async (req: SaaSRequest, res: Response) => {
      try {
        const stripe = process.env.STRIPE_SECRET_KEY
          ? new Stripe(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2025-07-30.basil',
            })
          : null;

        if (!stripe) {
          return res.status(500).json({ error: "Stripe is not configured" });
        }

        const { subscriptionId, immediate, organizationId } = req.body;

        if (!subscriptionId) {
          return res.status(400).json({ error: "Missing subscription ID" });
        }

        // Get subscription from database
        const [currentSubscription] = await db
          .select()
          .from(saasSubscriptions)
          .where(eq(saasSubscriptions.id, subscriptionId))
          .limit(1);

        if (!currentSubscription) {
          return res.status(404).json({ error: "Subscription not found" });
        }

        // If organizationId is provided, verify it matches
        if (organizationId && currentSubscription.organizationId !== organizationId) {
          return res.status(403).json({ error: "Subscription does not belong to the specified organization" });
        }

        if (!currentSubscription.stripeSubscriptionId) {
          return res.status(400).json({ error: "Subscription does not have Stripe ID" });
        }

        if (immediate === true) {
          // Immediate cancellation
          await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId);

          // Update database - downgrade to Basic (free) plan
          const [basicPlan] = await db
            .select()
            .from(saasPackages)
            .where(eq(saasPackages.name, "Basic"))
            .limit(1);

          // Get old package for history
          const [oldPackage] = currentSubscription.packageId
            ? await db
                .select()
                .from(saasPackages)
                .where(eq(saasPackages.id, currentSubscription.packageId))
                .limit(1)
            : [null];

          if (basicPlan) {
            await db
              .update(saasSubscriptions)
              .set({
                packageId: basicPlan.id,
                status: "cancelled",
                cancelAtPeriodEnd: false,
                updatedAt: new Date(),
              })
              .where(eq(saasSubscriptions.id, subscriptionId));
          }

          // Log subscription history
          await logSubscriptionHistory({
            organizationId: currentSubscription.organizationId,
            subscriptionId,
            action: "cancel",
            performedBy: (req as any).saasUser?.id,
            performedByType: "saas_admin",
            oldPackageId: currentSubscription.packageId || undefined,
            newPackageId: basicPlan?.id,
            oldBillingCycle: currentSubscription.billingCycle as "monthly" | "annual" | undefined,
            oldStatus: currentSubscription.status || undefined,
            newStatus: "cancelled",
            oldPrice: oldPackage?.price ? Number(oldPackage.price) : undefined,
            details: {
              immediate: true,
              stripeSubscriptionId: currentSubscription.stripeSubscriptionId || undefined,
            },
            ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || undefined,
            userAgent: req.headers["user-agent"] || undefined,
          });

          res.json({
            success: true,
            message: "Subscription cancelled immediately. Account downgraded to Basic plan.",
            immediate: true,
          });
        } else {
          // Cancel at period end (recommended)
          await stripe.subscriptions.update(
            currentSubscription.stripeSubscriptionId,
            {
              cancel_at_period_end: true,
            }
          );

          // Get old package for history
          const [oldPackage] = currentSubscription.packageId
            ? await db
                .select()
                .from(saasPackages)
                .where(eq(saasPackages.id, currentSubscription.packageId))
                .limit(1)
            : [null];

          // Update database
          await db
            .update(saasSubscriptions)
            .set({
              cancelAtPeriodEnd: true,
              updatedAt: new Date(),
            })
            .where(eq(saasSubscriptions.id, subscriptionId));

          // Log subscription history
          await logSubscriptionHistory({
            organizationId: currentSubscription.organizationId,
            subscriptionId,
            action: "cancel",
            performedBy: (req as any).saasUser?.id,
            performedByType: "saas_admin",
            oldPackageId: currentSubscription.packageId || undefined,
            oldBillingCycle: currentSubscription.billingCycle as "monthly" | "annual" | undefined,
            oldStatus: currentSubscription.status || undefined,
            newStatus: "cancelled",
            oldPrice: oldPackage?.price ? Number(oldPackage.price) : undefined,
            details: {
              immediate: false,
              effectiveDate: currentSubscription.currentPeriodEnd?.toISOString(),
              stripeSubscriptionId: currentSubscription.stripeSubscriptionId || undefined,
            },
            ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || undefined,
            userAgent: req.headers["user-agent"] || undefined,
          });

          res.json({
            success: true,
            message: "Subscription will be cancelled at the end of the current billing period.",
            immediate: false,
            expiresAt: currentSubscription.currentPeriodEnd,
          });
        }
      } catch (error: any) {
        console.error("Cancel subscription error (SaaS Admin):", error);
        res.status(500).json({
          error: "Failed to cancel subscription",
          message: error.message,
        });
      }
    }
  );

  // ============================================
  // SaaS Admin - Get Subscription History
  // ============================================
  app.get(
    "/api/saas/billing/subscription-history",
    verifySaaSToken,
    async (req: SaaSRequest, res: Response) => {
      try {
        const { organizationId } = req.query;
        const { getSubscriptionHistory } = await import("./services/subscription-history");
        
        const history = await getSubscriptionHistory(
          organizationId ? Number(organizationId) : undefined
        );

        // Join with organizations to get organization names
        const historyWithOrgNames = await Promise.all(
          history.map(async (item) => {
            const [org] = await db
              .select({ name: organizations.name, subdomain: organizations.subdomain })
              .from(organizations)
              .where(eq(organizations.id, item.organizationId))
              .limit(1);

            return {
              ...item,
              organizationName: org?.name || "Unknown",
              organizationSubdomain: org?.subdomain || "",
            };
          })
        );

        res.json(historyWithOrgNames);
      } catch (error: any) {
        console.error("Get subscription history error:", error);
        res.status(500).json({
          error: "Failed to fetch subscription history",
          message: error.message,
        });
      }
    }
  );
}
