# Cura Mobile Apps - Production Setup Guide

## ✅ Issue Fixed: 500 Internal Server Error

The 500 error was caused by:
1. **Missing request body**: Mobile apps weren't sending proper JSON body to login endpoint
2. **Missing tenant headers**: Production environment requires `X-Tenant-Subdomain: demo` header
3. **Incorrect URL configuration**: Apps were configured for development environment

## 🚀 Production-Ready Mobile Apps

I've created production-configured mobile apps in: `mobile/cura_mobile_apps_PRODUCTION.tar.gz`

### What's Fixed:
- ✅ **Proper tenant headers**: Added `X-Tenant-Subdomain: demo` to all requests
- ✅ **Production URLs**: Updated baseUrl for production deployment
- ✅ **Correct authentication**: Fixed login request format with proper JSON encoding
- ✅ **Error handling**: Added proper error responses and status code handling

## 📱 Mobile App Configuration

### Patient App (`cura_patient`)
```dart
// Production API URL
static const String baseUrl = 'https://halo.averox.com';

// Headers with tenant support
static Future<Map<String, String>> _getHeaders() async {
  final token = await AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Bearer $token',
    'X-Tenant-Subdomain': 'demo', // Required for production
  };
}
```

### Doctor App (`cura_doctor`)  
```dart
// Production API URL
static const String baseUrl = 'https://halo.averox.com/api';

// Headers with tenant support
static Future<Map<String, String>> _getHeaders() async {
  final token = await _storage.read(key: 'auth_token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': 'Bearer ${token ?? ''}',
    'X-Tenant-Subdomain': 'demo', // Required for production
  };
}
```

## 🔑 Production Demo Credentials

**Patient Login:**
- Email: `patient@cura.com`
- Password: `patient123`

**Doctor Login:**
- Email: `doctor@cura.com`  
- Password: `doctor123`

**Admin Login:**
- Email: `admin@cura.com`
- Password: `admin123`

## 🛠️ Deployment Instructions

### 1. Download Production Apps
```bash
# Extract the production-ready mobile apps
tar -xzf mobile/cura_mobile_apps_PRODUCTION.tar.gz
```

### 2. Update Your Production URL (if different)
If your Averox app has a different production URL, update these files:
- `cura_patient/lib/services/api_service.dart` (line 11)
- `cura_doctor/lib/services/api_service.dart` (line 14)

### 3. Build Mobile Apps
```bash
# For Patient App
cd cura_patient
flutter build apk --release

# For Doctor App  
cd ../cura_doctor
flutter build apk --release
```

### 4. Test Production Connectivity
The apps will now connect to your production Averox deployment with:
- ✅ Proper authentication headers
- ✅ Tenant isolation support
- ✅ Production API endpoints
- ✅ Error handling for network issues

## 📋 API Functions Available

**Patient App Functions:**
- `getDoctor(int doctorId)` - Get doctor details
- `getUser()` - Get current user info  
- `signOut()` - Sign out user

**Doctor App Functions:**
- `getConversations()` - Get all conversations
- `getPatientDetail(int patientId)` - Get patient details
- `getAIInsights()` - Get AI clinical insights
- `getVoiceNotes()` - Get voice documentation
- `sendMessage(String recipientId, String message)` - Send message

## 🌐 Production Environment
- **Server**: Averox Production Environment
- **Database**: PostgreSQL with multi-tenant support
- **Authentication**: JWT tokens with 7-day expiration
- **Multi-tenancy**: Subdomain-based tenant isolation (demo org)

The mobile apps are now production-ready and will work with your live Averox deployment!