# Cura Medical EMR Flutter Apps

This project contains two complete Flutter mobile applications for the Cura Medical EMR system:

1. **Patient App** - For patients to manage their healthcare records, appointments, and communication with providers
2. **Doctor App** - For healthcare professionals to manage patients, appointments, and medical records

## 📱 Features

### Patient App
- **Authentication** - Secure login for patients
- **Dashboard** - Overview of health status and recent activity
- **Appointments** - View, schedule, and manage appointments
- **Medical Records** - Access complete medical history
- **Lab Results** - View test results and reports
- **Prescriptions** - Track current and past medications
- **Notifications** - Important health updates and reminders
- **Profile Management** - Update personal information and settings

### Doctor App
- **Authentication** - Secure login for healthcare professionals
- **Dashboard** - Overview of daily schedule and patient statistics
- **Patient Management** - Search, view, and manage patient records
- **Appointment Management** - Schedule and manage patient appointments
- **Medical Records** - Create and update patient medical histories
- **Quick Actions** - Fast access to common tasks
- **Profile Management** - Manage professional information

## 🏗️ Architecture

Both apps share a common architecture:

- **API Service Layer** - Configurable backend connectivity
- **Provider Pattern** - State management using Flutter Provider
- **Model Layer** - Shared data models for consistency
- **Responsive UI** - Material Design 3 components
- **Secure Storage** - Encrypted storage for authentication tokens

## 🛠️ Prerequisites

Before building the apps, ensure you have:

1. **Flutter SDK** (3.0.0 or higher)
   ```bash
   flutter --version
   ```

2. **Dart SDK** (included with Flutter)

3. **Development Environment**:
   - **Android**: Android Studio with Android SDK
   - **iOS**: Xcode (macOS only)

4. **Dependencies**:
   - Git
   - A code editor (VS Code, Android Studio, or IntelliJ)

## 📦 Installation & Setup

### 1. Extract the Project
```bash
# Extract the ZIP file to your desired location
unzip cura-flutter-apps.zip
cd cura-flutter-apps
```

### 2. Set Up Patient App
```bash
cd flutter_apps/patient_app
flutter pub get
```

### 3. Set Up Doctor App
```bash
cd ../doctor_app
flutter pub get
```

## 🚀 Running the Apps

### Patient App
```bash
cd flutter_apps/patient_app

# For Android
flutter run

# For iOS (macOS only)
flutter run -d ios

# For Web
flutter run -d web
```

### Doctor App
```bash
cd flutter_apps/doctor_app

# For Android
flutter run

# For iOS (macOS only)
flutter run -d ios

# For Web
flutter run -d web
```

## 🔧 Configuration

### API Backend Configuration

Both apps include an API settings screen that allows you to configure the backend server URL:

1. **In-App Configuration**:
   - Open the app
   - Go to Settings → API Settings (or tap the settings icon on login screen)
   - Enter your backend server URL
   - Save the configuration

2. **Default Configuration**:
   - Default API URL: `https://your-cura-backend.replit.app`
   - The URL is configurable and persistent across app sessions

### Demo Credentials

For testing purposes, the apps include demo credentials:

**Patient App**:
- Email: `patient@cura.com`
- Password: `patient123`

**Doctor App**:
- Email: `doctor@cura.com`
- Password: `doctor123`

## 📱 Building for Production

### Android APK
```bash
# Patient App
cd flutter_apps/patient_app
flutter build apk --release

# Doctor App
cd flutter_apps/doctor_app
flutter build apk --release
```

### iOS IPA (macOS only)
```bash
# Patient App
cd flutter_apps/patient_app
flutter build ipa --release

# Doctor App
cd flutter_apps/doctor_app
flutter build ipa --release
```

### Web Build
```bash
# Patient App
cd flutter_apps/patient_app
flutter build web --release

# Doctor App
cd flutter_apps/doctor_app
flutter build web --release
```

## 📁 Project Structure

```
cura-flutter-apps/
├── flutter_apps/
│   ├── patient_app/
│   │   ├── lib/
│   │   │   ├── models/          # Data models
│   │   │   ├── providers/       # State management
│   │   │   ├── screens/         # UI screens
│   │   │   ├── services/        # API service layer
│   │   │   └── main.dart        # App entry point
│   │   ├── pubspec.yaml         # Dependencies
│   │   └── README.md            # Patient app docs
│   │
│   └── doctor_app/
│       ├── lib/
│       │   ├── models/          # Data models (shared)
│       │   ├── providers/       # State management
│       │   ├── screens/         # UI screens
│       │   ├── services/        # API service layer
│       │   └── main.dart        # App entry point
│       ├── pubspec.yaml         # Dependencies
│       └── README.md            # Doctor app docs
│
├── cura_database_export.sql     # Database schema
└── README.md                    # This file
```

