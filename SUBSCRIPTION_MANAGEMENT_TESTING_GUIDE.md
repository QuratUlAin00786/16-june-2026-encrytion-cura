# Subscription Management Testing Guide

## Overview
This guide provides comprehensive testing scenarios for the subscription management system, including upgrade, downgrade, cancel, and billing cycle changes.

---

## Prerequisites

### Environment Setup
1. **Stripe Configuration**
   - Set `STRIPE_SECRET_KEY` in `.env`
   - Set `STRIPE_WEBHOOK_SECRET` in `.env`
   - Configure webhook endpoint in Stripe Dashboard:
     - URL: `https://yourdomain.com/api/saas/webhooks/stripe`
     - Events: `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`

2. **Database Setup**
   - Ensure all migrations are applied
   - Verify `saas_packages` table has test plans with `stripe_price_id` configured
   - Verify `organizations` table has `stripe_customer_id` field

3. **Test Accounts**
   - Create test organization with admin user
   - Ensure organization has active subscription for testing upgrades/downgrades

---

## Test Scenarios

### 1. Upgrade Subscription

#### Test Case 1.1: Upgrade from Basic to Gold (Immediate Effect)
**Steps:**
1. Login as admin user
2. Navigate to `/subscription` page
3. Verify current subscription is "Basic Plan"
4. Click "Upgrade to Gold Plan" button
5. Confirm upgrade in dialog (if any)

**Expected Results:**
- ✅ Upgrade button shows "Processing..." during request
- ✅ Success message: "Subscription upgraded successfully. New features are now active."
- ✅ Subscription status updates immediately
- ✅ New plan features are immediately available
- ✅ Proration is calculated and charged correctly
- ✅ Invoice is generated for the prorated amount
- ✅ Database shows new `packageId` and `stripePriceId`
- ✅ `currentPeriodStart` and `currentPeriodEnd` are updated

**Verification:**
```sql
-- Check subscription in database
SELECT id, package_id, status, billing_cycle, current_period_start, current_period_end 
FROM saas_subscriptions 
WHERE organization_id = <test_org_id>;

-- Check payment record
SELECT * FROM saas_payments 
WHERE subscription_id = <subscription_id> 
ORDER BY created_at DESC LIMIT 1;
```

#### Test Case 1.2: Upgrade from Gold to Enterprise
**Steps:**
1. Start with Gold Plan subscription
2. Click "Upgrade to Enterprise Plan"
3. Complete upgrade process

**Expected Results:**
- ✅ Same as Test Case 1.1
- ✅ Proration correctly calculates unused Gold plan credit
- ✅ Enterprise features immediately available

---

### 2. Downgrade Subscription

#### Test Case 2.1: Downgrade with Usage Within Limits
**Prerequisites:**
- Current subscription: Enterprise Plan (e.g., 100 users, 10,000 patients)
- Current usage: 50 users, 5,000 patients
- Target plan: Gold Plan (e.g., 50 users, 5,000 patients)

**Steps:**
1. Login as admin user
2. Navigate to `/subscription` page
3. Click "Downgrade to Gold Plan" button
4. Confirm downgrade

**Expected Results:**
- ✅ Downgrade succeeds without errors
- ✅ Success message: "Subscription will be downgraded at the next billing cycle."
- ✅ Current features remain active until `currentPeriodEnd`
- ✅ Database shows new `packageId` but keeps current `currentPeriodEnd`
- ✅ No immediate refund issued
- ✅ Subscription status remains "active"

**Verification:**
```sql
-- Check subscription
SELECT package_id, status, cancel_at_period_end, current_period_end 
FROM saas_subscriptions 
WHERE organization_id = <test_org_id>;
```

#### Test Case 2.2: Downgrade Blocked - Users Exceed Limit
**Prerequisites:**
- Current subscription: Enterprise Plan (100 users limit)
- Current usage: 100 active users
- Target plan: Gold Plan (50 users limit)

