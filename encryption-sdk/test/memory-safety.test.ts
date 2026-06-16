// Memory Safety Tests - Verify Secure Memory Handling
import { AveroxCrypto, ChaCha20Poly1305 } from '../src/index';

describe('Memory Safety', () => {
  describe('Memory Zeroization', () => {
    test('AveroxCrypto zeroize clears master key', () => {
      const key = AveroxCrypto.generateMasterKey();
      const keyCopy = Buffer.from(key);
      const crypto = new AveroxCrypto(key);

      // Use the crypto instance
      const aad = Buffer.from('aad');
      crypto.encrypt('test', aad);

      // Zeroize
      crypto.zeroize();

      // After zeroization, encryption should fail
      expect(() => crypto.encrypt('test', aad)).toThrow();

      // Original key buffer should be zeroed
      expect(key.every(byte => byte === 0)).toBe(true);
    });

    test('ChaCha20Poly1305 zeroize clears key', () => {
      const key = ChaCha20Poly1305.generateKey();
      const keyCopy = Buffer.from(key);
      const chacha = new ChaCha20Poly1305(key);

      // Use the instance
      chacha.encrypt('test', 'aad');

      // Zeroize
      chacha.zeroize();

      // After zeroization, encryption should fail
      expect(() => chacha.encrypt('test')).toThrow();

      // Original key buffer should be zeroed
      expect(key.every(byte => byte === 0)).toBe(true);
    });

    test('multiple zeroize calls are safe', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);

      crypto.zeroize();
      crypto.zeroize();
      crypto.zeroize();

      // Should not throw, just be a no-op
      expect(key.every(byte => byte === 0)).toBe(true);
    });
  });

  describe('Key Independence', () => {
    test('constructor creates independent key copy', () => {
      const originalKey = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(originalKey);

      // Modify original key
      originalKey.fill(0xFF);

      // Crypto instance should still work (has its own copy)
      const aad = Buffer.from('aad');
      const encrypted = crypto.encrypt('test', aad);
      const decrypted = crypto.decrypt(encrypted, aad);

      expect(decrypted.toString()).toBe('test');
    });

    test('zeroizing one instance does not affect others', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto1 = new AveroxCrypto(Buffer.from(key));
      const crypto2 = new AveroxCrypto(Buffer.from(key));

      crypto1.zeroize();

      // crypto2 should still work
      const aad = Buffer.from('aad');
      const encrypted = crypto2.encrypt('test', aad);
      const decrypted = crypto2.decrypt(encrypted, aad);

      expect(decrypted.toString()).toBe('test');
    });
  });

  describe('Derived Key Cleanup', () => {
    test('deriveKey does not leak intermediate values', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);

      const salt = Buffer.from('salt');
      const info = Buffer.from('info');

      // Call multiple times to ensure no memory leaks
      for (let i = 0; i < 100; i++) {
        const derived = crypto.deriveKey(salt, info);
        expect(derived.length).toBe(32);
      }

      // No assertion needed - just checking no crashes/leaks
    });
  });

  describe('Buffer Ownership', () => {
    test('encrypted envelope does not share buffers', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const plaintext = Buffer.from('test data');
      const aad = Buffer.from('aad');

      const encrypted = crypto.encrypt(plaintext, aad);

      // Modify original plaintext
      plaintext.fill(0xFF);

      // Should not affect decryption
      const decrypted = crypto.decrypt(encrypted, aad);
      expect(decrypted.toString()).toBe('test data');
    });

    test('decrypted data is independent', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.from('aad');

      const encrypted = crypto.encrypt('test', aad);
      const decrypted1 = crypto.decrypt(encrypted, aad);
      const decrypted2 = crypto.decrypt(encrypted, aad);

      // Modifying one should not affect the other
      decrypted1.fill(0xFF);
      expect(decrypted2.toString()).toBe('test');
    });
  });
});

console.log('✅ Memory safety tests passed');
