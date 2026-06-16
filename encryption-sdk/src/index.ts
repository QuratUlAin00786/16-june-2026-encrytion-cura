/**
 * Averox Crypto SDK - Real AES-256-GCM Implementation
 * Actual cryptographic operations using Node.js crypto module
 * Enterprise-grade with OpenTelemetry metrics integration
 */

import * as crypto from 'crypto';

// SDK Metadata
export interface SDKMetadata {
  sdkId: string;
  sdkName: string;
  sdkVersion: string;
  language: string;
  generatedAt: string;
  telemetryEndpoint: string;
  telemetryEnabled: boolean;
  algorithms: string[]; // User-selected algorithms configured during SDK generation
  supportedAlgorithms: string[]; // Alias for algorithms
  metadata: {
    generator: string;
    generatorVersion: string;
    tenant: string;
    environment: string;
  };
}

const SDK_METADATA = {
  sdkId: 'be597e87-1051-4a12-bc5b-1a720faf46df',
  sdkName: 'CuraEmrEncryption',
  sdkVersion: '2.0.0',
  language: 'javascript',
  generatedAt: '2026-05-18T07:33:53.950Z',
  telemetryEndpoint: 'https://app.inkrypt.ai/api/sdk/telemetry',
  telemetryEnabled: true,
  algorithms: ["AES-128-GCM"],
  supportedAlgorithms: ["AES-128-GCM"],
  metadata: {
  "generator": "FixedEnterpriseSDKGenerator",
  "generatorVersion": "2.0.0",
  "tenant": "5793e1f1-f0ee-40af-a291-1bcb6cd6fcf1",
  "environment": "production"
},
  vaultKekName: 'pqc-kek-5793e1f1-f0ee-40af-a291-1bcb6cd6fcf1',
  vaultKekAlgorithm: 'kyber1024',
  vaultApiEndpoint: 'https://app.inkrypt.ai/api/vault/test',
  envelopeEncryptionEnabled: true
};

export function getSDKMetadata() {
  return { ...SDK_METADATA };
}

/**
 * Get list of algorithms supported by this SDK instance
 * @returns Array of algorithm names configured during SDK generation
 */
export function getSupportedAlgorithms(): string[] {
  return SDK_METADATA.algorithms || ['AES-256-GCM'];
}

// Telemetry Event Interface
interface TelemetryEvent {
  sdkId: string;
  operation: 'encrypt' | 'decrypt';
  algorithm: string;
  duration: number;
  success: boolean;
  inputSize: number;
  outputSize: number;
  metadata: {
    platform: string;
    deviceInfo: {
      os: string;
      arch: string;
      nodeVersion: string;
    };
    networkInfo: {
      endpoint: string;
    };
  };
}

// Telemetry Client
class TelemetryClient {
  private enabled: boolean;
  private endpoint: string;
  private sdkId: string;

  constructor() {
    this.enabled = SDK_METADATA.telemetryEnabled;
    this.endpoint = SDK_METADATA.telemetryEndpoint;
    this.sdkId = SDK_METADATA.sdkId;
  }

  /**
   * Send telemetry event to backend
   * Non-blocking - errors are silent and don't affect crypto operations
   */
  async sendEvent(event: Omit<TelemetryEvent, 'sdkId' | 'metadata'>): Promise<void> {
    if (!this.enabled) {
      return; // Telemetry disabled
    }

    try {
      const telemetryData: TelemetryEvent = {
        sdkId: this.sdkId,
        operation: event.operation,
        algorithm: event.algorithm,
        duration: event.duration,
        success: event.success,
        inputSize: event.inputSize,
        outputSize: event.outputSize,
        metadata: {
          platform: 'nodejs',
          deviceInfo: {
            os: process.platform,
            arch: process.arch,
            nodeVersion: process.version
          },
          networkInfo: {
            endpoint: this.endpoint
          }
        }
      };

      // Send asynchronously without blocking
      this.sendAsync(telemetryData).catch(() => {
        // Silent failure - telemetry should never break crypto operations
      });
    } catch (error) {
      // Silent failure
    }
  }

  private async sendAsync(data: TelemetryEvent): Promise<void> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `AveroxSDK/${SDK_METADATA.sdkVersion}`
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        return; // Silent failure
      }
    } catch (error) {
      return; // Network errors, timeouts - silent failure
    }
  }
}

// Global telemetry client instance
const telemetryClient = new TelemetryClient();

// OpenTelemetry Metrics Integration (legacy support)
interface TelemetryCounters {
  increment(name: string, value?: number, attributes?: Record<string, string>): void;
}

class NoOpTelemetry implements TelemetryCounters {
  increment(name: string, value?: number, attributes?: Record<string, string>): void {
    // No-op implementation when OpenTelemetry is not configured
  }
}

// Global telemetry instance - can be configured by consumers
let telemetry: TelemetryCounters = new NoOpTelemetry();

export function configureTelemetry(telemetryProvider: TelemetryCounters): void {
  telemetry = telemetryProvider;
}

// Enterprise telemetry metrics
const METRICS = {
  ENCRYPT_TOTAL: 'crypto_encrypt_total',
  DECRYPT_TOTAL: 'crypto_decrypt_total', 
  FAIL_TOTAL: 'crypto_fail_total'
} as const;

// Error Classes
export class AveroxCryptoError extends Error {
  constructor(public code: string, message: string, public details?: any) {
    super(message);
    this.name = 'AveroxCryptoError';
  }
}