**Steps:**
1. Login as admin user
2. Navigate to `/subscription` page
3. Click "Downgrade to Gold Plan" button

**Expected Results:**
- ✅ Downgrade validation dialog appears
- ✅ Error message: "You have 100 active users, but the new plan allows only 50. You need to delete 50 user(s) before downgrading."
- ✅ Shows required deletions: `{ users: 50, patients: 0 }`
- ✅ Downgrade is blocked
- ✅ Subscription remains unchanged

**Verification:**
- Check browser console for validation errors
- Verify subscription in database is unchanged

#### Test Case 2.3: Downgrade Blocked - Patients Exceed Limit
**Prerequisites:**
- Current subscription: Enterprise Plan (10,000 patients limit)
- Current usage: 10,000 patients
- Target plan: Gold Plan (5,000 patients limit)

**Steps:**
1. Login as admin user
2. Navigate to `/subscription` page
3. Click "Downgrade to Gold Plan" button

**Expected Results:**
- ✅ Downgrade validation dialog appears
- ✅ Error message: "You have 10,000 patients, but the new plan allows only 5,000. You need to delete 5,000 patient(s) before downgrading."
- ✅ Shows required deletions: `{ users: 0, patients: 5000 }`
- ✅ Downgrade is blocked

#### Test Case 2.4: Downgrade After Reducing Usage
**Prerequisites:**
- Start with Test Case 2.2 scenario (100 users, trying to downgrade to 50)
- Delete 50 users to bring count to 50

**Steps:**
1. Delete 50 users from the system
2. Navigate to `/subscription` page
3. Click "Downgrade to Gold Plan" button again

**Expected Results:**
- ✅ Downgrade succeeds (same as Test Case 2.1)
- ✅ No validation errors

---

### 3. Cancel Subscription

#### Test Case 3.1: Cancel at Period End
**Steps:**
1. Login as admin user
2. Navigate to `/subscription` page
3. Click "Cancel Subscription" button on current plan
4. Confirm cancellation in dialog

**Expected Results:**
- ✅ Cancel dialog shows expiration date
- ✅ Success message: "Subscription will be cancelled at the end of the current billing period."
- ✅ Database shows `cancel_at_period_end = true`
- ✅ Subscription status remains "active" until expiration
- ✅ Features remain available until `currentPeriodEnd`
- ✅ After expiration, subscription auto-downgrades to Basic plan

**Verification:**
```sql
-- Check cancellation flag
SELECT cancel_at_period_end, current_period_end, status 
FROM saas_subscriptions 
WHERE organization_id = <test_org_id>;
```

#### Test Case 3.2: Cancel Immediate (if implemented)
**Steps:**
1. Login as admin user
2. Navigate to `/subscription` page
3. Click "Cancel Subscription" button
4. Select "Immediate Cancellation" option (if available)

**Expected Results:**
- ✅ Subscription cancelled immediately
- ✅ Account downgraded to Basic plan
- ✅ Paid features disabled immediately
- ✅ Refund processed (if applicable)

---

### 4. Change Billing Cycle

#### Test Case 4.1: Monthly → Annual (Immediate)
**Prerequisites:**
- Current subscription: Gold Plan, Monthly billing
- Current period: Started 10 days ago (20 days remaining)

**Steps:**
1. Login as admin user
2. Navigate to `/subscription` page
3. Click "Change Cycle" button in "Current SaaS Subscription Snapshot"
4. Select "Switch to Annual" in dialog
5. Confirm change

**Expected Results:**
- ✅ Success message: "Billing cycle changed to annual. Unused monthly credit applied."
- ✅ Billing cycle updates immediately to "annual"
- ✅ Unused 20 days of monthly subscription credited toward annual
- ✅ `currentPeriodEnd` extends to 1 year from now
- ✅ Database shows `billingCycle = 'annual'`
- ✅ New `stripePriceId` for annual plan

