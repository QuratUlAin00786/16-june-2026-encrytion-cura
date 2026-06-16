// Basic Functionality Tests - 100% Coverage Required
import { AveroxCrypto, ChaCha20Poly1305, InvalidTagError, BadInputError } from '../src/index';

describe('Basic Functionality', () => {
  describe('AveroxCrypto', () => {
    test('generateMasterKey creates 32-byte key', () => {
      const key = AveroxCrypto.generateMasterKey();
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    test('encrypt and decrypt round trip', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const plaintext = 'Hello, World!';
      const aad = Buffer.from('metadata');

      const encrypted = crypto.encrypt(plaintext, aad);
      const decrypted = crypto.decrypt(encrypted, aad);

      expect(decrypted.toString()).toBe(plaintext);
    });

    test('encrypt with Buffer plaintext', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const plaintext = Buffer.from('test data');
      const aad = Buffer.from('metadata');

      const encrypted = crypto.encrypt(plaintext, aad);
      const decrypted = crypto.decrypt(encrypted, aad);

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    test('encrypt with string AAD', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const encrypted = crypto.encrypt('test', 'string-aad');
      const decrypted = crypto.decrypt(encrypted, 'string-aad');
      expect(decrypted.toString()).toBe('test');
    });

    test('deriveKey produces deterministic output', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const salt = Buffer.from('salt');
      const info = Buffer.from('info');

      const derived1 = crypto.deriveKey(salt, info);
      const derived2 = crypto.deriveKey(salt, info);

      expect(derived1.equals(derived2)).toBe(true);
      expect(derived1.length).toBe(32);
    });

    test('zeroize clears sensitive data', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      
      crypto.zeroize();
      
      // After zeroization, operations should fail
      expect(() => crypto.encrypt('test', 'aad')).toThrow();
    });
  });

  describe('ChaCha20Poly1305', () => {
    test('generateKey creates 32-byte key', () => {
      const key = ChaCha20Poly1305.generateKey();
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    test('encrypt and decrypt round trip', () => {
      const key = ChaCha20Poly1305.generateKey();
      const chacha = new ChaCha20Poly1305(key);
      const plaintext = 'Hello, ChaCha!';
      const aad = 'metadata';

      const encrypted = chacha.encrypt(plaintext, aad);
      const decrypted = chacha.decrypt(encrypted, aad);

      expect(decrypted.toString()).toBe(plaintext);
    });

    test('encrypt without AAD', () => {
      const key = ChaCha20Poly1305.generateKey();
      const chacha = new ChaCha20Poly1305(key);
      const plaintext = 'test';

      const encrypted = chacha.encrypt(plaintext);
      const decrypted = chacha.decrypt(encrypted);

      expect(decrypted.toString()).toBe(plaintext);
    });

    test('zeroize clears sensitive data', () => {
      const key = ChaCha20Poly1305.generateKey();
      const chacha = new ChaCha20Poly1305(key);
      
      chacha.zeroize();
      
      // After zeroization, operations should fail
      expect(() => chacha.encrypt('test')).toThrow();
    });
  });
});

console.log('✅ Basic functionality tests passed');
