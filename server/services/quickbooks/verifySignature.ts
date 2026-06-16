import crypto from 'crypto';
import { db } from '../../db';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export async function getQuickBooksClientSecret(organizationId: number): Promise<string | null> {
  try {
    const integration = await db.select()
      .from(schema.organizationIntegrations)
      .where(and(
        eq(schema.organizationIntegrations.organizationId, organizationId),
        eq(schema.organizationIntegrations.integrationType, 'quickbooks')
      ))
      .limit(1);

    if (integration.length > 0) {
      const settings = integration[0].settings as any;
      if (settings?.clientSecret) {
        return settings.clientSecret;
      }
    }
    return null;
  } catch (error) {
    console.error('[QuickBooks] Error getting client secret:', error);
    return null;
  }
}

export function verifyQuickBooksSignature(rawBody: Buffer | string, signatureHeader: string, clientSecret: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(rawBody);
    const digest = hmac.digest('base64');
    
    console.log('[QuickBooks Signature] Expected:', digest);
    console.log('[QuickBooks Signature] Received:', signatureHeader);
    
    return digest === signatureHeader;
  } catch (error) {
    console.error('[QuickBooks Signature] Verification error:', error);
    return false;
  }
}

export async function verifySignatureForAnyOrg(rawBody: Buffer | string, signatureHeader: string): Promise<{ valid: boolean; organizationId?: number }> {
  try {
    const integrations = await db.select()
      .from(schema.organizationIntegrations)
      .where(eq(schema.organizationIntegrations.integrationType, 'quickbooks'));

    for (const integration of integrations) {
      const settings = integration.settings as any;
      if (settings?.clientSecret) {
        const isValid = verifyQuickBooksSignature(rawBody, signatureHeader, settings.clientSecret);
        if (isValid) {
          return { valid: true, organizationId: integration.organizationId };
        }
      }
    }

    return { valid: false };
  } catch (error) {
    console.error('[QuickBooks Signature] Error checking all orgs:', error);
    return { valid: false };
  }
}