**Verification:**
```sql
-- Check billing cycle
SELECT billing_cycle, stripe_price_id, current_period_start, current_period_end 
FROM saas_subscriptions 
WHERE organization_id = <test_org_id>;
```

#### Test Case 4.2: Annual → Monthly (At Next Renewal)
**Prerequisites:**
- Current subscription: Gold Plan, Annual billing
- Current period: Started 2 months ago (10 months remaining)

**Steps:**
1. Login as admin user
2. Navigate to `/subscription` page
3. Click "Change Cycle" button
4. Select "Switch to Monthly" in dialog
5. Confirm change

**Expected Results:**
- ✅ Success message: "Billing cycle will change to monthly at the next renewal date."
- ✅ Database shows `billingCycle = 'monthly'`
- ✅ `currentPeriodEnd` remains unchanged (10 months from now)
- ✅ Change takes effect at next renewal
- ✅ Current features remain active until renewal

---

### 5. Webhook Events

#### Test Case 5.1: Subscription Created Webhook
**Steps:**
1. Create new subscription via Stripe Dashboard or API
2. Trigger `customer.subscription.created` webhook

**Expected Results:**
- ✅ Webhook endpoint receives event
- ✅ Subscription synced to database
- ✅ Organization linked to Stripe customer
- ✅ Status, billing cycle, and dates updated correctly

**Verification:**
- Check server logs for webhook processing
- Verify database subscription record

#### Test Case 5.2: Subscription Updated Webhook
**Steps:**
1. Update subscription in Stripe Dashboard (change plan, billing cycle)
2. Trigger `customer.subscription.updated` webhook

**Expected Results:**
- ✅ Webhook endpoint receives event
- ✅ Database subscription updated
- ✅ All fields synced correctly

#### Test Case 5.3: Subscription Deleted Webhook
**Steps:**
1. Cancel subscription in Stripe Dashboard
2. Trigger `customer.subscription.deleted` webhook

**Expected Results:**
- ✅ Webhook endpoint receives event
- ✅ Organization downgraded to Basic plan
- ✅ Subscription status set to "cancelled"
- ✅ `cancel_at_period_end = false`

#### Test Case 5.4: Invoice Paid Webhook
**Steps:**
1. Process successful payment in Stripe
2. Trigger `invoice.paid` webhook

**Expected Results:**
- ✅ Webhook endpoint receives event
- ✅ Payment record created in `saas_payments` table
- ✅ Subscription `paymentStatus` updated to "paid"
- ✅ Invoice details stored correctly

**Verification:**
```sql
-- Check payment record
SELECT * FROM saas_payments 
WHERE provider_transaction_id = <stripe_invoice_id> 
ORDER BY created_at DESC LIMIT 1;
```

#### Test Case 5.5: Invoice Payment Failed Webhook
**Steps:**
1. Simulate payment failure in Stripe (use test card: `4000000000000002`)
2. Trigger `invoice.payment_failed` webhook

**Expected Results:**
- ✅ Webhook endpoint receives event
- ✅ Subscription `paymentStatus` updated to "failed"
- ✅ Subscription `status` updated to "expired"
- ✅ Organization admin notified (if email service configured)

---

### 6. Edge Cases and Error Handling

#### Test Case 6.1: Upgrade with Missing Stripe Price ID
**Steps:**
1. Create package without `stripe_price_id`
2. Attempt to upgrade to that package

**Expected Results:**
- ✅ Error message: "Package does not have a Stripe Price ID configured"
- ✅ Upgrade fails gracefully
- ✅ User sees clear error message

#### Test Case 6.2: Downgrade with Invalid Subscription ID
**Steps:**
1. Attempt downgrade with non-existent subscription ID

**Expected Results:**
- ✅ Error: "Subscription not found"
- ✅ Request fails with 404 status

#### Test Case 6.3: Cancel Already Cancelled Subscription
**Steps:**
1. Cancel subscription
2. Attempt to cancel again

