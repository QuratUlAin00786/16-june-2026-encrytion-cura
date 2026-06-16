// Quick script to fix subscription status for hassan@averox.com
// Run this with: node scripts/fix-subscription.mjs

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import database connection
const { db } = await import('../server/db.ts');
const { users, saasSubscriptions } = await import('../shared/schema.ts');
const { eq, desc } = await import('drizzle-orm');

async function fixSubscription() {
  try {
    console.log('🔍 Looking up user hassan@averox.com...');
    
    // Find user by email
    const userResults = await db.select()
      .from(users)
      .where(eq(users.email, 'hassan@averox.com'))
      .limit(1);

    if (userResults.length === 0) {
      console.error('❌ User not found');
      process.exit(1);
    }

    const user = userResults[0];
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    console.log(`📋 Organization ID: ${user.organizationId}`);

    // Find subscription
    const subscriptionResults = await db.select()
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.organizationId, user.organizationId))
      .orderBy(desc(saasSubscriptions.id))
      .limit(1);

    if (subscriptionResults.length === 0) {
      console.error('❌ No subscription found for this organization');
      process.exit(1);
    }

    const subscription = subscriptionResults[0];
    console.log(`📦 Found subscription ID: ${subscription.id}`);
    console.log(`📊 Current status: ${subscription.status}`);

    // Update subscription
    const updatedResults = await db.update(saasSubscriptions)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(saasSubscriptions.id, subscription.id))
      .returning();

    if (updatedResults.length === 0) {
      console.error('❌ Failed to update subscription');
      process.exit(1);
    }

    const updated = updatedResults[0];
    console.log(`✅ Successfully updated subscription to: ${updated.status}`);
    console.log('🎉 Subscription is now active! User can login.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSubscription();
