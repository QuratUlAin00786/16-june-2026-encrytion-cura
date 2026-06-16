# Cura EMR Production Setup Guide

## Quick Setup (1 Command)

After deploying your Cura EMR to production, run this single command to set up the SaaS admin:

```bash
node create-saas-owner.cjs
```

This creates the default SaaS admin with:
- **Username:** `saas_admin`
- **Password:** `admin123` 
- **Email:** `admin@curapms.ai`

## Access SaaS Portal

Navigate to: `https://your-domain.com/saas`

## Advanced Setup (Interactive)

For custom credentials and management, use the interactive setup:

```bash
node production-setup.cjs
```

This script allows you to:
- ✅ Create new SaaS owner with custom credentials
- ✅ Reset password for existing owner
- ✅ Change username
- ✅ Change email address
- ✅ Check current owner details

## Production Commands Reference

### Create SaaS Owner (Simple)
```bash
node create-saas-owner.cjs
```

### Interactive Setup & Management
```bash
node production-setup.cjs
```

### Test SaaS Login (API)
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"saas_admin","password":"admin123"}' \
  https://your-domain.com/api/saas/login
```

### Debug Production Environment
```bash
curl https://your-domain.com/api/saas/debug
```

## Security Notes

⚠️ **Important:** After production setup:

1. **Change Default Password:** Use the interactive setup to change from `admin123`
2. **Secure Access:** SaaS portal is at `/saas` - protect this URL
3. **Save Credentials:** Store login details securely
4. **Regular Updates:** Periodically update passwords using the interactive script

## Troubleshooting

### Common Issues

**SaaS Admin Login Fails:**
- Run `node create-saas-owner.cjs` to ensure user exists
- Check debug endpoint: `/api/saas/debug`
- Verify DATABASE_URL environment variable

**Script Fails:**
- Ensure `DATABASE_URL` environment variable is set
- Check database connection and permissions
- Verify Node.js version compatibility

**Can't Access SaaS Portal:**
- Navigate directly to: `/saas` (not `/saas/`)
- Clear browser cache if needed
- Check if app is fully deployed and running

### Environment Variables Required

- `DATABASE_URL` - PostgreSQL connection string
- `SAAS_JWT_SECRET` - JWT signing secret (auto-generated)

## Support

For issues with production setup, check:
1. Database logs for connection errors
2. Application logs for authentication errors  
3. Environment variables are properly set
4. Network connectivity to database

The SaaS administration portal provides complete management of customers, billing, users, and system analytics once properly configured.