**Expected Results:**
- ✅ System handles gracefully
- ✅ Shows appropriate message or prevents duplicate cancellation

#### Test Case 6.4: Change Cycle When Already on That Cycle
**Steps:**
1. Subscription is on monthly billing
2. Attempt to change to monthly

**Expected Results:**
- ✅ Error: "Already on this billing cycle"
- ✅ Request fails with 400 status

#### Test Case 6.5: Webhook with Invalid Signature
**Steps:**
1. Send webhook request with wrong signature

**Expected Results:**
- ✅ Webhook endpoint rejects request
- ✅ Returns 400 error
- ✅ Logs error for debugging

---

### 7. UI/UX Testing

#### Test Case 7.1: Button States
**Verify:**
- ✅ "Currently Subscribed" button is disabled for current plan
- ✅ "Upgrade" buttons show "Processing..." during request
- ✅ "Downgrade" buttons show "Processing..." during request
- ✅ Buttons are disabled during loading states

#### Test Case 7.2: Dialog Modals
**Verify:**
- ✅ Downgrade validation dialog shows all errors clearly
- ✅ Cancel dialog shows expiration date
- ✅ Billing cycle change dialog explains immediate vs. renewal effect
- ✅ All dialogs can be closed/cancelled

#### Test Case 7.3: Error Messages
**Verify:**
- ✅ All error messages are user-friendly
- ✅ Technical errors are logged but not shown to user
- ✅ Success messages are clear and actionable

#### Test Case 7.4: Responsive Design
**Verify:**
- ✅ Subscription page works on mobile devices
- ✅ Dialogs are responsive
- ✅ Tables and cards adapt to screen size

---

### 8. Integration Testing

#### Test Case 8.1: Full Upgrade Flow
**Steps:**
1. Start with Basic Plan
2. Upgrade to Gold Plan
3. Verify features are available
4. Upgrade to Enterprise Plan
5. Verify all features are available

**Expected Results:**
- ✅ All upgrades succeed
- ✅ Features accumulate correctly
- ✅ Database is consistent throughout

#### Test Case 8.2: Full Downgrade Flow
**Steps:**
1. Start with Enterprise Plan
2. Reduce usage to match Gold Plan limits
3. Downgrade to Gold Plan
4. Reduce usage to match Basic Plan limits
5. Cancel subscription (downgrade to Basic)

**Expected Results:**
- ✅ All downgrades succeed
- ✅ Features are removed at appropriate times
- ✅ Database is consistent throughout

#### Test Case 8.3: Billing Cycle Change Flow
**Steps:**
1. Start with Monthly billing
2. Change to Annual
3. Wait for renewal
4. Change back to Monthly

**Expected Results:**
- ✅ All changes succeed
- ✅ Billing dates are correct
- ✅ Proration is calculated correctly

---

## Test Data Setup

### Create Test Packages
```sql
-- Basic Plan (Free)
INSERT INTO saas_packages (name, price, billing_cycle, features, is_active, show_on_website)
VALUES ('Basic', 0, 'monthly', '{"maxUsers": 5, "maxPatients": 100}', true, true);

-- Gold Plan
INSERT INTO saas_packages (name, price, billing_cycle, stripe_price_id, features, is_active, show_on_website)
VALUES ('Gold', 99, 'monthly', 'price_gold_monthly', '{"maxUsers": 50, "maxPatients": 5000}', true, true);

-- Enterprise Plan
INSERT INTO saas_packages (name, price, billing_cycle, stripe_price_id, features, is_active, show_on_website)
VALUES ('Enterprise', 199, 'monthly', 'price_enterprise_monthly', '{"maxUsers": 100, "maxPatients": 10000}', true, true);
```

