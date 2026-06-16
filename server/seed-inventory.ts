import { db } from "./db";
import { inventoryCategories, inventoryItems, inventorySuppliers, inventoryTaxRates } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Seed default inventory data for healthcare organizations
 */

const defaultCategories = [
  { name: "Tablets", description: "Oral solid dosage forms including tablets and capsules" },
  { name: "Syrups", description: "Liquid medications in syrup form" },
  { name: "Pharmaceuticals", description: "General pharmaceutical products" },
  { name: "Beauty Products", description: "Cosmetic and beauty care items" },
  { name: "Vitamins", description: "Vitamin supplements and nutritional products" },
  { name: "Minerals", description: "Mineral supplements and health products" },
  { name: "Medical Supplies", description: "General medical supplies and equipment" },
  { name: "First Aid", description: "First aid supplies and emergency medications" },
  { name: "Injections", description: "Injectable medications and vaccines" },
  { name: "Topical", description: "Creams, ointments, and topical applications" }
];

const defaultSuppliers = [
  {
    name: "Halo Pharmacy",
    contactPerson: "David Wilson",
    email: "orders@halopharmacy.co.uk",
    phone: "+44 20 7946 0958",
    address: "123 Health Street",
    city: "London",
    country: "UK",
    taxId: "GB123456789",
    paymentTerms: "Net 30"
  },
  {
    name: "MedSupply UK",
    contactPerson: "Sarah Johnson",
    email: "procurement@medsupplyuk.com",
    phone: "+44 161 234 5678",
    address: "456 Medical Ave",
    city: "Manchester",
    country: "UK",
    taxId: "GB987654321",
    paymentTerms: "Net 30"
  },
  {
    name: "Healthcare Direct",
    contactPerson: "Michael Brown",
    email: "orders@healthcaredirect.co.uk",
    phone: "+44 121 345 6789",
    address: "789 Pharma Road",
    city: "Birmingham",
    country: "UK",
    taxId: "GB456789123",
    paymentTerms: "Net 15"
  }
];

