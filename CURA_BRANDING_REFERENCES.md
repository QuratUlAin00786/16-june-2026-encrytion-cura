# CURA Branding References - Complete List

This document lists all occurrences of CURA-related branding, logos, and text throughout the entire application.

---

## 1. FILES USING `/cura-logo-chatbot.png`

### Client-Side Files:

#### `client/src/components/layout/sidebar.tsx`
- **Line 313**: Used as fallback logo in sidebar when no organization logo is set
- **Usage**: `(theme === "dark" ? darkLogoWhite : "/cura-logo-chatbot.png")`
- **Context**: Main application sidebar logo

#### `client/src/pages/auth/LoginPage.tsx`
- **Line 19**: Constant definition `const curaLogoPath = "/cura-logo-chatbot.png";`
- **Line 126**: Used in login page `<img src={curaLogoPath} alt="Cura EMR" />`
- **Context**: Login page logo

#### `client/src/pages/saas/SaaSLogin.tsx`
- **Line 16**: Constant definition `const curaLogoPath = "/cura-logo-chatbot.png";`
- **Line 75**: Used in SaaS login page
- **Context**: SaaS login page logo

#### `client/src/pages/saas/SaaSDashboard.tsx`
- **Line 24**: Constant definition `const curaLogoPath = "/cura-logo-chatbot.png";`
- **Line 108**: Used in dashboard header
- **Line 148**: Used in dashboard sidebar
- **Context**: SaaS dashboard logos

#### `client/src/pages/auth/ResetPasswordPage.tsx`
- **Line 11**: Constant definition `const curaLogoPath = "/cura-logo-chatbot.png";`
- **Line 94**: Used in reset password page `<img src={curaLogoPath} alt="Cura EMR" />`
- **Context**: Password reset page logo

#### `client/src/components/WebsiteChatbot.tsx`
- **Line 636**: Chatbot button icon (closed state)
- **Line 655**: Chatbot window header logo
- **Line 684**: Message bubble avatar for AI responses
- **Line 728**: Typing indicator avatar
- **Context**: Website chatbot component - multiple uses for branding

### Server-Side Files:

#### `server/saas-routes.ts`
- **Line 2363**: Server-side logo path for PDF generation
- **Usage**: `path.join(process.cwd(), "client", "public", "cura-logo-chatbot.png")`
- **Context**: PDF invoice generation

---

## 2. FILES USING OTHER CURA LOGO FILES

### `/cura-logo.png` (Standard Logo):

#### `client/src/App.tsx`
- **Line 24**: `const curaLogoPath = "/cura-logo.png";`

#### `client/src/pages/login.tsx`
- **Line 11**: `const curaLogoPath = "/cura-logo.png";`
- **Line 72**: Used in login page

#### `client/src/pages/legal/TermsOfService.tsx`
- **Line 5**: `const curaLogoPath = "/cura-logo.png";`
- **Line 16**: Used in terms of service page

#### `client/src/pages/legal/PrivacyPolicy.tsx`
- **Line 5**: `const curaLogoPath = "/cura-logo.png";`
- **Line 16**: Used in privacy policy page

#### `client/src/pages/legal/Press.tsx`
- **Line 7**: `const curaLogoPath = "/cura-logo.png";`
- **Line 66**: Used in press/media page
- **Context**: Logo package download

#### `client/src/pages/legal/GDPRCompliance.tsx`
- **Line 5**: `const curaLogoPath = "/cura-logo.png";`
- **Line 16**: Used in GDPR compliance page

#### `client/src/pages/landing/PricingPage.tsx`
- **Line 5**: `const curaLogoPath = "/cura-logo.png";`
- **Line 135**: Used in pricing page header
- **Line 353**: Used in pricing page footer

#### `client/src/pages/landing/HelpCentre.tsx`
- **Line 16**: `const curaLogoPath = "/cura-logo.png";`
- **Line 101**: Used in help center page

#### `client/src/pages/landing/FeaturesPage.tsx`
- **Line 34**: `const curaLogoPath = "/cura-logo.png";`
- **Line 35**: `const dashboardScreenshot = "/cura-logo.png";` (Note: This seems incorrect - should be a screenshot)
- **Line 46**: Used in features page
- **Line 549**: Used in features page footer

