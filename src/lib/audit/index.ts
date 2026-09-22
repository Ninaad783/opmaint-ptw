import { prisma } from "../db";

export interface LogAuditParams {
  permitId: string;
  userId?: string | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  fieldName?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  comment?: string | null;
}

export async function createAuditEntry(params: LogAuditParams) {
  try {
    return await prisma.permitAuditLog.create({
      data: {
        permitId: params.permitId,
        userId: params.userId,
        action: params.action,
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        fieldName: params.fieldName,
        fromValue: params.fromValue,
        toValue: params.toValue,
        comment: params.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            badgeNumber: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to write immutable audit log entry:", error);
    // Safety requirement: do not throw to crash transaction, but log vigorously
    return null;
  }
}
