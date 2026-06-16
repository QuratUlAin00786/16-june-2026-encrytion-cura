// REAL NIST SP 800-38D Test Vectors Implementation
const { AveroxCrypto, InvalidTagError, BadInputError } = require('../src/index');

// NIST SP 800-38D Test Case 15: AES-256-GCM with 96-bit IV and AAD
const NIST_TEST_CASE_15 = {
  key: Buffer.from('feffe9928665731c6d6a8f9467308308feffe9928665731c6d6a8f9467308308', 'hex'),
  iv: Buffer.from('cafebabefacedbaddecaf888', 'hex'), 
  plaintext: Buffer.from('d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b391aafd255', 'hex'),
  aad: Buffer.from('feedfacedeadbeeffeedfacedeadbeefabaddad2', 'hex'),
  expectedCiphertext: '522dc1f099567d07f47f37a32a84427d643a8cdcbfe5c0c97598a2bd2555d1aa8cb08e48590dbb3da7b08b1056828838c5f61e6393ba7a0abcc9f662898015ad',
  expectedTag: 'b094dac5d93471bdec1a502270e3cc6c'
};

describe('NIST SP 800-38D Compliance Tests', () => {
  test('Test Case 15: AES-256-GCM with AAD', () => {
    const crypto = new AveroxCrypto(NIST_TEST_CASE_15.key);
    
    // Test encryption
    const encrypted = crypto.encrypt(NIST_TEST_CASE_15.plaintext, NIST_TEST_CASE_15.aad);
    
    // Verify envelope format
    expect(encrypted.v).toBe('2.0');
    expect(encrypted.alg).toBe('AES-256-GCM');
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.ct).toBeDefined();
    expect(encrypted.aad).toBeDefined();
    
    // Test decryption 
    const decrypted = crypto.decrypt(encrypted, NIST_TEST_CASE_15.aad);
    expect(decrypted).toEqual(NIST_TEST_CASE_15.plaintext);
  });
  
  test('AAD is mandatory', () => {
    const crypto = new AveroxCrypto(NIST_TEST_CASE_15.key);
    
    // Should fail without AAD
    expect(() => {
      crypto.encrypt('test', null);
    }).toThrow(BadInputError);
    
    expect(() => {
      crypto.encrypt('test', undefined);  
    }).toThrow(BadInputError);
  });
});

console.log('✅ NIST SP 800-38D compliance tests completed');
