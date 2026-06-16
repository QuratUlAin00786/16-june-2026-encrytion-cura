// Quick script to fix subscription status for hassan@averox.com
// Run this with: node fix-subscription.js

import { db } from './server/db.ts';
import { users, saasSubscriptions } from './shared/schema.ts';
import { eq, desc } from 'drizzle-orm';

async function fixSubscription() {
  try {
    console.log('🔍 Looking up user hassan@averox.com...');
    
    // Find user by email
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, 'hassan@averox.com'))
      .limit(1);

    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    console.log(`📋 Organization ID: ${user.organizationId}`);

    // Find subscription
    const [subscription] = await db.select()
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.organizationId, user.organizationId))
      .orderBy(desc(saasSubscriptions.id))
      .limit(1);

    if (!subscription) {
      console.error('❌ No subscription found for this organization');
      process.exit(1);
    }

    console.log(`📦 Found subscription ID: ${subscription.id}`);
    console.log(`📊 Current status: ${subscription.status}`);

    // Update subscription
    const [updated] = await db.update(saasSubscriptions)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(saasSubscriptions.id, subscription.id))
      .returning();

    console.log(`✅ Successfully updated subscription to: ${updated.status}`);
    console.log('🎉 Subscription is now active! User can login.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSubscription();