#### `client/src/pages/landing/AboutPage.tsx`
- **Line 17**: `const curaLogoPath = "/cura-logo.png";`
- **Line 28**: Used in about page header
- **Line 332**: Used in about page footer

#### `client/src/components/layout/header.tsx`
- **Line 8**: `const curaIconPath = "/cura-logo.png";`

#### `client/src/pages/saas/components/InvoiceTemplate.tsx`
- **Line 5**: `import curaLogo from "@assets/cura-logo.png";`
- **Line 79**: Used in invoice template
- **Context**: Invoice PDF generation

### `/cura-logo.svg` (SVG Logo):

#### `client/src/pages/landing/LandingPage.tsx`
- **Line 29**: Used in navigation bar
- **Line 581**: Used in footer
- **Context**: Main landing page

### Dark Logo (White Version):

#### `client/src/components/layout/sidebar.tsx`
- **Line 59**: `const darkLogoWhite = new URL("../../../../attached_assets/dark-logo/cura-logo-white.png", import.meta.url).href;`
- **Line 313**: Used when theme is dark
- **Context**: Dark mode sidebar logo

---

## 3. FILES USING "CURA EMR" TEXT

### Server-Side Files:

#### `server/routes.ts`
- **Line 2094**: Email subject: "Verify your Cura EMR trial account"
- **Line 2097**: Email text: "Thank you for starting your 14-day free trial with Cura EMR!"
- **Line 2107**: Email signature: "The Cura EMR Team"
- **Line 2128**: Email HTML: "Thank you for starting your 14-day free trial with Cura EMR!"
- **Line 2135**: Email HTML: "Best regards,<br><strong>The Cura EMR Team</strong>"
- **Line 2138**: Email footer: "© 2025 Cura Software Limited. All rights reserved."
- **Line 17947**: Copyright text: 'Powered by Cura EMR'
- **Line 22263**: Email header: `<h1>Cura EMR</h1>`
- **Line 22323**: Email signature: "Best regards,<br><strong>Cura EMR Team</strong>"
- **Line 22326**: Email footer: "© 2025 Cura EMR by Cura Software Limited. All rights reserved."
- **Line 22347**: Email text signature: "Cura EMR Team"
- **Line 22643**: PDF header: `<h1>CURA MEDICAL CENTER</h1>`
- **Line 22831**: Default clinic name: 'CURA MEDICAL CENTER'
- **Line 23392**: PDF text: 'CURA MEDICAL CENTER - DEPARTMENT OF RADIOLOGY'
- **Line 23607**: PDF header comment: 'CURA HEALTH EMR header'
- **Line 23608**: PDF text: 'CURA HEALTH EMR'
- **Line 24788**: PDF footer: 'Generated by Cura EMR System'
- **Line 25118**: PDF footer comment: 'Organization Name - CURA EMR SYSTEM'
- **Line 25119**: PDF text: 'CURA EMR SYSTEM'
- **Line 25394**: Email signature: "Best regards,<br>Cura EMR Team"
- **Line 25398**: Email footer: "© 2025 Cura EMR by Halo Group. All rights reserved."
- **Line 25420**: Email text signature: "Cura EMR Team"

#### `server/storage.ts`
- **Line 7132**: Default platform name: 'Cura EMR Platform'
- **Line 7144**: Default from name: 'Cura Software Limited'
- **Line 7155**: Default invoice prefix: 'CURA'
- **Line 7176**: Default platform name: 'Cura EMR Platform'
- **Line 7188**: Default from name: 'Cura Software Limited'
- **Line 7199**: Default invoice prefix: 'CURA'

