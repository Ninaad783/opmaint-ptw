import { PermitStatus, UserRole } from "../permit-types/types";

export interface UserContext {
  id: string;
  name: string;
  role: UserRole;
  assignedAreaId?: string | null;
}

export interface ApprovalRecord {
  role: "AREA_OWNER" | "SAFETY_OFFICER";
  approverId?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decisionDate?: Date | null;
  comment?: string | null;
  signatureDataUrl?: string | null;
}

export interface PermitContext {
  id: string;
  permitNumber: string;
  title: string;
  status: PermitStatus;
  requesterId: string;
  areaId: string;
  plantId: string;
  plannedStartTime: Date;
  plannedEndTime: Date;
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  approvals: ApprovalRecord[];
  extensionHoursRequested?: number | null;
  extensionReason?: string | null;
  extensionStatus?: string | null;
}

export type StateAction =
  | "submit"
  | "approve"
  | "reject"
  | "activate"
  | "suspend"
  | "resume"
  | "close"
  | "verify"
  | "cancel"
  | "request_extension"
  | "approve_extension"
  | "reject_extension"
  | "auto_expire";

export interface TransitionPayload {
  comment?: string;
  reason?: string;
  signatureDataUrl?: string;
  completionNotes?: string;
  verificationNotes?: string;
  extensionHours?: number;
  now?: Date;
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  fromStatus: PermitStatus;
  toStatus: PermitStatus;
  auditAction: string;
  details?: Record<string, any>;
}

// Terminal states that can NEVER transition to any other state
export const TERMINAL_STATES: PermitStatus[] = [
  "REJECTED",
  "EXPIRED",
  "CLOSED_VERIFIED",
  "CANCELLED",
];

/**
 * Checks if a permit has expired based on current timestamp
 */
export function isPermitExpired(permit: { plannedEndTime: Date; status: PermitStatus }, now: Date = new Date()): boolean {
  if (TERMINAL_STATES.includes(permit.status)) {
    return false; // already in terminal state
  }
  return now.getTime() > new Date(permit.plannedEndTime).getTime();
}

/**
 * Pure evaluation function for state transitions and server-side safety guards.
 */
