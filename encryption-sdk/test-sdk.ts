/**
 * General-purpose integration test suite for Averox envelope encryption SDK.
 *
 * Domain-agnostic: validates metadata, single-value encryption, row sessions,
 * low-level DEK APIs, envelope structure, security, telemetry, and throughput.
 *
 * Run: npx ts-node --transpile-only test-sdk.ts
 */

import {
  AveroxCrypto,
  getSDKMetadata,
  getSupportedAlgorithms,
  BadInputError,
  InvalidTagError,
  type EnvelopeWithKMS,
} from './src/index';

// ============================================================================
// TEST UTILITIES
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logTest(name: string, passed: boolean, details = ''): void {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${name}`);
  } else {
    failedTests++;
    console.log(`❌ ${name}`);
  }
  if (details) console.log(`   ${details}`);
}

function logSection(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generic AAD for an isolated value (column, attribute, or message). */
function aadForContext(context: string): string {
  return `averox:context:${context}:v1`;
}

/** Generic AAD for a bundled record encrypted under the same row DEK. */
const RECORD_BUNDLE_AAD = 'averox:record-bundle:v1';

function isValidEnvelope(envelope: EnvelopeWithKMS): boolean {
  return Boolean(
    envelope.v === '2.0' &&
      envelope.alg &&
      envelope.iv &&
      envelope.tag &&
      envelope.ct &&
      envelope.encryptedDEK &&
      envelope.encryptedDEK.length > 0,
  );
}

// ============================================================================
// MAIN
// ============================================================================

async function runTests(): Promise<void> {
  const metadata = getSDKMetadata() as Record<string, unknown> & {
    sdkName?: string;
    sdkVersion?: string;
    vaultKekName?: string;
    vaultApiEndpoint?: string;
    envelopeEncryptionEnabled?: boolean;
    metadata: { tenant?: string };
  };

  const sdkName = String(metadata.sdkName ?? 'SDK');
  const sdkVersion = String(metadata.sdkVersion ?? 'unknown');

  console.log('='.repeat(80));
  console.log(`🧪 FULL SDK TEST SUITE — ${sdkName}`);
  console.log('='.repeat(80));
  console.log('\n📊 Configuration (from embedded metadata):');
  console.log(`  SDK ID: ${metadata.sdkId}`);
  console.log(`  Name: ${sdkName}`);
  console.log(`  Version: ${sdkVersion}`);
  console.log(`  Algorithms: ${getSupportedAlgorithms().join(', ')}`);
  console.log(`  Telemetry: ${metadata.telemetryEndpoint}`);
  console.log(`  Vault API: ${metadata.vaultApiEndpoint ?? 'N/A'}`);
  console.log(`  KEK: ${metadata.vaultKekName ?? 'N/A'}`);
  console.log(`  Tenant: ${metadata.metadata?.tenant ?? 'N/A'}`);

  // --------------------------------------------------------------------------
  // Test 1: Metadata & static helpers
  // --------------------------------------------------------------------------
  logSection('📊 Test 1: Metadata & Static Helpers');

  logTest('SDK ID present', !!metadata.sdkId, `ID: ${metadata.sdkId}`);
  logTest('SDK name present', !!metadata.sdkName, `Name: ${sdkName}`);
  logTest('SDK version present', !!metadata.sdkVersion, `Version: ${sdkVersion}`);
  logTest('Telemetry endpoint configured', !!metadata.telemetryEndpoint);
  logTest('Telemetry enabled', metadata.telemetryEnabled === true);
  logTest('Vault KEK name present', !!metadata.vaultKekName);
  logTest('Vault API endpoint present', !!metadata.vaultApiEndpoint);
  logTest('Envelope encryption enabled', metadata.envelopeEncryptionEnabled === true);
  logTest('Tenant ID present', !!metadata.metadata?.tenant);
  logTest(
    'Supported algorithms match metadata',
    getSupportedAlgorithms().length > 0 &&
      getSupportedAlgorithms().every((alg) =>
        (metadata.algorithms as string[] | undefined)?.includes(alg),
      ),
    getSupportedAlgorithms().join(', '),
  );

  // --------------------------------------------------------------------------
  // Test 2: Zero-config initialization
  // --------------------------------------------------------------------------
  logSection('🚀 Test 2: Zero-Config Auto-Initialization');

  let crypto: AveroxCrypto;
  try {
    crypto = new AveroxCrypto();
    logTest('AveroxCrypto() without manual config', true);
    logTest(
      'Instance reports supported algorithms',
      crypto.getSupportedAlgorithms().length > 0,
      crypto.getSupportedAlgorithms().join(', '),
    );
    logTest(
      'Static getSupportedAlgorithms matches instance',
      JSON.stringify(AveroxCrypto.getSupportedAlgorithms()) ===
        JSON.stringify(crypto.getSupportedAlgorithms()),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logTest('AveroxCrypto() without manual config', false, message);
    printSummary(metadata);
    process.exit(1);
  }

  const expectedAlg = getSupportedAlgorithms()[0]?.toUpperCase() ?? 'AES-128-GCM';

  // --------------------------------------------------------------------------
  // Test 3: Single-value encryptField / decryptField
  // --------------------------------------------------------------------------
  logSection('🔐 Test 3: Single-Value encryptField / decryptField');

  try {
    const plaintext = 'sensitive-value-7f3a9c2b';
    const aad = aadForContext('attribute-alpha');

    const encStart = Date.now();
    const envelope = await crypto.encryptField(plaintext, aad);
    const encMs = Date.now() - encStart;

    logTest('encryptField succeeds', isValidEnvelope(envelope), `${encMs}ms`);
    logTest('Envelope version 2.0', envelope.v === '2.0');
    logTest('Envelope algorithm matches SDK', envelope.alg?.toUpperCase() === expectedAlg, envelope.alg);
    logTest('IV is 12 bytes', Buffer.from(envelope.iv, 'base64url').length === 12);
    logTest('Tag is 16 bytes', Buffer.from(envelope.tag, 'base64url').length === 16);
    logTest('AAD stored in envelope', !!envelope.aad);
    logTest('encryptedDEK present', !!envelope.encryptedDEK);

    const decStart = Date.now();
    const decrypted = await crypto.decryptField(envelope, aad);
    const decMs = Date.now() - decStart;

    logTest('decryptField succeeds', decrypted.toString('utf8') === plaintext, `${decMs}ms`);
    logTest('Single-value round-trip integrity', decrypted.toString('utf8') === plaintext);

    const aliasEnv = await crypto.encrypt('alias-payload', aadForContext('alias'));
    const aliasDec = await crypto.decrypt(aliasEnv, aadForContext('alias'));
    logTest('encrypt/decrypt aliases work', aliasDec.toString('utf8') === 'alias-payload');
  } catch (error) {
    logTest('Single-value encrypt/decrypt', false, error instanceof Error ? error.message : String(error));
  }

  // --------------------------------------------------------------------------
  // Test 4: Row encryption session (one DEK per logical record)
  // --------------------------------------------------------------------------
  logSection('🗂️  Test 4: Row Encryption Session (one DEK per record)');

  try {
    const rowValues = [
      { key: 'col-a', value: 'value-alpha-001' },
      { key: 'col-b', value: 'value-beta-002' },
      { key: 'col-c', value: 'value-gamma-003' },
      { key: 'col-d', value: 'value-delta-004' },
    ];

    const rowEnc = await crypto.beginRowEncryption();
    const rowEnvelopes: EnvelopeWithKMS[] = [];

    try {
      for (const item of rowValues) {
        rowEnvelopes.push(await rowEnc.encryptField(item.value, aadForContext(item.key)));
      }

      logTest('beginRowEncryption + encryptField per value', rowEnvelopes.length === rowValues.length);

      const sharedDek = rowEnc.encryptedDEK;
      logTest('Row session exposes encryptedDEK', !!sharedDek);

      const allSameDek = rowEnvelopes.every((env) => env.encryptedDEK === sharedDek);
      logTest('All row values share same encryptedDEK', allSameDek);

      const uniqueIvs = new Set(rowEnvelopes.map((env) => env.iv));
      logTest('Each row value has unique IV', uniqueIvs.size === rowEnvelopes.length);

      const uniqueCts = new Set(rowEnvelopes.map((env) => env.ct));
      logTest('Each row value has unique ciphertext', uniqueCts.size === rowEnvelopes.length);

      const bundleEnv = await rowEnc.encryptField(
        JSON.stringify({ colA: 'value-alpha-001', colB: 'value-beta-002' }),
        RECORD_BUNDLE_AAD,
      );
      logTest('Record bundle encrypted with same session DEK', bundleEnv.encryptedDEK === sharedDek);

      rowEnvelopes.push(bundleEnv);
    } finally {
      rowEnc.close();
    }

    logTest('Row encryption session close() succeeds', true);

    let closedSessionRejected = false;
    try {
      await rowEnc.encryptField('should-fail', aadForContext('closed'));
    } catch {
      closedSessionRejected = true;
    }
    logTest('Closed row session rejects encryptField', closedSessionRejected);
  } catch (error) {
    logTest('Row encryption session', false, error instanceof Error ? error.message : String(error));
  }

  // --------------------------------------------------------------------------
  // Test 5: Row decryption session (one unwrap per record)
  // --------------------------------------------------------------------------
  logSection('🔓 Test 5: Row Decryption Session (one unwrap per record)');

  try {
    const rowEnc = await crypto.beginRowEncryption();
    const values = [
      { key: 'item-1', value: 'payload-one' },
      { key: 'item-2', value: 'payload-two' },
      { key: 'item-3', value: 'payload-three' },
    ];
    const encrypted: EnvelopeWithKMS[] = [];

    try {
      for (const item of values) {
        encrypted.push(await rowEnc.encryptField(item.value, aadForContext(item.key)));
      }
    } finally {
      rowEnc.close();
    }

    const rowDec = await crypto.beginRowDecryptionFromEnvelope(encrypted[0]);
    try {
      for (let i = 0; i < values.length; i++) {
        const plain = await rowDec.decryptField(encrypted[i], aadForContext(values[i].key));
        logTest(`Row decryptField: ${values[i].key}`, plain.toString('utf8') === values[i].value);
      }

      const rowDec2 = await crypto.beginRowDecryption(encrypted[0].encryptedDEK!);
      try {
        const plain = await rowDec2.decryptField(encrypted[1], aadForContext(values[1].key));
        logTest('beginRowDecryption(explicit DEK) works', plain.toString('utf8') === values[1].value);
      } finally {
        rowDec2.close();
      }
    } finally {
      rowDec.close();
    }

    let closedDecryptRejected = false;
    try {
      await rowDec.decryptField(encrypted[0], aadForContext(values[0].key));
    } catch {
      closedDecryptRejected = true;
    }
    logTest('Closed row decrypt session rejects decryptField', closedDecryptRejected);
  } catch (error) {
    logTest('Row decryption session', false, error instanceof Error ? error.message : String(error));
  }

  // --------------------------------------------------------------------------
  // Test 6: Row DEK mismatch detection
  // --------------------------------------------------------------------------
  logSection('🛡️  Test 6: Row DEK Mismatch Detection');

  try {
    const row1 = await crypto.beginRowEncryption();
    const row2 = await crypto.beginRowEncryption();
    let env1: EnvelopeWithKMS;
    let env2: EnvelopeWithKMS;

    try {
      env1 = await row1.encryptField('record-one', aadForContext('row-1'));
      env2 = await row2.encryptField('record-two', aadForContext('row-2'));
    } finally {
      row1.close();
      row2.close();
    }

    const rowDec = await crypto.beginRowDecryptionFromEnvelope(env1!);
    let mismatchCaught = false;
    try {
      await rowDec.decryptField(env2!, aadForContext('row-2'));
    } catch (error) {
      mismatchCaught =
        error instanceof BadInputError &&
        (error.message.includes('encryptedDEK') || error.message.includes('does not match'));
    } finally {
      rowDec.close();
    }
    logTest('Row session rejects envelope from different record DEK', mismatchCaught);
  } catch (error) {
    logTest('Row DEK mismatch detection', false, error instanceof Error ? error.message : String(error));
  }

  // --------------------------------------------------------------------------
  // Test 7: Low-level DEK APIs
  // --------------------------------------------------------------------------
  logSection('🔧 Test 7: Low-Level DEK APIs');

  try {
    const dataKey = await crypto.provisionDataKey();
    logTest('provisionDataKey returns dek + encryptedDEK', !!dataKey.dek && !!dataKey.encryptedDEK);

    const lowEnv = await crypto.encryptWithDataKey('low-level-value', aadForContext('manual'), dataKey);
    logTest('encryptWithDataKey succeeds', lowEnv.encryptedDEK === dataKey.encryptedDEK);

    const lowPlain = await crypto.decryptWithDataKey(lowEnv, aadForContext('manual'), dataKey.dek);
    logTest('decryptWithDataKey round-trip', lowPlain.toString('utf8') === 'low-level-value');

    const unwrapped = await crypto.unwrapDataKey(dataKey.encryptedDEK);
    logTest('unwrapDataKey returns buffer', Buffer.isBuffer(unwrapped) && unwrapped.length > 0);

    crypto.releaseDataKey(dataKey.dek);
    crypto.releaseDataKey(unwrapped);
    logTest('releaseDataKey completes without error', true);
  } catch (error) {
    logTest('Low-level DEK APIs', false, error instanceof Error ? error.message : String(error));
  }

  // --------------------------------------------------------------------------
  // Test 8: Security & error handling
  // --------------------------------------------------------------------------
  logSection('🛡️  Test 8: Security & Error Handling');

  try {
    const plaintext = 'authenticated-payload';
    const correctAad = aadForContext('auth-test');
    const wrongAad = aadForContext('wrong-context');
    const envelope = await crypto.encryptField(plaintext, correctAad);

    let wrongAadRejected = false;
    try {
      await crypto.decryptField(envelope, wrongAad);
    } catch (error) {
      wrongAadRejected = error instanceof InvalidTagError || error instanceof BadInputError;
    }
    logTest('Wrong AAD rejected on decrypt', wrongAadRejected);

    const recovered = await crypto.decryptField(envelope, correctAad);
    logTest('Correct AAD accepted on decrypt', recovered.toString('utf8') === plaintext);

    let emptyAadRejected = false;
    try {
      await crypto.encryptField('data', '');
    } catch (error) {
      emptyAadRejected = error instanceof BadInputError;
    }
    logTest('Empty AAD rejected on encrypt', emptyAadRejected);
  } catch (error) {
    logTest('Security & error handling', false, error instanceof Error ? error.message : String(error));
  }

  // --------------------------------------------------------------------------
  // Test 9: Multiple single-value operations
  // --------------------------------------------------------------------------
  logSection('🔄 Test 9: Multiple Single-Value Operations');

  try {
    let allPassed = true;
    const times: number[] = [];

    for (let i = 1; i <= 5; i++) {
      const data = `isolated-${i}-${Math.random().toString(36).slice(2, 8)}`;
      const aad = aadForContext(`cycle-${i}`);
      const start = Date.now();
      const env = await crypto.encryptField(data, aad);
      const dec = await crypto.decryptField(env, aad);
      times.push(Date.now() - start);

      if (dec.toString('utf8') !== data) {
        allPassed = false;
        console.log(`  ❌ Cycle ${i} failed`);
        break;
      }
      console.log(`  ✅ Cycle ${i} passed (${times[times.length - 1]}ms)`);
    }

    logTest('5 single-value encrypt/decrypt cycles', allPassed);
    if (allPassed && times.length) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`   Avg ${avg.toFixed(1)}ms per cycle (1 datakey + 1 unwrap each)`);
    }
  } catch (error) {
    logTest('Multiple single-value operations', false, error instanceof Error ? error.message : String(error));
  }

  // --------------------------------------------------------------------------
  // Test 10: Row session multi-cycle
  // --------------------------------------------------------------------------
  logSection('🔄 Test 10: Row Session Multi-Cycle');

  try {
    let allPassed = true;

    for (let cycle = 1; cycle <= 3; cycle++) {
      const rowEnc = await crypto.beginRowEncryption();
      const items = [
        { key: 'segment-a', value: `record-${cycle}-alpha` },
        { key: 'segment-b', value: `record-${cycle}-beta` },
        { key: 'segment-c', value: `record-${cycle}-gamma` },
      ];
      const envelopes: EnvelopeWithKMS[] = [];

      try {
        for (const item of items) {
          envelopes.push(await rowEnc.encryptField(item.value, aadForContext(item.key)));
        }
      } finally {
        rowEnc.close();
      }

      const rowDec = await crypto.beginRowDecryptionFromEnvelope(envelopes[0]);
      try {
        let cycleOk = true;
        for (let i = 0; i < items.length; i++) {
          const plain = await rowDec.decryptField(envelopes[i], aadForContext(items[i].key));
          if (plain.toString('utf8') !== items[i].value) {
            cycleOk = false;
          }
        }

        if (!cycleOk) {
          allPassed = false;
          console.log(`  ❌ Row cycle ${cycle} failed`);
        } else {
          console.log(
            `  ✅ Row cycle ${cycle} passed (shared DEK: ${envelopes[0].encryptedDEK!.slice(0, 24)}...)`,
          );
        }
      } finally {
        rowDec.close();
      }
    }

    logTest('3 row encrypt/decrypt cycles', allPassed);
  } catch (error) {
    logTest('Row session multi-cycle', false, error instanceof Error ? error.message : String(error));
  }

  // --------------------------------------------------------------------------
  // Test 11: Telemetry (async fire-and-forget)
  // --------------------------------------------------------------------------
  logSection('📊 Test 11: Telemetry Integration');

  try {
    const env = await crypto.encryptField('telemetry-payload', aadForContext('telemetry'));
    const dec = await crypto.decryptField(env, aadForContext('telemetry'));
    logTest('Operations for telemetry completed', dec.toString('utf8') === 'telemetry-payload');
    logTest('Telemetry enabled in metadata', metadata.telemetryEnabled === true);
    logTest('Telemetry endpoint configured', !!metadata.telemetryEndpoint);
    logTest('SDK ID present for telemetry', !!metadata.sdkId);

    console.log('\n⏳ Waiting 3s for async telemetry delivery...');
    await sleep(3000);
    console.log(`   Telemetry endpoint: ${metadata.telemetryEndpoint}`);
  } catch (error) {
    logTest('Telemetry integration', false, error instanceof Error ? error.message : String(error));
  }

  printSummary(metadata);
  process.exit(failedTests === 0 ? 0 : 1);
}

function printSummary(
  metadata: Record<string, unknown> & {
    sdkName?: string;
    vaultApiEndpoint?: string;
    telemetryEndpoint?: string;
    vaultKekName?: string;
    metadata?: { tenant?: string };
  },
): void {
  logSection('✅ SDK TEST SUITE COMPLETE');

  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';

  console.log('\n📊 Results:');
  console.log(`  ✅ Passed: ${passedTests}`);
  console.log(`  ❌ Failed: ${failedTests}`);
  console.log(`  📈 Total:  ${totalTests}`);
  console.log(`  🎯 Rate:   ${successRate}%`);

  console.log('\n🔐 API coverage:');
  console.log('  • getSDKMetadata / getSupportedAlgorithms');
  console.log('  • AveroxCrypto zero-config init');
  console.log('  • encryptField / decryptField (isolated value, own DEK)');
  console.log('  • encrypt / decrypt (aliases)');
  console.log('  • beginRowEncryption → RowEncryptionSession.encryptField → close()');
  console.log('  • beginRowDecryption / beginRowDecryptionFromEnvelope → decryptField → close()');
  console.log('  • provisionDataKey / encryptWithDataKey / decryptWithDataKey / unwrapDataKey / releaseDataKey');
  console.log('  • AAD validation, wrong-AAD rejection, row DEK mismatch');
  console.log('  • Telemetry (async)');

  console.log('\n📡 Backend endpoints used:');
  if (metadata.vaultApiEndpoint) {
    console.log(`  POST ${metadata.vaultApiEndpoint}/datakey`);
    console.log(`  POST ${metadata.vaultApiEndpoint}/decrypt`);
  }
  console.log(`  POST ${metadata.telemetryEndpoint}`);

  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED.');
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) failed. Review errors above.`);
    console.log('\n🔍 Troubleshooting:');
    console.log(`  • Vault API reachable: ${metadata.vaultApiEndpoint ?? 'not configured'}`);
    console.log(`  • KEK exists: ${metadata.vaultKekName ?? 'not configured'}`);
    console.log(`  • Tenant context: ${metadata.metadata?.tenant ?? 'not configured'}`);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
