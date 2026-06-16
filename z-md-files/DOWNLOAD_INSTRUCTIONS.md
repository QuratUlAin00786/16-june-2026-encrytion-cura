# Cura EMR System - Complete Download Package

## Overview
This is the complete Cura EMR (Electronic Medical Records) system codebase by Halo Group, including both web application and Flutter mobile apps.

## System Components

### 1. Web Application
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with role-based access control
- **UI**: Tailwind CSS + shadcn/ui components

### 2. Mobile Applications
- **Cura Patient App**: Flutter mobile app for patients
- **Cura Doctor App**: Flutter mobile app for healthcare providers
- **Features**: Appointment booking, prescription management, medical records, video consultations

## Download Instructions

### Option 1: Download via Averox Platform (Recommended)
1. **In Averox Console**, run this command to create a downloadable archive:
```bash
tar -czf cura-emr-complete.tar.gz --exclude=node_modules --exclude=.git --exclude=.averox --exclude=*.log --exclude=dist --exclude=build mobile/ client/ server/ shared/ public/ package.json package-lock.json tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js drizzle.config.ts components.json replit.md CURA_*.md *.md
```

2. **Download the archive**:
   - The `cura-emr-complete.tar.gz` file will be created in your workspace
   - Right-click on the file in Averox Platform's file explorer
   - Select "Download" to save it to your local machine

### Option 2: Individual File Download
You can download individual folders by right-clicking in Averox Platform:
- `mobile/` folder (Flutter mobile apps)
- `client/` folder (React web frontend)
- `server/` folder (Node.js backend)
- `shared/` folder (Common TypeScript types)

### Option 3: Git Clone (If Git is initialized)
```bash
git clone <your-averox-git-url> cura-emr-system
```

## Setup Instructions After Download

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Flutter SDK 3.0+ (for mobile apps)
- VS Code or preferred IDE

### Web Application Setup
1. **Install dependencies**:
```bash
npm install
```

2. **Environment Variables** - Create `.env` file:
```env
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret_key
OPENAI_API_KEY=your_openai_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

3. **Database Setup**:
```bash
npm run db:push
npm run seed
```

4. **Start Development Server**:
```bash
npm run dev
```

### Mobile Apps Setup

#### Flutter Patient App
```bash
cd mobile/cura_patient
flutter pub get
flutter run
```

#### Flutter Doctor App  
```bash
cd mobile/cura_doctor
flutter pub get
flutter run
```

## Demo Credentials
- **Admin**: admin@demo.com / admin123
- **Doctor**: doctor@gmail.com / doctor123  
- **Patient**: patient@gmail.com / patient123
- **Nurse**: nurse@demo.com / nurse123

## Production Deployment

### Web Application
- Deploy to Vercel, Netlify, or Averox Deployments
- Set up production PostgreSQL (Neon, Supabase, etc.)
- Configure environment variables in deployment platform

### Mobile Apps
- **iOS**: Build with Xcode, deploy to App Store
- **Android**: Build APK/AAB, deploy to Google Play Store

## Support & Documentation
- Complete API documentation in `server/routes.ts`
- Mobile app architecture in `mobile/` folders
- Database schema in `shared/schema.ts`
- UI components in `client/src/components/`

## License
© 2025 Halo Group. All rights reserved.

## Technical Support
For technical questions or deployment assistance, refer to the comprehensive documentation in each folder.