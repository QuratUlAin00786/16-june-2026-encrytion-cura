# Cura EMR - Roles API Documentation for Flutter

**Base URL:** `https://your-app-domain.replit.app` or your production domain  
**Version:** 1.0  
**Authentication:** JWT Token Required  
**Multi-Tenancy:** Organization Subdomain Required

---

## 📋 Table of Contents

1. [Authentication Headers](#authentication-headers)
2. [Get All Roles](#1-get-all-roles)
3. [Get Role by Name](#2-get-role-by-name)
4. [Create Role](#3-create-role)
5. [Update Role](#4-update-role)
6. [Delete Role](#5-delete-role)
7. [Flutter Implementation Examples](#flutter-implementation-examples)
8. [Error Handling](#error-handling)

---

## 🔐 Authentication Headers

All requests must include these headers:

```dart
Map<String, String> headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'X-Tenant-Subdomain': 'YOUR_ORGANIZATION_SUBDOMAIN',
};
```

### Required Headers:

| Header | Type | Description | Required |
|--------|------|-------------|----------|
| `Content-Type` | String | Must be `application/json` | ✅ Yes |
| `Authorization` | String | JWT token prefixed with `Bearer ` | ✅ Yes |
| `X-Tenant-Subdomain` | String | Organization subdomain (e.g., `demo`, `metro44`) | ✅ Yes |

### Example:
```dart
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'X-Tenant-Subdomain': 'demo',
}
```

---

## 1. Get All Roles

**Endpoint:** `GET /api/roles`  
**Authentication:** Required  
**Role Permission:** Any authenticated user  

### Request

```dart
GET /api/roles HTTP/1.1
Host: your-app-domain.replit.app
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
X-Tenant-Subdomain: demo
```

### Response (200 OK)

```json
[
  {
    "id": 1,
    "organizationId": 1,
    "name": "Administrator",
    "displayName": "Administrator",
    "description": "Full system access with all permissions",
    "permissions": {
      "modules": {
        "patients": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": true
        },
        "appointments": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": true
        },
        "medicalRecords": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": true
        },
        "prescriptions": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": true
        },
        "billing": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": true
        },
        "inventory": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": true
        },
        "reports": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": true
        },
        "users": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": true
        }
      },
      "fields": {
        "patientSensitiveInfo": {
          "view": true,
          "edit": true
        },
        "financialData": {
          "view": true,
          "edit": true
        },
        "medicalHistory": {
          "view": true,
          "edit": true
        }
      }
    },
    "isSystem": true,
    "createdAt": "2025-10-17T10:30:00.000Z",
    "updatedAt": "2025-10-17T10:30:00.000Z"
  },
  {
    "id": 2,
    "organizationId": 1,
    "name": "Doctor",
    "displayName": "Doctor",
    "description": "Medical practitioners with patient care permissions",
    "permissions": {
      "modules": {
        "patients": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": false
        },
        "appointments": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": true
        },
        "medicalRecords": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": false
        },
        "prescriptions": {
          "view": true,
          "create": true,
          "edit": true,
          "delete": false
        },
        "billing": {
          "view": true,
          "create": false,
          "edit": false,
          "delete": false
        }
      },
      "fields": {
        "patientSensitiveInfo": {
          "view": true,
          "edit": true
        },
        "medicalHistory": {
          "view": true,
          "edit": true
        }
      }
    },
    "isSystem": true,
    "createdAt": "2025-10-17T10:30:00.000Z",
    "updatedAt": "2025-10-17T10:30:00.000Z"
  }
]
```

### Error Response (500)

```json
{
  "error": "Failed to fetch roles"
}
```

---

## 2. Get Role by Name

**Endpoint:** `GET /api/roles/by-name/:roleName`  
**Authentication:** Required  
**Role Permission:** Any authenticated user  

### Request

```dart
GET /api/roles/by-name/Doctor HTTP/1.1
Host: your-app-domain.replit.app
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
X-Tenant-Subdomain: demo
```

### URL Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `roleName` | String | The name of the role (e.g., "Doctor", "Administrator") | ✅ Yes |

### Response (200 OK)

```json
{
  "id": 2,
  "organizationId": 1,
  "name": "Doctor",
  "displayName": "Doctor",
  "description": "Medical practitioners with patient care permissions",
  "permissions": {
    "modules": {
      "patients": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": false
      },
      "appointments": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true
      },
      "medicalRecords": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": false
      }
    },
    "fields": {
      "patientSensitiveInfo": {
        "view": true,
        "edit": true
      }
    }
  },
  "isSystem": true,
  "createdAt": "2025-10-17T10:30:00.000Z",
  "updatedAt": "2025-10-17T10:30:00.000Z"
}
```

### Error Response (404)

```json
{
  "error": "Role not found"
}
```

---

## 3. Create Role

**Endpoint:** `POST /api/roles`  
**Authentication:** Required  
**Role Permission:** Admin only  

### Request

```dart
POST /api/roles HTTP/1.1
Host: your-app-domain.replit.app
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
X-Tenant-Subdomain: demo

{
  "name": "Lab_Supervisor",
  "displayName": "Lab Supervisor",
  "description": "Laboratory supervisor with lab management permissions",
  "permissions": {
    "modules": {
      "patients": {
        "view": true,
        "create": false,
        "edit": false,
        "delete": false
      },
      "appointments": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": false
      },
      "labResults": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true
      },
      "inventory": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": false
      }
    },
    "fields": {
      "patientSensitiveInfo": {
        "view": true,
        "edit": false
      },
      "labResults": {
        "view": true,
        "edit": true
      }
    }
  },
  "isSystem": false
}
```

### Request Body Schema

```dart
{
  "name": String,              // Required: Unique role name (max 50 chars)
  "displayName": String,       // Required: User-friendly display name
  "description": String,       // Required: Role description
  "permissions": {             // Required: Permission object
    "modules": {
      "[moduleName]": {
        "view": Boolean,       // Required: View permission
        "create": Boolean,     // Required: Create permission
        "edit": Boolean,       // Required: Edit permission
        "delete": Boolean      // Required: Delete permission
      }
    },
    "fields": {
      "[fieldName]": {
        "view": Boolean,       // Required: View permission
        "edit": Boolean        // Required: Edit permission
      }
    }
  },
  "isSystem": Boolean          // Optional: Mark as system role (default: false)
}
```

### Response (201 Created)

```json
{
  "id": 17,
  "organizationId": 1,
  "name": "Lab_Supervisor",
  "displayName": "Lab Supervisor",
  "description": "Laboratory supervisor with lab management permissions",
  "permissions": {
    "modules": {
      "patients": {
        "view": true,
        "create": false,
        "edit": false,
        "delete": false
      },
      "labResults": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true
      }
    },
    "fields": {
      "patientSensitiveInfo": {
        "view": true,
        "edit": false
      }
    }
  },
  "isSystem": false,
  "createdAt": "2025-10-17T12:30:00.000Z",
  "updatedAt": "2025-10-17T12:30:00.000Z"
}
```

### Error Response (403 Forbidden)

```json
{
  "error": "Access denied. Admin role required."
}
```

### Error Response (500)

```json
{
  "error": "Failed to create role"
}
```

---

## 4. Update Role

**Endpoint:** `PATCH /api/roles/:id`  
**Authentication:** Required  
**Role Permission:** Admin only  

### Request

```dart
PATCH /api/roles/17 HTTP/1.1
Host: your-app-domain.replit.app
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
X-Tenant-Subdomain: demo

{
  "displayName": "Senior Lab Supervisor",
  "description": "Senior laboratory supervisor with extended permissions",
  "permissions": {
    "modules": {
      "patients": {
        "view": true,
        "create": false,
        "edit": true,
        "delete": false
      },
      "labResults": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true
      },
      "reports": {
        "view": true,
        "create": true,
        "edit": false,
        "delete": false
      }
    },
    "fields": {
      "patientSensitiveInfo": {
        "view": true,
        "edit": false
      },
      "labResults": {
        "view": true,
        "edit": true
      }
    }
  }
}
```

### URL Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `id` | Integer | The role ID to update | ✅ Yes |

### Request Body Schema

```dart
{
  "name": String,              // Optional: Role name
  "displayName": String,       // Optional: Display name
  "description": String,       // Optional: Description
  "permissions": {             // Optional: Updated permissions
    "modules": {
      "[moduleName]": {
        "view": Boolean,
        "create": Boolean,
        "edit": Boolean,
        "delete": Boolean
      }
    },
    "fields": {
      "[fieldName]": {
        "view": Boolean,
        "edit": Boolean
      }
    }
  }
}
```

### Response (200 OK)

```json
{
  "id": 17,
  "organizationId": 1,
  "name": "Lab_Supervisor",
  "displayName": "Senior Lab Supervisor",
  "description": "Senior laboratory supervisor with extended permissions",
  "permissions": {
    "modules": {
      "patients": {
        "view": true,
        "create": false,
        "edit": true,
        "delete": false
      },
      "labResults": {
        "view": true,
        "create": true,
        "edit": true,
        "delete": true
      },
      "reports": {
        "view": true,
        "create": true,
        "edit": false,
        "delete": false
      }
    },
    "fields": {
      "patientSensitiveInfo": {
        "view": true,
        "edit": false
      }
    }
  },
  "isSystem": false,
  "createdAt": "2025-10-17T12:30:00.000Z",
  "updatedAt": "2025-10-17T14:45:00.000Z"
}
```

### Error Response (404)

```json
{
  "error": "Role not found"
}
```

### Error Response (403)

```json
{
  "error": "Access denied. Admin role required."
}
```

---

## 5. Delete Role

**Endpoint:** `DELETE /api/roles/:id`  
**Authentication:** Required  
**Role Permission:** Admin only  

### Request

```dart
DELETE /api/roles/17 HTTP/1.1
Host: your-app-domain.replit.app
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
X-Tenant-Subdomain: demo
```

### URL Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `id` | Integer | The role ID to delete | ✅ Yes |

### Response (200 OK)

```json
{
  "success": true
}
```

### Error Response (400 - System Role)

```json
{
  "error": "Cannot delete system roles"
}
```

### Error Response (404)

```json
{
  "error": "Role not found"
}
```

### Error Response (403)

```json
{
  "error": "Access denied. Admin role required."
}
```

---

## 🎯 Flutter Implementation Examples

### 1. Roles Service Class

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class RolesService {
  final String baseUrl;
  final String jwtToken;
  final String subdomain;

  RolesService({
    required this.baseUrl,
    required this.jwtToken,
    required this.subdomain,
  });

  // Get common headers
  Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $jwtToken',
    'X-Tenant-Subdomain': subdomain,
  };

  // Get all roles
  Future<List<Role>> getAllRoles() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/roles'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Role.fromJson(json)).toList();
      } else {
        throw Exception('Failed to fetch roles: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching roles: $e');
    }
  }

  // Get role by name
  Future<Role> getRoleByName(String roleName) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/roles/by-name/$roleName'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        return Role.fromJson(json.decode(response.body));
      } else if (response.statusCode == 404) {
        throw Exception('Role not found');
      } else {
        throw Exception('Failed to fetch role: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching role: $e');
    }
  }

  // Create role
  Future<Role> createRole(RoleCreateRequest roleData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/roles'),
        headers: headers,
        body: json.encode(roleData.toJson()),
      );

      if (response.statusCode == 201) {
        return Role.fromJson(json.decode(response.body));
      } else if (response.statusCode == 403) {
        throw Exception('Access denied. Admin role required.');
      } else {
        throw Exception('Failed to create role: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error creating role: $e');
    }
  }

  // Update role
  Future<Role> updateRole(int roleId, RoleUpdateRequest updateData) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/api/roles/$roleId'),
        headers: headers,
        body: json.encode(updateData.toJson()),
      );

      if (response.statusCode == 200) {
        return Role.fromJson(json.decode(response.body));
      } else if (response.statusCode == 404) {
        throw Exception('Role not found');
      } else if (response.statusCode == 403) {
        throw Exception('Access denied. Admin role required.');
      } else {
        throw Exception('Failed to update role: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error updating role: $e');
    }
  }

  // Delete role
  Future<bool> deleteRole(int roleId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/api/roles/$roleId'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['success'] ?? false;
      } else if (response.statusCode == 400) {
        final error = json.decode(response.body);
        throw Exception(error['error'] ?? 'Cannot delete system roles');
      } else if (response.statusCode == 404) {
        throw Exception('Role not found');
      } else if (response.statusCode == 403) {
        throw Exception('Access denied. Admin role required.');
      } else {
        throw Exception('Failed to delete role: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error deleting role: $e');
    }
  }
}
```

### 2. Role Model Class

```dart
class Role {
  final int id;
  final int organizationId;
  final String name;
  final String displayName;
  final String description;
  final RolePermissions permissions;
  final bool isSystem;
  final DateTime createdAt;
  final DateTime updatedAt;