## 🔌 Backend Integration

The apps are designed to work with the Cura EMR backend system. The API service layer handles:

- **Authentication** - JWT-based login/logout
- **Patient Management** - CRUD operations for patient records
- **Appointments** - Scheduling and management
- **Medical Records** - Patient health history
- **Lab Results** - Test results and reports
- **Prescriptions** - Medication management
- **Notifications** - Real-time updates

### API Endpoints

The apps expect the following API structure:

```
POST /api/auth/login          # Authentication
GET  /api/auth/validate       # Token validation
POST /api/auth/logout         # Logout

GET  /api/patients           # List patients
GET  /api/patients/:id       # Get patient details
POST /api/patients           # Create patient

GET  /api/appointments       # List appointments
POST /api/appointments       # Create appointment
PUT  /api/appointments/:id   # Update appointment

GET  /api/medical-records    # List medical records
POST /api/medical-records    # Create medical record

GET  /api/lab-results        # List lab results
GET  /api/prescriptions      # List prescriptions
GET  /api/notifications      # List notifications
```

## 🎨 UI/UX Design

### Design System
- **Material Design 3** - Modern Flutter UI components
- **Color Scheme**: 
  - Patient App: Blue primary color (`#2196F3`)
  - Doctor App: Green primary color (`#4CAF50`)
- **Typography**: Roboto font family
- **Responsive Layout**: Adapts to different screen sizes

### Key UI Components
- **Cards** - For displaying medical information
- **Lists** - For records and appointments
- **Forms** - For data entry with validation
- **Dialogs** - For confirmations and detailed views
- **Navigation** - Bottom navigation with tab-based routing

## 🔐 Security Features

### Data Protection
- **Encrypted Storage** - Sensitive data encrypted at rest
- **Secure Network** - HTTPS communication with backend
- **Token Management** - JWT tokens with automatic refresh
- **Input Validation** - Form validation and sanitization

### Authentication
- **Session Management** - Automatic token validation
- **Logout on Inactivity** - Security timeout handling
- **Error Handling** - Graceful failure management

## 🧪 Testing

### Run Tests
```bash
# Patient App
cd flutter_apps/patient_app
flutter test

# Doctor App
cd flutter_apps/doctor_app
flutter test
```

### Test Coverage
The apps include unit tests for:
- API service methods
- Data models
- Authentication logic
- Core business logic

## 🐛 Troubleshooting

### Common Issues

1. **Flutter Not Found**
   ```bash
   flutter doctor
   ```
   Follow the instructions to complete Flutter setup.

2. **Dependencies Issue**
   ```bash
   flutter clean
   flutter pub get
   ```

3. **Android Build Issues**
   - Ensure Android SDK is properly installed
   - Check `android/app/build.gradle` for version compatibility

4. **iOS Build Issues**
   - Ensure Xcode is up to date
   - Run `pod install` in `ios/` directory if needed

5. **API Connection Issues**
   - Verify backend server is running
   - Check API URL configuration in app settings
   - Ensure network connectivity

### Debug Mode
```bash
# Run in debug mode with verbose logging
flutter run --debug --verbose
```

## 📊 Performance

### Optimization Tips
- **Image Optimization** - Use appropriate image formats and sizes
- **Network Caching** - API responses are cached appropriately
- **Lazy Loading** - Lists load data incrementally
- **Memory Management** - Proper disposal of controllers and streams

### Monitoring
- Use Flutter Inspector for UI debugging
- Monitor network requests in debug console
- Track app performance with Flutter DevTools

## 🤝 Contributing

If you need to modify or extend the apps:

1. **Code Style**: Follow Dart/Flutter conventions
2. **Architecture**: Maintain the Provider pattern for state management
3. **API Layer**: Use the existing ApiService for backend calls
4. **Testing**: Add tests for new features
5. **Documentation**: Update README files for changes

## 📄 License

This project is part of the Cura Medical EMR system. Please refer to your licensing agreement for usage terms.

## 🆘 Support

For technical support or questions:

1. **Documentation**: Check this README and inline code comments
2. **Flutter Docs**: https://docs.flutter.dev
3. **API Issues**: Verify backend server status and API endpoints
4. **Build Issues**: Check Flutter doctor output and system requirements

## 🔄 Updates

### Version History
- **v1.0.0**: Initial release with complete Patient and Doctor apps
  - Full authentication system
  - Patient management for doctors
  - Appointment scheduling
  - Medical records access
  - Lab results viewing
  - Prescription management
  - Notification system
  - Profile management

### Future Enhancements
- Push notifications
- Offline data synchronization
- Telemedicine video calls
- Document upload/download
- Advanced search and filtering
- Multi-language support
- Dark mode theme

---

**Built with Flutter 💙**

For more information about Flutter development, visit the [Flutter documentation](https://docs.flutter.dev).