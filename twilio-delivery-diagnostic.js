#!/usr/bin/env node

/**
 * Comprehensive Twilio Delivery Diagnostic Tool
 * 
 * This tool investigates the specific delivery issues mentioned:
 * 1. Phone number format problems
 * 2. WhatsApp template approval status
 * 3. Messages stuck in 'sent' status
 * 4. Trial account limitations and verification requirements
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = 'http://localhost:5000';
const TENANT = 'cura';

// Test phone numbers (various formats and regions)
const TEST_NUMBERS = [
  // Valid E.164 formats
  { number: '+15551234567', description: 'US test number (E.164 format)', expected: 'should work if not trial limitation' },
  { number: '+447911123456', description: 'UK mobile (E.164 format)', expected: 'should work internationally' },
  { number: '+33612345678', description: 'France mobile (E.164 format)', expected: 'should work in EU' },
  
  // Invalid formats (to test validation)
  { number: '15551234567', description: 'US number without + prefix', expected: 'should fail validation' },
  { number: '+1 555 123 4567', description: 'US number with spaces', expected: 'should fail validation' },
  { number: '+1(555)123-4567', description: 'US number with formatting', expected: 'should fail validation' },
];

// Test messages for different scenarios
const TEST_MESSAGES = [
  { type: 'sms', content: 'Test SMS from Cura EMR - delivery diagnostic', priority: 'normal' },
  { type: 'whatsapp', content: 'Test WhatsApp from Cura EMR - delivery diagnostic', priority: 'high' },
];

class TwilioDeliveryDiagnostic {
  constructor() {
    this.authToken = null;
    this.results = [];
  }

  async authenticate() {
    console.log('🔐 Authenticating with Cura EMR system...');
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Subdomain': TENANT
        },
        body: JSON.stringify({
          email: 'admin@cura.com',
          password: 'admin123'
        })
      });

      const data = await response.json();
      
      if (data.token) {
        this.authToken = data.token;
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.log('❌ Authentication failed:', data);
        return false;
      }
    } catch (error) {
      console.log('❌ Authentication error:', error.message);
      return false;
    }
  }

  async checkTwilioConfiguration() {
    console.log('\n🔍 DIAGNOSTIC #1: Twilio Configuration Check');
    console.log('=' .repeat(60));
    
    try {
      const response = await fetch(`${BASE_URL}/api/messaging/twilio-config`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-Subdomain': TENANT
        }
      });

      const config = await response.json();
      
      console.log('Twilio Configuration Status:');
      console.log(`📞 Phone Number: ${config.phoneNumber || 'Not configured'}`);
      console.log(`🔑 Account SID: ${config.accountSid ? config.accountSid.substring(0, 10) + '...' : 'Not configured'}`);
      console.log(`🔐 Auth Token: ${config.authToken ? 'Configured (hidden)' : 'Not configured'}`);
      
      // Check E.164 format compliance
      const phoneNumber = config.phoneNumber;
      if (phoneNumber) {
        const isE164 = /^\+[1-9]\d{1,14}$/.test(phoneNumber);
        console.log(`📋 Phone Format: ${isE164 ? '✅ E.164 compliant' : '❌ Not E.164 compliant'}`);
        
        if (!isE164) {
          console.log('⚠️  ISSUE #1 DETECTED: Phone number format problem');
          console.log('   Expected: +[country code][number] (e.g., +15551234567)');
          console.log(`   Actual: ${phoneNumber}`);
        }
      }
      
      return config;
    } catch (error) {
      console.log('❌ Failed to check Twilio configuration:', error.message);
      return null;
    }
  }

  async testPhoneNumberFormats() {
    console.log('\n🔍 DIAGNOSTIC #2: Phone Number Format Validation');
    console.log('=' .repeat(60));
    
    for (const testCase of TEST_NUMBERS) {
      console.log(`\nTesting: ${testCase.number}`);
      console.log(`Description: ${testCase.description}`);
      console.log(`Expected: ${testCase.expected}`);
      
      try {
        const response = await fetch(`${BASE_URL}/api/messaging/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`,
            'X-Tenant-Subdomain': TENANT
          },
          body: JSON.stringify({
            recipientType: 'phone',
            recipient: testCase.number,
            message: 'Phone format validation test',
            messageType: 'sms',
            priority: 'normal'
          })
        });

        const result = await response.json();
        
        if (result.error) {
          console.log(`❌ Failed: ${result.error}`);
          if (result.error.includes('format') || result.error.includes('invalid')) {
            console.log('   🚨 ISSUE #1 CONFIRMED: Phone number format validation failed');
          }
        } else if (result.externalMessageId) {
          console.log(`✅ Sent: Twilio SID ${result.externalMessageId}`);
          
          // Check delivery status after a delay
          await new Promise(resolve => setTimeout(resolve, 3000));
          await this.checkDeliveryStatus(result.externalMessageId, testCase.number);
        } else {
          console.log(`⚠️  Partial: Message created but no Twilio SID`);
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  async checkDeliveryStatus(messageSid, phoneNumber) {
    try {
      const response = await fetch(`${BASE_URL}/api/messaging/status/${messageSid}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-Subdomain': TENANT
        }
      });

      const status = await response.json();
      
      console.log(`   📊 Status: ${status.status || 'Unknown'}`);
      
      // Check for specific delivery issues
      if (status.status === 'sent') {
        console.log('   🚨 ISSUE #3 DETECTED: Message stuck in "sent" status');
        console.log('   This may indicate carrier delays or delivery problems');
      } else if (status.status === 'failed') {
        console.log('   ❌ Message delivery failed');
        
        if (status.errorCode) {
          this.analyzeErrorCode(status.errorCode, phoneNumber);
        }
      } else if (status.status === 'delivered') {
        console.log('   ✅ Message delivered successfully');
      } else if (status.status === 'queued') {
        console.log('   ⏳ Message queued for delivery');
      }
      
      // Log any error details
      if (status.errorMessage) {
        console.log(`   📝 Error: ${status.errorMessage}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Status check failed: ${error.message}`);
    }
  }

  analyzeErrorCode(errorCode, phoneNumber) {
    console.log(`   🔍 Error Code: ${errorCode}`);
    
    switch (parseInt(errorCode)) {
      case 21211:
        console.log('   🚨 ISSUE #1 CONFIRMED: Invalid phone number format (Error 21211)');
        console.log('   This number format is not accepted by Twilio');
        break;
        
      case 21610:
        console.log('   🚨 ISSUE #4 CONFIRMED: Trial account limitation (Error 21610)');
        console.log('   This number is not verified for your trial account');
        console.log('   💡 Solution: Verify the number in Twilio Console or upgrade account');
        break;
        
      case 30003:
        console.log('   🚨 ISSUE #1 RELATED: Unreachable destination (Error 30003)');
        console.log('   The handset is unreachable or the number is invalid');
        break;
        
      case 20003:
        console.log('   🚨 ISSUE #4 CONFIRMED: Authentication failed (Error 20003)');
        console.log('   Twilio credentials are invalid or expired');
        break;
        
      case 21408:
        console.log('   🚨 ISSUE #4 CONFIRMED: Phone number not purchased (Error 21408)');
        console.log('   The sending number is not associated with your account');
        break;
        
      default:
        console.log(`   ❓ Unknown error code: ${errorCode}`);
        console.log('   Check Twilio documentation for details');
    }
  }

  async testWhatsAppDelivery() {
    console.log('\n🔍 DIAGNOSTIC #3: WhatsApp Delivery Test');
    console.log('=' .repeat(60));
    
    // Test WhatsApp delivery to a test number
    const testNumber = '+15551234567';
    
    try {
      const response = await fetch(`${BASE_URL}/api/messaging/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-Subdomain': TENANT
        },
        body: JSON.stringify({
          recipientType: 'phone',
          recipient: testNumber,
          message: 'WhatsApp delivery test from Cura EMR',
          messageType: 'whatsapp',
          priority: 'normal'
        })
      });

      const result = await response.json();
      
      if (result.error) {
        console.log(`❌ WhatsApp send failed: ${result.error}`);
        
        if (result.error.includes('template') || result.error.includes('approval')) {
          console.log('🚨 ISSUE #2 DETECTED: WhatsApp template approval required');
          console.log('💡 Solution: Configure and approve message templates in Twilio Console');
        }
      } else if (result.externalMessageId) {
        console.log(`✅ WhatsApp sent: Twilio SID ${result.externalMessageId}`);
        
        // Check delivery status
        await new Promise(resolve => setTimeout(resolve, 5000));
        await this.checkDeliveryStatus(result.externalMessageId, testNumber);
      }
      
    } catch (error) {
      console.log(`❌ WhatsApp test error: ${error.message}`);
    }
  }

  async checkAccountLimitations() {
    console.log('\n🔍 DIAGNOSTIC #4: Account Limitations Check');
    console.log('=' .repeat(60));
    
    try {
      const response = await fetch(`${BASE_URL}/api/messaging/account-info`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'X-Tenant-Subdomain': TENANT
        }
      });

      const accountInfo = await response.json();
      
      console.log('Account Information:');
      console.log(`📊 Account Type: ${accountInfo.accountType || 'Unknown'}`);
      console.log(`💰 Balance: ${accountInfo.balance || 'Unknown'}`);
      console.log(`📞 Verified Numbers: ${accountInfo.verifiedNumbers?.length || 0}`);
      
      if (accountInfo.accountType === 'trial') {
        console.log('🚨 ISSUE #4 DETECTED: Trial account limitations in effect');
        console.log('📋 Trial account restrictions:');
        console.log('   • Can only send to verified phone numbers');
        console.log('   • Limited message volume');
        console.log('   • May have geographic restrictions');
        console.log('💡 Solutions:');
        console.log('   • Verify recipient numbers in Twilio Console');
        console.log('   • Upgrade to paid account for full functionality');
      }
      
      if (accountInfo.verifiedNumbers) {
        console.log('\n📞 Verified Numbers:');
        accountInfo.verifiedNumbers.forEach((num, index) => {
          console.log(`   ${index + 1}. ${num}`);
        });
      }
      
    } catch (error) {
      console.log(`❌ Account info check failed: ${error.message}`);
      console.log('   This may indicate API access issues or authentication problems');
    }
  }

  async generateReport() {
    console.log('\n📋 DELIVERY DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(60));
    
    console.log('\n🎯 IDENTIFIED ISSUES & SOLUTIONS:');
    
    console.log('\n1️⃣ PHONE NUMBER FORMAT ISSUES:');
    console.log('   ✓ Ensure all numbers use E.164 format: +[country code][number]');
    console.log('   ✓ Remove spaces, parentheses, and dashes');
    console.log('   ✓ Validate format before sending: /^\\+[1-9]\\d{1,14}$/');
    
    console.log('\n2️⃣ WHATSAPP TEMPLATE APPROVAL:');
    console.log('   ✓ Configure message templates in Twilio Console');
    console.log('   ✓ Submit templates for WhatsApp approval');
    console.log('   ✓ Use approved template IDs in API calls');
    console.log('   ✓ Allow 1-3 business days for approval');
    
    console.log('\n3️⃣ MESSAGES STUCK IN "SENT" STATUS:');
    console.log('   ✓ Monitor delivery status over longer periods (up to 72 hours)');
    console.log('   ✓ Check for carrier-specific delays');
    console.log('   ✓ Implement retry logic for critical messages');
    console.log('   ✓ Consider alternative delivery channels');
    
    console.log('\n4️⃣ TRIAL ACCOUNT LIMITATIONS:');
    console.log('   ✓ Verify all recipient numbers in Twilio Console');
    console.log('   ✓ Upgrade to paid account for production use');
    console.log('   ✓ Check account balance and usage limits');
    console.log('   ✓ Review geographic sending restrictions');
    
    console.log('\n🔍 NEXT STEPS:');
    console.log('   1. Check Twilio Console for detailed delivery logs');
    console.log('   2. Verify Twilio webhook configuration for delivery receipts');
    console.log('   3. Monitor message delivery over extended periods');
    console.log('   4. Test with verified phone numbers first');
    console.log('   5. Consider implementing delivery status polling');
    
    console.log('\n📞 FOR IMMEDIATE HELP:');
    console.log('   • Twilio Support: https://support.twilio.com');
    console.log('   • Twilio Console: https://console.twilio.com');
    console.log('   • Check account balance and verify phone numbers');
  }

  async run() {
    console.log('🚀 CURA EMR - TWILIO DELIVERY DIAGNOSTIC TOOL');
    console.log('=' .repeat(60));
    console.log('This tool will help identify specific delivery issues:');
    console.log('1. Phone number format problems');
    console.log('2. WhatsApp template approval status');
    console.log('3. Messages stuck in "sent" status');
    console.log('4. Trial account limitations and verification');
    console.log('');

    // Authenticate
    const authenticated = await this.authenticate();
    if (!authenticated) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }

    // Run all diagnostics
    await this.checkTwilioConfiguration();
    await this.testPhoneNumberFormats();
    await this.testWhatsAppDelivery();
    await this.checkAccountLimitations();
    
    // Generate final report
    await this.generateReport();
  }
}

// Run the diagnostic if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const diagnostic = new TwilioDeliveryDiagnostic();
  diagnostic.run().catch(console.error);
}

export default TwilioDeliveryDiagnostic;