#### `server/services/email.ts`
- **Line 310**: Email from address: `Cura EMR <${process.env.FALLBACK_EMAIL_USER}>`
- **Line 351**: Email header: `<h1>Cura EMR</h1>`
- **Line 368**: Email signature: "Best regards,<br>Cura EMR Team"
- **Line 371**: Email footer: "© 2025 Cura EMR by Halo Group. All rights reserved."
- **Line 391**: Email text signature: "Cura EMR Team"
- **Line 416**: Email header: `<h1>Cura EMR</h1>`
- **Line 433**: Email signature: "Best regards,<br>Cura EMR Team"
- **Line 436**: Email footer: "© 2025 Cura EMR by Halo Group. All rights reserved."
- **Line 456**: Email text signature: "Cura EMR Team"
- **Line 481**: Email header: `<h1>Cura EMR</h1>`
- **Line 497**: Email signature: "Best regards,<br>Cura EMR Team"
- **Line 500**: Email footer: "© 2025 Cura EMR by Halo Group. All rights reserved."
- **Line 519**: Email text signature: "Cura EMR Team"
- **Line 570**: Email subject: `${typeLabels[reminderType] || 'Healthcare Reminder'} - Cura EMR`
- **Line 587**: Email header: `<h1>Cura EMR</h1>`
- **Line 600**: Email signature: "Best regards,<br>Cura EMR Team"
- **Line 603**: Email footer: "© 2025 Cura EMR by Halo Group. All rights reserved."
- **Line 620**: Email text signature: "Cura EMR Team"
- **Line 646**: Email subject: `Password Changed - Cura EMR`
- **Line 668**: Email header: `<h1>Cura EMR</h1>`
- **Line 734**: Email signature: "Best regards,<br>Cura EMR Security Team"
- **Line 737**: Email footer: "© 2025 Cura EMR by Halo Group. All rights reserved."
- **Line 750**: Email text: "Your Cura EMR account password was successfully changed."
- **Line 778**: Email text signature: "Cura EMR Security Team"
- **Line 780**: Email text footer: "© 2025 Cura EMR by Halo Group. All rights reserved."
- **Line 829**: Email header: `<h1>Cura EMR</h1>`
- **Line 861**: Email signature: "Best regards,<br>Cura EMR Team"
- **Line 864**: Email footer: "© 2025 Cura EMR by Halo Group. All rights reserved."
- **Line 888**: Email text signature: "Cura EMR Team"
- **Line 1087**: Email HTML: `<p class="clinic-tagline" style="color: grey;">Powered by Cura EMR Platform</p>`
- **Line 1093**: Email HTML: `<h1 class="clinic-name" style="color: grey;">Cura EMR</h1>`
- **Line 1122**: Email HTML: `<span class="detail-value">Cura EMR Platform</span>`
- **Line 1158**: Email HTML: `<div class="footer-brand">Powered by Cura EMR</div>`
- **Line 1160**: Email HTML: "This email was automatically generated by the Cura EMR system.<br>"
- **Line 1162**: Email HTML: "© 2025 Cura Software Limited. All rights reserved."
- **Line 1181**: Email text: "- System: Cura EMR Platform"
- **Line 1197**: Email text: "Powered by Cura EMR"
- **Line 1198**: Email text: "This email was automatically generated by the Cura EMR system."
- **Line 1200**: Email text: "© 2025 Cura Software Limited. All rights reserved."
- **Line 1241**: Email subject: `Welcome to Cura EMR - Your Account Has Been Created`
- **Line 1328**: Email HTML: `<h1>Welcome to Cura EMR</h1>`
- **Line 1336**: Email HTML: "You have been assigned the role of <strong>${role}</strong> and can now access the Cura EMR system."
- **Line 1369**: Email HTML: `<a href="https://app.curaemr.ai/auth/login" class="button">Login to Cura EMR</a>`
- **Line 1386**: Email HTML: `<p style="margin: 0 0 10px 0;"><strong>Cura Software Limited</strong></p>`
- **Line 1390**: Email HTML: "© 2025 Cura Software Limited. All rights reserved."
- **Line 1398**: Email text: "Welcome to Cura EMR!"
- **Line 1425**: Email text: "Cura Software Limited"
- **Line 1430**: Email text: "© 2025 Cura Software Limited. All rights reserved."
- **Line 1462**: Email subject: 'Password Reset Request - Cura EMR'
- **Line 1480**: Email HTML: "Cura EMR"
- **Line 1496**: Email HTML: "You requested to reset your password for your Cura EMR account. Click the button below to create a new password:"
- **Line 1534**: Email HTML: `<strong style="color: #4a5568;">Cura EMR Team</strong>`
- **Line 1539**: Email HTML: `&copy; ${new Date().getFullYear()} Cura EMR. All rights reserved.`
- **Line 1553**: Email text: "You requested to reset your password for your Cura EMR account."
- **Line 1563**: Email text: "Cura EMR Team"
- **Line 1579**: Email subject: 'Password Successfully Changed - Cura EMR'
- **Line 1599**: Email HTML: "Cura EMR"
- **Line 1623**: Email HTML: "Your password has been successfully changed for your Cura EMR account."
- **Line 1649**: Email HTML: `<strong style="color: #4a5568;">Cura EMR Team</strong>`
- **Line 1654**: Email HTML: `&copy; ${new Date().getFullYear()} Cura EMR. All rights reserved.`
- **Line 1668**: Email text: "Your password has been successfully changed for your Cura EMR account."
- **Line 1675**: Email text: "Cura EMR Team"

