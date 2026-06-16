// Script to check subscription status for a user
// Usage: tsx check-subscription.ts averox71@gmail.com

import { db } from './server/db.js';
import { users, saasSubscriptions, organizations } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkSubscription(email: string) {
  try {
    console.log(`\n🔍 Checking subscription for: ${email}\n`);
    
    // 1. Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }
    
    console.log(`✅ User found:`);
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Name: ${user.firstName} ${user.lastName}`);
    console.log(`   - Organization ID: ${user.organizationId}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Active: ${user.isActive}`);
    
    // 2. Get organization details
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);
    
    if (organization) {
      console.log(`\n📋 Organization:`);
      console.log(`   - Name: ${organization.name}`);
      console.log(`   - Subdomain: ${organization.subdomain}`);
    }
    
    // 3. Get subscription from saas_subscriptions table
    const [subscription] = await db
      .select()
      .from(saasSubscriptions)
      .where(eq(saasSubscriptions.organizationId, user.organizationId))
      .limit(1);
    
    if (!subscription) {
      console.log(`\n⚠️  No subscription found for organization ID: ${user.organizationId}`);
      return;
    }
    
    console.log(`\n📦 Subscription Details:`);
    console.log(`   - Subscription ID: ${subscription.id}`);
    console.log(`   - Organization ID: ${subscription.organizationId}`);
    console.log(`   - Package ID: ${subscription.packageId}`);
    console.log(`   - Status: ${subscription.status}`);
    console.log(`   - Payment Status: ${subscription.paymentStatus}`);
    
    if (subscription.currentPeriodStart) {
      console.log(`   - Current Period Start: ${new Date(subscription.currentPeriodStart).toLocaleString()}`);
    }
    if (subscription.currentPeriodEnd) {
      console.log(`   - Current Period End: ${new Date(subscription.currentPeriodEnd).toLocaleString()}`);
    }
    if (subscription.trialEnd) {
      console.log(`   - Trial End: ${new Date(subscription.trialEnd).toLocaleString()}`);
    }
    if (subscription.expiresAt) {
      const expiresAt = new Date(subscription.expiresAt);
      const now = new Date();
      const isExpired = expiresAt.getTime() < now.getTime();
      
      console.log(`   - Expires At: ${expiresAt.toLocaleString()}`);
      console.log(`   - Expires At (ISO): ${expiresAt.toISOString()}`);
      console.log(`   - Current Date/Time: ${now.toLocaleString()}`);
      console.log(`   - Current Date/Time (ISO): ${now.toISOString()}`);
      console.log(`   - Expires At Timestamp: ${expiresAt.getTime()}`);
      console.log(`   - Current Timestamp: ${now.getTime()}`);
      console.log(`   - Time Difference (ms): ${now.getTime() - expiresAt.getTime()}`);
      console.log(`   - Is Expired: ${isExpired ? '❌ YES' : '✅ NO'}`);
      
      if (isExpired) {
        const daysExpired = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   - Days Expired: ${daysExpired} days`);
      } else {
        const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   - Days Remaining: ${daysRemaining} days`);
      }
    } else {
      console.log(`   - Expires At: Not set`);
    }
    
    console.log(`   - Max Users: ${subscription.maxUsers || 'N/A'}`);
    console.log(`   - Max Patients: ${subscription.maxPatients || 'N/A'}`);
    if (subscription.details) {
      console.log(`   - Details: ${subscription.details}`);
    }
    
    // Final verdict
    console.log(`\n${'='.repeat(60)}`);
    if (subscription.expiresAt) {
      const expiresAt = new Date(subscription.expiresAt);
      const now = new Date();
      if (expiresAt.getTime() < now.getTime()) {
        console.log(`❌ SUBSCRIPTION IS EXPIRED`);
        console.log(`   Expired on: ${expiresAt.toLocaleString()}`);
      } else {
        console.log(`✅ SUBSCRIPTION IS ACTIVE`);
        console.log(`   Expires on: ${expiresAt.toLocaleString()}`);
      }
    } else {
      console.log(`⚠️  SUBSCRIPTION EXPIRATION DATE NOT SET`);
    }
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('❌ Error checking subscription:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('Usage: tsx check-subscription.ts <email>');
  process.exit(1);
}

checkSubscription(email);