export class InvalidTagError extends AveroxCryptoError {
  constructor(message = 'Authentication tag verification failed') {
    super('INVALID_TAG', message);
  }
}

export class BadInputError extends AveroxCryptoError {
  constructor(message: string) {
    super('BAD_INPUT', message);
  }
}

// Envelope Format
export interface AveroxEnvelope {
  v: string;    // version
  alg: string;  // algorithm
  kid?: string; // key ID
  iv: string;   // base64url encoded IV
  tag: string;  // base64url encoded authentication tag
  ct: string;   // base64url encoded ciphertext
  aad?: string; // base64url encoded AAD (if present)
}

// Memory Zeroization
function secureZero(buffer: Buffer): void {
  if (!Buffer.isBuffer(buffer)) return;
  buffer.fill(0x00);
  buffer.fill(0xFF); 
  buffer.fill(0x00);
}

// Timing-Safe Comparison
function timingSafeCompare(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    // Prevent timing attacks on length comparison
    const dummy = Buffer.alloc(32);
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

// HKDF Implementation
function hkdf(ikm: Buffer, salt: Buffer, info: Buffer, length: number): Buffer {
  const hmac = crypto.createHmac('sha256', salt);
  hmac.update(ikm);
  const prk = Buffer.from(hmac.digest());
  
  const okm = Buffer.alloc(length);
  const n = Math.ceil(length / 32);
  let t = Buffer.alloc(0);
  
  for (let i = 1; i <= n; i++) {
    const hmacExpand = crypto.createHmac('sha256', prk);
    hmacExpand.update(t);
    hmacExpand.update(info);
    hmacExpand.update(Buffer.from([i]));
    t = Buffer.from(hmacExpand.digest());
    t.copy(okm, (i - 1) * 32, 0, Math.min(32, length - (i - 1) * 32));
  }
  
  secureZero(prk);
  secureZero(t);
  
  return okm.subarray(0, length);
}

function alignDekKeyLength(
  dek: Buffer,
  targetSize: number,
  algorithm: string
): Buffer {
  if (!dek || dek.length === 0) {
    throw new AveroxCryptoError(
      'INVALID_DATAKEY',
      'Backend returned empty data key material'
    );
  }

  if (dek.length === targetSize) {
    return Buffer.from(dek);
  }

  const info = Buffer.from('averox-' + algorithm + '-' + targetSize, 'utf8');
  const derived = hkdf(dek, Buffer.alloc(32, 0), info, targetSize);
  secureZero(dek);
  return derived;
}

// Backend Data Key Configuration Interface
export interface BackendDataKeyConfig {
  apiEndpoint?: string; // Optional - auto-configured from SDK metadata if not provided
  kekName?: string; // Optional - auto-configured from SDK metadata if not provided
  context?: string; // Optional - auto-configured from SDK metadata if not provided
  enableEnvelopeEncryption?: boolean; // Defaults to true
}

// Backend Client for Data Key Provisioning and Unwrapping
class BackendDataKeyClient {
  private readonly apiBase: string;
  private readonly kekName: string;
  private readonly context: string;

  constructor(config: BackendDataKeyConfig) {
    if (!config.apiEndpoint || !config.kekName || !config.context) {
      throw new AveroxCryptoError('INVALID_CONFIG', 'Backend configuration requires apiEndpoint, kekName, and context');
    }
    this.apiBase = config.apiEndpoint.replace(/\/$/, '');
    this.kekName = config.kekName;
    this.context = config.context;
  }

  /**
   * Request a fresh DEK from backend. Backend returns plaintext (base64) and ciphertext (Vault-wrapped)
   */
  async getDataKey(): Promise<{ plaintext: string; ciphertext: string; }> {
    const url = this.apiBase + '/datakey';
    const payload = { kekName: this.kekName, context: this.context };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AveroxCryptoError('BACKEND_DATAKEY_FAILED', 'Backend datakey request failed: ' + error);
    }

    const result = await response.json() as { success: boolean; plaintext: string; ciphertext: string };
    if (!result || !result.plaintext || !result.ciphertext) {
      throw new AveroxCryptoError('BACKEND_DATAKEY_INVALID', 'Backend datakey response missing fields');
    }
    return { plaintext: result.plaintext, ciphertext: result.ciphertext };
  }

  /**
   * Ask backend to unwrap a previously issued encrypted DEK and return plaintext (base64)
   */
  async decryptDEK(ciphertext: string): Promise<string> {
    const url = this.apiBase + '/decrypt';
    const payload = { kekName: this.kekName, ciphertext, context: this.context };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new AveroxCryptoError('BACKEND_DECRYPT_FAILED', 'Backend DEK decrypt failed: ' + error);
    }

    const result = await response.json() as { success: boolean; plaintext: string };
    if (!result || !result.plaintext) {
      throw new AveroxCryptoError('BACKEND_DECRYPT_INVALID', 'Backend decrypt response missing plaintext');
    }
    return result.plaintext;
  }
}

// Extended envelope format with encrypted DEK
export interface EnvelopeWithKMS extends AveroxEnvelope {
  encryptedDEK?: string; // DEK encrypted by Vault KEK
  kmsContext?: Record<string, string>; // Context for KEK operations
}

/** Plaintext DEK + Vault-wrapped DEK for reuse across multiple encrypt operations (one per record). */
export interface ProvisionedDataKey {
  dek: Buffer;
  encryptedDEK: string;
}

/**
 * Session for encrypting multiple fields under one DEK (one database row).
 * Call beginRowEncryption(), encryptField() per column, then close().
 */
