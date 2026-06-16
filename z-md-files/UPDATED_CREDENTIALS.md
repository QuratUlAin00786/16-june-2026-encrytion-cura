# Cura EMR - Updated Authentication Credentials

## 🔐 Updated Login Credentials

All user accounts have been updated with standardized passwords for easier access:

### **Admin Account**
- **Email:** `admin@cura.com` OR **Username:** `admin`
- **Password:** `admin123`
- **Role:** Administrator
- **Access:** Full system access

### **Doctor Account**  
- **Email:** `doctor@cura.com` OR **Username:** `doctor`
- **Password:** `doctor123`
- **Role:** Doctor
- **Access:** Clinical features, patient management

### **Nurse Account**
- **Email:** `nurse@cura.com` OR **Username:** `nurse`  
- **Password:** `nurse123`
- **Role:** Nurse
- **Access:** Patient care, limited clinical features

### **Patient Account**
- **Email:** `patient@cura.com` OR **Username:** `patient`
- **Password:** `patient123`
- **Role:** Patient
- **Access:** Personal medical records, appointments

### **Lab Technician Account**
- **Email:** `labtech@cura.com` OR **Username:** `labtech`
- **Password:** `labtech123`
- **Role:** Lab Technician
- **Access:** Lab results, sample management

### **Receptionist Account**
- **Email:** `receptionist@cura.com` OR **Username:** `receptionist`
- **Password:** `labtech123`
- **Role:** Receptionist
- **Access:** Appointment scheduling, basic patient info

---

## 🔄 Authentication System Changes

### **Flexible Login Support**
- Users can now login with **either email OR username**
- Login field accepts both formats for convenience
- Automatic detection and validation for both methods

### **Password Requirements**
- Minimum 3 characters for demo purposes
- Standardized across all roles for easy testing
- All existing users updated to new password format

### **Mobile API Authentication**
- Same credentials work for mobile apps
- JWT tokens valid for 7 days
- Required header: `X-Tenant-Subdomain: demo`

---

## 📱 Mobile App Testing

Use these credentials in mobile apps:

**Patient App:**
```json
{
  "email": "patient@cura.com",
  "password": "patient123"
}
```

**Doctor App:**
```json
{
  "email": "doctor@cura.com", 
  "password": "doctor123"
}
```

---

## 🚀 Production Notes

- All passwords have been updated in the database
- Authentication system supports both email and username login
- Mobile API endpoints require proper authentication headers
- JWT tokens include user role and organization information