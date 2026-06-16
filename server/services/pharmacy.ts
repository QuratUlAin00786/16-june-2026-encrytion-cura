import { db } from "../db";
import { eq, and, gte, lte, desc, sql, or, isNull, count } from "drizzle-orm";
import {
  pharmacyUserSessions,
  pharmacyActivityLogs,
  pharmacyShiftClosings,
  pharmacyDashboardSnapshots,
  pharmacyRolePermissions,
  inventorySales,
  inventoryReturns,
  inventoryItems,
  inventoryBatches,
  inventoryStockAlerts,
  users,
  type InsertPharmacyUserSession,
  type InsertPharmacyActivityLog,
  type InsertPharmacyShiftClosing,
  type InsertPharmacyDashboardSnapshot,
  type InsertPharmacyRolePermission,
} from "@shared/schema";
import { nanoid } from "nanoid";

export class PharmacyService {
  // ====== PHARMACY SESSION MANAGEMENT ======

  async createSession(data: Omit<InsertPharmacyUserSession, 'sessionToken' | 'expiresAt'>) {
    const sessionToken = nanoid(64);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    const [session] = await db
      .insert(pharmacyUserSessions)
      .values({
        ...data,
        sessionToken,
        expiresAt,
        lastActivityAt: new Date(),
      })
      .returning();

    return session;
  }

  async getSessionByToken(token: string) {
    const [session] = await db
      .select()
      .from(pharmacyUserSessions)
      .where(and(
        eq(pharmacyUserSessions.sessionToken, token),
        eq(pharmacyUserSessions.isActive, true),
        gte(pharmacyUserSessions.expiresAt, new Date())
      ))
      .limit(1);

    return session;
  }

  async updateSessionActivity(sessionId: number) {
    await db
      .update(pharmacyUserSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(pharmacyUserSessions.id, sessionId));
  }

  async endSession(sessionId: number) {
    await db
      .update(pharmacyUserSessions)
      .set({ 
        isActive: false, 
        logoutAt: new Date() 
      })
      .where(eq(pharmacyUserSessions.id, sessionId));
  }

  async endAllUserSessions(userId: number, organizationId: number) {
    await db
      .update(pharmacyUserSessions)
      .set({ 
        isActive: false, 
        logoutAt: new Date() 
      })
      .where(and(
        eq(pharmacyUserSessions.userId, userId),
        eq(pharmacyUserSessions.organizationId, organizationId),
        eq(pharmacyUserSessions.isActive, true)
      ));
  }

  // ====== ACTIVITY LOGGING ======

  async logActivity(data: InsertPharmacyActivityLog) {
    const [log] = await db
      .insert(pharmacyActivityLogs)
      .values(data)
      .returning();

    return log;
  }

