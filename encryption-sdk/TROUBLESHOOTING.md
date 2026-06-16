# Troubleshooting Guide - Averox Crypto SDK

## Common Issues and Solutions

### 🔐 Encryption/Decryption Errors

#### "AAD (Additional Authenticated Data) is required"
**Cause**: Empty or missing AAD parameter  
**Solution**: Always provide non-empty AAD
```javascript
// ❌ Wrong
crypto.encrypt(data, new Uint8Array(0))

// ✅ Correct  
crypto.encrypt(data, new TextEncoder().encode("user-context"))
```

#### "Authentication failed - data may have been tampered with"
**Cause**: Wrong AAD, corrupted data, or incorrect key  
**Solution**: 
- Use exact same AAD for encryption and decryption
- Verify data integrity
- Check key management

#### "Algorithm not supported"
**Cause**: Unsupported or misspelled algorithm name  
**Solution**: Use supported algorithms: AES-256-GCM, ChaCha20-Poly1305

### 🔑 Key Management Issues

#### "Master key must be exactly 32 bytes"
**Cause**: Invalid key size  
**Solution**: Use the key generation method
```javascript
const masterKey = AveroxCrypto.generateMasterKey(); // Always 32 bytes
```

#### Keys getting corrupted
**Cause**: Improper storage or memory issues  
**Solution**: 
- Store keys securely
- Use proper encoding (Base64/hex)
- Clear sensitive data from memory

### 📦 Installation Problems

#### Import/require errors
**Cause**: Module not found or path issues  
**Solution**:
- Verify installation: `npm list @averox/crypto-sdk`
- Check import syntax for your environment
- Clear node_modules and reinstall

#### TypeScript type errors
**Cause**: Missing or outdated type definitions  
**Solution**:
- Update to latest version
- Check tsconfig.json configuration
- Verify @types/ packages

### 📊 Performance Issues

#### Slow encryption/decryption
**Cause**: Large data sizes or frequent operations  
**Solution**:
- Process data in chunks
- Implement connection pooling
- Use worker threads for heavy operations

#### Memory usage growing
**Cause**: Not calling close() or clearing secrets  
**Solution**:
```javascript
try {
  // Use crypto operations
} finally {
  crypto.close(); // Always clean up
}
```

### 🏗️ Build Issues

#### CMake errors (C/C++)
**Cause**: Missing dependencies or configuration  
**Solution**:
- Install OpenSSL development headers
- Update CMake to 3.15+
- Check compiler compatibility

#### Gradle build failures (Android)
**Cause**: Version conflicts or missing SDK  
**Solution**:
- Update Android Gradle Plugin
- Sync Kotlin version with project
- Check minimum SDK version (API 24+)

### 🔍 Testing Problems

#### NIST test vectors failing
**Cause**: Implementation bugs or environment issues  
**Solution**:
- Run tests in clean environment
- Check for platform-specific issues
- Verify crypto library versions

#### Unit tests timing out
**Cause**: Slow crypto operations or deadlocks  
**Solution**:
- Increase test timeout
- Mock heavy operations
- Check for resource leaks

### 📱 Mobile Specific Issues

#### iOS build errors
**Cause**: Xcode/Swift version incompatibility  
**Solution**:
- Update to latest Xcode
- Check Swift version compatibility
- Clean derived data

#### Android ProGuard issues
**Cause**: Obfuscation breaking crypto operations  
**Solution**: Add keep rules:
```
-keep class com.averox.crypto.** { *; }
-keep class javax.crypto.** { *; }
```

### 🌐 Network/Telemetry Issues

#### OpenTelemetry not working
**Cause**: Missing configuration or disabled telemetry  
**Solution**:
- Check environment variables
- Verify telemetry endpoint
- Enable debug logging

#### SSL/TLS errors
**Cause**: Certificate issues or outdated libraries  
**Solution**:
- Update CA certificates
- Check TLS version support
- Verify network connectivity

## Getting Help

### Before contacting support:

1. **Check error messages carefully** - They often contain the solution
2. **Try minimal reproduction** - Isolate the problem
3. **Check version compatibility** - Ensure all components are compatible
4. **Review logs** - Enable debug logging for detailed information

### How to report issues:

1. **Environment details**: OS, language version, SDK version
2. **Error messages**: Complete stack traces
3. **Reproduction steps**: Minimal code example
4. **Expected vs actual behavior**: Clear description

### Contact Information:

- **Documentation**: http://localhost:3000
- **GitHub Issues**: https://github.com/averox/crypto-sdk/issues  
- **Security Issues**: security@averox.com
- **General Support**: support@averox.com

### Response Times:

- Security issues: Within 24 hours
- Bug reports: 2-3 business days  
- Feature requests: Weekly review
- General questions: 3-5 business days

---

**Remember**: When in doubt, check the security guide and ensure you're following cryptographic best practices!