export async function seedInventoryData(organizationId: number) {
  console.log(`[SEED] Starting inventory seed for organization ${organizationId}`);
  
  try {
    // Always ensure tax rates exist (required for sales)
    const existingTaxRates = await db
      .select()
      .from(inventoryTaxRates)
      .where(eq(inventoryTaxRates.organizationId, organizationId));

    if (existingTaxRates.length === 0) {
      console.log(`[SEED] Creating default tax rate for organization ${organizationId}`);
      await db.insert(inventoryTaxRates).values({
        organizationId,
        name: "No Tax",
        code: "NOTAX",
        rate: "0.00",
        description: "Zero tax rate",
        isDefault: true,
        isActive: true,
        appliesTo: "all",
        effectiveFrom: new Date(),
      });
      console.log(`[SEED] Created default tax rate`);
    }

    // Check if categories already exist for this organization
    const existingCategories = await db
      .select()
      .from(inventoryCategories)
      .where(eq(inventoryCategories.organizationId, organizationId));

    if (existingCategories.length === 0) {
      console.log(`[SEED] Creating default categories for organization ${organizationId}`);
      
      // Insert default categories
      const createdCategories = await db
        .insert(inventoryCategories)
        .values(defaultCategories.map(category => ({
          ...category,
          organizationId
        })))
        .returning();

      console.log(`[SEED] Created ${createdCategories.length} categories`);

      // Insert default suppliers
      const createdSuppliers = await db
        .insert(inventorySuppliers)
        .values(defaultSuppliers.map(supplier => ({
          ...supplier,
          organizationId
        })))
        .returning();

      console.log(`[SEED] Created ${createdSuppliers.length} suppliers`);

      // Get category IDs for sample items
      const tabletsCategory = createdCategories.find(c => c.name === "Tablets");
      const syrupsCategory = createdCategories.find(c => c.name === "Syrups");
      const vitaminsCategory = createdCategories.find(c => c.name === "Vitamins");
      const medicalSuppliesCategory = createdCategories.find(c => c.name === "Medical Supplies");

      if (tabletsCategory && syrupsCategory && vitaminsCategory && medicalSuppliesCategory) {
        // Sample inventory items
        const sampleItems = [
          // Tablets
          {
            categoryId: tabletsCategory.id,
            name: "Paracetamol 500mg",
            description: "Pain relief and fever reducer",
            sku: "TAB-PARA500-001",
            barcode: "1234567890123",
            genericName: "Paracetamol",
            brandName: "Panadol",
            manufacturer: "GSK",
            unitOfMeasurement: "tablets",
            packSize: 100,
            purchasePrice: "15.50",
            salePrice: "22.99",
            mrp: "25.99",
            taxRate: "20.00",
            currentStock: 500,
            minimumStock: 50,
            maximumStock: 2000,
            reorderPoint: 100,
            prescriptionRequired: false,
            storageConditions: "Store in cool, dry place",
            dosageInstructions: "1-2 tablets every 4-6 hours as needed"
          },
          {
            categoryId: tabletsCategory.id,
            name: "Ibuprofen 400mg",
            description: "Anti-inflammatory pain relief",
            sku: "TAB-IBU400-002",
            barcode: "2345678901234",
            genericName: "Ibuprofen",
            brandName: "Nurofen",
            manufacturer: "Reckitt Benckiser",
            unitOfMeasurement: "tablets",
            packSize: 84,
            purchasePrice: "12.75",
            salePrice: "18.99",
            mrp: "21.99",
            taxRate: "20.00",
            currentStock: 300,
            minimumStock: 30,
            maximumStock: 1500,
            reorderPoint: 75,
            prescriptionRequired: false,
            storageConditions: "Store below 25°C",
            dosageInstructions: "1 tablet every 4-6 hours with food"
          },
          // Syrups
          {
            categoryId: syrupsCategory.id,
            name: "Children's Paracetamol Suspension",
            description: "Liquid paracetamol for children",
            sku: "SYR-CHPARA-003",
            barcode: "3456789012345",
            genericName: "Paracetamol",
            brandName: "Calpol",
            manufacturer: "Johnson & Johnson",
            unitOfMeasurement: "bottles",
            packSize: 1,
            purchasePrice: "8.25",
            salePrice: "12.49",
            mrp: "14.99",
            taxRate: "20.00",
            currentStock: 150,
            minimumStock: 20,
            maximumStock: 500,
            reorderPoint: 40,
            prescriptionRequired: false,
            storageConditions: "Store below 25°C, do not freeze",
            dosageInstructions: "As per age and weight guidelines"
          },
          // Vitamins
          {
            categoryId: vitaminsCategory.id,
            name: "Vitamin D3 1000IU",
            description: "Vitamin D supplement",
            sku: "VIT-D3-1000-004",
            barcode: "4567890123456",
            genericName: "Cholecalciferol",
            brandName: "VitaD3",
            manufacturer: "Holland & Barrett",
            unitOfMeasurement: "tablets",
            packSize: 60,
            purchasePrice: "9.99",
            salePrice: "15.99",
            mrp: "18.99",
            taxRate: "20.00",
            currentStock: 200,
            minimumStock: 25,
            maximumStock: 800,
            reorderPoint: 50,
            prescriptionRequired: false,
            storageConditions: "Store in cool, dry place",
            dosageInstructions: "1 tablet daily with food"
          },
          // Medical Supplies
          {
            categoryId: medicalSuppliesCategory.id,
            name: "Digital Thermometer",
            description: "Digital oral/axillary thermometer",
            sku: "MED-THERM-005",
            barcode: "5678901234567",
            brandName: "OmniTemp",
            manufacturer: "Medical Devices Ltd",
            unitOfMeasurement: "pieces",
            packSize: 1,
            purchasePrice: "12.50",
            salePrice: "19.99",
            mrp: "24.99",
            taxRate: "20.00",
            currentStock: 75,
            minimumStock: 10,
            maximumStock: 200,
            reorderPoint: 25,
            prescriptionRequired: false,
            storageConditions: "Store at room temperature"
          },
          {
            categoryId: medicalSuppliesCategory.id,
            name: "Disposable Gloves (Nitrile)",
            description: "Powder-free nitrile examination gloves",
            sku: "MED-GLOVE-006",
            barcode: "6789012345678",
            brandName: "SafeGuard",
            manufacturer: "MedProtect",
            unitOfMeasurement: "boxes",
            packSize: 100,
            purchasePrice: "18.75",
            salePrice: "28.99",
            mrp: "32.99",
            taxRate: "20.00",
            currentStock: 50,
            minimumStock: 10,
            maximumStock: 300,
            reorderPoint: 20,
            prescriptionRequired: false,
            storageConditions: "Store in cool, dry place away from direct sunlight"
          }
        ];

        // Insert sample items
        const createdItems = await db
          .insert(inventoryItems)
          .values(sampleItems.map(item => ({
            ...item,
            organizationId
          })))
          .returning();

        console.log(`[SEED] Created ${createdItems.length} sample inventory items`);
      }

      console.log(`[SEED] Inventory seeding completed for organization ${organizationId}`);
      return true;
    } else {
      console.log(`[SEED] Categories already exist for organization ${organizationId}, skipping seed`);
      return false;
    }
  } catch (error) {
    console.error(`[SEED] Error seeding inventory data for organization ${organizationId}:`, error);
    throw error;
  }
}

// Auto-seed for all existing organizations
export async function seedAllOrganizations() {
  try {
    // Import storage to fetch all organizations
    const { storage } = await import("./storage");
    
    // Load IDs only — avoids UTF-8 errors if a text column has invalid bytes (e.g. 0x9c)
    const organizationIds = await storage.listOrganizationIds();
    console.log(`[SEED] Found ${organizationIds.length} organizations to seed`);

    for (const organizationId of organizationIds) {
      console.log(`[SEED] Seeding inventory for organization ${organizationId}`);
      await seedInventoryData(organizationId);
    }
    
    console.log("[SEED] Completed seeding for all organizations");
  } catch (error) {
    console.error("[SEED] Error in auto-seeding:", error);
    throw error;
  }
}

// Auto-run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAllOrganizations().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}