export class RowEncryptionSession {
  private closed = false;

  constructor(
    private readonly crypto: AveroxCrypto,
    private readonly dataKey: ProvisionedDataKey,
  ) {}

  /** Vault-wrapped DEK shared by every envelope in this row. */
  get encryptedDEK(): string {
    return this.dataKey.encryptedDEK;
  }

  /** Encrypt one column/value with this row's DEK (unique IV per call). */
  async encryptField(
    plaintext: Buffer | string,
    aad: Buffer | string,
    kid?: string,
    kmsContext?: Record<string, string>,
  ): Promise<EnvelopeWithKMS> {
    this.assertOpen();
    return this.crypto.encryptWithDataKey(plaintext, aad, this.dataKey, kid, kmsContext);
  }

  /** Zero the row DEK from memory when the batch is complete. */
  close(): void {
    if (!this.closed) {
      this.crypto.releaseDataKey(this.dataKey.dek);
      this.closed = true;
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new AveroxCryptoError('SESSION_CLOSED', 'Row encryption session is already closed');
    }
  }
}

/**
 * Session for decrypting multiple fields under one DEK (one database row).
 * Call beginRowDecryption(), decryptField() per column, then close().
 */
export class RowDecryptionSession {
  private closed = false;

  constructor(
    private readonly crypto: AveroxCrypto,
    readonly encryptedDEK: string,
    private readonly dek: Buffer,
  ) {}

  /** Decrypt one column/value that was encrypted with the same row encryptedDEK. */
  async decryptField(envelope: EnvelopeWithKMS, aad: Buffer | string): Promise<Buffer> {
    this.assertOpen();
    if (!envelope.encryptedDEK) {
      throw new BadInputError('Envelope is missing encryptedDEK');
    }
    if (envelope.encryptedDEK !== this.encryptedDEK) {
      throw new BadInputError('Envelope encryptedDEK does not match this row decryption session');
    }
    return this.crypto.decryptWithDataKey(envelope, aad, this.dek);
  }

  close(): void {
    if (!this.closed) {
      this.crypto.releaseDataKey(this.dek);
      this.closed = true;
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new AveroxCryptoError('SESSION_CLOSED', 'Row decryption session is already closed');
    }
  }
}

/**
 * Map algorithm name/ID to Node.js crypto format
 * Supports: AES-256-GCM, AES-192-GCM, AES-128-GCM, ChaCha20-Poly1305
 * Also supports: AES-256-CBC, AES-192-CBC, AES-128-CBC, AES-256-CFB, AES-192-CFB, AES-128-CFB, AES-256-CTR
 */
function getCryptoAlgorithm(algorithmName: string | undefined) {
  // Normalize algorithm names by lowercasing, converting spaces/underscores to hyphen,
  // then collapsing consecutive hyphens (keeps original hyphens intact).
  const normalized = (algorithmName || '')
    .replace(/s+/g, '-') // unify spaces to hyphen
    .replace(/_+/g, '-') // unify underscores to hyphen
    .toLowerCase() // case-insensitive comparison
    .replace(/-+/g, '-'); // collapse duplicate hyphens
  
  // AEAD modes (with built-in authentication)
  if (normalized.includes('aes-256-gcm') || normalized === 'aes256gcm' || (normalized.includes('aes256') && normalized.includes('gcm'))) {
    return { name: 'aes-256-gcm', keySize: 32, ivSize: 12, tagSize: 16, isAead: true };
  }
  if (normalized.includes('aes-192-gcm') || normalized === 'aes192gcm' || (normalized.includes('aes192') && normalized.includes('gcm'))) {
    return { name: 'aes-192-gcm', keySize: 24, ivSize: 12, tagSize: 16, isAead: true };
  }
  if (normalized.includes('aes-128-gcm') || normalized === 'aes128gcm' || (normalized.includes('aes128') && normalized.includes('gcm'))) {
    return { name: 'aes-128-gcm', keySize: 16, ivSize: 12, tagSize: 16, isAead: true };
  }
  if (normalized.includes('chacha20-poly1305') || normalized.includes('chacha20poly1305') || normalized.includes('chacha')) {
    return { name: 'chacha20-poly1305', keySize: 32, ivSize: 12, tagSize: 16, isAead: true };
  }
  
  // Non-AEAD modes (require HMAC for authentication)
  // AES-256-CBC
  if (normalized.includes('aes-256-cbc') || (normalized.includes('aes256') && normalized.includes('cbc'))) {
    return { name: 'aes-256-cbc', keySize: 32, ivSize: 16, tagSize: 32, isAead: false, mode: 'cbc' };
  }
  // AES-192-CBC
  if (normalized.includes('aes-192-cbc') || (normalized.includes('aes192') && normalized.includes('cbc'))) {
    return { name: 'aes-192-cbc', keySize: 24, ivSize: 16, tagSize: 32, isAead: false, mode: 'cbc' };
  }
  // AES-128-CBC
  if (normalized.includes('aes-128-cbc') || (normalized.includes('aes128') && normalized.includes('cbc'))) {
    return { name: 'aes-128-cbc', keySize: 16, ivSize: 16, tagSize: 32, isAead: false, mode: 'cbc' };
  }
  // AES-256-CFB
  if (normalized.includes('aes-256-cfb') || (normalized.includes('aes256') && normalized.includes('cfb'))) {
    return { name: 'aes-256-cfb', keySize: 32, ivSize: 16, tagSize: 32, isAead: false, mode: 'cfb' };
  }
  // AES-192-CFB
  if (normalized.includes('aes-192-cfb') || (normalized.includes('aes192') && normalized.includes('cfb'))) {
    return { name: 'aes-192-cfb', keySize: 24, ivSize: 16, tagSize: 32, isAead: false, mode: 'cfb' };
  }
  // AES-128-CFB
  if (normalized.includes('aes-128-cfb') || (normalized.includes('aes128') && normalized.includes('cfb'))) {
    return { name: 'aes-128-cfb', keySize: 16, ivSize: 16, tagSize: 32, isAead: false, mode: 'cfb' };
  }
  // AES-256-CTR
  if (normalized.includes('aes-256-ctr') || (normalized.includes('aes256') && normalized.includes('ctr'))) {
    return { name: 'aes-256-ctr', keySize: 32, ivSize: 16, tagSize: 32, isAead: false, mode: 'ctr' };
  }
  // AES-192-CTR
  if (normalized.includes('aes-192-ctr') || (normalized.includes('aes192') && normalized.includes('ctr'))) {
    return { name: 'aes-192-ctr', keySize: 24, ivSize: 16, tagSize: 32, isAead: false, mode: 'ctr' };
  }
  // AES-128-CTR
  if (normalized.includes('aes-128-ctr') || (normalized.includes('aes128') && normalized.includes('ctr'))) {
    return { name: 'aes-128-ctr', keySize: 16, ivSize: 16, tagSize: 32, isAead: false, mode: 'ctr' };
  }
  
  // Default to AES-256-GCM for safety
  console.warn('Unknown algorithm "' + algorithmName + '", defaulting to AES-256-GCM');
  return { name: 'aes-256-gcm', keySize: 32, ivSize: 12, tagSize: 16, isAead: true };
}

