const https = require('https');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.log('❌ Missing Twilio credentials');
  process.exit(1);
}

const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

const options = {
  hostname: 'api.twilio.com',
  port: 443,
  path: `/2010-04-01/Accounts/${accountSid}/Messages.json?PageSize=20`,
  method: 'GET',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
};

console.log('🔍 TWILIO DELIVERY DIAGNOSTIC - Checking recent messages...');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.messages) {
        console.log(`📊 Found ${response.messages.length} recent messages`);
        
        const statusCounts = {};
        const issues = [];
        
        console.log('\n📋 MESSAGE STATUS ANALYSIS:');
        console.log('SID\t\t\t\t\t\t\t\tStatus\t\tTo\t\t\tError\tDate');
        console.log(''.padEnd(120, '-'));
        
        response.messages.forEach(msg => {
          const status = msg.status;
          const to = msg.to;
          const errorCode = msg.error_code || 'none';
          const dateSent = (msg.date_sent || 'unknown').split('T')[0];
          
          statusCounts[status] = (statusCounts[status] || 0) + 1;
          
          console.log(`${msg.sid}\t${status}\t\t${to}\t\t${errorCode}\t${dateSent}`);
          
          // Check for common issues from your list
          if (msg.error_code === 21211) {
            issues.push(`Issue #1: Invalid phone number format for ${to} (Error 21211)`);
          }
          if (msg.error_code === 21610) {
            issues.push(`Issue #4: Message to unverified number ${to} in trial account (Error 21610)`);
          }
          if (msg.error_code === 30003) {
            issues.push(`Issue #1: Unreachable destination handset ${to} (Error 30003)`);
          }
          if (msg.error_code === 20003) {
            issues.push(`Issue #4: Twilio authentication failed (Error 20003)`);
          }
          
          // Check phone format issues
          if (!to.startsWith('+') || to.replace(/\D/g, '').length < 10) {
            issues.push(`Issue #1: Incorrect phone number format: ${to}`);
          }
          
          // Check for stuck messages
          if (status === 'sent' && msg.date_sent) {
            const sentTime = new Date(msg.date_sent);
            const hoursSinceSubmit = (new Date() - sentTime) / (1000 * 60 * 60);
            if (hoursSinceSubmit > 1) {
              issues.push(`Issue #3: Message ${msg.sid} stuck in 'sent' status for ${hoursSinceSubmit.toFixed(1)} hours`);
            }
          }
        });
        
        console.log('\n📊 STATUS SUMMARY:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`${status}: ${count}`);
        });
        
        console.log('\n🚨 DELIVERY ISSUES FOUND:');
        if (issues.length === 0) {
          console.log('✅ No delivery issues detected based on your concerns');
        } else {
          issues.forEach((issue, i) => {
            console.log(`${i + 1}. ${issue}`);
          });
        }
        
        // Calculate delivery rate
        const totalMessages = response.messages.length;
        const deliveredMessages = response.messages.filter(m => m.status === 'delivered').length;
        const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages * 100).toFixed(1) : 0;
        
        console.log(`\n📊 DELIVERY RATE: ${deliveryRate}% (${deliveredMessages}/${totalMessages} delivered)`);
        
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('1. Verify phone numbers are in E.164 format (+country_code_phone_number)');
        console.log('2. Check Twilio Console for detailed error messages and delivery receipts');
        console.log('3. For WhatsApp: Ensure recipient has WhatsApp and template messages are approved');
        console.log('4. Consider carrier restrictions and regional regulations');
        console.log('5. Monitor delivery status changes over time (some carriers have delays)');
        
      } else {
        console.log('❌ Error response:', response);
        if (response.code === 20003) {
          console.log('❌ Authentication failed - check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
        }
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.end();
