-- Fix subscription status for hassan@averox.com
-- This script updates the subscription status to 'active' for the organization associated with this email

-- First, find the user and organization
DO $$
DECLARE
    v_user_id INTEGER;
    v_org_id INTEGER;
    v_subscription_id INTEGER;
BEGIN
    -- Find user by email
    SELECT id, "organizationId" INTO v_user_id, v_org_id
    FROM users
    WHERE email = 'hassan@averox.com'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email hassan@averox.com not found';
    END IF;

    RAISE NOTICE 'Found user ID: %, Organization ID: %', v_user_id, v_org_id;

    -- Find subscription for this organization
    SELECT id INTO v_subscription_id
    FROM saas_subscriptions
    WHERE "organizationId" = v_org_id
    ORDER BY id DESC
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        RAISE EXCEPTION 'No subscription found for organization ID: %', v_org_id;
    END IF;

    RAISE NOTICE 'Found subscription ID: %', v_subscription_id;

    -- Update subscription status to 'active'
    UPDATE saas_subscriptions
    SET status = 'active',
        "updatedAt" = NOW()
    WHERE id = v_subscription_id;

    RAISE NOTICE 'Successfully updated subscription ID % to active status', v_subscription_id;
END $$;
