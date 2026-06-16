# CuraEmrEncryption SDK - JavaScript/TypeScript Installation Guide

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Uninstallation](#uninstallation)
6. [Troubleshooting](#troubleshooting)
7. [Support](#support)

## System Requirements

### Minimum Requirements
- **Node.js**: 16.0+ (LTS recommended)
- **npm**: 8.0+ or **yarn**: 1.22+
- **TypeScript**: 4.5+ (for TypeScript projects)
- **Operating System**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)

### Recommended Requirements
- **Node.js**: 20.x LTS
- **npm**: 10.x or **yarn**: 4.x
- **Memory**: 512MB+ available
- **Disk Space**: 50MB+ for SDK and dependencies

## Installation

### Option 1: NPM Installation (Recommended)
```bash
# Install the SDK
npm install @averox/curaemrencryption-crypto-sdk

# For TypeScript projects, types are included
npm install --save-dev typescript
```

### Option 2: Yarn Installation
```bash
# Install the SDK
yarn add @averox/curaemrencryption-crypto-sdk

# For TypeScript projects
yarn add --dev typescript
```

### Option 3: Local Development Installation
```bash
# Clone or download the SDK package
# Navigate to the SDK directory
npm install
npm run build
npm link

# In your project
npm link @averox/curaemrencryption-crypto-sdk
```

## Quick Start

### Basic Setup (JavaScript) - Envelope Encryption
```javascript
const { AveroxCrypto, getSDKMetadata } = require('@averox/curaemrencryption-crypto-sdk');

// SDK auto-configures from metadata (envelope encryption mode)
// No master key needed - backend provisions DEK automatically
const crypto = new AveroxCrypto();

// Encrypt data (AAD is required)
// Backend automatically provisions and wraps DEK
const customerData = {
  email: 'customer@example.com',
  creditCard: '4532-****-****-1234'
};
const plaintext = JSON.stringify(customerData);
const aad = Buffer.from("customer-id-12345");
const envelope = await crypto.encrypt(plaintext, aad);

console.log('✅ Encrypted successfully:', envelope.alg);
console.log('Has encrypted DEK:', !!envelope.encryptedDEK);

// Decrypt data
// Backend automatically unwraps DEK
const decrypted = await crypto.decrypt(envelope, aad);
console.log('✅ Decrypted:', JSON.parse(decrypted.toString()));
```

### TypeScript Setup - Envelope Encryption
```typescript
import { AveroxCrypto, EnvelopeWithKMS, getSDKMetadata } from '@averox/curaemrencryption-crypto-sdk';

// SDK auto-configures from metadata
const crypto: AveroxCrypto = new AveroxCrypto();

const customerData = {
  email: 'customer@example.com',
  ssn: '123-45-6789'
};
const plaintext: string = JSON.stringify(customerData);
const aad: Buffer = Buffer.from("user-session-12345");

try {
  const envelope: EnvelopeWithKMS = await crypto.encrypt(plaintext, aad);
  const decrypted: Buffer = await crypto.decrypt(envelope, aad);
  console.log('✅ Success:', JSON.parse(decrypted.toString()));
} catch (error) {
  console.error('Encryption failed:', error instanceof Error ? error.message : 'Unknown error');
}
```

### OpenTelemetry Integration
```javascript
// Configure telemetry (optional)
const { configureTelemetry } = require('@averox/curaemrencryption-crypto-sdk');

// Your OpenTelemetry setup
const telemetryProvider = {
  increment: (name, value, attributes) => {
    console.log(`Metric: ${name} = ${value}`, attributes);
    // Send to your monitoring system
  }
};

configureTelemetry(telemetryProvider);
```

## Configuration

### Environment Variables
```bash
# Optional: Set log level for debugging
export NODE_ENV=development

# Optional: Configure telemetry endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

### Package.json Configuration
```json
{
  "dependencies": {
    "@averox/curaemrencryption-crypto-sdk": "^2.0.0"
  },
  "scripts": {
    "test:crypto": "node test-crypto.js",
    "security:audit": "npm audit"
  }
}
```

## Uninstallation

### Complete Removal
```bash
# Remove the SDK package
npm uninstall @averox/curaemrencryption-crypto-sdk

# Clear npm cache (optional)
npm cache clean --force

# Remove any global installations
npm uninstall -g @averox/curaemrencryption-crypto-sdk
```

### Clean Project Dependencies
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Troubleshooting

### Common Issues

#### 1. "Module not found" Error
```bash
# Verify installation
npm list @averox/curaemrencryption-crypto-sdk

# Reinstall if necessary
npm uninstall @averox/curaemrencryption-crypto-sdk
npm install @averox/curaemrencryption-crypto-sdk
```

#### 2. TypeScript Import Issues
```bash
# Ensure TypeScript is properly configured
npx tsc --showConfig

# Check tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

#### 3. Build Errors
```bash
# Clear TypeScript cache
npx tsc --build --clean

# Rebuild
npm run build
```

### Performance Issues

#### 1. Slow Encryption/Decryption
- Verify Node.js version (16+ recommended)
- Check available memory
- Monitor AAD size (keep under 1KB for best performance)

#### 2. Memory Leaks
```javascript
// Proper cleanup example
const crypto = new AveroxCrypto(masterKey);
try {
  const result = crypto.encrypt(data, aad);
  // Use result
} finally {
  // SDK automatically clears sensitive memory
  crypto = null;
}
```

## Support

### Debug Mode
```javascript
// Enable debug logging
process.env.DEBUG = 'averox:*';
const crypto = new AveroxCrypto(masterKey);
```

### Health Check
```javascript
const { AveroxCrypto } = require('@averox/curaemrencryption-crypto-sdk');

// Verify SDK functionality
try {
  const key = AveroxCrypto.generateMasterKey();
  const crypto = new AveroxCrypto(key);
  const aad = Buffer.from('test');
  const envelope = crypto.encrypt('test', aad);
  const decrypted = crypto.decrypt(envelope, aad);
  console.log('✅ SDK is working properly');
} catch (error) {
  console.error('❌ SDK health check failed:', error instanceof Error ? error.message : 'Unknown error');
}
```

### Getting Help
1. Check the troubleshooting guide
2. Review error logs with `NODE_ENV=development`
3. Verify OpenTelemetry metrics for operation insights
4. Contact support with error details and environment info

---
*Generated by Averox Enterprise SDK Generator v2.0*