  Role({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.displayName,
    required this.description,
    required this.permissions,
    required this.isSystem,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Role.fromJson(Map<String, dynamic> json) {
    return Role(
      id: json['id'],
      organizationId: json['organizationId'],
      name: json['name'],
      displayName: json['displayName'],
      description: json['description'],
      permissions: RolePermissions.fromJson(json['permissions']),
      isSystem: json['isSystem'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'organizationId': organizationId,
      'name': name,
      'displayName': displayName,
      'description': description,
      'permissions': permissions.toJson(),
      'isSystem': isSystem,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class RolePermissions {
  final Map<String, ModulePermission> modules;
  final Map<String, FieldPermission> fields;

  RolePermissions({
    required this.modules,
    required this.fields,
  });

  factory RolePermissions.fromJson(Map<String, dynamic> json) {
    return RolePermissions(
      modules: (json['modules'] as Map<String, dynamic>).map(
        (key, value) => MapEntry(key, ModulePermission.fromJson(value)),
      ),
      fields: (json['fields'] as Map<String, dynamic>).map(
        (key, value) => MapEntry(key, FieldPermission.fromJson(value)),
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'modules': modules.map((key, value) => MapEntry(key, value.toJson())),
      'fields': fields.map((key, value) => MapEntry(key, value.toJson())),
    };
  }
}

class ModulePermission {
  final bool view;
  final bool create;
  final bool edit;
  final bool delete;

  ModulePermission({
    required this.view,
    required this.create,
    required this.edit,
    required this.delete,
  });

  factory ModulePermission.fromJson(Map<String, dynamic> json) {
    return ModulePermission(
      view: json['view'] ?? false,
      create: json['create'] ?? false,
      edit: json['edit'] ?? false,
      delete: json['delete'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'view': view,
      'create': create,
      'edit': edit,
      'delete': delete,
    };
  }
}

class FieldPermission {
  final bool view;
  final bool edit;

  FieldPermission({
    required this.view,
    required this.edit,
  });

  factory FieldPermission.fromJson(Map<String, dynamic> json) {
    return FieldPermission(
      view: json['view'] ?? false,
      edit: json['edit'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'view': view,
      'edit': edit,
    };
  }
}
```

### 3. Role Create/Update Request Models

```dart
class RoleCreateRequest {
  final String name;
  final String displayName;
  final String description;
  final RolePermissions permissions;
  final bool? isSystem;

  RoleCreateRequest({
    required this.name,
    required this.displayName,
    required this.description,
    required this.permissions,
    this.isSystem,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'displayName': displayName,
      'description': description,
      'permissions': permissions.toJson(),
      if (isSystem != null) 'isSystem': isSystem,
    };
  }
}

class RoleUpdateRequest {
  final String? name;
  final String? displayName;
  final String? description;
  final RolePermissions? permissions;

  RoleUpdateRequest({
    this.name,
    this.displayName,
    this.description,
    this.permissions,
  });

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = {};
    if (name != null) data['name'] = name;
    if (displayName != null) data['displayName'] = displayName;
    if (description != null) data['description'] = description;
    if (permissions != null) data['permissions'] = permissions!.toJson();
    return data;
  }
}
```

### 4. Usage Example in Flutter Widget

```dart
class RolesListScreen extends StatefulWidget {
  @override
  _RolesListScreenState createState() => _RolesListScreenState();
}

class _RolesListScreenState extends State<RolesListScreen> {
  late RolesService rolesService;
  List<Role> roles = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    
    // Initialize service with stored credentials
    rolesService = RolesService(
      baseUrl: 'https://your-app-domain.replit.app',
      jwtToken: 'your_jwt_token_here',
      subdomain: 'demo',
    );
    
    loadRoles();
  }

  Future<void> loadRoles() async {
    setState(() => isLoading = true);
    
    try {
      final fetchedRoles = await rolesService.getAllRoles();
      setState(() {
        roles = fetchedRoles;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading roles: $e')),
      );
    }
  }

  Future<void> createNewRole() async {
    try {
      final newRole = RoleCreateRequest(
        name: 'Custom_Role',
        displayName: 'Custom Role',
        description: 'A custom role with specific permissions',
        permissions: RolePermissions(
          modules: {
            'patients': ModulePermission(
              view: true,
              create: false,
              edit: false,
              delete: false,
            ),
          },
          fields: {
            'patientSensitiveInfo': FieldPermission(
              view: true,
              edit: false,
            ),
          },
        ),
      );

      final createdRole = await rolesService.createRole(newRole);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Role created: ${createdRole.displayName}')),
      );
      
      loadRoles(); // Refresh list
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error creating role: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Roles Management'),
        actions: [
          IconButton(
            icon: Icon(Icons.add),
            onPressed: createNewRole,
          ),
        ],
      ),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: roles.length,
              itemBuilder: (context, index) {
                final role = roles[index];
                return ListTile(
                  title: Text(role.displayName),
                  subtitle: Text(role.description),
                  trailing: role.isSystem
                      ? Chip(label: Text('System'))
                      : IconButton(
                          icon: Icon(Icons.delete),
                          onPressed: () => deleteRole(role.id),
                        ),
                );
              },
            ),
    );
  }

  Future<void> deleteRole(int roleId) async {
    try {
      final success = await rolesService.deleteRole(roleId);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Role deleted successfully')),
        );
        loadRoles(); // Refresh list
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error deleting role: $e')),
      );
    }
  }
}
```

---

## ⚠️ Error Handling

### Common Error Codes

| Status Code | Description | Solution |
|-------------|-------------|----------|
| 200 | Success | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Check request payload format |
| 401 | Unauthorized | Invalid or missing JWT token |
| 403 | Forbidden | Insufficient permissions (Admin role required) |
| 404 | Not Found | Role does not exist |
| 500 | Server Error | Internal server error |

### Error Response Format

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

### Flutter Error Handling Example

```dart
try {
  final roles = await rolesService.getAllRoles();
  // Handle success
} on Exception catch (e) {
  if (e.toString().contains('401')) {
    // Token expired - redirect to login
    Navigator.pushReplacementNamed(context, '/login');
  } else if (e.toString().contains('403')) {
    // Insufficient permissions
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Access Denied'),
        content: Text('You need admin permissions to perform this action.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
        ],
      ),
    );
  } else {
    // General error
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Error: ${e.toString()}')),
    );
  }
}
```

---

## 📝 Notes

1. **System Roles**: Roles with `isSystem: true` cannot be deleted
2. **Admin Permission**: Creating, updating, and deleting roles requires admin role
3. **Multi-Tenancy**: All roles are organization-scoped using the subdomain header
4. **Token Expiration**: JWT tokens expire after 7 days - implement token refresh logic
5. **Permissions Structure**: 
   - **Modules**: Feature-level permissions (view, create, edit, delete)
   - **Fields**: Data-level permissions (view, edit)

---

## 🔗 Related Endpoints

- **Users API**: `/api/users` - Manage users with assigned roles
- **Authentication**: `/api/auth/login` - Get JWT token
- **Organizations**: `/api/organizations` - Manage organization settings

---

**Last Updated:** October 17, 2025  
**Contact:** support@curaemr.ai
