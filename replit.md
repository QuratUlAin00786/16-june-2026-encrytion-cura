# Cura EMR System

## Overview
Cura is a comprehensive multi-tenant Electronic Medical Records (EMR) system designed to streamline healthcare operations. It offers patient management, appointment scheduling, AI-powered clinical insights, telemedicine, and workflow automation. The system emphasizes healthcare compliance (including GDPR) and aims to enhance healthcare delivery through advanced AI and efficient digital tools for a broad market of healthcare organizations. Cura is developed by Cura Software Limited.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Color Theme**: A medical-focused color system with Primary: Bluewave blue (#4A7DFF), Secondary: Electric Lilac (#7279FB), and Accent: Mint Drift (#6CFFEB). Supporting colors include Midnight, Steel, and Mist.
- **Typography**: Figtree typography enforced system-wide using self-hosted WOFF2 files and maximum CSS specificity.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Radix UI (with shadcn/ui), Tailwind CSS, TanStack Query, React Context, Wouter, React Hook Form, Zod.
- **Backend**: Node.js, Express.js, TypeScript, ES modules, PostgreSQL (with Drizzle ORM), JWT-based authentication (with bcrypt).
- **Multi-tenancy**: Subdomain-based tenant isolation with automatic `organizationId` filtering for all queries. A core package enforces multi-tenancy across the system.
- **SaaS Administration**: Unified user architecture where SaaS owners are identified by `organizationId: 0` and `isSaaSOwner: true`.
- **Automatic Role Provisioning**: New organizations automatically receive 16 default system roles (e.g., Administrator, Doctor, Nurse) with pre-configured granular permissions upon creation.
- **Subdomain-Based Organizational Routing**: All protected routes use a `/:subdomain/*` pattern for clear multi-tenant isolation and URL clarity.
- **Facial Muscle Analysis**: Expanded from 15 to 32 facial muscle positions for comprehensive analysis, including updated server-side mapping and API support.
- **Bidirectional Audio Calling**: Implemented using Averox WebRTC with WebSocket signaling for full caller and callee modes, including dynamic remote peer tracking and comprehensive error handling.
- **Pharmacy Sales & Returns**:
    - **Sales Process**: Point of Sale (POS) system supporting prescription/walk-in sales, FEFO (First Expiry First Out) algorithm for inventory, multi-payment options, customer management, discounts, and invoice generation.
    - **Returns Management**: Processes returns against sales, tracks item condition, manages restocking, offers various settlement options (refund, credit note, exchange), and includes an approval workflow.
- **AI Integration**: Local NLP-powered chatbot for appointment booking and general queries. OpenAI GPT-4o for risk assessment, drug interaction, treatment suggestions, and preventive care.
- **Real-time Messaging**: Hybrid WebSocket + polling system with 2-second refresh intervals for reliable synchronization and delivery status tracking for SMS/WhatsApp.
- **Mobile Applications**: Flutter-based Cura Patient App and Cura Doctor App.

## External Dependencies

- **Neon PostgreSQL**: Serverless database hosting.
- **OpenAI API**: GPT-4o for AI clinical insights.
- **Twilio API**: SMS and WhatsApp messaging.
- **Averox WebRTC**: Telemedicine audio calling infrastructure.
- **BigBlueButton**: Video conferencing.
- **PayPal SDK**: Payment processing.