### Create Test Subscription
```sql
-- Create subscription for test organization
INSERT INTO saas_subscriptions (
  organization_id, 
  package_id, 
  stripe_subscription_id,
  stripe_customer_id,
  stripe_price_id,
  billing_cycle,
  status,
  payment_status,
  current_period_start,
  current_period_end
)
VALUES (
  1, -- organization_id
  2, -- package_id (Gold Plan)
  'sub_test_123',
  'cus_test_123',
  'price_gold_monthly',
  'monthly',
  'active',
  'paid',
  NOW(),
  NOW() + INTERVAL '1 month'
);
```

---

## Automated Testing Scripts

### Test Upgrade Endpoint
```bash
curl -X POST http://localhost:1100/api/saas/billing/upgrade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Subdomain: <subdomain>" \
  -d '{
    "subscriptionId": 1,
    "newPackageId": 3,
    "billingCycle": "monthly"
  }'
```

### Test Downgrade Endpoint
```bash
curl -X POST http://localhost:1100/api/saas/billing/downgrade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Subdomain: <subdomain>" \
  -d '{
    "subscriptionId": 1,
    "newPackageId": 2,
    "billingCycle": "monthly",
    "immediate": false
  }'
```

### Test Cancel Endpoint
```bash
curl -X POST http://localhost:1100/api/saas/billing/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Subdomain: <subdomain>" \
  -d '{
    "subscriptionId": 1,
    "immediate": false
  }'
```

### Test Change Cycle Endpoint
```bash
curl -X POST http://localhost:1100/api/saas/billing/change-cycle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Subdomain: <subdomain>" \
  -d '{
    "subscriptionId": 1,
    "newBillingCycle": "annual"
  }'
```

### Test Webhook (using Stripe CLI)
```bash
stripe listen --forward-to http://localhost:1100/api/saas/webhooks/stripe
stripe trigger customer.subscription.updated
```

---

## Performance Testing

### Load Testing
- Test upgrade endpoint with 100 concurrent requests
- Test downgrade validation with large user/patient counts
- Test webhook processing with high event volume

### Database Performance
- Verify indexes on `organization_id`, `stripe_subscription_id`
- Check query performance for subscription lookups
- Monitor database locks during concurrent updates

---

## Security Testing

### Authentication
- ✅ Verify all endpoints require authentication
- ✅ Verify admin role is required for subscription management
- ✅ Test with invalid/missing tokens

### Authorization
- ✅ Verify users can only manage their own organization's subscription
- ✅ Test cross-organization access attempts

### Input Validation
- ✅ Test with invalid subscription IDs
- ✅ Test with invalid package IDs
- ✅ Test with SQL injection attempts
- ✅ Test with XSS in error messages

---

## Checklist

### Pre-Deployment
- [ ] All test cases pass
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` set in production environment
- [ ] Database migrations applied
- [ ] Error logging configured
- [ ] Email notifications configured (if applicable)

### Post-Deployment
- [ ] Monitor webhook delivery in Stripe Dashboard
- [ ] Verify subscription sync is working
- [ ] Check error logs for any issues
- [ ] Test with real Stripe test mode
- [ ] Verify payment records are created correctly

---

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check `STRIPE_WEBHOOK_SECRET` is correct
   - Verify webhook URL is accessible
   - Check Stripe Dashboard webhook delivery logs

2. **Subscription not updating**
   - Check webhook signature verification
   - Verify organization has `stripe_customer_id`
   - Check database connection

3. **Downgrade validation failing**
   - Verify usage count functions are working
   - Check package limits in database
   - Verify user/patient counts are accurate

4. **Proration not calculating correctly**
   - Check Stripe subscription period dates
   - Verify price IDs are correct
   - Check Stripe Dashboard for proration details

---

## Support and Documentation

- **Stripe Documentation**: https://stripe.com/docs/billing/subscriptions/overview
- **Webhook Events**: https://stripe.com/docs/api/events/types
- **Implementation Plan**: See `SUBSCRIPTION_MANAGEMENT_IMPLEMENTATION_PLAN.md`
