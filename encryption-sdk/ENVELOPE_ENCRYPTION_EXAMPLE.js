
// Example Usage:

const { EnvelopeEncryption } = require('./envelope-encryption');

// Initialize with Vault configuration (use env vars — never commit real tokens)
const encryption = new EnvelopeEncryption({
  vaultEndpoint: process.env.VAULT_ENDPOINT,
  vaultToken: process.env.VAULT_TOKEN,
  kekName: process.env.VAULT_KEK_NAME,
  transitMount: process.env.VAULT_TRANSIT_MOUNT || 'transit',
});

// Encrypt data with mandatory AAD
async function encryptData() {
  const plaintext = 'Sensitive data to encrypt';
  
  // CRITICAL: AAD (Additional Authenticated Data) is REQUIRED
  // Use transaction ID, user ID, session context, or other metadata
  const aad = Buffer.from('user123:transaction456:session789');
  
  const context = { userId: 'user123', purpose: 'storage' };
  
  const envelope = await encryption.encrypt(plaintext, aad, context);
  console.log('Encrypted envelope:', envelope);
  
  // Store envelope in database
  // The envelope contains:
  // - encryptedData: Your data encrypted with DEK
  // - encryptedDEK: DEK encrypted with KEK (via Vault)
  // - iv: Initialization vector
  // - tag: Authentication tag
  // - aad: Additional Authenticated Data (REQUIRED)
  // - context: Additional context for encryption
  
  return envelope;
}

// Decrypt data
async function decryptData(envelope) {
  const plaintext = await encryption.decrypt(envelope);
  console.log('Decrypted:', plaintext);
  return plaintext;
}

// Rotate KEK
async function rotateKey() {
  await encryption.rotateKEK();
  console.log('KEK rotated successfully');
}

// Run example
(async () => {
  const envelope = await encryptData();
  const decrypted = await decryptData(envelope);
  console.log('Success!', decrypted);
})();