#### `server/saas-routes.ts`
- **Line 46**: Email subject: `Welcome to Cura EMR - Your ${organization.name} Account is Ready`
- **Line 49**: Email text: "Welcome to Cura EMR! Your account for ${organization.name} has been successfully created."
- **Line 74**: Email text: "The Cura EMR Team"
- **Line 75**: Email text: "Cura Software Limited"
- **Line 77**: Email text: "© 2025 Cura Software Limited. All rights reserved."
- **Line 83**: Email HTML title: `<title>Welcome to Cura EMR</title>`
- **Line 108**: Email HTML: `<div class="logo">Cura EMR</div>`
- **Line 115**: Email HTML: "Welcome to Cura EMR! Your account for <strong>${organization.name}</strong> has been successfully created and is ready to use."
- **Line 158**: Email HTML: "<strong>The Cura EMR Team</strong><br>"
- **Line 159**: Email HTML: "Cura Software Limited</p>"
- **Line 163**: Email HTML: "© 2025 Cura Software Limited. All rights reserved."
- **Line 277**: Email subject: "Cura EMR Email Service Test"
- **Line 278**: Email text: "This is a test email to verify the Cura EMR email service is working properly."
- **Line 280**: Email HTML: `<h3>Cura EMR Email Service Test</h3>`
- **Line 281**: Email HTML: "This is a test email to verify the Cura EMR email service is working properly."
- **Line 646**: Email text: "Your patient account has been successfully created in the Cura EMR system."
- **Line 654**: Email text: "The Cura EMR Team"
- **Line 675**: Email HTML: "Your patient account has been successfully created in the Cura EMR system."
- **Line 681**: Email HTML: "Best regards,<br><strong>The Cura EMR Team</strong>"
- **Line 684**: Email HTML: "© 2025 Cura Software Limited. All rights reserved."
- **Line 1910**: Payment description: `paymentData.description || "Payment for Cura EMR Services"`
- **Line 2357**: Payment description: `payment.description || "Cura EMR Software Subscription"`
- **Line 2563**: Email subject: `Invoice ${payment.invoiceNumber} from Cura EMR`

### Client-Side Files:

#### `client/src/pages/lab-results.tsx`
- **Line 1389**: PDF text: "Report generated from Cura EMR System"
- **Line 1543**: PDF footer: `Generated by Cura EMR System - ${format(new Date(), "MMM dd, yyyy HH:mm")}`
- **Line 1753**: Default clinic name: `'CURA EMR SYSTEM'`
- **Line 1876**: PDF footer: `Generated by Cura EMR System - ${format(new Date(), "MMM dd, yyyy HH:mm")}`
- **Line 2169**: Default clinic name: `'CURA EMR SYSTEM'`
- **Line 2334**: PDF footer: `Generated by Cura EMR System - ${format(new Date(), "MMM dd, yyyy HH:mm")}`
- **Line 5775**: Default clinic name: `'CURA EMR SYSTEM'`
- **Line 6005**: HTML text: "Generated by Cura EMR System"

#### `client/src/pages/inventory.tsx`
- **Line 472**: PDF title: "CURA EMR - INVENTORY ITEM REPORT"
- **Line 506**: PDF footer: "Report generated by Cura EMR System"

#### `client/src/pages/auth/LoginPage.tsx`
- **Line 126**: Image alt text: `alt="Cura EMR"`

#### `client/src/pages/auth/ResetPasswordPage.tsx`
- **Line 94**: Image alt text: `alt="Cura EMR"`