// Main Crypto Class with Vault KMS Integration (supports multiple symmetric algorithms)
export class AveroxCrypto {
  algorithm!: string;
  keySize!: number;
  ivSize!: number;
  tagSize!: number;
  masterKey!: Buffer;
  originalKeyRef!: Buffer;
  isZeroized = false;
  backendClient!: BackendDataKeyClient;
  useEnvelopeEncryption!: boolean;
  supportedAlgorithms!: string[];
  isAead!: boolean;
  cipherMode?: string;
  
  /**
   * Get list of algorithms supported by this SDK instance
   * @returns Array of algorithm names configured during SDK generation
   */
  static getSupportedAlgorithms(): string[] {
    return getSupportedAlgorithms();
  }
  
  /**
   * Get list of algorithms supported by this SDK instance (instance method)
   * @returns Array of algorithm names configured during SDK generation
   */
  getSupportedAlgorithms(): string[] {
    // Safety check: ensure we always return an array
    if (!Array.isArray(this.supportedAlgorithms)) {
      console.warn('Warning: supportedAlgorithms is not an array, using default');
      return ['AES-256-GCM'];
    }
    return this.supportedAlgorithms;
  }
  
  constructor(backendConfig?: BackendDataKeyConfig) {
    // Load SDK metadata for auto-configuration
    const metadata = getSDKMetadata();
    
    // Auto-configure from SDK metadata if not provided
    // This makes the SDK production-ready - users don't need to know internal details
    const config: BackendDataKeyConfig = {
      // Use provided config or fall back to SDK metadata
      // NOTE: apiEndpoint should NOT include the KEK name - KEK name goes in request body
      apiEndpoint: backendConfig?.apiEndpoint || 
        (metadata.vaultApiEndpoint ? metadata.vaultApiEndpoint : undefined),
      kekName: backendConfig?.kekName || metadata.vaultKekName || undefined,
      context: backendConfig?.context || metadata.metadata.tenant || undefined,
      enableEnvelopeEncryption: backendConfig?.enableEnvelopeEncryption !== false, // Default to true
    };
    
    // Validate that we have required configuration
    if (!config.apiEndpoint || !config.kekName || !config.context) {
      throw new BadInputError(
        'Backend configuration is required. Either provide config or ensure SDK metadata contains vault configuration.\n' +
        'Missing: ' + [
          !config.apiEndpoint && 'apiEndpoint',
          !config.kekName && 'kekName',
          !config.context && 'context'
        ].filter(Boolean).join(', ')
      );
    }
    
    // Envelope encryption is the only supported mode
    if (!config.enableEnvelopeEncryption) {
      throw new BadInputError('Envelope encryption is required and cannot be disabled');
    }
    
    // Generate internal master key (not used for data encryption)
    // Note: keySize will be set after algorithm is determined
    const tempKeySize = 32; // Temporary, will be overridden
    const internalKey = crypto.randomBytes(tempKeySize);
    this.originalKeyRef = internalKey;
    this.masterKey = Buffer.from(internalKey);
    
    // Initialize Backend Data Key client with auto-configured or provided config
    this.backendClient = new BackendDataKeyClient(config);
    this.useEnvelopeEncryption = true;
    
    // Load algorithms from SDK metadata (user-selected during SDK generation)
    const algorithms = getSupportedAlgorithms();
    // Ensure it's always an array
    this.supportedAlgorithms = Array.isArray(algorithms) ? algorithms : (algorithms ? [String(algorithms)] : ['AES-256-GCM']);
    
    // PRODUCTION-READY: Use the selected algorithm instead of hardcoding
    // Get the first (and only) algorithm from metadata
    const selectedAlgorithm = this.supportedAlgorithms[0] || 'AES-256-GCM';
    const cryptoAlg = getCryptoAlgorithm(selectedAlgorithm);
    this.algorithm = cryptoAlg.name;
    this.keySize = cryptoAlg.keySize;
    this.ivSize = cryptoAlg.ivSize;
    this.tagSize = cryptoAlg.tagSize;
    this.isAead = cryptoAlg.isAead !== false; // Default to true for AEAD modes
    this.cipherMode = cryptoAlg.mode; // For non-AEAD modes (cbc, cfb, ctr)
  }

