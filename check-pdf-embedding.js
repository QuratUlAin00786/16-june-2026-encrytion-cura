/**
 * Quick Diagnostic Script for PDF Image Embedding Issues
 * 
 * Run this script to check common issues:
 * node check-pdf-embedding.js <medical_image_id> <organization_id>
 * 
 * Example:
 * node check-pdf-embedding.js 123 1
 */

const fs = require('fs');
const path = require('path');
const { db } = require('./server/db'); // Adjust import path as needed
const schema = require('./server/db/schema'); // Adjust import path as needed

async function diagnosePDFEmbedding(medicalImageId, organizationId) {
  console.log('\n🔍 PDF EMBEDDING DIAGNOSTIC TOOL\n');
  console.log(`Medical Image ID: ${medicalImageId}`);
  console.log(`Organization ID: ${organizationId}\n`);
  console.log('='.repeat(60));

  // Check 1: Database - Are images in radiology_images table?
  console.log('\n📊 CHECK 1: Database Query');
  console.log('-'.repeat(60));
  
  try {
    const radiologyImages = await db
      .select()
      .from(schema.radiologyImages)
      .where(
        and(
          eq(schema.radiologyImages.medicalImageId, medicalImageId),
          eq(schema.radiologyImages.organizationId, organizationId)
        )
      );

    console.log(`✅ Found ${radiologyImages.length} image(s) in radiology_images table\n`);

    if (radiologyImages.length === 0) {
      console.log('❌ ISSUE: No images found in database!');
      console.log('   → This is the most common cause of embedding failures');
      console.log('   → Verify images were uploaded successfully');
      console.log('   → Check upload endpoint: /api/radiology-images\n');
      return;
    }

    // Check each image
    for (let i = 0; i < radiologyImages.length; i++) {
      const img = radiologyImages[i];
      console.log(`\n📷 Image ${i + 1}/${radiologyImages.length}:`);
      console.log(`   ID: ${img.id}`);
      console.log(`   FileName: ${img.fileName || 'N/A'}`);
      console.log(`   FilePath: ${img.filePath || 'N/A'}`);
      console.log(`   MimeType: ${img.mimeType || 'N/A'}`);
      
      // Check imageData
      if (img.imageData) {
        const dataLength = img.imageData.length;
        const hasDataUrl = img.imageData.startsWith('data:');
        const hasComma = img.imageData.includes(',');
        console.log(`   ImageData: ✅ EXISTS (${dataLength} chars)`);
        console.log(`   ImageData Format: ${hasDataUrl ? 'Data URL' : 'Pure Base64'}`);
        console.log(`   ImageData Has Comma: ${hasComma ? 'Yes' : 'No'}`);
        
        // Try to decode base64
        try {
          let base64Data = img.imageData;
          if (hasComma) {
            base64Data = base64Data.split(',')[1];
          }
          const buffer = Buffer.from(base64Data, 'base64');
          console.log(`   Base64 Decode: ✅ SUCCESS (${buffer.length} bytes)`);
        } catch (e) {
          console.log(`   Base64 Decode: ❌ FAILED - ${e.message}`);
        }
      } else {
        console.log(`   ImageData: ❌ MISSING`);
      }

      // Check filePath
      if (img.filePath) {
        console.log(`   FilePath: ✅ EXISTS`);
        
        // Resolve path
        let resolvedPath;
        if (path.isAbsolute(img.filePath)) {
          resolvedPath = path.normalize(img.filePath);
        } else if (img.filePath.includes('uploads')) {
          const uploadsIndex = img.filePath.indexOf('uploads');
          const relativePath = img.filePath.substring(uploadsIndex).replace(/\\/g, '/');
          resolvedPath = path.resolve(process.cwd(), relativePath);
        } else {
          resolvedPath = path.resolve(process.cwd(), img.filePath);
        }
        
        console.log(`   Resolved Path: ${resolvedPath}`);
        
        // Check if file exists
        if (fs.existsSync(resolvedPath)) {
          const stats = fs.statSync(resolvedPath);
          console.log(`   File Exists: ✅ YES (${stats.size} bytes)`);
        } else {
          console.log(`   File Exists: ❌ NO`);
          console.log(`   → File not found at resolved path!`);
          
          // Try constructed path
          const constructedPath = path.resolve(
            process.cwd(),
            'uploads',
            'Imaging_Images',
            String(organizationId),
            'patients',
            String(img.patientId || 'unknown'),
            img.fileName
          );
          console.log(`   Trying Constructed Path: ${constructedPath}`);
          
          if (fs.existsSync(constructedPath)) {
            console.log(`   Constructed Path: ✅ EXISTS`);
          } else {
            console.log(`   Constructed Path: ❌ NOT FOUND`);
          }
        }
      } else {
        console.log(`   FilePath: ❌ MISSING`);
      }

      // Check fileName
      if (img.fileName) {
        console.log(`   FileName: ✅ EXISTS`);
      } else {
        console.log(`   FileName: ❌ MISSING`);
      }
    }

  } catch (error) {
    console.error('❌ Database query failed:', error);
    return;
  }

  // Check 2: File System - Do files exist?
  console.log('\n\n📁 CHECK 2: File System');
  console.log('-'.repeat(60));
  
  const imagesDir = path.resolve(
    process.cwd(),
    'uploads',
    'Imaging_Images',
    String(organizationId),
    'patients'
  );

  console.log(`Expected Directory: ${imagesDir}`);
  
  if (fs.existsSync(imagesDir)) {
    console.log(`Directory Exists: ✅ YES`);
    
    // List subdirectories (patient IDs)
    try {
      const patientDirs = fs.readdirSync(imagesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      console.log(`Patient Directories: ${patientDirs.length} found`);
      if (patientDirs.length > 0) {
        console.log(`   Directories: ${patientDirs.slice(0, 5).join(', ')}${patientDirs.length > 5 ? '...' : ''}`);
      }
    } catch (e) {
      console.log(`   Error reading directory: ${e.message}`);
    }
  } else {
    console.log(`Directory Exists: ❌ NO`);
    console.log(`   → Directory structure doesn't exist!`);
    console.log(`   → Expected: uploads/Imaging_Images/${organizationId}/patients/`);
  }

  // Check 3: Dependencies
  console.log('\n\n📦 CHECK 3: Dependencies');
  console.log('-'.repeat(60));
  
  try {
    const sharp = require('sharp');
    console.log('Sharp: ✅ INSTALLED');
  } catch (e) {
    console.log('Sharp: ❌ NOT INSTALLED');
    console.log('   → Install: npm install sharp');
  }

  try {
    const pdfLib = require('pdf-lib');
    console.log('pdf-lib: ✅ INSTALLED');
  } catch (e) {
    console.log('pdf-lib: ❌ NOT INSTALLED');
    console.log('   → Install: npm install pdf-lib');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnostic Complete!\n');
}

// Run if called directly
if (require.main === module) {
  const medicalImageId = process.argv[2];
  const organizationId = process.argv[3];

  if (!medicalImageId || !organizationId) {
    console.log('Usage: node check-pdf-embedding.js <medical_image_id> <organization_id>');
    process.exit(1);
  }

  diagnosePDFEmbedding(parseInt(medicalImageId), parseInt(organizationId))
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { diagnosePDFEmbedding };
