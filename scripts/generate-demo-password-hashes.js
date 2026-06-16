/**
 * Generate bcrypt password hashes for demo credentials
 * Run: node scripts/generate-demo-password-hashes.js
 */

const bcrypt = require('bcrypt');

async function generateHashes() {
  const password = 'demo123';
  const saltRounds = 10;
  
  console.log('Generating bcrypt hashes for password: demo123\n');
  console.log('='.repeat(60));
  
  // Generate multiple hashes (bcrypt generates different hashes each time)
  for (let i = 0; i < 12; i++) {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log(`Hash ${i + 1}: ${hash}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\nNote: Use any of these hashes in the SQL file.');
  console.log('Each hash will work for the password "demo123"');
  console.log('Bcrypt generates different hashes each time, but all verify correctly.');
}

generateHashes().catch(console.error);
