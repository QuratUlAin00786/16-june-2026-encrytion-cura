import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    console.warn('[Stripe] Secret key not configured');
    return null;
  }

  try {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia' as any,
      typescript: true,
    });
    console.log('[Stripe] Client initialized successfully');
    return stripeInstance;
  } catch (error) {
    console.error('[Stripe] Failed to initialize client:', error);
    return null;
  }
}

export function getStripePublishableKey(): string | null {
  return process.env.STRIPE_PUBLISHABLE_KEY || null;
}

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
}

export async function testStripeConnection(): Promise<{ success: boolean; error?: string; accountId?: string }> {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return { success: false, error: 'Stripe client not configured. Please add your API keys.' };
    }

    const account = await stripe.accounts.retrieve();
    return { 
      success: true, 
      accountId: account.id 
    };
  } catch (error: any) {
    console.error('[Stripe] Connection test failed:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to connect to Stripe' 
    };
  }
}

export async function createPaymentIntent(
  amount: number,
  currency: string = 'gbp',
  metadata?: Record<string, string>
): Promise<{ clientSecret: string; paymentIntentId: string } | { error: string }> {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return { error: 'Stripe not configured' };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error: any) {
    console.error('[Stripe] Failed to create payment intent:', error);
    return { error: error.message };
  }
}

export async function confirmPaymentIntent(
  paymentIntentId: string
): Promise<{ status: string; error?: string }> {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return { status: 'error', error: 'Stripe not configured' };
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return { status: paymentIntent.status };
  } catch (error: any) {
    console.error('[Stripe] Failed to retrieve payment intent:', error);
    return { status: 'error', error: error.message };
  }
}

export async function createRefund(
  paymentIntentId: string,
  amount?: number
): Promise<{ refundId: string; status: string } | { error: string }> {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return { error: 'Stripe not configured' };
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });

    return {
      refundId: refund.id,
      status: refund.status || 'pending',
    };
  } catch (error: any) {
    console.error('[Stripe] Failed to create refund:', error);
    return { error: error.message };
  }
}

export function resetStripeClient(): void {
  stripeInstance = null;
}
