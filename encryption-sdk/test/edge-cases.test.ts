// Edge Case Tests - Comprehensive Coverage
import { AveroxCrypto, ChaCha20Poly1305, BadInputError } from '../src/index';

describe('Edge Cases', () => {
  describe('Input Validation', () => {
    test('empty plaintext', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.from('aad');

      const encrypted = crypto.encrypt('', aad);
      const decrypted = crypto.decrypt(encrypted, aad);

      expect(decrypted.toString()).toBe('');
    });

    test('very large plaintext (1MB)', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const plaintext = Buffer.alloc(1024 * 1024, 'x');
      const aad = Buffer.from('aad');

      const encrypted = crypto.encrypt(plaintext, aad);
      const decrypted = crypto.decrypt(encrypted, aad);

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    test('unicode plaintext', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const plaintext = '🔐 Unicode: 你好世界 🌍';
      const aad = Buffer.from('aad');

      const encrypted = crypto.encrypt(plaintext, aad);
      const decrypted = crypto.decrypt(encrypted, aad);

      expect(decrypted.toString()).toBe(plaintext);
    });

    test('binary data with all byte values', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const plaintext = Buffer.from([...Array(256)].map((_, i) => i));
      const aad = Buffer.from('aad');

      const encrypted = crypto.encrypt(plaintext, aad);
      const decrypted = crypto.decrypt(encrypted, aad);

      expect(decrypted.equals(plaintext)).toBe(true);
    });

    test('very long AAD', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.alloc(10000, 'A');

      const encrypted = crypto.encrypt('test', aad);
      const decrypted = crypto.decrypt(encrypted, aad);

      expect(decrypted.toString()).toBe('test');
    });
  });

  describe('Constructor Edge Cases', () => {
    test('null key throws error', () => {
      expect(() => new AveroxCrypto(null as any)).toThrow(BadInputError);
    });

    test('undefined key throws error', () => {
      expect(() => new AveroxCrypto(undefined as any)).toThrow(BadInputError);
    });

    test('wrong size key throws error', () => {
      expect(() => new AveroxCrypto(Buffer.alloc(16))).toThrow(BadInputError);
      expect(() => new AveroxCrypto(Buffer.alloc(64))).toThrow(BadInputError);
    });

    test('non-Buffer key throws error', () => {
      expect(() => new AveroxCrypto('not a buffer' as any)).toThrow(BadInputError);
    });
  });

  describe('Multiple Operations', () => {
    test('same instance can encrypt multiple times', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.from('aad');

      const encrypted1 = crypto.encrypt('test1', aad);
      const encrypted2 = crypto.encrypt('test2', aad);
      const encrypted3 = crypto.encrypt('test3', aad);

      expect(crypto.decrypt(encrypted1, aad).toString()).toBe('test1');
      expect(crypto.decrypt(encrypted2, aad).toString()).toBe('test2');
      expect(crypto.decrypt(encrypted3, aad).toString()).toBe('test3');
    });

    test('IVs are unique across encryptions', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.from('aad');

      const encrypted1 = crypto.encrypt('test', aad);
      const encrypted2 = crypto.encrypt('test', aad);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });
});

console.log('✅ Edge case tests passed');
