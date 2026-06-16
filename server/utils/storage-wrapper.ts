import type { IStorage } from "../storage";
import { validateApiAccess, withOrganizationId, withOrganizationFilter } from "./tenant-validator";

/**
 * Multi-Tenant Storage Wrapper
 * Automatically enforces organization-level data isolation for all storage operations
 */

export class MultiTenantStorageWrapper {
  constructor(private storage: IStorage) {}

  /**
   * Wrapper for create operations - automatically injects organizationId
   */
  async createWithTenantIsolation<T extends Record<string, any>, R>(
    createFn: (data: T & { organizationId: number }) => Promise<R>,
    data: T,
    organizationId: number,
    userId?: number
  ): Promise<R> {
    // Validate tenant access if userId provided
    if (userId) {
      const validation = await validateApiAccess(userId, organizationId);
      if (!validation.isValid) {
        throw new Error(`Tenant validation failed: ${validation.errors?.join(', ')}`);
      }
    }

    // Inject organizationId and execute
    const dataWithOrgId = withOrganizationId(data, organizationId);
    console.log(`[MULTI-TENANT-STORAGE] Creating resource for organization ${organizationId}`);
    
    return await createFn(dataWithOrgId);
  }

  /**
   * Wrapper for read operations - automatically filters by organizationId
   */
  async readWithTenantIsolation<R>(
    readFn: (organizationId: number) => Promise<R>,
    organizationId: number,
    userId?: number
  ): Promise<R> {
    // Validate tenant access if userId provided
    if (userId) {
      const validation = await validateApiAccess(userId, organizationId);
      if (!validation.isValid) {
        throw new Error(`Tenant validation failed: ${validation.errors?.join(', ')}`);
      }
    }

    console.log(`[MULTI-TENANT-STORAGE] Reading resources for organization ${organizationId}`);
    return await readFn(organizationId);
  }

  /**
   * Wrapper for update operations - validates resource ownership and injects organizationId
   */
  async updateWithTenantIsolation<T extends Record<string, any>, R>(
    updateFn: (id: number, organizationId: number, data: T) => Promise<R>,
    id: number,
    data: T,
    organizationId: number,
    userId?: number
  ): Promise<R> {
    // Validate tenant access if userId provided
    if (userId) {
      const validation = await validateApiAccess(userId, organizationId);
      if (!validation.isValid) {
        throw new Error(`Tenant validation failed: ${validation.errors?.join(', ')}`);
      }
    }

    console.log(`[MULTI-TENANT-STORAGE] Updating resource ${id} for organization ${organizationId}`);
    return await updateFn(id, organizationId, data);
  }

  /**
   * Wrapper for delete operations - validates resource ownership
   */
  async deleteWithTenantIsolation(
    deleteFn: (id: number, organizationId: number) => Promise<boolean>,
    id: number,
    organizationId: number,
    userId?: number
  ): Promise<boolean> {
    // Validate tenant access if userId provided
    if (userId) {
      const validation = await validateApiAccess(userId, organizationId);
      if (!validation.isValid) {
        throw new Error(`Tenant validation failed: ${validation.errors?.join(', ')}`);
      }
    }

    console.log(`[MULTI-TENANT-STORAGE] Deleting resource ${id} for organization ${organizationId}`);
    return await deleteFn(id, organizationId);
  }

  // Tenant-aware patient operations
  async getPatient(id: number, organizationId: number, userId?: number) {
    return this.readWithTenantIsolation(
      (orgId) => this.storage.getPatient(id, orgId),
      organizationId,
      userId
    );
  }

  async getPatientsByOrganization(organizationId: number, userId?: number, limit?: number) {
    return this.readWithTenantIsolation(
      (orgId) => this.storage.getPatientsByOrganization(orgId, limit),
      organizationId,
      userId
    );
  }

