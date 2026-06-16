// Script to clean up duplicate prescription records
// This will remove duplicates based on patient + medication name + dosage, keeping the most recent one

import { db } from './server/db';
import { prescriptions } from './shared/schema';
import { eq } from 'drizzle-orm';

async function cleanupDuplicatePrescriptions() {
  console.log('🔍 Starting duplicate prescription cleanup...');
  
  try {
    // Get all prescriptions for organization 1
    const allPrescriptions = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.organizationId, 1));
    
    console.log(`📊 Found ${allPrescriptions.length} total prescriptions`);
    
    // Group prescriptions by patient + medication combination
    const prescriptionGroups = new Map();
    
    for (const prescription of allPrescriptions) {
      if (prescription.medications && prescription.medications.length > 0) {
        const firstMed = prescription.medications[0];
        const key = `${prescription.patientId}-${firstMed.name || 'unknown'}-${firstMed.dosage || 'unknown'}`;
        
        if (!prescriptionGroups.has(key)) {
          prescriptionGroups.set(key, []);
        }
        prescriptionGroups.get(key).push(prescription);
      }
    }
    
    let totalDuplicates = 0;
    let deletedCount = 0;
    
    // Process each group and identify duplicates
    for (const [key, group] of prescriptionGroups.entries()) {
      if (group.length > 1) {
        console.log(`🔍 Found ${group.length} duplicates for: ${key}`);
        totalDuplicates += group.length - 1;
        
        // Sort by createdAt to keep the most recent one
        group.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Keep the first (most recent) and delete the rest
        const toKeep = group[0];
        const toDelete = group.slice(1);
        
        console.log(`  ✅ Keeping prescription ID: ${toKeep.id} (${toKeep.createdAt})`);
        
        for (const duplicate of toDelete) {
          console.log(`  ❌ Deleting duplicate ID: ${duplicate.id} (${duplicate.createdAt})`);
          await db.delete(prescriptions).where(eq(prescriptions.id, duplicate.id));
          deletedCount++;
        }
      }
    }
    
    console.log(`\n📋 Cleanup Summary:`);
    console.log(`  - Total prescriptions processed: ${allPrescriptions.length}`);
    console.log(`  - Duplicate groups found: ${prescriptionGroups.size}`);
    console.log(`  - Total duplicates identified: ${totalDuplicates}`);
    console.log(`  - Prescriptions deleted: ${deletedCount}`);
    console.log(`  - Remaining prescriptions: ${allPrescriptions.length - deletedCount}`);
    
    console.log('✅ Duplicate prescription cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupDuplicatePrescriptions()
  .then(() => {
    console.log('🎉 Cleanup script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });