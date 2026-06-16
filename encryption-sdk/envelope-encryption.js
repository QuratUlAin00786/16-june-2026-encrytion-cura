/**
 * Envelope Encryption with Inkrypt AI KMS
 * 
 * Architecture:
 * 1. Generate DEK (Data Encryption Key) locally - 32 bytes random
 * 2. Encrypt data with DEK using AES-256-GCM
 * 3. Encrypt DEK with KEK (Key Encryption Key) via Vault
 * 4. Store encrypted DEK with ciphertext
 * 5. For decryption: decrypt DEK with Vault, then decrypt data
 * 
 * SECURITY WARNING:
 * - NEVER hard-code Vault tokens in source code
 * - ALWAYS use environment variables or secure secret management
 * - NEVER log sensitive data (tokens, DEKs, plaintext)
 * - Use proper timeout and retry configuration for production
 * 
 * Configuration (via environment variables):
 * - VAULT_ENDPOINT: Vault server URL (required)
 * - VAULT_TOKEN: Vault authentication token (required)
 * - VAULT_KEK_NAME: Key encryption key name (default: pqc-kek-5793e1f1-f0ee-40af-a291-1bcb6cd6fcf1)
 * - VAULT_TRANSIT_MOUNT: Transit engine mount path (default: transit)
 */

const crypto = require('crypto');

// Security Constants - match verified C implementation
const AVEROX_MAX_AAD_SIZE = 65536; // 64KB max AAD size
const AVEROX_MAX_PLAINTEXT_SIZE = 1048576; // 1MB max plaintext
const AVEROX_IV_SIZE = 12; // 12 bytes for GCM

/**
 * Load configuration from environment variables with validation
 */
function loadVaultConfig(overrides = {}) {
  const config = {
    vaultEndpoint: overrides.vaultEndpoint || process.env.VAULT_ENDPOINT,
    vaultToken: overrides.vaultToken || process.env.VAULT_TOKEN,
    kekName: overrides.kekName || process.env.VAULT_KEK_NAME || 'pqc-kek-5793e1f1-f0ee-40af-a291-1bcb6cd6fcf1',
    transitMount: overrides.transitMount || process.env.VAULT_TRANSIT_MOUNT || 'transit',
  };

  // Validate required fields
  if (!config.vaultEndpoint) {
    throw new Error('VAULT_ENDPOINT is required. Set via environment variable or config override.');
  }
  if (!config.vaultToken) {
    throw new Error('VAULT_TOKEN is required. Set via environment variable or config override. NEVER hard-code tokens!');
  }

  return config;
}

/**
 * HTTP client with timeout, retry logic, and proper error handling
 */
class ResilientHttpClient {
  constructor(timeoutMs = 3000, maxRetries = 3) {
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
  }

  async fetchWithRetry(url, options, attempt = 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Retry on network errors with exponential backoff
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        const backoffMs = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      
      throw this.normalizeError(error);
    }
  }

  isRetryableError(error) {
    return error.name === 'AbortError' || 
           error.message.includes('network') || 
           error.message.includes('ECONNREFUSED');
  }

  normalizeError(error) {
    if (error.name === 'AbortError') {
      return new Error(`Vault request timeout after ${this.timeoutMs}ms`);
    }
    return error;
  }
}

class VaultKmsClient {
  constructor(config) {
    const validatedConfig = loadVaultConfig(config);
    this.vaultEndpoint = validatedConfig.vaultEndpoint;
    this.vaultToken = validatedConfig.vaultToken;
    this.kekName = validatedConfig.kekName;
    this.transitMount = validatedConfig.transitMount;
    this.httpClient = new ResilientHttpClient(3000, 3);
  }

