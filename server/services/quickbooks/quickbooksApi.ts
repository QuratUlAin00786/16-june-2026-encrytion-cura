import axios from 'axios';
import { db } from '../../db';
import * as schema from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface QuickBooksEntity {
  name: string;
  id: string;
  operation: string;
}

interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  realmId?: string;
}

export async function getQuickBooksConfig(organizationId: number): Promise<QuickBooksConfig | null> {
  try {
    const integration = await db.select()
      .from(schema.organizationIntegrations)
      .where(and(
        eq(schema.organizationIntegrations.organizationId, organizationId),
        eq(schema.organizationIntegrations.integrationType, 'quickbooks')
      ))
      .limit(1);

    if (integration.length > 0) {
      return integration[0].settings as QuickBooksConfig;
    }
    return null;
  } catch (error) {
    console.error('[QuickBooks API] Error getting config:', error);
    return null;
  }
}

export async function getEntity(realmId: string, entity: QuickBooksEntity, accessToken: string): Promise<any> {
  const url = `https://quickbooks.api.intuit.com/v3/company/${realmId}/${entity.name.toLowerCase()}/${entity.id}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    return response.data;
  } catch (err: any) {
    console.error('[QuickBooks API] Error fetching entity:', err.response?.data || err.message);
    return null;
  }
}

export async function updateQuickBooksTokens(organizationId: number, accessToken: string, refreshToken: string, realmId?: string): Promise<boolean> {
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
        accessToken,
        refreshToken,
        ...(realmId && { realmId }),
        tokenUpdatedAt: new Date().toISOString()
      };
      
      await db.update(schema.organizationIntegrations)
        .set({
          settings: newSettings,
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
    console.error('[QuickBooks API] Error updating tokens:', error);
    return false;
  }
}