#### `client/src/components/WebsiteChatbot.tsx`
- **Line 660**: Chatbot title: "Cura Assistant"
- **Line 661**: Chatbot subtitle: "AI-Powered Healthcare Support"

---

## 4. FILES USING "CURA SOFTWARE LIMITED" TEXT

### Server-Side Files:

#### `server/routes.ts`
- **Line 2138**: Email footer: "© 2025 Cura Software Limited. All rights reserved."

#### `server/services/email.ts`
- **Line 1162**: Email HTML: "© 2025 Cura Software Limited. All rights reserved."
- **Line 1200**: Email text: "© 2025 Cura Software Limited. All rights reserved."
- **Line 1386**: Email HTML: `<p style="margin: 0 0 10px 0;"><strong>Cura Software Limited</strong></p>`
- **Line 1390**: Email HTML: "© 2025 Cura Software Limited. All rights reserved."
- **Line 1425**: Email text: "Cura Software Limited"
- **Line 1430**: Email text: "© 2025 Cura Software Limited. All rights reserved."

#### `server/saas-routes.ts`
- **Line 75**: Email text: "Cura Software Limited"
- **Line 77**: Email text: "© 2025 Cura Software Limited. All rights reserved."
- **Line 159**: Email HTML: "Cura Software Limited</p>"
- **Line 163**: Email HTML: "© 2025 Cura Software Limited. All rights reserved."
- **Line 684**: Email HTML: "© 2025 Cura Software Limited. All rights reserved."
- **Line 2389**: PDF text: "Cura Software Limited"

#### `server/storage.ts`
- **Line 7144**: Default from name: 'Cura Software Limited'
- **Line 7188**: Default from name: 'Cura Software Limited'

---

## 5. FILES USING "CURA" (Other Variations)

### Server-Side Files:

#### `server/routes.ts`
- **Line 22643**: PDF header: `CURA MEDICAL CENTER`
- **Line 22831**: Default clinic name: `'CURA MEDICAL CENTER'`
- **Line 23392**: PDF text: `'CURA MEDICAL CENTER - DEPARTMENT OF RADIOLOGY'`
- **Line 23607**: PDF comment: `'CURA HEALTH EMR header'`
- **Line 23608**: PDF text: `'CURA HEALTH EMR'`
- **Line 25118**: PDF comment: `'Organization Name - CURA EMR SYSTEM'`
- **Line 25119**: PDF text: `'CURA EMR SYSTEM'`

#### `server/storage.ts`
- **Line 7155**: Default invoice prefix: 'CURA'
- **Line 7199**: Default invoice prefix: 'CURA'

### Client-Side Files:

#### `client/src/pages/lab-results.tsx`
- **Line 1753**: Default clinic name: `'CURA EMR SYSTEM'`
- **Line 2169**: Default clinic name: `'CURA EMR SYSTEM'`
- **Line 5775**: Default clinic name: `'CURA EMR SYSTEM'`

#### `client/src/pages/inventory.tsx`
- **Line 472**: PDF title: `"CURA EMR - INVENTORY ITEM REPORT"`

### Documentation Files:

#### `CURA_Problem_Statement.html`
- **Line 6**: HTML title: `<title>CURA EMR System - Problem Statement</title>`
- **Line 111**: Heading: `<h1>CURA EMR SYSTEM</h1>`
- **Line 117**: Company name: `<strong>Cura Software Limited</strong>`
- **Line 127**: Text: "CURA EMR System addresses..."
- **Line 168**: Heading: `<h2>3. THE SOLUTION: CURA EMR SYSTEM</h2>`
- **Line 173**: Text: "CURA EMR System is a state-of-the-art..."
- **Line 175**: Text: "Built on modern cloud architecture, CURA provides..."
- **Line 296**: Heading: `<h3 style="color: white; margin-top: 0;">What Makes CURA Unique</h3>`
- **Line 350**: Heading: `<h3>Why Choose CURA Over Competitors?</h3>`
- **Line 415**: Text: "CURA EMR System addresses..."
- **Line 417**: Text: "intelligence, and user-centric design, CURA transforms..."
- **Line 424**: Text: "multi-tenant architecture, CURA makes enterprise-grade..."
- **Line 430**: Text: "care, CURA EMR System positions itself..."
- **Line 435**: Text: `<p><strong>Cura Software Limited</strong></p>`