  /** Request one DEK from the backend for encrypting an entire logical record (e.g. one patient row). */
  async provisionDataKey(): Promise<ProvisionedDataKey> {
    if (!this.backendClient) {
      throw new AveroxCryptoError('ENVELOPE_REQUIRED', 'Backend client is not configured.');
    }
    const { plaintext, ciphertext } = await this.backendClient.getDataKey();
    let dek = Buffer.from(plaintext, 'base64');
    dek = Buffer.from(alignDekKeyLength(dek, this.keySize, this.algorithm));
    return { dek, encryptedDEK: ciphertext };
  }

  /** Unwrap a stored encrypted DEK via the backend (one call per record on decrypt). */
  async unwrapDataKey(encryptedDEK: string): Promise<Buffer> {
    if (!this.backendClient) {
      throw new AveroxCryptoError('ENVELOPE_REQUIRED', 'Backend client is not configured.');
    }
    const dekPlaintext = await this.backendClient.decryptDEK(encryptedDEK);
    let dek = Buffer.from(dekPlaintext, 'base64');
    dek = Buffer.from(alignDekKeyLength(dek, this.keySize, this.algorithm));
    return dek;
  }

  /** Securely zero a provisioned DEK after a batch encrypt/decrypt completes. */
  releaseDataKey(dek: Buffer): void {
    secureZero(dek);
  }

  /**
   * Encrypt with a previously provisioned DEK (unique IV per call; same encryptedDEK on each envelope).
   * Used for field-level ciphertext that shares one DEK per database row.
   */
  async encryptWithDataKey(
    plaintext: Buffer | string,
    aad: Buffer | string,
    dataKey: ProvisionedDataKey,
    kid?: string,
    kmsContext?: Record<string, string>,
  ): Promise<EnvelopeWithKMS> {
    const startTime = performance.now();
    const algorithmDisplayName = this.algorithm.toUpperCase().replace(/_/g, '-');
    const attributes = {
      alg: algorithmDisplayName,
      kid: kid || 'unknown',
      env: process.env.NODE_ENV || 'development',
      useKMS: 'true',
    };

    try {
      if (!aad || (typeof aad === 'string' && aad.length === 0) || (Buffer.isBuffer(aad) && aad.length === 0)) {
        telemetry.increment(METRICS.FAIL_TOTAL, 1, { ...attributes, reason: 'missing_aad' });
        throw new BadInputError('AAD (Additional Authenticated Data) is required and cannot be empty');
      }

      const plaintextBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
      const aadBuffer = typeof aad === 'string' ? Buffer.from(aad, 'utf8') : aad;
      const iv = crypto.randomBytes(this.ivSize);
      let ciphertext: Buffer;
      let tag: Buffer;

      if (this.isAead) {
        const cipher = crypto.createCipheriv(this.algorithm, dataKey.dek, iv) as crypto.CipherGCM;
        cipher.setAAD(aadBuffer, { plaintextLength: plaintextBuffer.length });
        ciphertext = cipher.update(plaintextBuffer);
        ciphertext = Buffer.concat([ciphertext, cipher.final()]);
        tag = cipher.getAuthTag();
      } else {
        const cipher = crypto.createCipheriv(this.algorithm, dataKey.dek, iv) as crypto.CipherGCM;
        ciphertext = cipher.update(plaintextBuffer);
        ciphertext = Buffer.concat([ciphertext, cipher.final()]);
        const hmacKey = hkdf(dataKey.dek, Buffer.alloc(32, 0), Buffer.from('averox-hmac', 'utf8'), 32);
        const hmac = crypto.createHmac('sha256', hmacKey);
        hmac.update(iv);
        hmac.update(ciphertext);
        hmac.update(aadBuffer);
        tag = hmac.digest();
        secureZero(hmacKey);
      }

      telemetry.increment(METRICS.ENCRYPT_TOTAL, 1, { ...attributes, mode: 'envelope' });
      const result: EnvelopeWithKMS = {
        v: '2.0',
        alg: algorithmDisplayName,
        kid,
        iv: iv.toString('base64url'),
        tag: tag.toString('base64url'),
        ct: ciphertext.toString('base64url'),
        aad: aadBuffer.toString('base64url'),
        encryptedDEK: dataKey.encryptedDEK,
        kmsContext,
      };

      telemetryClient.sendEvent({
        operation: 'encrypt',
        algorithm: result.alg || algorithmDisplayName,
        duration: Math.round(performance.now() - startTime),
        success: true,
        inputSize: plaintextBuffer.length,
        outputSize: ciphertext.length,
      });

      return result;
    } catch (error: unknown) {
      telemetry.increment(METRICS.FAIL_TOTAL, 1, { ...attributes, reason: 'encryption_error' });
      const plaintextBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
      telemetryClient.sendEvent({
        operation: 'encrypt',
        algorithm: algorithmDisplayName,
        duration: Math.round(performance.now() - startTime),
        success: false,
        inputSize: plaintextBuffer.length,
        outputSize: 0,
      });
      if (error instanceof AveroxCryptoError) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown encryption error';
      throw new AveroxCryptoError('ENCRYPTION_FAILED', `Encryption failed: ${errorMessage}`);
    }
  }

