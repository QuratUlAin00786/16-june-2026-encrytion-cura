// REAL Audit Compliance Tests
const { AveroxCrypto, ChaCha20Poly1305, InvalidTagError } = require('../src/index');

describe('Audit Compliance Tests', () => {
  test('All claimed algorithms are implemented', () => {
    // AES-256-GCM
    expect(AveroxCrypto).toBeDefined();
    expect(typeof AveroxCrypto.generateMasterKey).toBe('function');
    
    // ChaCha20-Poly1305 
    expect(ChaCha20Poly1305).toBeDefined();
    expect(typeof ChaCha20Poly1305.generateKey).toBe('function');
    
    const testKey = ChaCha20Poly1305.generateKey();
    const chacha = new ChaCha20Poly1305(testKey);
    expect(typeof chacha.encrypt).toBe('function');
    expect(typeof chacha.decrypt).toBe('function');
    expect(typeof chacha.zeroize).toBe('function');
  });
  
  test('Envelope format standardization', () => {
    const key = AveroxCrypto.generateMasterKey();
    const crypto = new AveroxCrypto(key);
    const encrypted = crypto.encrypt('test', Buffer.from('aad'));
    
    // Standard envelope fields
    expect(encrypted).toHaveProperty('v');
    expect(encrypted).toHaveProperty('alg'); 
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('tag');
    expect(encrypted).toHaveProperty('ct');
    expect(encrypted).toHaveProperty('aad');
    
    // Proper base64url encoding
    expect(encrypted.iv).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encrypted.tag).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encrypted.ct).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  
  test('Error handling consistency - AES-256-GCM', () => {
    const { InvalidTagError, BadInputError, AveroxCryptoError } = require('../src/index');
    const key = AveroxCrypto.generateMasterKey();
    const crypto = new AveroxCrypto(key);
    const aad = Buffer.from('test-aad');
    
    // BadInputError for missing/empty AAD
    expect(() => crypto.encrypt('test', '')).toThrow(BadInputError);
    expect(() => crypto.encrypt('test', Buffer.alloc(0))).toThrow(BadInputError);
    
    // InvalidTagError for authentication failure
    const encrypted = crypto.encrypt('test', aad);
    encrypted.tag = Buffer.from([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]).toString('base64url'); // wrong tag
    expect(() => crypto.decrypt(encrypted, aad)).toThrow(InvalidTagError);
    
    // BadInputError for wrong algorithm
    const wrongAlg = { ...encrypted, alg: 'AES-128-GCM' };
    expect(() => crypto.decrypt(wrongAlg, aad)).toThrow(BadInputError);
    
    // AveroxCryptoError for invalid key
    expect(() => new AveroxCrypto(Buffer.from('too-short'))).toThrow(BadInputError);
  });
  
  test('Error handling consistency - ChaCha20-Poly1305', () => {
    const { InvalidTagError, BadInputError } = require('../src/index');
    const key = ChaCha20Poly1305.generateKey();
    const chacha = new ChaCha20Poly1305(key);
    const aad = Buffer.from('test-aad');
    
    // Encrypt and decrypt should work
    const encrypted = chacha.encrypt('test', aad);
    const decrypted = chacha.decrypt(encrypted, aad);
    expect(decrypted.toString()).toBe('test');
    
    // InvalidTagError for authentication failure
    encrypted.tag = Buffer.from([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]).toString('base64url');
    expect(() => chacha.decrypt(encrypted, aad)).toThrow(InvalidTagError);
    
    // BadInputError for wrong algorithm
    const wrongAlg = { ...encrypted, alg: 'AES-256-GCM' };
    expect(() => chacha.decrypt(wrongAlg, aad)).toThrow(BadInputError);
  });
  
  test('deriveKey method works correctly', () => {
    const key = AveroxCrypto.generateMasterKey();
    const crypto = new AveroxCrypto(key);
    
    const salt = Buffer.from('test-salt');
    const info = Buffer.from('test-info');
    
    const derivedKey = crypto.deriveKey(salt, info);
    expect(Buffer.isBuffer(derivedKey)).toBe(true);
    expect(derivedKey.length).toBe(32);
    
    // Same inputs should produce same output
    const derivedKey2 = crypto.deriveKey(salt, info);
    expect(derivedKey.equals(derivedKey2)).toBe(true);
    
    // Different salt should produce different output
    const derivedKey3 = crypto.deriveKey(Buffer.from('different-salt'), info);
    expect(derivedKey.equals(derivedKey3)).toBe(false);
  });
  
  test('ChaCha20-Poly1305 with optional AAD', () => {
    const key = ChaCha20Poly1305.generateKey();
    const chacha = new ChaCha20Poly1305(key);
    
    // Without AAD
    const encrypted1 = chacha.encrypt('test');
    const decrypted1 = chacha.decrypt(encrypted1);
    expect(decrypted1.toString()).toBe('test');
    
    // With AAD
    const encrypted2 = chacha.encrypt('test', 'metadata');
    const decrypted2 = chacha.decrypt(encrypted2, 'metadata');
    expect(decrypted2.toString()).toBe('test');
    
    // Wrong AAD should fail
    expect(() => chacha.decrypt(encrypted2, 'wrong')).toThrow(InvalidTagError);
  });
});

console.log('✅ Audit compliance verification completed');
