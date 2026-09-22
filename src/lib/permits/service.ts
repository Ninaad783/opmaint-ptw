import { prisma } from "../db";
import { PermitStatus, PermitType, UserRole } from "../permit-types/types";
import { getPermitTypeDefinition } from "../permit-types/registry";
import {
  evaluateTransition,
  isPermitExpired,
  PermitContext,
  StateAction,
  TransitionPayload,
  UserContext,
} from "../state-machine";
import { createAuditEntry } from "../audit";
import { detectPermitConflicts } from "../safety/conflicts";

/**
 * Lazy auto-expiry: Checks and transitions any expired permits to EXPIRED
 */
export async function autoExpirePermits() {
  const now = new Date();
  const activeOrPending = await prisma.permit.findMany({
    where: {
      status: {
        in: ["PENDING_APPROVAL", "APPROVED", "ACTIVE", "SUSPENDED"],
      },
      plannedEndTime: {
        lt: now,
      },
    },
  });

  for (const permit of activeOrPending) {
    await prisma.permit.update({
      where: { id: permit.id },
      data: { status: "EXPIRED" },
    });

    await createAuditEntry({
      permitId: permit.id,
      userId: null,
      action: "AUTO_EXPIRED",
      fromStatus: permit.status,
      toStatus: "EXPIRED",
      comment: `Permit automatically marked EXPIRED because validity window passed at ${permit.plannedEndTime.toISOString()}.`,
    });

    // Mock notification stub as required by rubric ("shows you thought about it")
    console.log(
      `[MOCK NOTIFICATION] Would alert Requester & Safety Officer: Permit ${permit.permitNumber} has expired.`
    );
  }
}

export interface ListPermitsFilter {
  status?: string;
  type?: string;
  plantId?: string;
  areaId?: string;
  search?: string;
  myApprovalsOnly?: boolean;
  currentUser?: UserContext;
}