  /** Decrypt with an already-unwrapped DEK (batch decrypt for one record). */
  async decryptWithDataKey(
    envelope: EnvelopeWithKMS,
    aad: Buffer | string,
    dek: Buffer,
  ): Promise<Buffer> {
    const startTime = performance.now();
    const attributes = {
      alg: envelope.alg,
      kid: envelope.kid || 'unknown',
      env: process.env.NODE_ENV || 'development',
      useKMS: envelope.encryptedDEK ? 'true' : 'false',
    };

    try {
      if (!aad || (typeof aad === 'string' && aad.length === 0) || (Buffer.isBuffer(aad) && aad.length === 0)) {
        telemetry.increment(METRICS.FAIL_TOTAL, 1, { ...attributes, reason: 'missing_aad' });
        throw new BadInputError('AAD (Additional Authenticated Data) is required and cannot be empty');
      }

      const envelopeAlg = (envelope.alg || '').toString().toUpperCase().trim();
      const selectedAlgUpper = this.algorithm.toUpperCase().replace(/-/g, '-');
      const normalizeAlg = (alg: string) => alg.replace(/[-s_]/g, '').toUpperCase();
      const envelopeNormalized = normalizeAlg(envelopeAlg);
      const selectedNormalized = normalizeAlg(selectedAlgUpper);
      const isMatch =
        envelopeNormalized === selectedNormalized ||
        (envelopeNormalized.includes('AES') &&
          selectedNormalized.includes('AES') &&
          envelopeNormalized.includes('GCM') &&
          selectedNormalized.includes('GCM')) ||
        (envelopeNormalized.includes('CHACHA') && selectedNormalized.includes('CHACHA'));

      if (!isMatch) {
        telemetry.increment(METRICS.FAIL_TOTAL, 1, { ...attributes, reason: 'unsupported_algorithm' });
        throw new BadInputError(
          `Unsupported algorithm: ${envelope.alg || 'undefined'}. Supported algorithms: ${this.getSupportedAlgorithms().join(', ')}`,
        );
      }

      const aadBuffer = typeof aad === 'string' ? Buffer.from(aad, 'utf8') : aad;
      const iv = Buffer.from(envelope.iv, 'base64url');
      const tag = Buffer.from(envelope.tag, 'base64url');
      const ciphertext = Buffer.from(envelope.ct, 'base64url');

      if (iv.length !== this.ivSize) {
        throw new AveroxCryptoError('INVALID_IV', `IV must be exactly ${this.ivSize} bytes`);
      }
      if (tag.length !== this.tagSize) {
        throw new AveroxCryptoError('INVALID_TAG', `Tag must be exactly ${this.tagSize} bytes`);
      }

      let plaintext: Buffer;
      if (this.isAead) {
        const decipher = crypto.createDecipheriv(this.algorithm, dek, iv) as crypto.DecipherGCM;
        decipher.setAuthTag(tag);
        decipher.setAAD(aadBuffer, { plaintextLength: ciphertext.length });
        plaintext = decipher.update(ciphertext);
        plaintext = Buffer.concat([plaintext, decipher.final()]);
      } else {
        const hmacKey = hkdf(dek, Buffer.alloc(32, 0), Buffer.from('averox-hmac', 'utf8'), 32);
        const hmac = crypto.createHmac('sha256', hmacKey);
        hmac.update(iv);
        hmac.update(ciphertext);
        hmac.update(aadBuffer);
        const computedTag = hmac.digest();
        if (!crypto.timingSafeEqual(tag, computedTag)) {
          secureZero(hmacKey);
          throw new InvalidTagError('Authentication tag verification failed');
        }
        const decipher = crypto.createDecipheriv(this.algorithm, dek, iv) as crypto.DecipherGCM;
        plaintext = decipher.update(ciphertext);
        plaintext = Buffer.concat([plaintext, decipher.final()]);
        secureZero(hmacKey);
      }

      telemetry.increment(METRICS.DECRYPT_TOTAL, 1, { ...attributes, mode: 'envelope' });
      const algorithmForTelemetry = envelope.alg || this.algorithm.toUpperCase().replace(/_/g, '-');
      telemetryClient.sendEvent({
        operation: 'decrypt',
        algorithm: algorithmForTelemetry,
        duration: Math.round(performance.now() - startTime),
        success: true,
        inputSize: ciphertext.length,
        outputSize: plaintext.length,
      });

      return plaintext;
    } catch (error: unknown) {
      telemetry.increment(METRICS.FAIL_TOTAL, 1, { ...attributes, reason: 'decryption_error' });
      const ciphertext = Buffer.from(envelope.ct, 'base64url');
      const algorithmForTelemetry = envelope.alg || this.algorithm.toUpperCase().replace(/_/g, '-');
      telemetryClient.sendEvent({
        operation: 'decrypt',
        algorithm: algorithmForTelemetry,
        duration: Math.round(performance.now() - startTime),
        success: false,
        inputSize: ciphertext.length,
        outputSize: 0,
      });

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage &&
        (errorMessage.includes('Unsupported state or unable to authenticate data') ||
          errorMessage.includes('unable to authenticate') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('auth tag'))
      ) {
        throw new InvalidTagError('Authentication failed - data may have been tampered with');
      }
      if (error instanceof AveroxCryptoError) throw error;
      throw new AveroxCryptoError('DECRYPTION_FAILED', `Decryption failed: ${errorMessage}`);
    }
  }
  
  /**
   * Encrypt a single field/column — provisions its own DEK (one backend call).
   * Use beginRowEncryption() when multiple fields share one database row.
   */
  async encryptField(
    plaintext: Buffer | string,
    aad: Buffer | string,
    kid?: string,
    kmsContext?: Record<string, string>,
  ): Promise<EnvelopeWithKMS> {
    return this.encrypt(plaintext, aad, kid, kmsContext);
  }

  /**
   * Decrypt a single field/column — unwraps the envelope's DEK (one backend call).
   * Use beginRowDecryption() when multiple fields share one database row.
   */
  async decryptField(envelope: EnvelopeWithKMS, aad: Buffer | string): Promise<Buffer> {
    return this.decrypt(envelope, aad);
  }

  /** Start a row encryption batch — one DEK for all encryptField() calls on the session. */
  async beginRowEncryption(): Promise<RowEncryptionSession> {
    if (this.isZeroized) {
      throw new AveroxCryptoError('ZEROIZED', 'Cannot encrypt: instance has been zeroized');
    }
    const dataKey = await this.provisionDataKey();
    return new RowEncryptionSession(this, dataKey);
  }

  /** Start a row decryption batch — one unwrap for all decryptField() calls on the session. */
  async beginRowDecryption(encryptedDEK: string): Promise<RowDecryptionSession> {
    if (this.isZeroized) {
      throw new AveroxCryptoError('ZEROIZED', 'Cannot decrypt: instance has been zeroized');
    }
    const dek = await this.unwrapDataKey(encryptedDEK);
    return new RowDecryptionSession(this, encryptedDEK, dek);
  }

  /** Start row decryption using any envelope from the row as the DEK reference. */
  async beginRowDecryptionFromEnvelope(envelope: EnvelopeWithKMS): Promise<RowDecryptionSession> {
    if (!envelope.encryptedDEK) {
      throw new AveroxCryptoError('ENVELOPE_REQUIRED', 'Envelope is missing encryptedDEK');
    }
    return this.beginRowDecryption(envelope.encryptedDEK);
  }

  // Encrypt with MANDATORY AAD (provisions a new DEK — use beginRowEncryption for row-level reuse)
  async encrypt(plaintext: Buffer | string, aad: Buffer | string, kid?: string, kmsContext?: Record<string, string>): Promise<EnvelopeWithKMS> {
    if (this.isZeroized) {
      throw new AveroxCryptoError('ZEROIZED', 'Cannot encrypt: instance has been zeroized');
    }
    if (!this.useEnvelopeEncryption || !this.backendClient) {
      throw new AveroxCryptoError('ENVELOPE_REQUIRED', 'Envelope encryption is required. Please provide backend configuration.');
    }

    const dataKey = await this.provisionDataKey();
    try {
      return await this.encryptWithDataKey(plaintext, aad, dataKey, kid, kmsContext);
    } finally {
      this.releaseDataKey(dataKey.dek);
    }
  }

  // Decrypt with MANDATORY AAD (unwraps DEK per call — use beginRowDecryption for row-level reuse)
  async decrypt(envelope: EnvelopeWithKMS, aad: Buffer | string): Promise<Buffer> {
    if (this.isZeroized) {
      throw new AveroxCryptoError('ZEROIZED', 'Cannot decrypt: instance has been zeroized');
    }
    if (!envelope.encryptedDEK || !this.backendClient) {
      throw new AveroxCryptoError('ENVELOPE_REQUIRED', 'Envelope decryption is required. Encrypted DEK not found or backend client not configured.');
    }

    const dek = await this.unwrapDataKey(envelope.encryptedDEK);
    try {
      return await this.decryptWithDataKey(envelope, aad, dek);
    } finally {
      this.releaseDataKey(dek);
    }
  }

  // Derive key using HKDF-SHA256
  deriveKey(salt: Buffer, info: Buffer): Buffer {
    try {
      return hkdf(this.masterKey, salt, info, this.keySize);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown key derivation error';
      throw new AveroxCryptoError('KEY_DERIVATION_FAILED', `Key derivation failed: ${errorMessage}`);
    }
  }
  
  // Securely clear master key from memory
  zeroize(): void {
    if (!this.isZeroized) {
      secureZero(this.masterKey); // Zero working copy
      secureZero(this.originalKeyRef); // Zero original buffer
      this.isZeroized = true;
    }
  }
}

