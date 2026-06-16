# Changelog

All notable changes to the CuraEmrEncryption Cryptographic SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-05-18

### Added
- **Enterprise Security Features**
  - ENFORCED AAD policy for all encrypt/decrypt operations
  - Real ChaCha20-Poly1305 implementation (RFC 8439 compliant)
  - HKDF-SHA256 key derivation (RFC 5869 compliant)
  - Secure memory zeroization with multi-pass clearing
  - Timing-safe comparison for authentication tag verification

- **OpenTelemetry Integration**
  - crypto_encrypt_total counter for successful encryptions
  - crypto_decrypt_total counter for successful decryptions  
  - crypto_fail_total counter for operation failures with categorized reasons
  - Configurable telemetry provider support

- **Comprehensive Testing**
  - NIST SP 800-38D test vectors for compliance verification
  - Wycheproof test vectors for edge case coverage
  - CI/CD pipeline with sanitizer builds (ASAN/UBSAN/TSAN)
  - Post-install verification for pkg-config integration

- **Supply Chain Security**
  - SBOM generation (CycloneDX and SPDX formats)
  - Threat model documentation aligned to GCM/AAD/IV policies
  - Security policy documentation (SECURITY.md)
  - Automated security gates in CI pipeline

- **Multi-Language Support**
  - JavaScript/TypeScript with full ESM/CJS support
  - Python with real cryptography library integration
  - Java with proper JCE provider usage
  - C/C++ with CMake and pkg-config support

### Security
- **Critical Security Fixes**
  - AAD is now REQUIRED (was optional in previous versions)
  - 12-byte IV policy is strictly ENFORCED (cannot be overridden)
  - Authentication tag verification uses timing-safe comparison
  - All sensitive memory is securely cleared after use

### Changed
- **Breaking Changes**
  - `encrypt()` method now requires AAD parameter (previously optional)
  - `decrypt()` method now requires AAD parameter (previously optional)
  - IV generation is now controlled by the SDK (user cannot provide custom IVs)
  - Error types changed to provide more specific security error information

### Fixed
- Fixed ChaCha20-Poly1305 implementation (was previously non-functional placeholder)
- Fixed HKDF key derivation (was previously non-functional placeholder)
- Fixed envelope format consistency across all language implementations
- Fixed memory management in C implementation with proper cleanup

### Technical Debt
- Removed all placeholder/mock implementations
- Replaced JavaScript fallbacks with language-specific implementations
- Eliminated false security claims from documentation
- Standardized error handling across all language bindings

---

## Security Advisories

### High Severity
- **CVE-PENDING-001**: Previous versions allowed encryption without AAD, potentially enabling certain classes of attacks. Upgrade immediately.
- **CVE-PENDING-002**: Previous versions used non-constant time comparisons for authentication tag verification. Upgrade immediately.

### Medium Severity  
- **Advisory-001**: Previous versions did not properly clear sensitive memory. While not immediately exploitable, upgrade recommended.

---

*For security issues, please refer to our [Security Policy](SECURITY.md).*
