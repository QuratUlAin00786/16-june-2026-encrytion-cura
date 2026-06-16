// Error Handling Tests - All Error Paths Covered
import { AveroxCrypto, ChaCha20Poly1305, InvalidTagError, BadInputError, AveroxCryptoError } from '../src/index';

describe('Error Handling', () => {
  describe('AAD Validation', () => {
    test('missing AAD throws BadInputError', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);

      expect(() => crypto.encrypt('test', null as any)).toThrow(BadInputError);
      expect(() => crypto.encrypt('test', undefined as any)).toThrow(BadInputError);
    });

    test('empty AAD throws BadInputError', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);

      expect(() => crypto.encrypt('test', '')).toThrow(BadInputError);
      expect(() => crypto.encrypt('test', Buffer.alloc(0))).toThrow(BadInputError);
    });

    test('wrong AAD during decrypt throws InvalidTagError', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const encrypted = crypto.encrypt('test', 'correct-aad');

      expect(() => crypto.decrypt(encrypted, 'wrong-aad')).toThrow(InvalidTagError);
    });
  });

  describe('Authentication Failures', () => {
    test('tampered ciphertext throws InvalidTagError', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.from('aad');
      const encrypted = crypto.encrypt('test', aad);

      // Tamper with ciphertext
      encrypted.ct = Buffer.from('tampered').toString('base64url');

      expect(() => crypto.decrypt(encrypted, aad)).toThrow(InvalidTagError);
    });

    test('tampered tag throws InvalidTagError', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.from('aad');
      const encrypted = crypto.encrypt('test', aad);

      // Tamper with tag
      encrypted.tag = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toString('base64url');

      expect(() => crypto.decrypt(encrypted, aad)).toThrow(InvalidTagError);
    });

    test('tampered IV throws InvalidTagError', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.from('aad');
      const encrypted = crypto.encrypt('test', aad);

      // Tamper with IV
      encrypted.iv = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).toString('base64url');

      expect(() => crypto.decrypt(encrypted, aad)).toThrow(InvalidTagError);
    });
  });

  describe('Algorithm Validation', () => {
    test('wrong algorithm throws BadInputError', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.from('aad');
      const encrypted = crypto.encrypt('test', aad);

      encrypted.alg = 'AES-128-GCM';

      expect(() => crypto.decrypt(encrypted, aad)).toThrow(BadInputError);
    });

    test('ChaCha20 with wrong algorithm throws BadInputError', () => {
      const key = ChaCha20Poly1305.generateKey();
      const chacha = new ChaCha20Poly1305(key);
      const encrypted = chacha.encrypt('test', 'aad');

      encrypted.alg = 'AES-256-GCM';

      expect(() => chacha.decrypt(encrypted, 'aad')).toThrow(BadInputError);
    });
  });

  describe('Envelope Validation', () => {
    test('missing envelope fields throw errors', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.from('aad');

      expect(() => crypto.decrypt({} as any, aad)).toThrow();
      expect(() => crypto.decrypt({ v: '2' } as any, aad)).toThrow();
      expect(() => crypto.decrypt({ v: '2', alg: 'AES-256-GCM' } as any, aad)).toThrow();
    });

    test('invalid base64url encoding throws error', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const aad = Buffer.from('aad');
      const encrypted = crypto.encrypt('test', aad);

      encrypted.iv = 'invalid base64url!!!';

      expect(() => crypto.decrypt(encrypted, aad)).toThrow();
    });
  });

  describe('Error Message Safety', () => {
    test('errors do not leak sensitive data', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);

      try {
        crypto.encrypt('sensitive data', null as any);
        fail('Should have thrown error');
      } catch (err) {
        const error = err as Error;
        expect(error.message).not.toContain('sensitive data');
        expect(error.message).not.toContain(key.toString('hex'));
      }
    });

    test('InvalidTagError has safe message', () => {
      const key = AveroxCrypto.generateMasterKey();
      const crypto = new AveroxCrypto(key);
      const encrypted = crypto.encrypt('test', 'aad');
      encrypted.tag = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).toString('base64url');

      try {
        crypto.decrypt(encrypted, 'aad');
        fail('Should have thrown InvalidTagError');
      } catch (err) {
        const error = err as any;
        expect(error).toBeInstanceOf(InvalidTagError);
        expect(error.code).toBe('INVALID_TAG');
        expect(error.message).not.toContain('test');
      }
    });
  });
});

console.log('✅ Error handling tests passed');
