# Production SaaS Admin Setup

## Automated Production Setup

After deploying your Cura EMR system to production, you need to create the initial SaaS admin account to access the admin portal at `/saas`.

## Simple One-Click Setup

**Method 1: Web Request (Recommended)**
1. After deployment, make a POST request to: `https://your-app.replit.app/api/production-setup`
2. This creates the SaaS admin account automatically
3. You can now login at `/saas` with credentials: `saas_admin` / `admin123`

**Method 2: Using curl**
```bash
curl -X POST https://your-app.replit.app/api/production-setup
```

**Method 3: Using browser**
You can even use a browser tool or Postman to make a POST request to the setup endpoint.

## What This Does

- ✅ Creates SaaS admin account (`saas_admin` / `admin123`)
- ✅ Sets up proper database permissions
- ✅ Only runs once (prevents duplicate accounts)
- ✅ Returns confirmation message
- ✅ Safe to call multiple times

## Response Examples

**Success (first time):**
```json
{
  "success": true,
  "message": "SaaS admin account created successfully",
  "owner": {
    "id": 1,
    "username": "saas_admin",
    "email": "admin@curapms.ai"
  }
}
```

**Already exists:**
```json
{
  "success": true,
  "message": "SaaS admin already exists",
  "alreadyExists": true
}
```

## After Setup

1. Visit: `https://your-app.replit.app/saas`
2. Login with: `saas_admin` / `admin123`
3. Access full SaaS administration portal

## Security Notes

- Change the default password after first login
- The setup endpoint is public but safe (only creates account once)
- All admin actions require proper authentication
- Production environment variables are automatically used