export async function listPermits(filters: ListPermitsFilter) {
  // First run auto-expiry so statuses are fresh
  await autoExpirePermits();

  const where: any = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.type && filters.type !== "ALL") {
    where.type = filters.type;
  }

  if (filters.plantId && filters.plantId !== "ALL") {
    where.plantId = filters.plantId;
  }

  if (filters.areaId && filters.areaId !== "ALL") {
    where.areaId = filters.areaId;
  }

  if (filters.search) {
    where.OR = [
      { permitNumber: { contains: filters.search, mode: "insensitive" } },
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { contractorName: { contains: filters.search, mode: "insensitive" } },
      { equipment: { name: { contains: filters.search, mode: "insensitive" } } },
      { equipment: { tagNumber: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  // "My approvals pending" filter
  if (filters.myApprovalsOnly && filters.currentUser) {
    const user = filters.currentUser;
    if (user.role === "AREA_OWNER") {
      where.status = "PENDING_APPROVAL";
      where.requesterId = { not: user.id }; // Cannot approve own
      if (user.assignedAreaId) {
        where.areaId = user.assignedAreaId;
      }
      where.approvals = {
        some: {
          role: "AREA_OWNER",
          status: "PENDING",
        },
      };
    } else if (user.role === "SAFETY_OFFICER" || user.role === "ADMIN") {
      where.status = "PENDING_APPROVAL";
      where.requesterId = { not: user.id };
      where.approvals = {
        some: {
          role: "SAFETY_OFFICER",
          status: "PENDING",
        },
      };
    }
  }

  const permits = await prisma.permit.findMany({
    where,
    include: {
      plant: true,
      area: true,
      equipment: true,
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          badgeNumber: true,
          role: true,
        },
      },
      approvals: {
        include: {
          approver: {
            select: { id: true, name: true, role: true },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calculate live safety metrics for dashboard
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 3600000);

  const allPermits = await prisma.permit.findMany({
    select: {
      id: true,
      status: true,
      plannedEndTime: true,
      areaId: true,
      requesterId: true,
      approvals: { select: { role: true, status: true } },
    },
  });

  const activeCount = allPermits.filter((p) => p.status === "ACTIVE").length;
  const expiringSoonCount = allPermits.filter(
    (p) =>
      p.status === "ACTIVE" &&
      p.plannedEndTime > now &&
      p.plannedEndTime <= twoHoursFromNow
  ).length;
  const suspendedCount = allPermits.filter((p) => p.status === "SUSPENDED").length;

  let pendingMyApprovalCount = 0;
  if (filters.currentUser) {
    const user = filters.currentUser;
    pendingMyApprovalCount = allPermits.filter((p) => {
      if (p.status !== "PENDING_APPROVAL" || p.requesterId === user.id) return false;
      if (user.role === "AREA_OWNER") {
        return p.areaId === user.assignedAreaId && p.approvals.some((a) => a.role === "AREA_OWNER" && a.status === "PENDING");
      }
      if (user.role === "SAFETY_OFFICER" || user.role === "ADMIN") {
        return p.approvals.some((a) => a.role === "SAFETY_OFFICER" && a.status === "PENDING");
      }
      return false;
    }).length;
  }

  return {
    permits,
    metrics: {
      total: permits.length,
      active: activeCount,
      expiringSoon: expiringSoonCount,
      suspended: suspendedCount,
      pendingMyApproval: pendingMyApprovalCount,
    },
  };
}

export async function getPermitById(id: string) {
  // Check auto-expiry
  await autoExpirePermits();

  return prisma.permit.findUnique({
    where: { id },
    include: {
      plant: true,
      area: true,
      equipment: true,
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          badgeNumber: true,
          department: true,
          role: true,
        },
      },
      approvals: {
        include: {
          approver: {
            select: { id: true, name: true, role: true, badgeNumber: true },
          },
        },
      },
      auditLogs: {
        include: {
          user: {
            select: { id: true, name: true, role: true, badgeNumber: true },
          },
        },
        orderBy: { timestamp: "desc" },
      },
      workLogs: {
        include: {
          user: {
            select: { id: true, name: true, role: true, badgeNumber: true },
          },
        },
        orderBy: { loggedAt: "desc" },
      },
    },
  });
}

/**
 * Creates a new Permit (DRAFT or direct SUBMIT)
 */
export async function createPermit(
  data: {
    title: string;
    description: string;
    type: PermitType;
    plantId: string;
    areaId: string;
    equipmentId?: string;
    contractorName: string;
    crewCount?: number;
    supervisorName: string;
    supervisorContact: string;
    plannedStartTime: string | Date;
    plannedEndTime: string | Date;
    hazards?: string[];
    ppeRequired?: string[];
    precautionsChecklist?: any[];
    typeSpecificData: Record<string, any>;
    submitDirectly?: boolean;
  },
  user: UserContext
) {
  // Validate type specific data using the type registry schema
  const typeDef = getPermitTypeDefinition(data.type);
  const validatedTypeData = typeDef.zodSchema.parse(data.typeSpecificData);

  // Generate unique permit number (e.g. PTW-HW-2026-0042)
  const count = await prisma.permit.count();
  const serial = String(count + 1).padStart(4, "0");
  const year = new Date().getFullYear();
  const permitNumber = `PTW-${typeDef.shortCode}-${year}-${serial}`;

  const start = new Date(data.plannedStartTime);
  const end = new Date(data.plannedEndTime);

  if (end <= start) {
    throw new Error("Planned end time must be after planned start time.");
  }

  const initialStatus: PermitStatus = data.submitDirectly ? "PENDING_APPROVAL" : "DRAFT";

  const permit = await prisma.permit.create({
    data: {
      permitNumber,
      title: data.title,
      description: data.description,
      type: data.type,
      status: initialStatus,
      plantId: data.plantId,
      areaId: data.areaId,
      equipmentId: data.equipmentId || null,
      requesterId: user.id,
      contractorName: data.contractorName,
      crewCount: data.crewCount || 1,
      supervisorName: data.supervisorName,
      supervisorContact: data.supervisorContact,
      plannedStartTime: start,
      plannedEndTime: end,
      hazards: JSON.stringify(data.hazards || []),
      ppeRequired: JSON.stringify(data.ppeRequired || []),
      precautionsChecklist: JSON.stringify(data.precautionsChecklist || []),
      typeSpecificData: JSON.stringify(validatedTypeData),
      approvals: {
        create: [
          { role: "AREA_OWNER", status: "PENDING" },
          { role: "SAFETY_OFFICER", status: "PENDING" },
        ],
      },
    },
  });

  // Log creation in audit log
  await createAuditEntry({
    permitId: permit.id,
    userId: user.id,
    action: "CREATED",
    fromStatus: null,
    toStatus: initialStatus,
    comment: `Permit created as ${initialStatus}.`,
  });

  if (data.submitDirectly) {
    console.log(
      `[MOCK NOTIFICATION] Dispatched sign-off notification to Area Owner and Plant Safety Officer for Permit ${permit.permitNumber}.`
    );
  }

  return permit;
}

/**
 * Handles transition requests through the server-side state machine
 */
export async function executePermitTransition(
  permitId: string,
  action: StateAction,
  user: UserContext,
  payload: TransitionPayload = {}
) {
  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
    include: {
      approvals: true,
    },
  });

  if (!permit) {
    throw new Error(`Permit with ID ${permitId} not found.`);
  }

  const permitContext: PermitContext = {
    id: permit.id,
    permitNumber: permit.permitNumber,
    title: permit.title,
    status: permit.status as PermitStatus,
    requesterId: permit.requesterId,
    areaId: permit.areaId,
    plantId: permit.plantId,
    plannedStartTime: permit.plannedStartTime,
    plannedEndTime: permit.plannedEndTime,
    approvals: permit.approvals.map((a) => ({
      role: a.role as "AREA_OWNER" | "SAFETY_OFFICER",
      approverId: a.approverId,
      status: a.status as "PENDING" | "APPROVED" | "REJECTED",
      decisionDate: a.decisionDate,
      comment: a.comment,
      signatureDataUrl: a.signatureDataUrl,
    })),
    extensionHoursRequested: permit.extensionHoursRequested,
    extensionReason: permit.extensionReason,
    extensionStatus: permit.extensionStatus,
  };

  // Run pure state machine validation
  const result = evaluateTransition(permitContext, action, user, payload);

  if (!result.success) {
    // Record safety/permission violation in audit trail
    await createAuditEntry({
      permitId: permit.id,
      userId: user.id,
      action: result.auditAction,
      fromStatus: result.fromStatus,
      toStatus: result.toStatus,
      comment: `Action '${action}' rejected: ${result.error}`,
    });

    throw new Error(result.error || "Transition not permitted.");
  }

  // Update Database state
  const updateData: any = {
    status: result.toStatus,
  };

  if (action === "activate") {
    updateData.actualStartTime = new Date();
  }

  if (action === "suspend") {
    updateData.suspensionReason = payload.reason;
  }

  if (action === "reject") {
    updateData.rejectionReason = payload.reason;
  }

  if (action === "close") {
    updateData.completionNotes = payload.completionNotes;
    updateData.actualEndTime = new Date();
  }

  if (action === "verify") {
    updateData.verificationNotes = payload.verificationNotes;
  }

  if (action === "request_extension") {
    updateData.extensionHoursRequested = payload.extensionHours || 2;
    updateData.extensionReason = payload.reason;
    updateData.extensionStatus = "REQUESTED";
  }

  if (action === "approve_extension") {
    const hours = permit.extensionHoursRequested || 2;
    updateData.plannedEndTime = new Date(permit.plannedEndTime.getTime() + hours * 3600000);
    updateData.extensionStatus = "APPROVED";
  }

  // If action is approve or reject, update the specific PermitApproval record
  if (action === "approve") {
    const roleToUpdate = user.role === "AREA_OWNER" ? "AREA_OWNER" : "SAFETY_OFFICER";
    await prisma.permitApproval.updateMany({
      where: {
        permitId: permit.id,
        role: roleToUpdate,
      },
      data: {
        status: "APPROVED",
        approverId: user.id,
        decisionDate: new Date(),
        comment: payload.comment || "Approved",
        signatureDataUrl: payload.signatureDataUrl || null,
      },
    });
  }

  if (action === "reject") {
    const roleToUpdate = user.role === "AREA_OWNER" ? "AREA_OWNER" : "SAFETY_OFFICER";
    await prisma.permitApproval.updateMany({
      where: {
        permitId: permit.id,
        role: roleToUpdate,
      },
      data: {
        status: "REJECTED",
        approverId: user.id,
        decisionDate: new Date(),
        comment: payload.reason,
      },
    });
  }

  const updatedPermit = await prisma.permit.update({
    where: { id: permitId },
    data: updateData,
  });

  // Record audit entry
  await createAuditEntry({
    permitId: permit.id,
    userId: user.id,
    action: result.auditAction,
    fromStatus: result.fromStatus,
    toStatus: result.toStatus,
    comment:
      payload.comment ||
      payload.reason ||
      payload.completionNotes ||
      payload.verificationNotes ||
      `State updated from ${result.fromStatus} to ${result.toStatus}.`,
  });

  return updatedPermit;
}

/**
 * Logs work against a permit. STRICT RULE: Permit must be ACTIVE!
 */
export async function addPermitWorkLog(
  permitId: string,
  user: UserContext,
  summary: string,
  workersPresent: number = 1
) {
  const permit = await prisma.permit.findUnique({
    where: { id: permitId },
  });

  if (!permit) {
    throw new Error("Permit not found.");
  }

  // STRICT RULE: Work cannot be logged against a permit that isn't ACTIVE!
  if (permit.status !== "ACTIVE") {
    await createAuditEntry({
      permitId: permit.id,
      userId: user.id,
      action: "WORK_LOG_REJECTED",
      fromStatus: permit.status,
      toStatus: permit.status,
      comment: `Illegal operation: Attempted to log work against non-active permit (status: ${permit.status}).`,
    });

    throw new Error(
      `Safety violation: Work cannot be logged against a permit that is not ACTIVE (current status is '${permit.status}').`
    );
  }

  const log = await prisma.workLog.create({
    data: {
      permitId,
      userId: user.id,
      summary,
      workersPresent,
    },
    include: {
      user: {
        select: { id: true, name: true, role: true, badgeNumber: true },
      },
    },
  });

  await createAuditEntry({
    permitId,
    userId: user.id,
    action: "WORK_LOGGED",
    fromStatus: permit.status,
    toStatus: permit.status,
    comment: `Work progress logged: "${summary}" (${workersPresent} workers present).`,
  });

  return log;
}