  /**
   * Encrypt DEK with KEK via Vault with timeout and retry
   */
  async encryptDEK(dekPlaintext, context = {}) {
    const url = `${this.vaultEndpoint}/v1/${this.transitMount}/encrypt/${this.kekName}`;
    
    const payload = {
      plaintext: Buffer.from(dekPlaintext).toString('base64'),
      context: context ? Buffer.from(JSON.stringify(context)).toString('base64') : undefined
    };

    try {
      const response = await this.httpClient.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Vault encrypt failed (${response.status}): ${errorBody}`);
      }

      const result = await response.json();
      return result.data.ciphertext;
    } catch (error) {
      // SECURITY: Never log the DEK or token
      throw new Error(`DEK encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt DEK with KEK via Vault with timeout and retry
   */
  async decryptDEK(dekCiphertext, context = {}) {
    const url = `${this.vaultEndpoint}/v1/${this.transitMount}/decrypt/${this.kekName}`;
    
    const payload = {
      ciphertext: dekCiphertext,
      context: context ? Buffer.from(JSON.stringify(context)).toString('base64') : undefined
    };

    try {
      const response = await this.httpClient.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Vault decrypt failed (${response.status}): ${errorBody}`);
      }

      const result = await response.json();
      return Buffer.from(result.data.plaintext, 'base64').toString('utf8');
    } catch (error) {
      // SECURITY: Never log the DEK or token
      throw new Error(`DEK decryption failed: ${error.message}`);
    }
  }
}

class EnvelopeEncryption {
  constructor(vaultConfig) {
    this.vaultClient = new VaultKmsClient(vaultConfig);
  }

  /**
   * Generate a random DEK (Data Encryption Key)
   */
  generateDEK() {
    return crypto.randomBytes(32); // 256-bit key for AES-256
  }

  /**
   * Encrypt data using envelope encryption with mandatory AAD
   * 
   * @param {string} plaintext - Data to encrypt
   * @param {Buffer|string} aad - Additional Authenticated Data (REQUIRED)
   * @param {object} context - Vault encryption context
   * Returns: { encryptedData, encryptedDEK, iv, tag, aad, context }
   * 
   * SECURITY REQUIREMENTS (matches verified C implementation):
   * - AAD is MANDATORY (cannot be empty/null)
   * - AAD size must be <= 64KB to prevent DoS
   * - IV is always 12 bytes, randomly generated (not user-controlled)
   * - Plaintext size must be <= 1MB
   */
  async encrypt(plaintext, aad, context = {}) {
    try {
      // CRITICAL: AAD enforcement - matches verified C implementation
      if (!aad || (Buffer.isBuffer(aad) && aad.length === 0) || (typeof aad === 'string' && aad.length === 0)) {
        throw new Error('AAD (Additional Authenticated Data) is REQUIRED and cannot be empty. Use transaction ID, user ID, or session context.');
      }
      
      // CRITICAL: AAD size limit validation - prevents DoS attacks
      const aadBuffer = Buffer.isBuffer(aad) ? aad : Buffer.from(aad);
      if (aadBuffer.length > AVEROX_MAX_AAD_SIZE) {
        throw new Error(`AAD size (${aadBuffer.length} bytes) exceeds maximum allowed (${AVEROX_MAX_AAD_SIZE} bytes)`);
      }
      
      // Plaintext bounds checking
      const plaintextBuffer = Buffer.from(plaintext, 'utf8');
      if (plaintextBuffer.length > AVEROX_MAX_PLAINTEXT_SIZE) {
        throw new Error(`Plaintext size (${plaintextBuffer.length} bytes) exceeds maximum allowed (${AVEROX_MAX_PLAINTEXT_SIZE} bytes)`);
      }
      
      // Step 1: Generate DEK locally
      const dek = this.generateDEK();
      
      // Step 2: Encrypt data with DEK using AES-256-GCM with AAD
      const iv = crypto.randomBytes(AVEROX_IV_SIZE); // Always 12 bytes, random
      const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
      
      // Set AAD for authentication
      cipher.setAAD(aadBuffer);
      
      let encryptedData = cipher.update(plaintextBuffer);
      encryptedData = Buffer.concat([encryptedData, cipher.final()]);
      const tag = cipher.getAuthTag();
      
      // Step 3: Encrypt DEK with KEK via Vault
      const encryptedDEK = await this.vaultClient.encryptDEK(
        dek.toString('base64'),
        context
      );
      
      // Step 4: Secure cleanup - zeroize DEK from memory
      dek.fill(0);
      
      // Step 5: Return envelope with encrypted DEK and data
      return {
        encryptedData: encryptedData.toString('base64'),
        encryptedDEK: encryptedDEK,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        aad: aadBuffer.toString('base64'), // Store AAD with envelope
        context: context,
        algorithm: 'aes-256-gcm',
        version: '2.0' // v2 with mandatory AAD
      };
    } catch (error) {
      throw new Error(`Envelope encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using envelope encryption with mandatory AAD
   * 
   * SECURITY REQUIREMENTS:
   * - AAD must match the AAD used during encryption
   * - If AAD mismatch, decryption will fail (authentication error)
   * - This prevents ciphertext from being used in wrong context
   */
  async decrypt(envelope) {
    try {
      // CRITICAL: AAD enforcement for decryption
      if (!envelope.aad || envelope.aad.length === 0) {
        throw new Error('AAD (Additional Authenticated Data) is REQUIRED in envelope. Cannot decrypt without AAD.');
      }
      
      // Step 1: Decrypt DEK with KEK via Vault
      const dekPlaintext = await this.vaultClient.decryptDEK(
        envelope.encryptedDEK,
        envelope.context || {}
      );
      
      const dek = Buffer.from(dekPlaintext, 'base64');
      
      // Step 2: Decrypt data with DEK, validating AAD
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        dek,
        Buffer.from(envelope.iv, 'base64')
      );
      
      // Set AAD - must match encryption AAD or decryption will fail
      const aadBuffer = Buffer.from(envelope.aad, 'base64');
      decipher.setAAD(aadBuffer);
      
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
      
      let decrypted = decipher.update(Buffer.from(envelope.encryptedData, 'base64'));
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      // Secure cleanup - zeroize DEK from memory
      dek.fill(0);
      
      return decrypted.toString('utf8');
    } catch (error) {
      // Authentication failures indicate AAD mismatch or tampering
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        throw new Error('Authentication failed: AAD mismatch or ciphertext tampered. Cannot decrypt.');
      }
      throw new Error(`Envelope decryption failed: ${error.message}`);
    }
  }

  /**
   * Rotate KEK in Vault (creates new version) with timeout and retry
   */
  async rotateKEK() {
    const url = `${this.vaultClient.vaultEndpoint}/v1/${this.vaultClient.transitMount}/keys/${this.vaultClient.kekName}/rotate`;
    
    try {
      const response = await this.vaultClient.httpClient.fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.vaultClient.vaultToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`KEK rotation failed (${response.status}): ${errorBody}`);
      }

      return { success: true, message: 'KEK rotated successfully' };
    } catch (error) {
      // SECURITY: Never log the token
      throw new Error(`KEK rotation failed: ${error.message}`);
    }
  }

  /**
   * Re-encrypt data with new KEK version (after rotation)
   * Preserves original AAD for context binding
   */
  async reEncrypt(envelope) {
    // Vault handles this automatically with versioned keys
    // Old encrypted DEKs can still be decrypted with old KEK versions
    // New encryptions will use the latest KEK version
    const plaintext = await this.decrypt(envelope);
    
    // CRITICAL: Preserve original AAD when re-encrypting
    const aad = Buffer.from(envelope.aad, 'base64');
    return await this.encrypt(plaintext, aad, envelope.context);
  }
}

// Export for use
module.exports = { EnvelopeEncryption, VaultKmsClient };

// ES Module support
if (typeof exports !== 'undefined') {
  exports.EnvelopeEncryption = EnvelopeEncryption;
  exports.VaultKmsClient = VaultKmsClient;
}
