import OAuthClient from 'intuit-oauth';
import { db } from '../../db';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const QUICKBOOKS_SCOPES = [
  'com.intuit.quickbooks.accounting',
  'com.intuit.quickbooks.payment'
];

interface QuickBooksTokens {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  companyName?: string;
  tokenExpiresAt?: string;
}

export async function getOAuthClient(organizationId: number): Promise<OAuthClient | null> {
  try {
    const integration = await db.select()
      .from(schema.organizationIntegrations)
      .where(and(
        eq(schema.organizationIntegrations.organizationId, organizationId),
        eq(schema.organizationIntegrations.integrationType, 'quickbooks')
      ))
      .limit(1);

    if (integration.length === 0) {
      return null;
    }

    const settings = integration[0].settings as any;
    if (!settings?.clientId || !settings?.clientSecret) {
      return null;
    }

    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'https://app.curaemr.ai';

    const oauthClient = new OAuthClient({
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
      environment: 'production',
      redirectUri: `${baseUrl}/api/auth/quickbooks/callback`,
      logging: false
    });

    return oauthClient;
  } catch (error) {
    console.error('[QuickBooks OAuth] Error creating client:', error);
    return null;
  }
}

export function generateAuthUri(oauthClient: OAuthClient, state: string): string {
  return oauthClient.authorizeUri({
    scope: QUICKBOOKS_SCOPES,
    state: state
  });
}

export async function exchangeCodeForTokens(
  oauthClient: OAuthClient,
  authUri: string
): Promise<QuickBooksTokens | null> {
  try {
    const authResponse = await oauthClient.createToken(authUri);
    const token = authResponse.getJson();
    
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      realmId: authResponse.token.realmId,
      tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString()
    };
  } catch (error) {
    console.error('[QuickBooks OAuth] Error exchanging code:', error);
    return null;
  }
}

export async function refreshAccessToken(
  organizationId: number
): Promise<QuickBooksTokens | null> {
  try {
    const oauthClient = await getOAuthClient(organizationId);
    if (!oauthClient) return null;

    const integration = await db.select()
      .from(schema.organizationIntegrations)
      .where(and(
        eq(schema.organizationIntegrations.organizationId, organizationId),
        eq(schema.organizationIntegrations.integrationType, 'quickbooks')
      ))
      .limit(1);

    if (integration.length === 0) return null;

    const settings = integration[0].settings as any;
    if (!settings?.refreshToken) return null;

    oauthClient.setToken({
      refresh_token: settings.refreshToken,
      access_token: settings.accessToken || ''
    });

    const authResponse = await oauthClient.refresh();
    const token = authResponse.getJson();

    const newTokens: QuickBooksTokens = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      realmId: settings.realmId,
      tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString()
    };

    await saveQuickBooksTokens(organizationId, newTokens);

    return newTokens;
  } catch (error) {
    console.error('[QuickBooks OAuth] Error refreshing token:', error);
    return null;
  }
}

export async function saveQuickBooksTokens(
  organizationId: number,
  tokens: QuickBooksTokens
): Promise<boolean> {
  try {
    const existing = await db.select()
      .from(schema.organizationIntegrations)
      .where(and(
        eq(schema.organizationIntegrations.organizationId, organizationId),
        eq(schema.organizationIntegrations.integrationType, 'quickbooks')
      ))
      .limit(1);

    if (existing.length > 0) {
      const currentSettings = existing[0].settings || {};
      const newSettings = {
        ...(currentSettings as object),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        realmId: tokens.realmId,
        companyName: tokens.companyName,
        tokenExpiresAt: tokens.tokenExpiresAt,
        connectedAt: new Date().toISOString()
      };
      
      await db.update(schema.organizationIntegrations)
        .set({
          settings: newSettings,
          isEnabled: true,
          isConfigured: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(schema.organizationIntegrations.organizationId, organizationId),
          eq(schema.organizationIntegrations.integrationType, 'quickbooks')
        ));
      return true;
    }
    return false;
  } catch (error) {
    console.error('[QuickBooks OAuth] Error saving tokens:', error);
    return false;
  }
}

export async function getCompanyInfo(
  organizationId: number
): Promise<{ companyName: string; realmId: string } | null> {
  try {
    const integration = await db.select()
      .from(schema.organizationIntegrations)
      .where(and(
        eq(schema.organizationIntegrations.organizationId, organizationId),
        eq(schema.organizationIntegrations.integrationType, 'quickbooks')
      ))
      .limit(1);

    if (integration.length === 0) return null;

    const settings = integration[0].settings as any;
    if (!settings?.accessToken || !settings?.realmId) return null;

    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${settings.realmId}/companyinfo/${settings.realmId}`,
      {
        headers: {
          'Authorization': `Bearer ${settings.accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await refreshAccessToken(organizationId);
        if (refreshed) {
          return getCompanyInfo(organizationId);
        }
      }
      return null;
    }

    const data = await response.json();
    const companyName = data.CompanyInfo?.CompanyName || 'Unknown Company';

    await db.update(schema.organizationIntegrations)
      .set({
        settings: {
          ...(settings as object),
          companyName
        },
        updatedAt: new Date()
      })
      .where(and(
        eq(schema.organizationIntegrations.organizationId, organizationId),
        eq(schema.organizationIntegrations.integrationType, 'quickbooks')
      ));

    return {
      companyName,
      realmId: settings.realmId
    };
  } catch (error) {
    console.error('[QuickBooks OAuth] Error getting company info:', error);
    return null;
  }
}

export async function disconnectQuickBooks(organizationId: number): Promise<boolean> {
  try {
    const existing = await db.select()
      .from(schema.organizationIntegrations)
      .where(and(
        eq(schema.organizationIntegrations.organizationId, organizationId),
        eq(schema.organizationIntegrations.integrationType, 'quickbooks')
      ))
      .limit(1);

    if (existing.length > 0) {
      const currentSettings = existing[0].settings as any || {};
      const newSettings = {
        clientId: currentSettings.clientId,
        clientSecret: currentSettings.clientSecret,
        configuredAt: currentSettings.configuredAt
      };
      
      await db.update(schema.organizationIntegrations)
        .set({
          settings: newSettings,
          isEnabled: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(schema.organizationIntegrations.organizationId, organizationId),
          eq(schema.organizationIntegrations.integrationType, 'quickbooks')
        ));
      return true;
    }
    return false;
  } catch (error) {
    console.error('[QuickBooks OAuth] Error disconnecting:', error);
    return false;
  }
}
