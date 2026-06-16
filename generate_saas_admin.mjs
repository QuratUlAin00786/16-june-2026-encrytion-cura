import bcrypt from 'bcrypt';

const saasAdmin = {
  email: 'saasadmin@curaemr.ai',
  password: 'saas123',
  username: 'saasadmin',
  firstName: 'SaaS',
  lastName: 'Administrator'
};

async function generateSaasAdmin() {
  const hash = await bcrypt.hash(saasAdmin.password, 10);
  
  console.log('-- =============================================');
  console.log('-- SAAS ADMIN INSERT QUERY');
  console.log('-- Generated:', new Date().toISOString());
  console.log('-- =============================================\n');
  
  console.log('-- SaaS Administrator User');
  console.log(`-- Email: ${saasAdmin.email}`);
  console.log(`-- Password: ${saasAdmin.password}`);
  console.log(`-- Role: admin (with is_saas_owner = true)\n`);
  
  console.log('INSERT INTO public.users (');
  console.log('    organization_id,');
  console.log('    email,');
  console.log('    username,');
  console.log('    password_hash,');
  console.log('    first_name,');
  console.log('    last_name,');
  console.log('    role,');
  console.log('    is_active,');
  console.log('    is_saas_owner');
  console.log(') VALUES (');
  console.log(`    1,                                    -- organization_id`);
  console.log(`    '${saasAdmin.email}',                 -- email`);
  console.log(`    '${saasAdmin.username}',              -- username`);
  console.log(`    '${hash}',  -- password_hash (bcrypt)`);
  console.log(`    '${saasAdmin.firstName}',             -- first_name`);
  console.log(`    '${saasAdmin.lastName}',              -- last_name`);
  console.log(`    'admin',                              -- role`);
  console.log(`    true,                                 -- is_active`);
  console.log(`    true                                  -- is_saas_owner (THIS MAKES IT SAAS ADMIN)`);
  console.log(');\n');
  
  console.log('\n-- =============================================');
  console.log('-- NOTES');
  console.log('-- =============================================');
  console.log('-- A SaaS Admin is defined by:');
  console.log('--   1. role = "admin"');
  console.log('--   2. is_saas_owner = true');
  console.log('--');
  console.log('-- This gives the user full system access including:');
  console.log('--   - Multi-organization management');
  console.log('--   - SaaS subscription management');
  console.log('--   - Global system settings');
  console.log('--   - All admin privileges');
  console.log('\n');
  
  console.log('-- =============================================');
  console.log('-- LOGIN CREDENTIALS');
  console.log('-- =============================================');
  console.log(`-- Email: ${saasAdmin.email}`);
  console.log(`-- Password: ${saasAdmin.password}`);
}

generateSaasAdmin().catch(console.error);