  async createPatient(patient: any, organizationId: number, userId?: number) {
    return this.createWithTenantIsolation(
      (data) => this.storage.createPatient(data),
      patient,
      organizationId,
      userId
    );
  }

  async updatePatient(id: number, updates: any, organizationId: number, userId?: number) {
    return this.updateWithTenantIsolation(
      (id, orgId, data) => this.storage.updatePatient(id, orgId, data),
      id,
      updates,
      organizationId,
      userId
    );
  }

  // Tenant-aware user operations
  async getUser(id: number, organizationId: number, userId?: number) {
    return this.readWithTenantIsolation(
      (orgId) => this.storage.getUser(id, orgId),
      organizationId,
      userId
    );
  }

  async getUsersByOrganization(organizationId: number, userId?: number) {
    return this.readWithTenantIsolation(
      (orgId) => this.storage.getUsersByOrganization(orgId),
      organizationId,
      userId
    );
  }

  async createUser(user: any, organizationId: number, userId?: number) {
    return this.createWithTenantIsolation(
      (data) => this.storage.createUser(data),
      user,
      organizationId,
      userId
    );
  }

  async updateUser(id: number, updates: any, organizationId: number, userId?: number) {
    return this.updateWithTenantIsolation(
      (id, orgId, data) => this.storage.updateUser(id, orgId, data),
      id,
      updates,
      organizationId,
      userId
    );
  }

  // Tenant-aware appointment operations
  async getAppointmentsByOrganization(organizationId: number, userId?: number, date?: Date) {
    return this.readWithTenantIsolation(
      (orgId) => this.storage.getAppointmentsByOrganization(orgId, date),
      organizationId,
      userId
    );
  }

  async createAppointment(appointment: any, organizationId: number, userId?: number) {
    return this.createWithTenantIsolation(
      (data) => this.storage.createAppointment(data),
      appointment,
      organizationId,
      userId
    );
  }

  async updateAppointment(id: number, updates: any, organizationId: number, userId?: number) {
    return this.updateWithTenantIsolation(
      (id, orgId, data) => this.storage.updateAppointment(id, orgId, data),
      id,
      updates,
      organizationId,
      userId
    );
  }

  // Tenant-aware medical record operations
  async getMedicalRecordsByPatient(patientId: number, organizationId: number, userId?: number) {
    return this.readWithTenantIsolation(
      (orgId) => this.storage.getMedicalRecordsByPatient(patientId, orgId),
      organizationId,
      userId
    );
  }

  async createMedicalRecord(record: any, organizationId: number, userId?: number) {
    return this.createWithTenantIsolation(
      (data) => this.storage.createMedicalRecord(data),
      record,
      organizationId,
      userId
    );
  }

  async updateMedicalRecord(id: number, updates: any, organizationId: number, userId?: number) {
    return this.updateWithTenantIsolation(
      (id, orgId, data) => this.storage.updateMedicalRecord(id, orgId, data),
      id,
      updates,
      organizationId,
      userId
    );
  }

  // Tenant-aware prescription operations
  async getPrescriptionsByOrganization(organizationId: number, userId?: number) {
    return this.readWithTenantIsolation(
      (orgId) => this.storage.getPrescriptionsByOrganization(orgId),
      organizationId,
      userId
    );
  }

  async createPrescription(prescription: any, organizationId: number, userId?: number) {
    return this.createWithTenantIsolation(
      (data) => this.storage.createPrescription(data),
      prescription,
      organizationId,
      userId
    );
  }

  async updatePrescription(id: number, updates: any, organizationId: number, userId?: number) {
    return this.updateWithTenantIsolation(
      (id, orgId, data) => this.storage.updatePrescription(id, orgId, data),
      id,
      updates,
      organizationId,
      userId
    );
  }
}

/**
 * Create a tenant-aware storage instance
 */
export function createTenantAwareStorage(storage: IStorage): MultiTenantStorageWrapper {
  return new MultiTenantStorageWrapper(storage);
}