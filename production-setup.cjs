#!/usr/bin/env node

const bcrypt = require('bcrypt');
const { neonConfig, Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { saasOwners } = require('./shared/schema.ts');
const { eq } = require('drizzle-orm');
const ws = require("ws");
const readline = require('readline');

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupSaaSOwner() {
  try {
    const pool = new Pool({ connectionString: DATABASE_URL });
    const db = drizzle({ client: pool });

    console.log('\n🚀 Cura EMR Production Setup');
    console.log('================================\n');

    // Check if SaaS owner already exists
    const [existingOwner] = await db.select().from(saasOwners).where(eq(saasOwners.username, 'saas_admin'));

    if (existingOwner) {
      console.log('ℹ️  SaaS owner already exists!');
      console.log(`Current Username: ${existingOwner.username}`);
      console.log(`Current Email: ${existingOwner.email}\n`);

      const action = await question('What would you like to do?\n1. Reset password\n2. Change username\n3. Change email\n4. Exit\nEnter option (1-4): ');

      switch (action.trim()) {
        case '1':
          await resetPassword(db, existingOwner.id);
          break;
        case '2':
          await changeUsername(db, existingOwner.id);
          break;
        case '3':
          await changeEmail(db, existingOwner.id);
          break;
        case '4':
          console.log('Setup cancelled.');
          break;
        default:
          console.log('Invalid option. Setup cancelled.');
      }
    } else {
      await createNewOwner(db);
    }

    rl.close();

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    rl.close();
    process.exit(1);
  }
}

async function createNewOwner(db) {
  console.log('Creating new SaaS owner...\n');

  const username = await question('Enter username (default: saas_admin): ') || 'saas_admin';
  const email = await question('Enter email (default: admin@curapms.ai): ') || 'admin@curapms.ai';
  const password = await question('Enter password (default: admin123): ') || 'admin123';
  const firstName = await question('Enter first name (default: SaaS): ') || 'SaaS';
  const lastName = await question('Enter last name (default: Administrator): ') || 'Administrator';

  const hashedPassword = await bcrypt.hash(password, 10);

  const [owner] = await db.insert(saasOwners).values({
    username,
    password: hashedPassword,
    email,
    firstName,
    lastName,
    isActive: true,
  }).returning();

  console.log('\n✅ SaaS Owner created successfully!');
  console.log('================================');
  console.log(`Username: ${owner.username}`);
  console.log(`Email: ${owner.email}`);
  console.log(`Password: ${password}`);
  console.log(`ID: ${owner.id}`);
  console.log('\n🔐 Access the SaaS portal at: /saas');
  console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
}

async function resetPassword(db, ownerId) {
  const newPassword = await question('Enter new password: ');
  
  if (!newPassword.trim()) {
    console.log('❌ Password cannot be empty');
    return;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await db.update(saasOwners)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(saasOwners.id, ownerId));

  console.log('\n✅ Password updated successfully!');
  console.log(`New Password: ${newPassword}`);
  console.log('\n⚠️  IMPORTANT: Save this password securely!');
}

async function changeUsername(db, ownerId) {
  const newUsername = await question('Enter new username: ');
  
  if (!newUsername.trim()) {
    console.log('❌ Username cannot be empty');
    return;
  }

  try {
    await db.update(saasOwners)
      .set({ username: newUsername, updatedAt: new Date() })
      .where(eq(saasOwners.id, ownerId));

    console.log('\n✅ Username updated successfully!');
    console.log(`New Username: ${newUsername}`);
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      console.log('❌ Username already exists. Please choose a different one.');
    } else {
      throw error;
    }
  }
}

async function changeEmail(db, ownerId) {
  const newEmail = await question('Enter new email: ');
  
  if (!newEmail.trim() || !newEmail.includes('@')) {
    console.log('❌ Please enter a valid email address');
    return;
  }

  await db.update(saasOwners)
    .set({ email: newEmail, updatedAt: new Date() })
    .where(eq(saasOwners.id, ownerId));

  console.log('\n✅ Email updated successfully!');
  console.log(`New Email: ${newEmail}`);
}

// Run the setup
setupSaaSOwner().catch(console.error);