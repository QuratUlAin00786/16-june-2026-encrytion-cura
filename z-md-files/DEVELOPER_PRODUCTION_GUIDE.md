# Cura EMR - Production Deployment Guide for Developers

## 🚨 Current Issue: Mobile Apps 500 Error in Production

### Root Cause Analysis
The mobile apps are failing with "500 Internal Server Error - Login Failed" because:

1. **Missing Request Body Validation**: Server expects `email` and `password` in request body but receives `undefined`
2. **Tenant Header Missing**: Production requires `X-Tenant-Subdomain` header for multi-tenant isolation
3. **Development URLs Hardcoded**: Mobile apps point to development server instead of production
4. **Authentication Format Mismatch**: Mobile login requests don't match server expectations

### Error Details from Logs
```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string", 
    "received": "undefined",
    "path": ["email"],
    "message": "Required"
  },
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined", 
    "path": ["password"],
    "message": "Required"
  }
]
```

## 🔧 Step-by-Step Fix Instructions

### Step 1: Fix Mobile App Configuration

#### Patient App (`mobile/cura_patient/lib/services/api_service.dart`)

**Current (Broken):**
```dart
class ApiService {
  static const String baseUrl = 'https://development-url';
  // Missing tenant headers
}
```

**Fixed Version:**
```dart
class ApiService {
  // Environment-specific URL configuration
  static const String baseUrl = kDebugMode 
    ? 'https://development-url'
    : 'https://your-production-replit-app.replit.app';
  static const String apiVersion = 'api';
  
  static String get apiUrl => '$baseUrl/$apiVersion';
  
  static Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
      'X-Tenant-Subdomain': 'demo', // CRITICAL: Required for production
    };
  }
}
```

#### Doctor App (`mobile/cura_doctor/lib/services/api_service.dart`)

**Current (Broken):**
```dart
static Future<Map<String, String>> _getHeaders() async {
  final token = await _storage.read(key: 'auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${token ?? ''}',
  };
}
```

**Fixed Version:**
```dart
static Future<Map<String, String>> _getHeaders() async {
  final token = await _storage.read(key: 'auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Bearer ${token ?? ''}',
    'X-Tenant-Subdomain': 'demo', // CRITICAL: Required for production
  };
}
```

### Step 2: Fix Login Authentication Format

#### Patient App Login Fix (`mobile/cura_patient/lib/services/api_service.dart`)

**Add proper login method:**
```dart
static Future<Map<String, dynamic>> login(String email, String password) async {
  final response = await http.post(
    Uri.parse('$apiUrl/auth/login'),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Tenant-Subdomain': 'demo',
    },
    body: jsonEncode({
      'email': email,        // Ensure these are strings
      'password': password,  // Ensure these are strings
    }),
  );
  
  if (response.statusCode == 200) {
    return jsonDecode(response.body);
  } else {
    final errorBody = jsonDecode(response.body);
    throw Exception('Login failed: ${errorBody['error']}');
  }
}
```

### Step 3: Environment Configuration Setup

#### Create Environment Configuration File
Create `mobile/lib/config/environment.dart`:

```dart
import 'package:flutter/foundation.dart';

class Environment {
  static const String _devBaseUrl = 'https://localhost:5000';
  static const String _prodBaseUrl = 'https://halo.averox.com';
  
  static String get baseUrl => kDebugMode ? _devBaseUrl : _prodBaseUrl;
  static String get apiUrl => '$baseUrl/api';
  
  static const String tenantSubdomain = 'demo';
  
  static bool get isProduction => !kDebugMode;
  static bool get isDevelopment => kDebugMode;
}
```

#### Update API Services to Use Environment
```dart
import '../config/environment.dart';

class ApiService {
  static String get baseUrl => Environment.baseUrl;
  static String get apiUrl => Environment.apiUrl;
  
  static Future<Map<String, String>> _getHeaders() async {
    final token = await AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
      'X-Tenant-Subdomain': Environment.tenantSubdomain,
    };
  }
}
```

### Step 4: Server-Side Validation Enhancement

#### Add Request Logging (`server/routes.ts`)
```typescript
app.post("/api/auth/login", async (req: TenantRequest, res) => {
  try {
    // Add request logging for debugging
    console.log('Login request body:', req.body);
    console.log('Login request headers:', req.headers);
    
    const { email, password } = z.object({
      email: z.string().min(1, "Email is required"),
      password: z.string().min(6, "Password must be at least 6 characters")
    }).parse(req.body);
    
    // ... rest of login logic
  } catch (error) {
    console.error("Login validation error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    res.status(500).json({ error: "Login failed" });
  }
});
```

## 🌍 Production Deployment Checklist

### 1. Averox Platform Production Setup
```bash
# Deploy to Averox production environment
averox deploy

# Verify production URL is active
curl https://halo.averox.com/api/status
```

### 2. Mobile App Production Build
```bash
# Patient App
cd mobile/cura_patient
flutter clean
flutter pub get
flutter build apk --release --target-platform android-arm64

# Doctor App  
cd ../cura_doctor
flutter clean
flutter pub get
flutter build apk --release --target-platform android-arm64
```

### 3. Environment Variables Check
Ensure these are set in Averox Platform Secrets:
- `DATABASE_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `SESSION_SECRET`

### 4. Production Testing Credentials
```
Patient Login:
- Email: patient@cura.com
- Password: patient123

Doctor Login:
- Email: doctor@cura.com
- Password: doctor123

Admin Login:
- Email: admin@cura.com
- Password: admin123
```

## 🔍 Debugging Production Issues

### 1. Check Server Logs
```bash
# View Replit console logs for errors
# Look for authentication and validation errors
```

### 2. Test API Endpoints
```bash
# Test login endpoint directly
curl -X POST https://halo.averox.com/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Subdomain: demo" \
  -d '{"email":"patient@cura.com","password":"patient123"}'
```

### 3. Mobile App Debug Mode
```dart
// Add debug logging in API service
static Future<http.Response> _makeRequest(String method, String endpoint, {Map<String, dynamic>? body}) async {
  final headers = await _getHeaders();
  final uri = Uri.parse('$apiUrl$endpoint');
  
  // Debug logging
  print('Making $method request to: $uri');
  print('Headers: $headers');
  print('Body: ${body != null ? jsonEncode(body) : 'null'}');
  
  // ... rest of request logic
}
```

## 📱 Mobile Development Workflow

### 1. Development Environment
```dart
// Use local development server
static const String devBaseUrl = 'http://localhost:5000';
```

### 2. Staging Environment  
```dart
// Use Averox staging URL for testing
static const String stagingBaseUrl = 'https://staging.averox.com';
```

### 3. Production Environment
```dart
// Use Averox production URL
static const String prodBaseUrl = 'https://halo.averox.com';
```

## 🚀 Final Deployment Steps

1. **Update Production URLs** in mobile apps
2. **Build production APKs** with correct environment
3. **Test authentication** with demo credentials
4. **Verify API connectivity** between mobile and server
5. **Monitor server logs** for any remaining issues

## 📋 Post-Deployment Verification

- ✅ Mobile apps can login with demo credentials
- ✅ API calls return proper data (not 500 errors)
- ✅ Tenant isolation working correctly
- ✅ Authentication tokens being generated and validated
- ✅ All mobile app features functional in production

This guide will resolve the production 500 errors and establish proper development workflow for the Cura EMR mobile applications.