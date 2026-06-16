import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "cura-jwt-secret-2025-9f8e7d6c5b4a3e2f1a9b8c7d6e5f4a3b2c1d0e9f8g7h6i5j4k3l2m1n0o9p8q7r6s5t4u3v2w1x0y9z8";
const SALT_ROUNDS = 12;

export interface AuthTokenPayload {
  userId: number;
  organizationId: number;
  email: string;
  role: string;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  generateToken(user: User): string {
    // Warn if JWT_SECRET is not configured
    if (!process.env.JWT_SECRET) {
      console.warn("⚠️ [AUTH] JWT_SECRET not set in .env - using default fallback. Add JWT_SECRET to .env!");
    }

    const payload: AuthTokenPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { 
      expiresIn: "7d", // Extended to 7 days for development
      issuer: "medicore-emr",
      audience: "medicore-users"
    });

    console.log("🔐 [AUTH] Token generated:", {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      tokenLength: token.length,
      jwtSecretConfigured: !!process.env.JWT_SECRET,
    });

    return token;
  }

  verifyToken(token: string): AuthTokenPayload | null {
    try {
      // Check if JWT_SECRET is configured
      if (!process.env.JWT_SECRET && JWT_SECRET === "cura-jwt-secret-2025-9f8e7d6c5b4a3e2f1a9b8c7d6e5f4a3b2c1d0e9f8g7h6i5j4k3l2m1n0o9p8q7r6s5t4u3v2w1x0y9z8") {
        console.warn("⚠️ JWT_SECRET not set in .env - using default fallback. This may cause token validation issues!");
      }

      const payload = jwt.verify(token, JWT_SECRET, {
        issuer: "medicore-emr",
        audience: "medicore-users"
      }) as AuthTokenPayload;
      
      return payload;
    } catch (error: any) {
      console.error("❌ Token verification failed:", {
        message: error.message,
        name: error.name,
        jwtSecretSet: !!process.env.JWT_SECRET,
        jwtSecretLength: JWT_SECRET.length,
      });
      
      // Provide more specific error information
      if (error.name === 'JsonWebTokenError') {
        console.error("   → Token format is invalid or secret mismatch");
      } else if (error.name === 'TokenExpiredError') {
        console.error("   → Token has expired");
      } else if (error.name === 'NotBeforeError') {
        console.error("   → Token not active yet");
      }
      
      return null;
    }
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }

  hasPermission(userRole: string | undefined | null, requiredRoles: string[]): boolean {
    if (!userRole) return false;
    const normalizedRole = userRole.toLowerCase();
    if (normalizedRole === "patient") {
      return true;
    }
    return requiredRoles.map(r => r.toLowerCase()).includes(normalizedRole);
  }

  checkGDPRCompliance(organizationRegion: string): {
    gdprRequired: boolean;
    dataResidencyRules: string[];
    retentionPeriod: number; // in days
  } {
    switch (organizationRegion) {
      case "UK":
      case "EU":
        return {
          gdprRequired: true,
          dataResidencyRules: ["EU_ONLY", "ENCRYPTION_REQUIRED", "AUDIT_TRAIL"],
          retentionPeriod: 2555 // 7 years for medical records
        };
      case "ME":
      case "SA":
        return {
          gdprRequired: false,
          dataResidencyRules: ["REGIONAL_STORAGE", "ENCRYPTION_REQUIRED"],
          retentionPeriod: 3650 // 10 years
        };
      case "US":
        return {
          gdprRequired: false,
          dataResidencyRules: ["HIPAA_COMPLIANCE", "ENCRYPTION_REQUIRED"],
          retentionPeriod: 2555 // 7 years
        };
      default:
        return {
          gdprRequired: true,
          dataResidencyRules: ["ENCRYPTION_REQUIRED"],
          retentionPeriod: 2555
        };
    }
  }
}

export const authService = new AuthService();
