// Script to create sample billing data for demonstration
import { storage } from "./server/storage";

async function createSampleBillingData() {
  try {
    console.log('🏥 Creating sample billing data for Cura Software Limited...');
    
    // Get first organization for demo
    const organizations = await storage.getAllOrganizations();
    if (!organizations || organizations.length === 0) {
      console.log('No organizations found. Please create an organization first.');
      return;
    }
    
    const testOrg = organizations[0];
    console.log(`Using organization: ${testOrg.name} (ID: ${testOrg.id})`);
    
    // Create sample payment/invoice data
    const samplePayments = [
      {
        organizationId: testOrg.id,
        invoiceNumber: `INV-${Date.now()}-001`,
        amount: '299.99',
        currency: 'GBP',
        paymentMethod: 'stripe',
        paymentStatus: 'completed',
        description: 'Cura EMR Professional Subscription - Monthly',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        paymentDate: new Date(),
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentProvider: 'stripe',
        providerTransactionId: 'pi_3QR1a92eZvKYlo2C1234567890',
        metadata: {
          customerEmail: 'admin@healthcare.example.com',
          subscriptionType: 'professional',
          billingCycle: 'monthly'
        }
      },
      {
        organizationId: testOrg.id,
        invoiceNumber: `INV-${Date.now()}-002`,
        amount: '149.99',
        currency: 'GBP',
        paymentMethod: 'paypal',
        paymentStatus: 'pending',
        description: 'Cura EMR Basic Subscription - Monthly',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentProvider: 'paypal',
        metadata: {
          customerEmail: 'billing@healthcare.example.com',
          subscriptionType: 'basic',
          billingCycle: 'monthly'
        }
      },
      {
        organizationId: testOrg.id,
        invoiceNumber: `INV-${Date.now()}-003`,
        amount: '99.99',
        currency: 'GBP',
        paymentMethod: 'bank_transfer',
        paymentStatus: 'pending',
        description: 'Cura EMR Starter Subscription - Monthly',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days overdue
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentProvider: 'bank_transfer',
        metadata: {
          customerEmail: 'finance@healthcare.example.com',
          subscriptionType: 'starter',
          billingCycle: 'monthly',
          bankReference: 'CURA-HEALTH-2025'
        }
      }
    ];
    
    // Create the sample payments
    for (const paymentData of samplePayments) {
      try {
        const payment = await storage.createPayment(paymentData);
        console.log(`✅ Created payment: ${payment.invoiceNumber} - £${payment.amount} (${payment.paymentStatus})`);
      } catch (error) {
        console.error(`❌ Failed to create payment ${paymentData.invoiceNumber}:`, error);
      }
    }
    
    console.log('🎉 Sample billing data creation completed!');
    console.log('💡 You can now view the professional invoices in the SaaS billing portal at /saas');
    
  } catch (error) {
    console.error('❌ Error creating sample billing data:', error);
  }
}

// Run the script
createSampleBillingData();