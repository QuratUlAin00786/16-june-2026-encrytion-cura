# API Reference - CuraEmrEncryption

## Table of Contents
- [AveroxCrypto](#averoxcrypto)
- [ChaCha20Poly1305](#chacha20poly1305)
- [Error Types](#error-types)
- [Type Definitions](#type-definitions)

## AveroxCrypto

Enterprise-grade AES-256-GCM encryption class with mandatory AAD.

### Constructor

```typescript
new AveroxCrypto(masterKey: Buffer): AveroxCrypto
```

Creates a new AveroxCrypto instance with the provided master key.

**Parameters:**
- `masterKey` (Buffer): Must be exactly 32 bytes

**Throws:**
- `BadInputError`: If key is not a Buffer or not 32 bytes

**Example:**
```typescript
const key = AveroxCrypto.generateMasterKey();
const crypto = new AveroxCrypto(key);
```

### Static Methods

#### generateMasterKey()

```typescript
static generateMasterKey(): Buffer
```

Generates a cryptographically secure 32-byte master key.

**Returns:** Buffer of 32 random bytes

**Example:**
```typescript
const key = AveroxCrypto.generateMasterKey();
```

### Instance Methods

#### encrypt()

```typescript
encrypt(plaintext: Buffer | string, aad: Buffer | string, kid?: string): AveroxEnvelope
```

Encrypts data using AES-256-GCM with mandatory AAD.

**Parameters:**
- `plaintext` (Buffer | string): Data to encrypt
- `aad` (Buffer | string): Additional authenticated data (REQUIRED, non-empty)
- `kid` (string, optional): Key identifier for envelope

**Returns:** AveroxEnvelope object

**Throws:**
- `BadInputError`: If AAD is missing or empty

**Example:**
```typescript
const encrypted = crypto.encrypt('Hello', Buffer.from('metadata'));
```

#### decrypt()

```typescript
decrypt(envelope: AveroxEnvelope, aad: Buffer | string): Buffer
```

Decrypts an encrypted envelope.

**Parameters:**
- `envelope` (AveroxEnvelope): Encrypted data envelope
- `aad` (Buffer | string): Same AAD used during encryption

**Returns:** Buffer containing decrypted plaintext

**Throws:**
- `InvalidTagError`: If authentication fails (wrong AAD, tampered data, wrong key)
- `BadInputError`: If envelope format is invalid or algorithm mismatch

**Example:**
```typescript
const decrypted = crypto.decrypt(encrypted, Buffer.from('metadata'));
console.log(decrypted.toString());
```

#### deriveKey()

```typescript
deriveKey(salt: Buffer, info: Buffer, length?: number): Buffer
```

Derives a key using HKDF-SHA256.

**Parameters:**
- `salt` (Buffer): Salt for derivation
- `info` (Buffer): Context/application info
- `length` (number, optional): Desired key length in bytes (default: 32)

**Returns:** Derived key buffer

**Example:**
```typescript
const derivedKey = crypto.deriveKey(
  Buffer.from('salt'),
  Buffer.from('app-context')
);
```

#### zeroize()

```typescript
zeroize(): void
```

Securely zeros out the master key in memory. After calling this method, the instance cannot be used for encryption/decryption.

**Example:**
```typescript
crypto.zeroize();
// crypto instance is now unusable
```

## ChaCha20Poly1305

ChaCha20-Poly1305 AEAD encryption (RFC 8439 compliant).

### Constructor

```typescript
new ChaCha20Poly1305(key: Buffer): ChaCha20Poly1305
```

Creates a new ChaCha20Poly1305 instance.

**Parameters:**
- `key` (Buffer): Must be exactly 32 bytes

**Throws:**
- `BadInputError`: If key is not a Buffer or not 32 bytes

### Static Methods

#### generateKey()

```typescript
static generateKey(): Buffer
```

Generates a cryptographically secure 32-byte key.

**Returns:** Buffer of 32 random bytes

### Instance Methods

#### encrypt()

```typescript
encrypt(plaintext: Buffer | string, aad?: Buffer | string, kid?: string): AveroxEnvelope
```

Encrypts data using ChaCha20-Poly1305.

**Parameters:**
- `plaintext` (Buffer | string): Data to encrypt
- `aad` (Buffer | string, optional): Additional authenticated data
- `kid` (string, optional): Key identifier

**Returns:** AveroxEnvelope object

#### decrypt()

```typescript
decrypt(envelope: AveroxEnvelope, aad?: Buffer | string): Buffer
```

Decrypts an encrypted envelope.

**Parameters:**
- `envelope` (AveroxEnvelope): Encrypted data envelope
- `aad` (Buffer | string, optional): Same AAD used during encryption

**Returns:** Buffer containing decrypted plaintext

**Throws:**
- `InvalidTagError`: If authentication fails
- `BadInputError`: If envelope format is invalid

#### zeroize()

```typescript
zeroize(): void
```

Securely zeros out the key in memory.

## Error Types

### AveroxCryptoError

Base error class for all crypto operations.

```typescript
class AveroxCryptoError extends Error {
  code: string;
  details?: any;
}
```

### InvalidTagError

Thrown when authentication tag verification fails.

```typescript
class InvalidTagError extends AveroxCryptoError {
  code: 'INVALID_TAG'
}
```

**Common causes:**
- Wrong AAD provided
- Data has been tampered with
- Wrong decryption key used

### BadInputError

Thrown for invalid inputs or parameters.

```typescript
class BadInputError extends AveroxCryptoError {
  code: 'BAD_INPUT'
}
```

**Common causes:**
- Missing or empty AAD
- Invalid key size
- Malformed envelope
- Algorithm mismatch

## Type Definitions

### AveroxEnvelope

```typescript
interface AveroxEnvelope {
  v: string;       // Version (always "2")
  alg: string;     // Algorithm ("AES-256-GCM" or "CHACHA20-POLY1305")
  kid?: string;    // Key identifier (optional)
  iv: string;      // Base64url-encoded IV
  tag: string;     // Base64url-encoded authentication tag
  ct: string;      // Base64url-encoded ciphertext
  aad?: string;    // Base64url-encoded AAD (if present)
}
```

## Security Best Practices

1. **Always use AAD**: For AES-256-GCM, AAD is mandatory. Include context like tenant ID, request ID, or operation type.

2. **Zeroize after use**: Call `zeroize()` when you're done with a crypto instance to clear sensitive keys from memory.

3. **Handle errors properly**: Catch `InvalidTagError` separately from `BadInputError` for appropriate error handling.

4. **Store keys securely**: Never log or expose master keys. Use environment variables or key management systems.

5. **Don't reuse envelopes**: Each encryption generates a unique IV. Never attempt to decrypt the same envelope multiple times with different AADs.

## Complete Example

```typescript
import { AveroxCrypto, InvalidTagError, BadInputError } from 'curaemrencryption-crypto-sdk';

// Generate or load master key
const key = AveroxCrypto.generateMasterKey();
const crypto = new AveroxCrypto(key);

try {
  // Encrypt with AAD
  const aad = Buffer.from(JSON.stringify({
    tenantId: 'tenant-123',
    requestId: 'req-456'
  }));
  
  const encrypted = crypto.encrypt('sensitive data', aad);
  
  // Store encrypted.v, encrypted.ct, encrypted.iv, encrypted.tag, etc.
  
  // Decrypt with same AAD
  const decrypted = crypto.decrypt(encrypted, aad);
  console.log(decrypted.toString()); // "sensitive data"
  
} catch (error) {
  if (error instanceof InvalidTagError) {
    console.error('Authentication failed - data may be tampered');
  } else if (error instanceof BadInputError) {
    console.error('Invalid input:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
} finally {
  // Clean up
  crypto.zeroize();
}
```

---

Generated: 2026-05-18T07:33:53.952Z
