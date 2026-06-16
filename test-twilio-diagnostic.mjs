// Simple script to test Twilio delivery diagnostic
import twilio from 'twilio';
import 'dotenv/config';

async function runTwilioDeliveryDiagnostic() {
  try {
    console.log('🔍 TWILIO DELIVERY DIAGNOSTIC - Starting analysis...');
    
    // 1. Check credentials configuration
    const twilioConfig = {
      hasAccountSID: !!process.env.TWILIO_ACCOUNT_SID,
      hasSIDFormat: process.env.TWILIO_ACCOUNT_SID?.startsWith('AC') && process.env.TWILIO_ACCOUNT_SID?.length >= 34,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
      phoneNumberFormat: process.env.TWILIO_PHONE_NUMBER || 'missing'
    };
    
    console.log('📊 Twilio Configuration:', twilioConfig);
    
    if (!twilioConfig.hasAccountSID || !twilioConfig.hasAuthToken) {
      console.log('❌ Missing Twilio credentials - cannot proceed with status checks');
      return;
    }
    
    // 2. Initialize Twilio client
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // 3. Get recent messages from Twilio (last 20)
    console.log('🔍 Fetching recent messages from Twilio...');
    const messages = await client.messages.list({ 
      limit: 20,
      dateSentAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    });
    
    console.log(`📊 Found ${messages.length} messages in last 7 days`);
    
    if (messages.length === 0) {
      console.log('📊 No recent messages found in Twilio account');
      return;
    }
    
    // 4. Analyze message delivery status
    const statusAnalysis = {
      delivered: 0,
      sent: 0,
      queued: 0,
      sending: 0,
      failed: 0,
      undelivered: 0,
      unknown: 0,
      total: messages.length
    };
    
    const issuesFound = [];
    
    console.log('\n📋 DETAILED MESSAGE ANALYSIS:');
    console.log('SID | Status | To | Error | Date');
    console.log(''.padEnd(80, '-'));
    
    for (const message of messages) {
      const status = message.status;
      const errorCode = message.errorCode;
      const to = message.to;
      const dateSent = message.dateSent;
      
      // Count status types
      if (statusAnalysis.hasOwnProperty(status)) {
        statusAnalysis[status]++;
      } else {
        statusAnalysis.unknown++;
      }
      
      // Log message details
      console.log(`${message.sid} | ${status.padEnd(12)} | ${to.padEnd(15)} | ${errorCode || 'none'.padEnd(8)} | ${dateSent?.toISOString().split('T')[0] || 'unknown'}`);
      
      // Check for common issues from user's list
      if (errorCode === '21211') {
        issuesFound.push(`Issue #1: Invalid phone number format for ${to} (Error 21211)`);
      }
      if (errorCode === '21610') {
        issuesFound.push(`Issue #4: Message to unverified number ${to} in trial account (Error 21610)`);
      }
      if (errorCode === '30003') {
        issuesFound.push(`Issue #1: Unreachable destination handset ${to} (Error 30003)`);
      }
      if (errorCode === '20003') {
        issuesFound.push(`Issue #4: Twilio authentication failed (Error 20003)`);
      }
      
      // Check for phone number format issues  
      if (!to.startsWith('+') || to.replace(/\D/g, '').length < 10) {
        issuesFound.push(`Issue #1: Incorrect phone number format: ${to}`);
      }
      
      // Check for stuck messages (sent but not delivered for >1 hour)
      if (status === 'sent' && dateSent && 
          new Date().getTime() - dateSent.getTime() > 3600000) {
        issuesFound.push(`Issue #3: Message ${message.sid} stuck in 'sent' status (carrier/network issues)`);
      }
    }
    
    console.log('\n📊 DELIVERY STATUS SUMMARY:');
    console.log(JSON.stringify(statusAnalysis, null, 2));
    
    console.log('\n🚨 ISSUES FOUND:');
    if (issuesFound.length === 0) {
      console.log('✅ No delivery issues detected based on your list of concerns');
    } else {
      issuesFound.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    // 5. Account info check
    try {
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      console.log('\n📊 ACCOUNT STATUS:');
      console.log(`Status: ${account.status}`);
      console.log(`Type: ${account.type}`);
      if (account.type === 'Trial') {
        console.log('⚠️  Trial Account - Only verified numbers can receive messages');
      }
    } catch (error) {
      console.log('❌ Could not fetch account information:', error.message);
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Verify phone numbers are in E.164 format (+country_code_phone_number)');
    console.log('2. Check Twilio Console for detailed error messages and delivery receipts');
    console.log('3. For WhatsApp: Ensure recipient has WhatsApp and template messages are approved');
    console.log('4. Consider carrier restrictions and regional regulations');
    console.log('5. Monitor delivery status changes over time (some carriers have delays)');
    
  } catch (error) {
    console.error('❌ Error running diagnostic:', error);
    if (error.code === 20003) {
      console.log('❌ Authentication failed - check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    }
  }
}

// Run the diagnostic
runTwilioDeliveryDiagnostic();