export function evaluateTransition(
  permit: PermitContext,
  action: StateAction,
  user: UserContext,
  payload: TransitionPayload = {}
): TransitionResult {
  const now = payload.now || new Date();
  const currentStatus = permit.status;

  // 1. Terminal state protection
  if (TERMINAL_STATES.includes(currentStatus) && action !== "auto_expire") {
    return {
      success: false,
      error: `Permit ${permit.permitNumber} is in terminal state '${currentStatus}' and cannot be modified or reactivated.`,
      fromStatus: currentStatus,
      toStatus: currentStatus,
      auditAction: "TRANSITION_BLOCKED",
    };
  }

  // 2. Auto-expiry check
  if (action === "auto_expire" || isPermitExpired(permit, now)) {
    if (["PENDING_APPROVAL", "APPROVED", "ACTIVE", "SUSPENDED"].includes(currentStatus)) {
      return {
        success: true,
        fromStatus: currentStatus,
        toStatus: "EXPIRED",
        auditAction: "EXPIRED",
        details: {
          reason: `Permit validity window expired at ${new Date(permit.plannedEndTime).toISOString()}`,
          expiredAt: now,
        },
      };
    }
  }

  switch (action) {
    // -------------------------------------------------------------
    // DRAFT -> PENDING_APPROVAL
    // -------------------------------------------------------------
    case "submit": {
      if (currentStatus !== "DRAFT") {
        return {
          success: false,
          error: `Cannot submit permit from status '${currentStatus}'. Only DRAFT permits can be submitted.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "SUBMISSION_BLOCKED",
        };
      }

      if (user.role !== "REQUESTER" && user.role !== "ADMIN") {
        return {
          success: false,
          error: `Only a Requester or Admin can submit permits for approval.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "SUBMISSION_BLOCKED",
        };
      }

      if (user.role === "REQUESTER" && permit.requesterId !== user.id) {
        return {
          success: false,
          error: `You can only submit your own permit.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "SUBMISSION_BLOCKED",
        };
      }

      if (new Date(permit.plannedEndTime).getTime() <= new Date(permit.plannedStartTime).getTime()) {
        return {
          success: false,
          error: `Planned end time must be after planned start time.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "SUBMISSION_BLOCKED",
        };
      }

      return {
        success: true,
        fromStatus: "DRAFT",
        toStatus: "PENDING_APPROVAL",
        auditAction: "SUBMITTED",
        details: { submittedAt: now },
      };
    }

    // -------------------------------------------------------------
    // PENDING_APPROVAL -> APPROVED (when all approve)
    // -------------------------------------------------------------
    case "approve": {
      if (currentStatus !== "PENDING_APPROVAL") {
        return {
          success: false,
          error: `Cannot approve permit in '${currentStatus}' status. Must be PENDING_APPROVAL.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "APPROVAL_BLOCKED",
        };
      }

      // KEY SAFETY RULE: A person can NEVER approve their own permit!
      if (permit.requesterId === user.id) {
        return {
          success: false,
          error: `Safety violation: A person can never approve their own permit (${user.name} is the requester).`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "SELF_APPROVAL_ATTEMPT_BLOCKED",
        };
      }

      // Role check
      if (user.role === "REQUESTER") {
        return {
          success: false,
          error: `Requesters are not permitted to sign off on permit approvals.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "APPROVAL_BLOCKED",
        };
      }

      // Area Owner restriction: can only approve permits for their assigned area
      if (user.role === "AREA_OWNER") {
        if (!user.assignedAreaId || user.assignedAreaId !== permit.areaId) {
          return {
            success: false,
            error: `Area Owner ${user.name} is only authorized to approve permits within their assigned area.`,
            fromStatus: currentStatus,
            toStatus: currentStatus,
            auditAction: "AREA_MISMATCH_APPROVAL_BLOCKED",
          };
        }
      }

      // Check current approval records
      const roleToApprove = user.role === "AREA_OWNER" ? "AREA_OWNER" : "SAFETY_OFFICER";
      const existingApproval = permit.approvals.find((a) => a.role === roleToApprove);

      if (existingApproval && existingApproval.status === "APPROVED") {
        return {
          success: false,
          error: `This permit has already been approved by ${roleToApprove}.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "DUPLICATE_APPROVAL_BLOCKED",
        };
      }

      // Determine if this approval satisfies all required sign-offs
      // Required: 1 Area Owner approval AND 1 Safety Officer approval
      const otherApprovals = permit.approvals.filter((a) => a.role !== roleToApprove && a.status === "APPROVED");
      const allApprovedNow = otherApprovals.length >= 1 || user.role === "ADMIN";

      return {
        success: true,
        fromStatus: currentStatus,
        toStatus: allApprovedNow ? "APPROVED" : "PENDING_APPROVAL",
        auditAction: "APPROVED",
        details: {
          approvedByRole: roleToApprove,
          approverId: user.id,
          comment: payload.comment || "Approved without conditions",
          signatureDataUrl: payload.signatureDataUrl,
          allApproved: allApprovedNow,
        },
      };
    }

    // -------------------------------------------------------------
    // PENDING_APPROVAL -> REJECTED (any reject)
    // -------------------------------------------------------------
    case "reject": {
      if (currentStatus !== "PENDING_APPROVAL") {
        return {
          success: false,
          error: `Cannot reject permit in '${currentStatus}' status.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "REJECTION_BLOCKED",
        };
      }

      // Cannot reject own permit
      if (permit.requesterId === user.id) {
        return {
          success: false,
          error: `Requester cannot perform rejection evaluation on own permit (use cancel instead).`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "REJECTION_BLOCKED",
        };
      }

      if (user.role === "REQUESTER") {
        return {
          success: false,
          error: `Requesters cannot reject permits.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "REJECTION_BLOCKED",
        };
      }

      if (user.role === "AREA_OWNER" && user.assignedAreaId && user.assignedAreaId !== permit.areaId) {
        return {
          success: false,
          error: `Area Owner cannot reject permits outside their assigned plant area.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "REJECTION_BLOCKED",
        };
      }

      if (!payload.reason || payload.reason.trim().length < 5) {
        return {
          success: false,
          error: `A mandatory specific reason must be provided when rejecting a safety permit.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "REJECTION_REASON_MISSING",
        };
      }

      return {
        success: true,
        fromStatus: currentStatus,
        toStatus: "REJECTED",
        auditAction: "REJECTED",
        details: {
          rejectedBy: user.id,
          reason: payload.reason,
        },
      };
    }

    // -------------------------------------------------------------
    // APPROVED -> ACTIVE (Work begins)
    // -------------------------------------------------------------
    case "activate": {
      if (currentStatus !== "APPROVED") {
        return {
          success: false,
          error: `Cannot activate permit from '${currentStatus}'. Permit must be in APPROVED status with all signoffs completed.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "ACTIVATION_BLOCKED",
        };
      }

      // Check all required approvers
      const hasAreaApproval = permit.approvals.some((a) => a.role === "AREA_OWNER" && a.status === "APPROVED");
      const hasSafetyApproval = permit.approvals.some((a) => a.role === "SAFETY_OFFICER" && a.status === "APPROVED");
      
      if (!hasAreaApproval || !hasSafetyApproval) {
        return {
          success: false,
          error: `Cannot activate: Every required approver (Area Owner and Safety Officer) must approve before work can commence.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "ACTIVATION_BLOCKED",
        };
      }

      // KEY SAFETY RULE: A permit cannot go ACTIVE before its planned start time!
      if (now.getTime() < new Date(permit.plannedStartTime).getTime()) {
        const timeDiffMins = Math.round((new Date(permit.plannedStartTime).getTime() - now.getTime()) / 60000);
        return {
          success: false,
          error: `Cannot activate permit before scheduled start time (${new Date(permit.plannedStartTime).toLocaleString()}). Work cannot start for another ${timeDiffMins} minutes.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "PREMATURE_ACTIVATION_BLOCKED",
        };
      }

      // Check if already expired
      if (now.getTime() > new Date(permit.plannedEndTime).getTime()) {
        return {
          success: false,
          error: `Permit validity window has already lapsed. An expired permit cannot be activated; a new permit must be raised.`,
          fromStatus: currentStatus,
          toStatus: "EXPIRED",
          auditAction: "EXPIRED",
        };
      }

      return {
        success: true,
        fromStatus: "APPROVED",
        toStatus: "ACTIVE",
        auditAction: "ACTIVATED",
        details: {
          activatedBy: user.id,
          actualStartTime: now,
        },
      };
    }

    // -------------------------------------------------------------
    // ACTIVE -> SUSPENDED (Immediate emergency / condition change)
    // -------------------------------------------------------------
    case "suspend": {
      if (currentStatus !== "ACTIVE") {
        return {
          success: false,
          error: `Cannot suspend permit in '${currentStatus}' status. Only ACTIVE permits can be suspended.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "SUSPENSION_BLOCKED",
        };
      }

      // Safety Officer or Admin can suspend instantly
      if (user.role !== "SAFETY_OFFICER" && user.role !== "ADMIN") {
        return {
          success: false,
          error: `Only Safety Officers or Admins have authority to suspend an ACTIVE permit.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "SUSPENSION_UNAUTHORIZED",
        };
      }

      if (!payload.reason || payload.reason.trim().length < 3) {
        return {
          success: false,
          error: `Mandatory suspension reason required (e.g. gas alarm, severe weather, emergency shift change).`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "SUSPENSION_REASON_MISSING",
        };
      }

      return {
        success: true,
        fromStatus: "ACTIVE",
        toStatus: "SUSPENDED",
        auditAction: "SUSPENDED",
        details: {
          suspendedBy: user.id,
          reason: payload.reason,
          suspendedAt: now,
        },
      };
    }

    // -------------------------------------------------------------
    // SUSPENDED -> ACTIVE (Resume work)
    // -------------------------------------------------------------
    case "resume": {
      if (currentStatus !== "SUSPENDED") {
        return {
          success: false,
          error: `Cannot resume permit in '${currentStatus}' status. Only SUSPENDED permits can be resumed.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "RESUME_BLOCKED",
        };
      }

      if (user.role !== "SAFETY_OFFICER" && user.role !== "ADMIN") {
        return {
          success: false,
          error: `Only Safety Officers or Admins can authorize resumption of suspended permits.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "RESUME_UNAUTHORIZED",
        };
      }

      // Check validity window
      if (now.getTime() > new Date(permit.plannedEndTime).getTime()) {
        return {
          success: false,
          error: `Cannot resume: validity window passed while suspended. Permit is expired.`,
          fromStatus: currentStatus,
          toStatus: "EXPIRED",
          auditAction: "EXPIRED",
        };
      }

      return {
        success: true,
        fromStatus: "SUSPENDED",
        toStatus: "ACTIVE",
        auditAction: "RESUMED",
        details: {
          resumedBy: user.id,
          comment: payload.comment || "Site re-inspected and declared safe to resume.",
          resumedAt: now,
        },
      };
    }

    // -------------------------------------------------------------
    // ACTIVE -> CLOSED (Requester handback)
    // -------------------------------------------------------------
    case "close": {
      if (currentStatus !== "ACTIVE") {
        return {
          success: false,
          error: `Cannot close permit in '${currentStatus}' status. Only ACTIVE permits can be closed.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "CLOSURE_BLOCKED",
        };
      }

      // Requester closes their own permit, or Admin/Safety Officer
      if (user.role === "REQUESTER" && permit.requesterId !== user.id) {
        return {
          success: false,
          error: `Requesters can only close their own permits.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "CLOSURE_UNAUTHORIZED",
        };
      }

      if (!payload.completionNotes || payload.completionNotes.trim().length < 5) {
        return {
          success: false,
          error: `Completion notes are mandatory: describe job status, housekeeping completed, and tools removed.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "CLOSURE_NOTES_MISSING",
        };
      }

      return {
        success: true,
        fromStatus: "ACTIVE",
        toStatus: "CLOSED",
        auditAction: "CLOSED",
        details: {
          closedBy: user.id,
          completionNotes: payload.completionNotes,
          actualEndTime: now,
        },
      };
    }

    // -------------------------------------------------------------
    // CLOSED -> CLOSED_VERIFIED (Safety officer final walk-down)
    // -------------------------------------------------------------
    case "verify": {
      if (currentStatus !== "CLOSED") {
        return {
          success: false,
          error: `Cannot verify closure from '${currentStatus}'. Permit must be marked CLOSED by requester first.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "VERIFICATION_BLOCKED",
        };
      }

      if (user.role !== "SAFETY_OFFICER" && user.role !== "ADMIN") {
        return {
          success: false,
          error: `Only a Safety Officer can perform closure site verification.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "VERIFICATION_UNAUTHORIZED",
        };
      }

      if (!payload.verificationNotes || payload.verificationNotes.trim().length < 5) {
        return {
          success: false,
          error: `Safety Officer verification notes required confirming site clean, isolation removed, and area safe.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "VERIFICATION_NOTES_MISSING",
        };
      }

      return {
        success: true,
        fromStatus: "CLOSED",
        toStatus: "CLOSED_VERIFIED",
        auditAction: "CLOSED_VERIFIED",
        details: {
          verifiedBy: user.id,
          verificationNotes: payload.verificationNotes,
          verifiedAt: now,
        },
      };
    }

    // -------------------------------------------------------------
    // Any non-terminal state -> CANCELLED
    // -------------------------------------------------------------
    case "cancel": {
      if (TERMINAL_STATES.includes(currentStatus)) {
        return {
          success: false,
          error: `Permit is already in terminal state '${currentStatus}' and cannot be cancelled.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "CANCEL_BLOCKED",
        };
      }

      if (user.role === "REQUESTER" && permit.requesterId !== user.id) {
        return {
          success: false,
          error: `Requesters can only cancel their own permits.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "CANCEL_UNAUTHORIZED",
        };
      }

      return {
        success: true,
        fromStatus: currentStatus,
        toStatus: "CANCELLED",
        auditAction: "CANCELLED",
        details: {
          cancelledBy: user.id,
          reason: payload.reason || "Cancelled by user",
          cancelledAt: now,
        },
      };
    }

    // -------------------------------------------------------------
    // Extension Request Flow (+1h to +4h)
    // -------------------------------------------------------------
    case "request_extension": {
      if (currentStatus !== "ACTIVE") {
        return {
          success: false,
          error: `Extensions can only be requested for ACTIVE permits before they expire.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "EXTENSION_BLOCKED",
        };
      }

      const hours = payload.extensionHours || 2;
      if (hours < 1 || hours > 4) {
        return {
          success: false,
          error: `Extensions are strictly capped between 1 and 4 hours per industrial regulations.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "EXTENSION_LIMIT_EXCEEDED",
        };
      }

      if (!payload.reason || payload.reason.trim().length < 5) {
        return {
          success: false,
          error: `Valid justification required for extension request.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "EXTENSION_REASON_MISSING",
        };
      }

      return {
        success: true,
        fromStatus: currentStatus,
        toStatus: currentStatus, // stays ACTIVE, extension requested
        auditAction: "EXTENSION_REQUESTED",
        details: {
          hours,
          reason: payload.reason,
          requestedBy: user.id,
        },
      };
    }

    case "approve_extension": {
      if (currentStatus !== "ACTIVE") {
        return {
          success: false,
          error: `Cannot approve extension for non-ACTIVE permit.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "EXTENSION_APPROVAL_BLOCKED",
        };
      }

      if (user.role !== "SAFETY_OFFICER" && user.role !== "ADMIN") {
        return {
          success: false,
          error: `Only a Safety Officer can approve permit extensions.`,
          fromStatus: currentStatus,
          toStatus: currentStatus,
          auditAction: "EXTENSION_APPROVAL_UNAUTHORIZED",
        };
      }

      const extensionHours = permit.extensionHoursRequested || payload.extensionHours || 2;
      const newEndTime = new Date(new Date(permit.plannedEndTime).getTime() + extensionHours * 3600000);

      return {
        success: true,
        fromStatus: currentStatus,
        toStatus: currentStatus,
        auditAction: "EXTENSION_APPROVED",
        details: {
          approvedBy: user.id,
          extendedByHours: extensionHours,
          oldEndTime: permit.plannedEndTime,
          newEndTime,
          comment: payload.comment || "Extension approved after re-inspection",
        },
      };
    }

    default:
      return {
        success: false,
        error: `Unknown or unhandled action '${action}'.`,
        fromStatus: currentStatus,
        toStatus: currentStatus,
        auditAction: "UNKNOWN_ACTION",
      };
  }
}