#### `server/packages/multi-tenant-core.ts`
- **Line 3**: Comment: `* Comprehensive multi-tenancy enforcement across the entire Cura EMR system`

### SQL Files:

#### `SQL Files/5th-deployment.sql`
- **Line 10356**: Organization name: `'Cura Healthcare'`
- **Line 10356**: Brand name: `'Cura EMR'`

#### `SQL Files/database_export.sql`
- **Line 13513**: Organization name: `Cura Healthcare`
- **Line 13513**: Brand name: `Cura EMR`

#### `SQL Files/cura16Nov_database.sql`
- **Line 13673**: Organization name: `Cura Healthcare`
- **Line 13673**: Brand name: `Cura EMR`

#### `SQL Files/all_tables_insert_development.sql`
- **Line 94**: Clinic name: `"Cura Healthcare"`
- **Line 95**: Clinic name: `"Cura Healthcare"`

---

## 6. SUMMARY BY FILE TYPE

### Logo Files Used:
1. `/cura-logo-chatbot.png` - **10 occurrences** (Main chatbot and login logos)
2. `/cura-logo.png` - **18 occurrences** (Standard logo for pages)
3. `/cura-logo.svg` - **2 occurrences** (Landing page SVG)
4. `cura-logo-white.png` - **1 occurrence** (Dark mode sidebar)

### Text Variations Found:
1. **"Cura EMR"** - Most common (200+ occurrences)
2. **"CURA EMR"** - All caps version (20+ occurrences)
3. **"Cura Software Limited"** - Company name (15+ occurrences)
4. **"CURA"** - Standalone (10+ occurrences)
5. **"Cura Healthcare"** - Organization name (5+ occurrences)
6. **"CURA MEDICAL CENTER"** - Default clinic name (3+ occurrences)
7. **"CURA EMR SYSTEM"** - System name (5+ occurrences)
8. **"CURA HEALTH EMR"** - Alternative name (2+ occurrences)

### File Categories:
- **Email Templates**: `server/routes.ts`, `server/services/email.ts`, `server/saas-routes.ts`
- **PDF Generation**: `server/routes.ts`, `client/src/pages/lab-results.tsx`, `client/src/pages/inventory.tsx`
- **UI Components**: `client/src/components/layout/sidebar.tsx`, `client/src/components/WebsiteChatbot.tsx`
- **Auth Pages**: `client/src/pages/auth/LoginPage.tsx`, `client/src/pages/auth/ResetPasswordPage.tsx`
- **Landing Pages**: `client/src/pages/landing/*.tsx`
- **Legal Pages**: `client/src/pages/legal/*.tsx`
- **SaaS Pages**: `client/src/pages/saas/*.tsx`
- **Storage/Config**: `server/storage.ts`
- **Documentation**: `CURA_Problem_Statement.html`, SQL files

---

## 7. NOTES

1. **Logo Path Consistency**: Most files use `/cura-logo-chatbot.png` for authentication and chatbot, while `/cura-logo.png` is used for landing and legal pages.

2. **Branding Variations**: The application uses multiple variations:
   - "Cura EMR" (most common, sentence case)
   - "CURA EMR" (all caps, used in PDFs and headers)
   - "Cura Software Limited" (company legal name)

3. **Default Values**: Several default values are set in `server/storage.ts`:
   - Platform name: 'Cura EMR Platform'
   - From name: 'Cura Software Limited'
   - Invoice prefix: 'CURA'

4. **Email Templates**: Most email templates include:
   - Header: "Cura EMR"
   - Signature: "Cura EMR Team" or "The Cura EMR Team"
   - Footer: "© 2025 Cura Software Limited. All rights reserved." or "© 2025 Cura EMR by Halo Group. All rights reserved."

5. **PDF Generation**: PDFs use variations like:
   - "CURA MEDICAL CENTER"
   - "CURA EMR SYSTEM"
   - "Generated by Cura EMR System"

---

**Generated**: 2025-01-18
**Total Files Analyzed**: 50+
**Total Occurrences**: 300+