  async getActivityLogs(organizationId: number, filters?: {
    userId?: number;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    let query = db
      .select({
        log: pharmacyActivityLogs,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(pharmacyActivityLogs)
      .leftJoin(users, eq(pharmacyActivityLogs.userId, users.id))
      .where(eq(pharmacyActivityLogs.organizationId, organizationId))
      .orderBy(desc(pharmacyActivityLogs.timestamp))
      .$dynamic();

    if (filters?.userId) {
      query = query.where(eq(pharmacyActivityLogs.userId, filters.userId));
    }
    if (filters?.action) {
      query = query.where(eq(pharmacyActivityLogs.action, filters.action));
    }
    if (filters?.entityType) {
      query = query.where(eq(pharmacyActivityLogs.entityType, filters.entityType));
    }
    if (filters?.startDate) {
      query = query.where(gte(pharmacyActivityLogs.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      query = query.where(lte(pharmacyActivityLogs.timestamp, filters.endDate));
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return await query;
  }

  // ====== SHIFT MANAGEMENT ======

  async startShift(data: Omit<InsertPharmacyShiftClosing, 'status' | 'shiftEndTime'>) {
    // Check if there's already an open shift for this pharmacist
    const existingShift = await this.getOpenShift(data.organizationId, data.pharmacistId);
    if (existingShift) {
      throw new Error("There is already an open shift. Please close it before starting a new one.");
    }

    const [shift] = await db
      .insert(pharmacyShiftClosings)
      .values({
        ...data,
        status: "open",
      })
      .returning();

    return shift;
  }

  async getOpenShift(organizationId: number, pharmacistId: number) {
    const [shift] = await db
      .select()
      .from(pharmacyShiftClosings)
      .where(and(
        eq(pharmacyShiftClosings.organizationId, organizationId),
        eq(pharmacyShiftClosings.pharmacistId, pharmacistId),
        eq(pharmacyShiftClosings.status, "open")
      ))
      .limit(1);

    return shift;
  }

  async getShift(shiftId: number) {
    const [shift] = await db
      .select()
      .from(pharmacyShiftClosings)
      .where(eq(pharmacyShiftClosings.id, shiftId))
      .limit(1);

    return shift;
  }

  async closeShift(shiftId: number, closingData: {
    closingCash: string;
    discrepancyNotes?: string;
    notes?: string;
  }) {
    const shift = await this.getShift(shiftId);
    if (!shift) {
      throw new Error("Shift not found");
    }

    // Calculate shift totals
    const shiftStartTime = shift.shiftStartTime;
    const shiftEndTime = new Date();

    // Get sales totals for this shift
    const salesData = await db
      .select({
        totalCount: count(),
        totalAmount: sql<string>`COALESCE(SUM(total_amount), 0)`,
        cashSales: sql<string>`COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0)`,
        cardSales: sql<string>`COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0)`,
        insuranceSales: sql<string>`COALESCE(SUM(CASE WHEN payment_method = 'insurance' THEN total_amount ELSE 0 END), 0)`,
        creditSales: sql<string>`COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total_amount ELSE 0 END), 0)`,
      })
      .from(inventorySales)
      .where(and(
        eq(inventorySales.shiftId, shiftId),
        eq(inventorySales.status, "completed")
      ));

    // Get returns totals for this shift
    const returnsData = await db
      .select({
        totalCount: count(),
        totalAmount: sql<string>`COALESCE(SUM(total_amount), 0)`,
      })
      .from(inventoryReturns)
      .where(and(
        eq(inventoryReturns.shiftId, shiftId),
        eq(inventoryReturns.status, "completed")
      ));

    const sales = salesData[0] || { totalCount: 0, totalAmount: "0", cashSales: "0", cardSales: "0", insuranceSales: "0", creditSales: "0" };
    const returns = returnsData[0] || { totalCount: 0, totalAmount: "0" };

    const expectedCash = parseFloat(shift.openingCash || "0") + 
                         parseFloat(sales.cashSales) - 
                         parseFloat(returns.totalAmount);
    const actualCash = parseFloat(closingData.closingCash);
    const discrepancy = actualCash - expectedCash;

    const [updatedShift] = await db
      .update(pharmacyShiftClosings)
      .set({
        shiftEndTime,
        status: "closed",
        totalSalesCount: typeof sales.totalCount === 'number' ? sales.totalCount : parseInt(String(sales.totalCount)),
        totalSalesAmount: sales.totalAmount,
        totalReturnsCount: typeof returns.totalCount === 'number' ? returns.totalCount : parseInt(String(returns.totalCount)),
        totalReturnsAmount: returns.totalAmount,
        cashSales: sales.cashSales,
        cardSales: sales.cardSales,
        insuranceSales: sales.insuranceSales,
        creditSales: sales.creditSales,
        closingCash: closingData.closingCash,
        expectedCash: expectedCash.toFixed(2),
        cashDiscrepancy: discrepancy.toFixed(2),
        discrepancyNotes: closingData.discrepancyNotes,
        notes: closingData.notes,
        updatedAt: new Date(),
      })
      .where(eq(pharmacyShiftClosings.id, shiftId))
      .returning();

    return updatedShift;
  }

  async approveShift(shiftId: number, approverId: number, approvalNotes?: string) {
    const [updatedShift] = await db
      .update(pharmacyShiftClosings)
      .set({
        approvedBy: approverId,
        approvedAt: new Date(),
        approvalNotes,
        updatedAt: new Date(),
      })
      .where(eq(pharmacyShiftClosings.id, shiftId))
      .returning();

    return updatedShift;
  }

  async getShiftHistory(organizationId: number, filters?: {
    pharmacistId?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }) {
    let conditions = [eq(pharmacyShiftClosings.organizationId, organizationId)];

    if (filters?.pharmacistId) {
      conditions.push(eq(pharmacyShiftClosings.pharmacistId, filters.pharmacistId));
    }
    if (filters?.startDate) {
      conditions.push(gte(pharmacyShiftClosings.shiftDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(pharmacyShiftClosings.shiftDate, filters.endDate));
    }
    if (filters?.status) {
      conditions.push(eq(pharmacyShiftClosings.status, filters.status));
    }

    return await db
      .select({
        shift: pharmacyShiftClosings,
        pharmacist: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(pharmacyShiftClosings)
      .leftJoin(users, eq(pharmacyShiftClosings.pharmacistId, users.id))
      .where(and(...conditions))
      .orderBy(desc(pharmacyShiftClosings.shiftDate));
  }

  // ====== DASHBOARD METRICS ======

  async getDashboardSummary(organizationId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales
    const todaySales = await db
      .select({
        totalCount: count(),
        totalAmount: sql<string>`COALESCE(SUM(total_amount), 0)`,
      })
      .from(inventorySales)
      .where(and(
        eq(inventorySales.organizationId, organizationId),
        gte(inventorySales.saleDate, today),
        lte(inventorySales.saleDate, tomorrow),
        eq(inventorySales.status, "completed")
      ));

    // Today's returns - include all statuses (pending, pending_approval, completed)
    // Use returnDate for date filter since that's when the return was made
    const todayReturns = await db
      .select({
        totalCount: count(),
        totalAmount: sql<string>`COALESCE(SUM(total_amount), 0)`,
      })
      .from(inventoryReturns)
      .where(and(
        eq(inventoryReturns.organizationId, organizationId),
        gte(inventoryReturns.returnDate, today),
        lte(inventoryReturns.returnDate, tomorrow)
      ));

    // Low stock items
    const lowStockItems = await db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        sku: inventoryItems.sku,
        currentStock: inventoryItems.currentStock,
        minimumStock: inventoryItems.minimumStock,
        reorderPoint: inventoryItems.reorderPoint,
      })
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.organizationId, organizationId),
        eq(inventoryItems.isActive, true),
        sql`current_stock <= reorder_point`
      ))
      .limit(20);

    // Near expiry items (within 90 days)
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const nearExpiryItems = await db
      .select({
        id: inventoryBatches.id,
        itemId: inventoryBatches.itemId,
        batchNumber: inventoryBatches.batchNumber,
        expiryDate: inventoryBatches.expiryDate,
        remainingQuantity: inventoryBatches.remainingQuantity,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
      })
      .from(inventoryBatches)
      .innerJoin(inventoryItems, eq(inventoryBatches.itemId, inventoryItems.id))
      .where(and(
        eq(inventoryItems.organizationId, organizationId),
        lte(inventoryBatches.expiryDate, ninetyDaysFromNow),
        gte(inventoryBatches.expiryDate, today),
        sql`remaining_quantity > 0`
      ))
      .orderBy(inventoryBatches.expiryDate)
      .limit(20);

    // Pending insurance bills
    const pendingInsurance = await db
      .select({
        totalCount: count(),
        totalAmount: sql<string>`COALESCE(SUM(insurance_amount), 0)`,
      })
      .from(inventorySales)
      .where(and(
        eq(inventorySales.organizationId, organizationId),
        eq(inventorySales.paymentMethod, "insurance"),
        eq(inventorySales.paymentStatus, "pending")
      ));

    // Pending credit bills
    const pendingCredit = await db
      .select({
        totalCount: count(),
        totalAmount: sql<string>`COALESCE(SUM(amount_due), 0)`,
      })
      .from(inventorySales)
      .where(and(
        eq(inventorySales.organizationId, organizationId),
        eq(inventorySales.paymentMethod, "credit"),
        sql`amount_due > 0`
      ));

    return {
      todaySales: {
        count: todaySales[0]?.totalCount || 0,
        amount: parseFloat(todaySales[0]?.totalAmount || "0"),
      },
      todayReturns: {
        count: todayReturns[0]?.totalCount || 0,
        amount: parseFloat(todayReturns[0]?.totalAmount || "0"),
      },
      lowStockItems,
      nearExpiryItems,
      pendingInsurance: {
        count: pendingInsurance[0]?.totalCount || 0,
        amount: parseFloat(pendingInsurance[0]?.totalAmount || "0"),
      },
      pendingCredit: {
        count: pendingCredit[0]?.totalCount || 0,
        amount: parseFloat(pendingCredit[0]?.totalAmount || "0"),
      },
    };
  }

  // ====== REPORTS ======

  async getDailySalesReport(organizationId: number, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await db
      .select()
      .from(inventorySales)
      .where(and(
        eq(inventorySales.organizationId, organizationId),
        gte(inventorySales.saleDate, startOfDay),
        lte(inventorySales.saleDate, endOfDay),
        eq(inventorySales.status, "completed")
      ))
      .orderBy(desc(inventorySales.saleDate));

    // Aggregate by payment method
    const paymentSummary = await db
      .select({
        paymentMethod: inventorySales.paymentMethod,
        count: count(),
        totalAmount: sql<string>`COALESCE(SUM(total_amount), 0)`,
      })
      .from(inventorySales)
      .where(and(
        eq(inventorySales.organizationId, organizationId),
        gte(inventorySales.saleDate, startOfDay),
        lte(inventorySales.saleDate, endOfDay),
        eq(inventorySales.status, "completed")
      ))
      .groupBy(inventorySales.paymentMethod);

    return {
      date,
      sales,
      paymentSummary,
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0),
    };
  }

  async getReturnSummaryReport(organizationId: number, startDate: Date, endDate: Date) {
    const returns = await db
      .select()
      .from(inventoryReturns)
      .where(and(
        eq(inventoryReturns.organizationId, organizationId),
        gte(inventoryReturns.createdAt, startDate),
        lte(inventoryReturns.createdAt, endDate)
      ))
      .orderBy(desc(inventoryReturns.createdAt));

    // Aggregate by reason
    const reasonSummary = await db
      .select({
        returnReason: inventoryReturns.returnReason,
        count: count(),
        totalAmount: sql<string>`COALESCE(SUM(total_amount), 0)`,
      })
      .from(inventoryReturns)
      .where(and(
        eq(inventoryReturns.organizationId, organizationId),
        gte(inventoryReturns.createdAt, startDate),
        lte(inventoryReturns.createdAt, endDate)
      ))
      .groupBy(inventoryReturns.returnReason);

    return {
      startDate,
      endDate,
      returns,
      reasonSummary,
      totalReturns: returns.length,
      totalAmount: returns.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0),
    };
  }

  async getItemWiseSalesReport(organizationId: number, startDate: Date, endDate: Date) {
    const itemSales = await db.execute(sql`
      SELECT 
        ii.id as item_id,
        ii.name as item_name,
        ii.sku,
        ii.brand_name,
        SUM(isi.quantity) as total_quantity_sold,
        SUM(isi.total_price) as total_sales_amount,
        COUNT(DISTINCT is2.id) as number_of_sales
      FROM inventory_sale_items isi
      JOIN inventory_items ii ON isi.item_id = ii.id
      JOIN inventory_sales is2 ON isi.sale_id = is2.id
      WHERE ii.organization_id = ${organizationId}
        AND is2.sale_date >= ${startDate}
        AND is2.sale_date <= ${endDate}
        AND is2.status = 'completed'
      GROUP BY ii.id, ii.name, ii.sku, ii.brand_name
      ORDER BY total_quantity_sold DESC
    `);

    return itemSales.rows;
  }

  async getPharmacistActivityReport(organizationId: number, startDate: Date, endDate: Date) {
    const activities = await db
      .select({
        pharmacistId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        salesCount: sql<number>`COUNT(DISTINCT CASE WHEN ${pharmacyActivityLogs.action} = 'sale_completed' THEN ${pharmacyActivityLogs.id} END)`,
        returnsCount: sql<number>`COUNT(DISTINCT CASE WHEN ${pharmacyActivityLogs.action} = 'return_completed' THEN ${pharmacyActivityLogs.id} END)`,
        totalActions: count(),
      })
      .from(pharmacyActivityLogs)
      .innerJoin(users, eq(pharmacyActivityLogs.userId, users.id))
      .where(and(
        eq(pharmacyActivityLogs.organizationId, organizationId),
        gte(pharmacyActivityLogs.timestamp, startDate),
        lte(pharmacyActivityLogs.timestamp, endDate)
      ))
      .groupBy(users.id, users.firstName, users.lastName, users.email)
      .orderBy(desc(sql`COUNT(*)`));

    return activities;
  }

  // ====== PERMISSIONS ======

  async getPermissions(organizationId: number, roleName: string) {
    return await db
      .select()
      .from(pharmacyRolePermissions)
      .where(and(
        eq(pharmacyRolePermissions.organizationId, organizationId),
        eq(pharmacyRolePermissions.roleName, roleName),
        eq(pharmacyRolePermissions.isEnabled, true)
      ));
  }

  async hasPermission(organizationId: number, roleName: string, permissionKey: string): Promise<boolean> {
    const [permission] = await db
      .select()
      .from(pharmacyRolePermissions)
      .where(and(
        eq(pharmacyRolePermissions.organizationId, organizationId),
        eq(pharmacyRolePermissions.roleName, roleName),
        eq(pharmacyRolePermissions.permissionKey, permissionKey),
        eq(pharmacyRolePermissions.isEnabled, true)
      ))
      .limit(1);

    return !!permission;
  }

  async setPermission(data: InsertPharmacyRolePermission) {
    const existing = await db
      .select()
      .from(pharmacyRolePermissions)
      .where(and(
        eq(pharmacyRolePermissions.organizationId, data.organizationId),
        eq(pharmacyRolePermissions.roleName, data.roleName),
        eq(pharmacyRolePermissions.permissionKey, data.permissionKey)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(pharmacyRolePermissions)
        .set({ 
          isEnabled: data.isEnabled,
          updatedAt: new Date() 
        })
        .where(eq(pharmacyRolePermissions.id, existing[0].id))
        .returning();
      return updated;
    }

    const [permission] = await db
      .insert(pharmacyRolePermissions)
      .values(data)
      .returning();

    return permission;
  }

  // ====== INVOICE MANAGEMENT ======

  async getSalesInvoices(organizationId: number, filters?: {
    startDate?: Date;
    endDate?: Date;
    patientId?: number;
    invoiceNumber?: string;
    status?: string;
  }) {
    let conditions = [eq(inventorySales.organizationId, organizationId)];

    if (filters?.startDate) {
      conditions.push(gte(inventorySales.saleDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(inventorySales.saleDate, filters.endDate));
    }
    if (filters?.patientId) {
      conditions.push(eq(inventorySales.patientId, filters.patientId));
    }
    if (filters?.invoiceNumber) {
      conditions.push(sql`invoice_number ILIKE ${`%${filters.invoiceNumber}%`}`);
    }
    if (filters?.status) {
      conditions.push(eq(inventorySales.status, filters.status));
    }

    return await db
      .select()
      .from(inventorySales)
      .where(and(...conditions))
      .orderBy(desc(inventorySales.saleDate));
  }

  async getReturnInvoices(organizationId: number, filters?: {
    startDate?: Date;
    endDate?: Date;
    returnType?: string;
    status?: string;
  }) {
    let conditions = [eq(inventoryReturns.organizationId, organizationId)];

    if (filters?.startDate) {
      conditions.push(gte(inventoryReturns.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(inventoryReturns.createdAt, filters.endDate));
    }
    if (filters?.returnType) {
      conditions.push(eq(inventoryReturns.returnType, filters.returnType));
    }
    if (filters?.status) {
      conditions.push(eq(inventoryReturns.status, filters.status));
    }

    return await db
      .select()
      .from(inventoryReturns)
      .where(and(...conditions))
      .orderBy(desc(inventoryReturns.createdAt));
  }
}

export const pharmacyService = new PharmacyService();