// ChaCha20-Poly1305 Implementation (RFC 8439)
export class ChaCha20Poly1305 {
  private static readonly KEY_SIZE = 32;
  private static readonly NONCE_SIZE = 12;
  
  private readonly key: Buffer;
  private readonly originalKeyRef: Buffer; // Reference to original for zeroization
  private isZeroized: boolean = false;
  
  constructor(key: Buffer) {
    if (!Buffer.isBuffer(key) || key.length !== ChaCha20Poly1305.KEY_SIZE) {
      throw new BadInputError('ChaCha20-Poly1305 key must be exactly 32 bytes');
    }
    this.originalKeyRef = key; // Store reference to original
    this.key = Buffer.from(key); // Create working copy
  }
  
  // Generate secure 32-byte key
  static generateKey(): Buffer {
    return crypto.randomBytes(ChaCha20Poly1305.KEY_SIZE);
  }
  
  // Encrypt with ChaCha20-Poly1305
  encrypt(plaintext: Buffer | string, aad?: Buffer | string, kid?: string): AveroxEnvelope {
    if (this.isZeroized) {
      throw new AveroxCryptoError('ZEROIZED', 'Cannot encrypt: instance has been zeroized');
    }

    const attributes = {
      alg: 'ChaCha20-Poly1305',
      kid: kid || 'unknown',
      env: process.env.NODE_ENV || 'development'
    };

    try {
      const plaintextBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
      const aadBuffer = aad ? (typeof aad === 'string' ? Buffer.from(aad, 'utf8') : aad) : Buffer.alloc(0);
      
      // Generate random 12-byte nonce
      const nonce = crypto.randomBytes(ChaCha20Poly1305.NONCE_SIZE);
      
      // Create cipher
      const cipher = crypto.createCipheriv('chacha20-poly1305', this.key, nonce, {
        authTagLength: 16
      });
      
      if (aadBuffer.length > 0) {
        cipher.setAAD(aadBuffer, { 
          plaintextLength: plaintextBuffer.length 
        });
      }
      
      // Encrypt
      let ciphertext = cipher.update(plaintextBuffer);
      ciphertext = Buffer.concat([ciphertext, cipher.final()]);
      const tag = cipher.getAuthTag();
      
      telemetry.increment(METRICS.ENCRYPT_TOTAL, 1, attributes);
      
      return {
        v: '2.0',
        alg: 'ChaCha20-Poly1305',
        kid,
        iv: nonce.toString('base64url'),
        tag: tag.toString('base64url'),
        ct: ciphertext.toString('base64url'),
        aad: aadBuffer.length > 0 ? aadBuffer.toString('base64url') : undefined
      };
      
    } catch (error: unknown) {
      telemetry.increment(METRICS.FAIL_TOTAL, 1, { ...attributes, reason: 'encryption_error' });
      if (error instanceof AveroxCryptoError) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown encryption error';
      throw new AveroxCryptoError('ENCRYPTION_FAILED', `ChaCha20-Poly1305 encryption failed: ${errorMessage}`);
    }
  }
  
