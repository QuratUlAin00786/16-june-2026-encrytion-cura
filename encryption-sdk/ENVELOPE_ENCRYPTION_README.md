# Envelope Encryption with Vault KMS

This SDK includes envelope encryption capabilities using Vault.

## Configuration

Your tenant KEK (Key Encryption Key) details:
- KEK Name: pqc-kek-5793e1f1-f0ee-40af-a291-1bcb6cd6fcf1
- Algorithm: kyber1024
- Version: 22
- Vault Endpoint: https://kms.averox.com

## How It Works

1. **Data Encryption**: Generate a DEK (Data Encryption Key) locally
2. **Encrypt Data**: Use DEK to encrypt your data with AES-256-GCM
3. **Protect DEK**: Encrypt DEK with KEK via Vault
4. **Store**: Save encrypted data + encrypted DEK together
5. **Decrypt**: Decrypt DEK with Vault, then decrypt data

## Usage

See ENVELOPE_ENCRYPTION_EXAMPLE.js for complete usage examples.

## Security Benefits

- KEK never leaves Vault
- DEK is generated fresh for each encryption
- Automatic key rotation support
- Audit trail in Vault
- FIPS 140-2 Level 3 compliance (Vault)
