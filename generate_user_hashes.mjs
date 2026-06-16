import bcrypt from 'bcrypt';

const users = [
  { email: 'james@curaemr.ai', password: '467fe887', role: 'admin', name: 'James Admin' },
  { email: 'paul@curaemr.ai', password: 'doctor123', role: 'doctor', name: 'Paul Doctor' },
  { email: 'emma@curaemr.ai', password: 'nurse123', role: 'nurse', name: 'Emma Nurse' },
  { email: 'john@curaemr.ai', password: 'patient123', role: 'patient', name: 'John Patient' },
  { email: 'amelia@curaemr.ai', password: 'lab123', role: 'lab_technician', name: 'Amelia Lab' },
  { email: 'sampletaker@curaemr.ai', password: 'sample123', role: 'sample_taker', name: 'Sample Taker' }
];

async function generateHashes() {
  console.log('-- =============================================');
  console.log('-- CURA EMR USERS INSERT QUERIES');
  console.log('-- Generated:', new Date().toISOString());
  console.log('-- =============================================\n');
  
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    const [firstName, ...lastNameParts] = user.name.split(' ');
    const lastName = lastNameParts.join(' ');
    const username = user.email.split('@')[0];
    
    console.log(`-- ${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
    console.log(`INSERT INTO public.users (`);
    console.log(`    organization_id, email, username, password_hash,`);
    console.log(`    first_name, last_name, role, is_active`);
    console.log(`) VALUES (`);
    console.log(`    1,`);
    console.log(`    '${user.email}',`);
    console.log(`    '${username}',`);
    console.log(`    '${hash}',`);
    console.log(`    '${firstName}',`);
    console.log(`    '${lastName}',`);
    console.log(`    '${user.role}',`);
    console.log(`    true`);
    console.log(`);\n`);
  }
  
  console.log('\n-- =============================================');
  console.log('-- BULK INSERT (All Users at Once)');
  console.log('-- =============================================\n');
  
  console.log('INSERT INTO public.users (');
  console.log('    organization_id, email, username, password_hash,');
  console.log('    first_name, last_name, role, is_active');
  console.log(') VALUES');
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const hash = await bcrypt.hash(user.password, 10);
    const [firstName, ...lastNameParts] = user.name.split(' ');
    const lastName = lastNameParts.join(' ');
    const username = user.email.split('@')[0];
    
    const comma = i < users.length - 1 ? ',' : ';';
    console.log(`    (1, '${user.email}', '${username}', '${hash}', '${firstName}', '${lastName}', '${user.role}', true)${comma}`);
  }
  
  console.log('\n\n-- =============================================');
  console.log('-- LOGIN CREDENTIALS REFERENCE');
  console.log('-- =============================================');
  users.forEach(user => {
    console.log(`-- ${user.role.toUpperCase().padEnd(15)} | ${user.email.padEnd(30)} | ${user.password}`);
  });
}

generateHashes().catch(console.error);