  // Decrypt with ChaCha20-Poly1305
  decrypt(envelope: AveroxEnvelope, aad?: Buffer | string): Buffer {
    if (this.isZeroized) {
      throw new AveroxCryptoError('ZEROIZED', 'Cannot decrypt: instance has been zeroized');
    }

    const attributes = {
      alg: envelope.alg,
      kid: envelope.kid || 'unknown',
      env: process.env.NODE_ENV || 'development'
    };

    try {
      if (envelope.alg !== 'ChaCha20-Poly1305') {
        telemetry.increment(METRICS.FAIL_TOTAL, 1, { ...attributes, reason: 'unsupported_algorithm' });
        throw new BadInputError(`Expected ChaCha20-Poly1305 but got: ${envelope.alg}`);
      }
      
      const aadBuffer = aad ? (typeof aad === 'string' ? Buffer.from(aad, 'utf8') : aad) : Buffer.alloc(0);
      
      // Decode envelope components
      const nonce = Buffer.from(envelope.iv, 'base64url');
      const tag = Buffer.from(envelope.tag, 'base64url');
      const ciphertext = Buffer.from(envelope.ct, 'base64url');
      
      // Validate sizes
      if (nonce.length !== ChaCha20Poly1305.NONCE_SIZE) {
        throw new AveroxCryptoError('INVALID_NONCE', 'Nonce must be exactly 12 bytes');
      }
      
      if (tag.length !== 16) {
        throw new AveroxCryptoError('INVALID_TAG', 'Tag must be exactly 16 bytes');
      }
      
      // Create decipher
      const decipher = crypto.createDecipheriv('chacha20-poly1305', this.key, nonce, {
        authTagLength: 16
      });
      
      decipher.setAuthTag(tag);
      
      if (aadBuffer.length > 0) {
        decipher.setAAD(aadBuffer, { 
          plaintextLength: ciphertext.length 
        });
      }
      
      // Decrypt
      let plaintext = decipher.update(ciphertext);
      plaintext = Buffer.concat([plaintext, decipher.final()]);
      
      telemetry.increment(METRICS.DECRYPT_TOTAL, 1, attributes);
      return plaintext;
      
    } catch (error: unknown) {
      telemetry.increment(METRICS.FAIL_TOTAL, 1, { ...attributes, reason: 'decryption_error' });
      
      // Detect authentication tag failures from Node.js crypto
      // Handle both direct Error objects and ts-jest wrapped errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage && (
        errorMessage.includes('Unsupported state or unable to authenticate data') ||
        errorMessage.includes('unable to authenticate') || 
        errorMessage.includes('authentication') ||
        errorMessage.includes('auth tag')
      )) {
        throw new InvalidTagError('ChaCha20-Poly1305 authentication failed - data may have been tampered with');
      }
      
      if (error instanceof AveroxCryptoError) throw error;
      const finalErrorMessage = error instanceof Error ? error.message : 'Unknown decryption error';
      throw new AveroxCryptoError('DECRYPTION_FAILED', `ChaCha20-Poly1305 decryption failed: ${finalErrorMessage}`);
    }
  }
  
  // Securely clear key from memory
  zeroize(): void {
    if (!this.isZeroized) {
      secureZero(this.key); // Zero working copy
      secureZero(this.originalKeyRef); // Zero original buffer
      this.isZeroized = true;
    }
  }
}

export default AveroxCrypto;