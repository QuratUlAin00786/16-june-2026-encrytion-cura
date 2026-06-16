# Cura EMR System - Complete Download Instructions

## Complete System Overview

This is the complete Cura EMR system with:
- **Web Application**: Full-featured EMR with 24+ healthcare modules
- **Flutter Mobile Apps**: Separate Patient and Doctor mobile applications
- **Backend API**: Node.js/Express with PostgreSQL database
- **Latest Updates**: Voice Documentation, AI Insights, Messaging, and complete API coverage

## Download Methods

### Method 1: Download Entire Project (Recommended)

1. **Download as ZIP Archive**:
   - Click the menu (three dots) in Averox Platform
   - Select "Download as ZIP"
   - This includes all files: web app, mobile apps, backend, and database schema

2. **Extract and Setup**:
   ```bash
   unzip cura-emr-system.zip
   cd cura-emr-system
   npm install
   ```

### Method 2: Git Clone (For Development)

```bash
git clone [your-averox-git-url]
cd cura-emr-system
npm install
```

## Project Structure

```
cura-emr-system/
├── client/                     # React Web Application
│   ├── src/
│   │   ├── components/         # UI Components
│   │   ├── pages/             # Application Pages
│   │   ├── hooks/             # Custom React Hooks
│   │   └── lib/               # Utilities and API Client
├── mobile/                     # Flutter Mobile Applications
│   ├── cura_doctor/           # Doctor Mobile App
│   │   ├── lib/
│   │   │   ├── screens/       # App Screens (NEW: Voice, AI, Messaging)
│   │   │   ├── services/      # API Services (UPDATED)
│   │   │   ├── providers/     # State Management
│   │   │   └── theme/         # App Theming
│   │   └── pubspec.yaml       # Flutter Dependencies
│   └── cura_patient/          # Patient Mobile App
│       ├── lib/
│       │   ├── screens/       # Patient App Screens
│       │   ├── services/      # Patient API Services
│       │   └── providers/     # Patient State Management
│       └── pubspec.yaml
├── server/                     # Node.js Backend
│   ├── routes.ts              # API Routes (UPDATED with mobile endpoints)
│   ├── storage.ts             # Database Layer
│   └── db.ts                  # Database Configuration
├── shared/                     # Shared Types and Schema
│   └── schema.ts              # Database Schema (Drizzle ORM)
└── package.json               # Node.js Dependencies
```

## Latest Updates Included

### ✅ New Flutter Screens (Doctor App)
- **Voice Documentation Screen**: Speech-to-text recording and note management
- **AI Insights Screen**: Clinical decision support with filtering and recommendations
- **Messaging Screen**: Professional chat interface with conversation management

### ✅ Enhanced API Service
- **getDoctorProfile()**: Complete doctor profile information
- **Voice Documentation APIs**: Create, read, delete voice notes
- **AI Insights APIs**: Fetch clinical insights and patient-specific recommendations  
- **Messaging APIs**: Conversation management and real-time messaging

### ✅ Mobile Backend Endpoints
- `/api/mobile/doctor/profile` - Doctor profile data
- `/api/mobile/doctor/voice-notes` - Voice documentation management
- `/api/mobile/doctor/ai-insights` - Clinical AI insights
- `/api/mobile/doctor/conversations` - Messaging system

## Setup Instructions

### 1. Web Application Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Configure database
npm run db:push

# Start development server
npm run dev
```

### 2. Mobile App Setup (Doctor App)
```bash
cd mobile/cura_doctor

# Install Flutter dependencies
flutter pub get

# Configure API endpoint in lib/config/api_config.dart
# Update baseUrl to your deployed backend URL

# Run on device/emulator
flutter run
```

### 3. Mobile App Setup (Patient App)
```bash
cd mobile/cura_patient

# Install Flutter dependencies
flutter pub get

# Configure API endpoint
# Update baseUrl in lib/services/api_service.dart

# Run on device/emulator
flutter run
```

## Environment Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=your_postgresql_url
PGHOST=your_db_host
PGPORT=5432
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=your_db_name

# Authentication
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# AI Features
OPENAI_API_KEY=your_openai_key

# SMS/WhatsApp (Optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Payments (Optional)
STRIPE_SECRET_KEY=your_stripe_key
PAYPAL_CLIENT_ID=your_paypal_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
```

### Mobile App Configuration
Update API endpoints in:
- `mobile/cura_doctor/lib/config/api_config.dart`
- `mobile/cura_patient/lib/services/api_service.dart`

Replace with your deployed backend URL:
```dart
static const String baseUrl = 'https://your-backend-url.com/api';
```

## Demo Credentials

### Web Application Login
- **Admin**: admin@cura.com / admin123
- **Doctor**: doctor@cura.com / doctor123  
- **Patient**: patient@gmail.com / patient123
- **Nurse**: nurse@cura.com / nurse123
- **Receptionist**: receptionist@cura.com / receptionist123

### Mobile App Login
- **Doctor App**: doctor@cura.com / doctor123
- **Patient App**: patient@gmail.com / patient123

## Deployment Options

### 1. Averox Platform Deployment (Easiest)
- Click "Deploy" button in Averox Platform
- Automatic build and hosting
- Environment variables configured in Averox Secrets

### 2. Vercel/Netlify (Frontend)
```bash
# Build web application
npm run build

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

### 3. Heroku/Railway (Full Stack)
```bash
# Deploy to Heroku
heroku create your-app-name
git push heroku main

# Deploy to Railway
railway login
railway link
railway up
```

### 4. Mobile App Stores
```bash
# Android (Doctor App)
cd mobile/cura_doctor
flutter build apk --release

# iOS (Doctor App)
flutter build ios --release

# Android (Patient App)  
cd mobile/cura_patient
flutter build apk --release
```

## Key Features Included

### Web Application (24+ Modules)
- Patient Management with comprehensive records
- Advanced appointment scheduling with provider availability
- Prescription management with pharmacy integration
- Voice documentation with speech-to-text
- AI-powered clinical insights and decision support
- Telemedicine with BigBlueButton video integration
- SMS/WhatsApp messaging via Twilio
- Medical imaging with DICOM viewer
- Laboratory management and results
- Billing and payment processing (Stripe/PayPal)
- Analytics dashboard with reporting
- Role-based access control (6 user roles)
- Multi-tenant architecture with subdomain isolation

### Mobile Applications
- **Doctor App**: Patient management, appointments, prescriptions, voice documentation, AI insights, messaging
- **Patient App**: Medical history access, appointment booking, prescription alerts, telemedicine consultations

### Technical Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Mobile**: Flutter with Provider state management
- **Backend**: Node.js, Express, PostgreSQL, Drizzle ORM
- **AI**: OpenAI GPT-4o integration
- **Authentication**: JWT with role-based permissions
- **Database**: Neon PostgreSQL with automatic scaling

## Support and Documentation

- **Complete Specifications**: See `CURA_COMPLETE_SPECIFICATIONS.md`
- **API Documentation**: All endpoints documented in `server/routes.ts`
- **Mobile API Guide**: Check `mobile/*/lib/services/api_service.dart`
- **Database Schema**: Defined in `shared/schema.ts`

## Version Information

**Current Version**: Latest (July 23, 2025)
- ✅ Complete Flutter mobile app development
- ✅ Voice Documentation, AI Insights, and Messaging screens
- ✅ Enhanced API service with all doctor functions
- ✅ Production-ready deployment configuration
- ✅ Comprehensive healthcare feature set

This is the complete, production-ready Cura EMR system with all latest updates and mobile applications included.