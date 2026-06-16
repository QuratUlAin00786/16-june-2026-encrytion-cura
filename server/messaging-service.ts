import twilio, { Twilio } from 'twilio';
import { getTwilioClient, getTwilioFromPhoneNumber, getTwilioCredentials } from './services/twilio-connector';

// Initialize Twilio client with proper error handling and validation
let client: Twilio | null = null;
let authenticationFailed = false; // Track if authentication has failed
let useReplitConnector = false; // Track if using Replit connector
let connectorPhoneNumber: string | null = null;

// Use environment variables for Twilio (user's own account)
async function initializeTwilioClientAsync(): Promise<boolean> {
  // Use environment variables directly for user's own Twilio account
  // The Replit connector uses a shared account which may not match user's needs
  console.log('🔧 Initializing Twilio with user credentials...');
  return initializeTwilioFromEnv();
}

function initializeTwilioFromEnv(): boolean {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
    
    console.log('🔧 Twilio Initialization Debug (env vars):', {
      hasSID: !!accountSid,
      sidFormat: accountSid ? `${accountSid.substring(0, 5)}...` : 'missing',
      sidLength: accountSid?.length || 0,
      hasToken: !!authToken,
      tokenLength: authToken?.length || 0,
      hasPhone: !!phoneNumber,
      phoneFormat: phoneNumber || 'missing'
    });
    
    if (accountSid && 
        authToken && 
        phoneNumber &&
        accountSid.startsWith('AC') &&
        accountSid.length >= 34) {
      
      // Reset authentication flag when reinitializing
      authenticationFailed = false;
      useReplitConnector = false;
      
      // Only create client if credentials appear valid
      client = twilio(accountSid, authToken);
      console.log('✅ Twilio client initialized via env vars - credentials will be verified on first use');
      return true;
    } else {
      console.warn('❌ Twilio credentials invalid or incomplete:', {
        hasValidSID: accountSid?.startsWith('AC') && accountSid?.length >= 34,
        hasToken: !!authToken,
        hasPhone: !!phoneNumber
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error);
    client = null;
    return false;
  }
}

// Initialize on startup (async)
initializeTwilioClientAsync().catch(err => {
  console.error('Failed to initialize Twilio async:', err);
  initializeTwilioFromEnv();
});

// Export function to reset client with new credentials
export async function resetTwilioClient() {
  console.log('Resetting Twilio client with new credentials...');
  authenticationFailed = false; // Reset authentication flag
  return initializeTwilioClientAsync();
}

// Get the current from phone number (connector or env var)
function getTwilioPhoneNumber(): string {
  if (useReplitConnector && connectorPhoneNumber) {
    return connectorPhoneNumber;
  }
  return process.env.TWILIO_PHONE_NUMBER || '';
}

export interface MessageOptions {
  to: string;
  message: string;
  type: 'sms' | 'whatsapp';
  priority?: 'low' | 'normal' | 'high';
  scheduledTime?: Date;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

export class MessagingService {
  /**
   * Get the Twilio from number dynamically (supports Replit connector)
   */
  private get twilioFromNumber(): string {
    return getTwilioPhoneNumber();
  }
  
  private get whatsappFromNumber(): string {
    // Use Twilio WhatsApp Sandbox number for WhatsApp messaging
    // This is the dedicated WhatsApp sandbox number provided by Twilio
    const whatsappSandboxNumber = '+14155238886';
    console.log(`📱 WhatsApp From number: using Twilio sandbox "whatsapp:${whatsappSandboxNumber}"`);
    return `whatsapp:${whatsappSandboxNumber}`;
  }

  /**
   * Format phone number to E.164 format (removes all non-digit chars except leading +)
   * Also removes invisible Unicode characters (LTR marks, RTL marks, etc.)
   */
  private formatE164(phoneNumber: string): string {
    if (!phoneNumber) return '';
    // First, remove all invisible/control Unicode characters (LTR marks, RTL marks, etc.)
    // This regex removes everything that's not a digit, +, or standard ASCII
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    // Ensure it starts with + 
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    return `+${cleaned}`;
  }

  constructor() {
    // Phone numbers are now dynamically retrieved via getters
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<MessageResult> {
    try {
      // Check if Twilio is properly configured
      if (!client) {
        console.error('Twilio client not configured - missing credentials');
        return {
          success: false,
          error: 'SMS service not properly configured. Please check Twilio credentials (Account SID, Auth Token, and Phone Number).'
        };
      }

      // Check current authentication status, but don't permanently block attempts
      if (authenticationFailed) {
        console.warn('Previous authentication failed - will retry with current credentials');
        authenticationFailed = false; // Reset flag to allow retry
      }

      // Additional validation for Twilio configuration (skip if using Replit connector)
      if (!useReplitConnector && (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER)) {
        console.error('Twilio credentials incomplete:', {
          hasSID: !!process.env.TWILIO_ACCOUNT_SID,
          hasToken: !!process.env.TWILIO_AUTH_TOKEN,
          hasPhone: !!process.env.TWILIO_PHONE_NUMBER
        });
        return {
          success: false,
          error: 'SMS service not properly configured. Please check Twilio credentials (Account SID, Auth Token, and Phone Number).'
        };
      }
      
      console.log('📱 Using Twilio via:', useReplitConnector ? 'Replit Connector' : 'Environment Variables');
      console.log('📱 From number:', this.twilioFromNumber);

      // Validate phone number format
      const phoneNumber = this.formatPhoneNumber(to);
      console.log(`📱 Phone number formatting: "${to}" -> "${phoneNumber}"`);
      
      const messageOptions: any = {
        body: message,
        from: this.twilioFromNumber,
        to: phoneNumber,
      };

      // Note: Development environment cannot receive webhooks from Twilio
      // Status tracking will be done via direct API polling instead
      console.log('📱 SMS sent without webhook (dev environment) - will poll status directly');

      const twilioMessage = await client.messages.create(messageOptions);

      return {
        success: true,
        messageId: twilioMessage.sid,
        cost: parseFloat(twilioMessage.price || '0')
      };
    } catch (error: any) {
      console.error('SMS sending error:', error);
      
      // Mark credentials as invalid if authentication fails
      if (error.code === 20003 || error.message?.includes('Authentication Error')) {
        authenticationFailed = true;
        
        console.error('🚨 TWILIO ERROR 20003 - AUTHENTICATION FAILED');
        console.error('🔍 ERROR DETAILS:', {
          code: error.code,
          status: error.status,
          message: error.message,
          moreInfo: error.moreInfo,
          details: error.details
        });
        console.error('💰 BILLING CHECK REQUIRED - Error 20003 typically indicates:');
        console.error('   1. ❌ Account suspended due to UNPAID BILLS');
        console.error('   2. ❌ Trial account EXPIRED or OUT OF CREDIT');
        console.error('   3. ❌ Invalid Account SID/Auth Token combination');
        console.error('   4. ❌ Account DEACTIVATED or CLOSED');
        console.error('🌐 CHECK YOUR TWILIO CONSOLE: https://console.twilio.com');
        console.error('💳 CHECK BILLING SECTION for overdue payments');
        console.error('📊 CHECK ACCOUNT STATUS for suspension notices');
        
        return {
          success: false,
          error: '🚨 TWILIO AUTHENTICATION ERROR (Code 20003): Your Twilio account has AUTHENTICATION issues. MOST LIKELY CAUSES: (1) Unpaid bills - check your Twilio Console billing section, (2) Trial account expired - upgrade to paid account, (3) Invalid credentials - verify Account SID and Auth Token match. Visit https://console.twilio.com to resolve billing/account issues.'
        };
      }
      
      // Handle other Twilio errors
      let errorMessage = error.message || 'Failed to send SMS';
      if (error.code === 21211) {
        errorMessage = 'Invalid phone number format. Please check the recipient phone number.';
      } else if (error.code === 21610) {
        errorMessage = `🚫 TWILIO TRIAL ACCOUNT LIMITATION: This phone number (${to}) is not verified in your Twilio trial account. Trial accounts can only send messages to verified numbers. To fix this: 1) Verify this number in your Twilio console, or 2) Upgrade to a paid Twilio account to send to any number.`;
        console.error(`🚫 TRIAL ACCOUNT BLOCK: ${to} - ${errorMessage}`);
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(to: string, message: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<MessageResult> {
    try {
      // Check if Twilio is properly configured
      if (!client) {
        console.error('Twilio client not configured - missing credentials');
        return {
          success: false,
          error: 'WhatsApp service not properly configured. Please check Twilio credentials (Account SID, Auth Token, and Phone Number).'
        };
      }

      // If authentication has failed before, block further attempts
      if (authenticationFailed) {
        console.error('WhatsApp blocked - Twilio credentials previously failed authentication');
        return {
          success: false,
          error: 'WhatsApp service not properly configured. Please check Twilio credentials (Account SID, Auth Token, and Phone Number).'
        };
      }

      const phoneNumber = this.formatPhoneNumber(to);
      const whatsappTo = `whatsapp:${phoneNumber}`;
      
      const messageOptions: any = {
        body: message,
        from: this.whatsappFromNumber,
        to: whatsappTo,
      };

      // Note: Development environment cannot receive webhooks from Twilio
      // Status tracking will be done via direct API polling instead
      console.log('📱 WhatsApp sent without webhook (dev environment) - will poll status directly');

      const twilioMessage = await client.messages.create(messageOptions);

      return {
        success: true,
        messageId: twilioMessage.sid,
        cost: parseFloat(twilioMessage.price || '0')
      };
    } catch (error: any) {
      console.error('WhatsApp sending error:', error);
      
      // Mark credentials as invalid if authentication fails
      if (error.code === 20003 || error.message?.includes('Authentication Error')) {
        authenticationFailed = true;
        console.error('Twilio authentication failed for WhatsApp - marking credentials as invalid');
        return {
          success: false,
          error: 'WhatsApp service not properly configured. Please check Twilio credentials (Account SID, Auth Token, and Phone Number).'
        };
      }
      
      // Handle other Twilio errors
      let errorMessage = error.message || 'Failed to send WhatsApp message';
      if (error.code === 21211) {
        errorMessage = 'Invalid phone number format. Please check the recipient phone number.';
      } else if (error.code === 21610) {
        errorMessage = `🚫 TWILIO TRIAL ACCOUNT LIMITATION: This phone number (${to}) is not verified in your Twilio trial account. Trial accounts can only send messages to verified numbers. To fix this: 1) Verify this number in your Twilio console, or 2) Upgrade to a paid Twilio account to send to any number.`;
        console.error(`🚫 TRIAL ACCOUNT BLOCK: ${to} - ${errorMessage}`);
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Make voice call with Text-to-Speech message
   */
  async makeVoiceCall(to: string, message: string): Promise<MessageResult> {
    try {
      if (!client) {
        console.error('Twilio client not configured - missing credentials');
        return {
          success: false,
          error: 'Voice call service not properly configured. Please check Twilio credentials.'
        };
      }

      if (authenticationFailed) {
        console.warn('Previous authentication failed - will retry with current credentials');
        authenticationFailed = false;
      }

      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.error('Twilio credentials incomplete for voice call');
        return {
          success: false,
          error: 'Voice call service not properly configured. Please check Twilio credentials.'
        };
      }

      const phoneNumber = this.formatPhoneNumber(to);
      console.log(`📞 Initiating voice call to: ${phoneNumber}`);
      console.log(`📞 TTS Message: ${message}`);

      const twimlMessage = `<Response><Say voice="alice" language="en-GB">${message}</Say></Response>`;

      const call = await client.calls.create({
        twiml: twimlMessage,
        to: phoneNumber,
        from: this.twilioFromNumber,
      });

      console.log(`✅ Voice call initiated successfully. Call SID: ${call.sid}`);

      return {
        success: true,
        messageId: call.sid,
      };
    } catch (error: any) {
      console.error('Voice call error:', error);

      if (error.code === 20003 || error.message?.includes('Authentication Error')) {
        authenticationFailed = true;
        return {
          success: false,
          error: 'Voice call service not properly configured. Please check Twilio credentials.'
        };
      }

      let errorMessage = error.message || 'Failed to make voice call';
      if (error.code === 21211) {
        errorMessage = 'Invalid phone number format. Please check the recipient phone number.';
      } else if (error.code === 21214) {
        errorMessage = `Trial account limitation: Phone number ${to} is not verified. Please verify in Twilio console.`;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send message with automatic channel selection
   */
  async sendMessage(options: MessageOptions): Promise<MessageResult> {
    const { to, message, type, priority = 'normal' } = options;

    if (type === 'sms') {
      return this.sendSMS(to, message, priority);
    } else if (type === 'whatsapp') {
      return this.sendWhatsApp(to, message, priority);
    } else {
      return {
        success: false,
        error: 'Invalid message type. Use "sms" or "whatsapp"'
      };
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(patientPhone: string, patientName: string, appointmentDate: string, doctorName: string, clinicName: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<MessageResult> {
    const message = `Hi ${patientName},

This is a reminder that you have an appointment scheduled on ${appointmentDate} with ${doctorName} at ${clinicName}.

Please arrive 15 minutes early for check-in.

If you need to reschedule, please call us.

Thank you,
${clinicName}`;

    return this.sendMessage({
      to: patientPhone,
      message,
      type,
      priority: 'normal'
    });
  }

  /**
   * Send lab results notification
   */
  async sendLabResultsNotification(patientPhone: string, patientName: string, clinicName: string, clinicPhone: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<MessageResult> {
    const message = `Hi ${patientName},

Your lab results are now available for review.

Please call us at ${clinicPhone} or visit your patient portal to discuss the results with your provider.

Best regards,
${clinicName}`;

    return this.sendMessage({
      to: patientPhone,
      message,
      type,
      priority: 'normal'
    });
  }

  /**
   * Send prescription ready notification
   */
  async sendPrescriptionReady(patientPhone: string, patientName: string, pharmacyName: string, pharmacyAddress: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<MessageResult> {
    const message = `Hi ${patientName},

Your prescription is ready for pickup at:
${pharmacyName}
${pharmacyAddress}

Please bring a valid ID when collecting your medication.

Thank you!`;

    return this.sendMessage({
      to: patientPhone,
      message,
      type,
      priority: 'normal'
    });
  }

  /**
   * Send emergency notification
   */
  async sendEmergencyNotification(patientPhone: string, patientName: string, urgentMessage: string, clinicPhone: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<MessageResult> {
    const message = `URGENT - ${patientName}

${urgentMessage}

Please call us immediately at ${clinicPhone} or visit our emergency department.

This is an urgent medical notification.`;

    return this.sendMessage({
      to: patientPhone,
      message,
      type,
      priority: 'high'
    });
  }

  /**
   * Format phone number for Twilio (E.164 format)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // If already properly formatted in E.164, return as-is
    if (/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      console.log(`✅ Already E.164 compliant: ${phoneNumber}`);
      return phoneNumber;
    }
    
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    console.log(`🔍 Cleaned number: "${cleaned}", length: ${cleaned.length}`);
    
    // Handle different country formats
    if (cleaned.startsWith('92')) {
      // Already has Pakistan country code
      console.log(`✅ Pakistan country code detected: +${cleaned}`);
      return `+${cleaned}`;
    } else if (cleaned.startsWith('03') && cleaned.length === 11) {
      // Pakistani mobile number (03XXXXXXXX) - convert to international  
      const formatted = `+92${cleaned.substring(1)}`;
      console.log(`✅ Pakistani mobile detected: ${cleaned} -> ${formatted}`);
      return formatted;
    } else if (cleaned.startsWith('44')) {
      // UK number
      return `+${cleaned}`;
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
      // US number with country code
      return `+${cleaned}`;
    } else if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      // US number without country code
      return `+1${cleaned}`;
    }
    
    // If starts with + but digits were removed, try to reconstruct
    if (phoneNumber.startsWith('+')) {
      const result = `+${cleaned}`;
      console.log(`✅ Reconstructed E.164: ${phoneNumber} -> ${result}`);
      return result;
    }
    
    // Default: add + prefix if not present
    const result = `+${cleaned}`;
    console.log(`⚠️ Default formatting applied: ${cleaned} -> ${result}`);
    return result;
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<any> {
    try {
      if (!client) {
        return null;
      }
      const message = await client.messages(messageId).fetch();
      return {
        status: message.status,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        price: message.price,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      console.error('Error fetching message status:', error);
      return null;
    }
  }

  /**
   * Get account balance and usage with enhanced error handling
   */
  async getAccountInfo(): Promise<any> {
    console.log('🔍 TWILIO ACCOUNT INFO - Starting retrieval...');
    
    try {
      // Check basic configuration
      if (!client) {
        console.error('❌ TWILIO CLIENT - Not initialized');
        return {
          accountType: 'error',
          balance: 'error',
          status: 'client not initialized',
          verifiedNumbers: [],
          error: 'Twilio client not properly initialized',
          errorType: 'configuration'
        };
      }
      
      if (!process.env.TWILIO_ACCOUNT_SID) {
        console.error('❌ TWILIO ACCOUNT SID - Missing from environment variables');
        return {
          accountType: 'error',
          balance: 'error',
          status: 'missing credentials',
          verifiedNumbers: [],
          error: 'TWILIO_ACCOUNT_SID not configured',
          errorType: 'configuration'
        };
      }
      
      console.log('✅ TWILIO CONFIG - Client and Account SID present');
      console.log('🔄 TWILIO API - Fetching account information...');
      
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      console.log('✅ TWILIO ACCOUNT - Successfully retrieved:', {
        type: account.type,
        status: account.status,
        sid: account.sid?.substring(0, 10) + '...'
      });
      
      // Try to get verified numbers (for trial account diagnostics)
      let verifiedNumbers: string[] = [];
      let verifiedNumbersError: string | null = null;
      
      try {
        console.log('🔄 TWILIO VERIFIED NUMBERS - Fetching list...');
        const outgoingCallerIds = await client.outgoingCallerIds.list();
        verifiedNumbers = outgoingCallerIds.map(id => id.phoneNumber);
        console.log(`✅ TWILIO VERIFIED NUMBERS - Found ${verifiedNumbers.length} verified numbers`);
      } catch (error: any) {
        verifiedNumbersError = error?.message || 'Unknown error';
        console.warn('⚠️ TWILIO VERIFIED NUMBERS - Could not fetch:', verifiedNumbersError);
        if (error?.code) {
          console.warn('⚠️ TWILIO ERROR CODE:', error.code);
        }
      }
      
      const accountInfo = {
        accountType: account.type === 'Trial' ? 'trial' : 'paid',
        balance: account.balance,
        status: account.status,
        verifiedNumbers,
        ...(verifiedNumbersError && { verifiedNumbersError }),
        lastUpdated: new Date().toISOString()
      };
      
      console.log('✅ TWILIO ACCOUNT INFO - Successfully compiled:', accountInfo);
      return accountInfo;
      
    } catch (error: any) {
      console.error('🚨 TWILIO ACCOUNT INFO - Retrieval failed');
      console.error('🔍 ERROR DETAILS:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        moreInfo: error?.moreInfo
      });
      
      // Categorize different types of errors
      let errorType = 'unknown';
      let userFriendlyMessage = error?.message || 'Unknown error occurred';
      
      if (error?.code === 20003) {
        errorType = 'authentication';
        userFriendlyMessage = 'Authentication failed - check Account SID and Auth Token, or verify account billing status';
        console.error('💳 AUTHENTICATION ERROR - Code 20003 detected (billing/credentials issue)');
      } else if (error?.code === 20404) {
        errorType = 'not_found';
        userFriendlyMessage = 'Account not found - verify Account SID is correct';
        console.error('🔍 ACCOUNT NOT FOUND - Code 20404 detected');
      } else if (error?.status === 401) {
        errorType = 'unauthorized';
        userFriendlyMessage = 'Unauthorized access - verify Auth Token is correct';
        console.error('🔐 UNAUTHORIZED ERROR - Status 401 detected');
      } else if (error?.status === 403) {
        errorType = 'forbidden';
        userFriendlyMessage = 'Access forbidden - account may be suspended or restricted';
        console.error('🚫 FORBIDDEN ERROR - Status 403 detected');
      } else if (error?.code && error.code.toString().startsWith('2')) {
        errorType = 'twilio_api';
        userFriendlyMessage = `Twilio API error (${error.code}): ${error.message}`;
        console.error(`📡 TWILIO API ERROR - Code ${error.code} detected`);
      } else if (error?.message?.includes('timeout') || error?.message?.includes('ETIMEDOUT')) {
        errorType = 'timeout';
        userFriendlyMessage = 'Request timeout - check network connection or try again';
        console.error('⏱️ TIMEOUT ERROR - Network timeout detected');
      } else if (error?.message?.includes('network') || error?.message?.includes('ENOTFOUND')) {
        errorType = 'network';
        userFriendlyMessage = 'Network error - check internet connection';
        console.error('🌐 NETWORK ERROR - Network connectivity issue detected');
      }
      
      const errorInfo = {
        accountType: 'error',
        balance: 'error',
        status: 'error',
        verifiedNumbers: [],
        error: userFriendlyMessage,
        errorType,
        errorCode: error?.code,
        errorStatus: error?.status,
        moreInfo: error?.moreInfo,
        lastUpdated: new Date().toISOString()
      };
      
      console.error('❌ TWILIO ACCOUNT INFO - Returning error response:', errorInfo);
      return errorInfo;
    }
  }

  /**
   * Send bulk messages (for campaigns)
   */
  async sendBulkMessages(recipients: Array<{phone: string, name: string}>, message: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<Array<MessageResult & {recipient: string}>> {
    const results: Array<MessageResult & {recipient: string}> = [];
    
    for (const recipient of recipients) {
      const personalizedMessage = message.replace('{{patientName}}', recipient.name);
      const result = await this.sendMessage({
        to: recipient.phone,
        message: personalizedMessage,
        type,
        priority: 'normal'
      });
      
      results.push({
        ...result,
        recipient: recipient.phone
      });
      
      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}

export const messagingService = new MessagingService();