import { getQuickBooksConfig, getEntity } from './quickbooksApi';

interface WebhookEvent {
  realmId: string;
  dataChangeEvent?: {
    entities: Array<{
      name: string;
      id: string;
      operation: string;
      lastUpdated: string;
    }>;
  };
}

interface WebhookPayload {
  eventNotifications: WebhookEvent[];
}

export async function processQuickBooksWebhook(data: WebhookPayload, organizationId?: number): Promise<void> {
  console.log('[QuickBooks Webhook Processor] Starting processing...');
  
  if (!data.eventNotifications || !Array.isArray(data.eventNotifications)) {
    console.log('[QuickBooks Webhook Processor] No event notifications found');
    return;
  }

  for (const event of data.eventNotifications) {
    const realmId = event.realmId;
    console.log(`[QuickBooks Webhook Processor] Processing realm: ${realmId}`);

    if (!event.dataChangeEvent?.entities) {
      console.log('[QuickBooks Webhook Processor] No entities in data change event');
      continue;
    }

    for (const entity of event.dataChangeEvent.entities) {
      console.log(`[QuickBooks Webhook Processor] Event: ${entity.name} - ${entity.operation} (ID: ${entity.id})`);

      // Process different entity types
      switch (entity.name.toLowerCase()) {
        case 'invoice':
          await handleInvoiceEvent(entity, realmId, organizationId);
          break;
        case 'payment':
          await handlePaymentEvent(entity, realmId, organizationId);
          break;
        case 'customer':
          await handleCustomerEvent(entity, realmId, organizationId);
          break;
        case 'estimate':
          await handleEstimateEvent(entity, realmId, organizationId);
          break;
        case 'salesreceipt':
          await handleSalesReceiptEvent(entity, realmId, organizationId);
          break;
        default:
          console.log(`[QuickBooks Webhook Processor] Unhandled entity type: ${entity.name}`);
      }
    }
  }

  console.log('[QuickBooks Webhook Processor] Processing complete');
}

async function handleInvoiceEvent(entity: any, realmId: string, organizationId?: number): Promise<void> {
  console.log(`[QuickBooks] Invoice ${entity.operation}: ID ${entity.id}`);
  
  // If we have an access token, we could fetch the full invoice data
  if (organizationId) {
    const config = await getQuickBooksConfig(organizationId);
    if (config?.accessToken) {
      const fullData = await getEntity(realmId, entity, config.accessToken);
      if (fullData) {
        console.log(`[QuickBooks] Synced Invoice data:`, JSON.stringify(fullData, null, 2));
        // TODO: Save to database or trigger business logic
      }
    }
  }
}

async function handlePaymentEvent(entity: any, realmId: string, organizationId?: number): Promise<void> {
  console.log(`[QuickBooks] Payment ${entity.operation}: ID ${entity.id}`);
  
  if (organizationId) {
    const config = await getQuickBooksConfig(organizationId);
    if (config?.accessToken) {
      const fullData = await getEntity(realmId, entity, config.accessToken);
      if (fullData) {
        console.log(`[QuickBooks] Synced Payment data:`, JSON.stringify(fullData, null, 2));
        // TODO: Update payment status in your system
      }
    }
  }
}

async function handleCustomerEvent(entity: any, realmId: string, organizationId?: number): Promise<void> {
  console.log(`[QuickBooks] Customer ${entity.operation}: ID ${entity.id}`);
  
  if (organizationId) {
    const config = await getQuickBooksConfig(organizationId);
    if (config?.accessToken) {
      const fullData = await getEntity(realmId, entity, config.accessToken);
      if (fullData) {
        console.log(`[QuickBooks] Synced Customer data:`, JSON.stringify(fullData, null, 2));
        // TODO: Sync customer with patient records
      }
    }
  }
}

async function handleEstimateEvent(entity: any, realmId: string, organizationId?: number): Promise<void> {
  console.log(`[QuickBooks] Estimate ${entity.operation}: ID ${entity.id}`);
}

async function handleSalesReceiptEvent(entity: any, realmId: string, organizationId?: number): Promise<void> {
  console.log(`[QuickBooks] Sales Receipt ${entity.operation}: ID ${entity.id}`);
}
