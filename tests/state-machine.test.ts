import { describe, it, expect } from "vitest";
import { evaluateTransition, PermitContext, UserContext, isPermitExpired } from "../src/lib/state-machine";

describe("Permit State Machine & Safety Guard Rails", () => {
  const requesterUser: UserContext = {
    id: "user-req-1",
    name: "Rajesh Requester",
    role: "REQUESTER",
  };

  const areaOwnerUser: UserContext = {
    id: "user-ao-1",
    name: "Suresh Area Owner",
    role: "AREA_OWNER",
    assignedAreaId: "area-boiler-house",
  };

  const foreignAreaOwnerUser: UserContext = {
    id: "user-ao-2",
    name: "Vikram Foreign Area Owner",
    role: "AREA_OWNER",
    assignedAreaId: "area-tank-farm",
  };

  const safetyOfficerUser: UserContext = {
    id: "user-so-1",
    name: "Ananya Safety Officer",
    role: "SAFETY_OFFICER",
  };

  const basePermit: PermitContext = {
    id: "permit-101",
    permitNumber: "PTW-HW-2026-0001",
    title: "Test Hot Work Permit",
    status: "DRAFT",
    requesterId: "user-req-1",
    plantId: "plant-cpcl",
    areaId: "area-boiler-house",
    plannedStartTime: new Date(Date.now() + 3600000), // in 1 hour
    plannedEndTime: new Date(Date.now() + 18000000), // in 5 hours
    approvals: [],
  };

  // -------------------------------------------------------------
  // 1. SUBMISSION RULES
  // -------------------------------------------------------------
  describe("Submission (DRAFT -> PENDING_APPROVAL)", () => {
    it("allows the requester to submit their own draft permit", () => {
      const res = evaluateTransition(basePermit, "submit", requesterUser);
      expect(res.success).toBe(true);
      expect(res.toStatus).toBe("PENDING_APPROVAL");
    });

    it("blocks a different requester from submitting someone else's draft", () => {
      const otherRequester: UserContext = {
        id: "user-req-99",
        name: "Imposter Requester",
        role: "REQUESTER",
      };
      const res = evaluateTransition(basePermit, "submit", otherRequester);
      expect(res.success).toBe(false);
      expect(res.error).toContain("only submit your own permit");
    });
  });

  // -------------------------------------------------------------
  // 2. APPROVAL & KEY RULE: SELF-APPROVAL PROHIBITION
  // -------------------------------------------------------------
  describe("Approval Rules & Self-Approval Prevention", () => {
    const pendingPermit: PermitContext = {
      ...basePermit,
      status: "PENDING_APPROVAL",
      approvals: [
        { role: "AREA_OWNER", status: "PENDING" },
        { role: "SAFETY_OFFICER", status: "PENDING" },
      ],
    };

    it("CRITICAL RULE: Rejects self-approval even if requester is also an Area Owner", () => {
      // Say the user who created the permit happens to be the area owner
      const dualRoleRequester: UserContext = {
        id: "user-req-1", // SAME as basePermit.requesterId
        name: "Rajesh (Dual Role)",
        role: "AREA_OWNER",
        assignedAreaId: "area-boiler-house",
      };

      const res = evaluateTransition(pendingPermit, "approve", dualRoleRequester);
      expect(res.success).toBe(false);
      expect(res.auditAction).toBe("SELF_APPROVAL_ATTEMPT_BLOCKED");
      expect(res.error).toContain("A person can never approve their own permit");
    });

    it("prevents Requesters from approving permits", () => {
      const otherRequesterUser: UserContext = {
        id: "user-req-2",
        name: "Sunil Requester",
        role: "REQUESTER",
      };
      const res = evaluateTransition(pendingPermit, "approve", otherRequesterUser);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Requesters are not permitted to sign off");
    });

    it("prevents Area Owner from approving a permit outside their assigned area", () => {
      const res = evaluateTransition(pendingPermit, "approve", foreignAreaOwnerUser);
      expect(res.success).toBe(false);
      expect(res.auditAction).toBe("AREA_MISMATCH_APPROVAL_BLOCKED");
      expect(res.error).toContain("only authorized to approve permits within their assigned area");
    });

    it("allows assigned Area Owner to sign off on their own area permit", () => {
      const res = evaluateTransition(pendingPermit, "approve", areaOwnerUser, {
        comment: "Isolation boundary confirmed",
      });
      expect(res.success).toBe(true);
      // Still PENDING_APPROVAL because Safety Officer hasn't approved yet
      expect(res.toStatus).toBe("PENDING_APPROVAL");
    });

    it("transitions to APPROVED when BOTH Area Owner and Safety Officer approve", () => {
      const halfApprovedPermit: PermitContext = {
        ...pendingPermit,
        approvals: [
          { role: "AREA_OWNER", status: "APPROVED", approverId: areaOwnerUser.id },
          { role: "SAFETY_OFFICER", status: "PENDING" },
        ],
      };

      const res = evaluateTransition(halfApprovedPermit, "approve", safetyOfficerUser, {
        comment: "EHS clearance granted",
      });
      expect(res.success).toBe(true);
      expect(res.toStatus).toBe("APPROVED");
    });

    it("requires a mandatory specific reason when rejecting a permit", () => {
      const resWithoutReason = evaluateTransition(pendingPermit, "reject", safetyOfficerUser, {
        reason: "",
      });
      expect(resWithoutReason.success).toBe(false);
      expect(resWithoutReason.auditAction).toBe("REJECTION_REASON_MISSING");

      const resWithReason = evaluateTransition(pendingPermit, "reject", safetyOfficerUser, {
        reason: "Combustible solvents within 3m must be cleared first.",
      });
      expect(resWithReason.success).toBe(true);
      expect(resWithReason.toStatus).toBe("REJECTED");
    });
  });

  // -------------------------------------------------------------
  // 3. ACTIVATION RULES
  // -------------------------------------------------------------
  describe("Activation (APPROVED -> ACTIVE)", () => {
    it("CRITICAL RULE: Cannot go ACTIVE before planned start time", () => {
      const approvedFuturePermit: PermitContext = {
        ...basePermit,
        status: "APPROVED",
        plannedStartTime: new Date(Date.now() + 7200000), // starts in 2 hours
        plannedEndTime: new Date(Date.now() + 28800000),
        approvals: [
          { role: "AREA_OWNER", status: "APPROVED", approverId: "user-ao-1" },
          { role: "SAFETY_OFFICER", status: "APPROVED", approverId: "user-so-1" },
        ],
      };

      const res = evaluateTransition(approvedFuturePermit, "activate", requesterUser, {
        now: new Date(), // current time is BEFORE plannedStartTime
      });

      expect(res.success).toBe(false);
      expect(res.auditAction).toBe("PREMATURE_ACTIVATION_BLOCKED");
      expect(res.error).toContain("Cannot activate permit before scheduled start time");
    });

    it("CRITICAL RULE: Cannot go ACTIVE unless EVERY required approver has approved", () => {
      const incompletePermit: PermitContext = {
        ...basePermit,
        status: "APPROVED", // forged status without approvals
        plannedStartTime: new Date(Date.now() - 1000), // already past
        approvals: [
          { role: "AREA_OWNER", status: "APPROVED" },
          { role: "SAFETY_OFFICER", status: "PENDING" }, // Safety officer didn't sign!
        ],
      };

      const res = evaluateTransition(incompletePermit, "activate", requesterUser);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Every required approver (Area Owner and Safety Officer) must approve");
    });

    it("allows activation when time is valid and all approvals are present", () => {
      const readyPermit: PermitContext = {
        ...basePermit,
        status: "APPROVED",
        plannedStartTime: new Date(Date.now() - 60000), // started 1 min ago
        plannedEndTime: new Date(Date.now() + 14400000),
        approvals: [
          { role: "AREA_OWNER", status: "APPROVED", approverId: "user-ao-1" },
          { role: "SAFETY_OFFICER", status: "APPROVED", approverId: "user-so-1" },
        ],
      };

      const res = evaluateTransition(readyPermit, "activate", requesterUser);
      expect(res.success).toBe(true);
      expect(res.toStatus).toBe("ACTIVE");
    });
  });

  // -------------------------------------------------------------
  // 4. SUSPENSION & EMERGENCY RESUME
  // -------------------------------------------------------------
  describe("Suspension & Resumption", () => {
    const activePermit: PermitContext = {
      ...basePermit,
      status: "ACTIVE",
      plannedStartTime: new Date(Date.now() - 3600000),
      plannedEndTime: new Date(Date.now() + 7200000),
      approvals: [
        { role: "AREA_OWNER", status: "APPROVED" },
        { role: "SAFETY_OFFICER", status: "APPROVED" },
      ],
    };

    it("allows Safety Officer to instantly suspend an ACTIVE permit with a reason", () => {
      const res = evaluateTransition(activePermit, "suspend", safetyOfficerUser, {
        reason: "Gas alarm triggered in adjacent unit.",
      });
      expect(res.success).toBe(true);
      expect(res.toStatus).toBe("SUSPENDED");
    });

    it("blocks a Requester from suspending an active permit", () => {
      const res = evaluateTransition(activePermit, "suspend", requesterUser, {
        reason: "Feeling unsafe",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Only Safety Officers or Admins have authority to suspend");
    });

    it("allows Safety Officer to resume a suspended permit if still inside window", () => {
      const suspendedPermit: PermitContext = {
        ...activePermit,
        status: "SUSPENDED",
      };
      const res = evaluateTransition(suspendedPermit, "resume", safetyOfficerUser, {
        comment: "Area re-tested 0% LEL. Safe to resume.",
      });
      expect(res.success).toBe(true);
      expect(res.toStatus).toBe("ACTIVE");
    });
  });

  // -------------------------------------------------------------
  // 5. CLOSURE & TWO-STAGE VERIFICATION
  // -------------------------------------------------------------
  describe("Closure Lifecycle (ACTIVE -> CLOSED -> CLOSED_VERIFIED)", () => {
    const activePermit: PermitContext = {
      ...basePermit,
      status: "ACTIVE",
      plannedStartTime: new Date(Date.now() - 7200000),
      plannedEndTime: new Date(Date.now() + 7200000),
      approvals: [],
    };

    it("allows Requester to mark work completed with completion notes", () => {
      const res = evaluateTransition(activePermit, "close", requesterUser, {
        completionNotes: "Hot work finished, housekeeping done, fire watch completed 30-min patrol.",
      });
      expect(res.success).toBe(true);
      expect(res.toStatus).toBe("CLOSED");
    });

    it("requires mandatory completion notes when closing", () => {
      const res = evaluateTransition(activePermit, "close", requesterUser, {
        completionNotes: "",
      });
      expect(res.success).toBe(false);
      expect(res.auditAction).toBe("CLOSURE_NOTES_MISSING");
    });

    it("allows Safety Officer to perform final site closure verification", () => {
      const closedPermit: PermitContext = {
        ...activePermit,
        status: "CLOSED",
      };
      const res = evaluateTransition(closedPermit, "verify", safetyOfficerUser, {
        verificationNotes: "Physical walk-down complete: site clean, tools removed, area safe.",
      });
      expect(res.success).toBe(true);
      expect(res.toStatus).toBe("CLOSED_VERIFIED");
    });

    it("blocks Requester from doing final verification (must be Safety Officer)", () => {
      const closedPermit: PermitContext = {
        ...activePermit,
        status: "CLOSED",
      };
      const res = evaluateTransition(closedPermit, "verify", requesterUser, {
        verificationNotes: "Looks good to me",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Only a Safety Officer can perform closure site verification");
    });
  });

  // -------------------------------------------------------------
  // 6. EXPIRY HANDLING THAT ACTUALLY WORKS & TERMINAL LOCKOUT
  // -------------------------------------------------------------
  describe("Expiry & Terminal States", () => {
    it("auto-expires when validity window passes", () => {
      const expiredPermitContext: PermitContext = {
        ...basePermit,
        status: "ACTIVE",
        plannedStartTime: new Date(Date.now() - 10000000),
        plannedEndTime: new Date(Date.now() - 1000), // ended in the past
      };

      expect(isPermitExpired(expiredPermitContext)).toBe(true);

      const res = evaluateTransition(expiredPermitContext, "auto_expire", requesterUser);
      expect(res.success).toBe(true);
      expect(res.toStatus).toBe("EXPIRED");
    });

    it("CRITICAL RULE: An expired permit can NEVER be reactivated", () => {
      const expiredPermit: PermitContext = {
        ...basePermit,
        status: "EXPIRED",
        plannedEndTime: new Date(Date.now() - 10000),
      };

      const res = evaluateTransition(expiredPermit, "activate", requesterUser);
      expect(res.success).toBe(false);
      expect(res.error).toContain("cannot be modified or reactivated");
    });

    it("CRITICAL RULE: A rejected permit can NEVER transition to any other state", () => {
      const rejectedPermit: PermitContext = {
        ...basePermit,
        status: "REJECTED",
      };

      const res = evaluateTransition(rejectedPermit, "submit", requesterUser);
      expect(res.success).toBe(false);
      expect(res.error).toContain("is in terminal state 'REJECTED'");
    });
  });

  // -------------------------------------------------------------
  // 7. EXTENSION FLOW
  // -------------------------------------------------------------
  describe("Extension Requests", () => {
    const activePermit: PermitContext = {
      ...basePermit,
      status: "ACTIVE",
      plannedStartTime: new Date(Date.now() - 3600000),
      plannedEndTime: new Date(Date.now() + 3600000),
    };

    it("caps extensions between 1 and 4 hours", () => {
      const resExceed = evaluateTransition(activePermit, "request_extension", requesterUser, {
        extensionHours: 6,
        reason: "Need extra time for cooldown",
      });
      expect(resExceed.success).toBe(false);
      expect(resExceed.error).toContain("strictly capped between 1 and 4 hours");

      const resValid = evaluateTransition(activePermit, "request_extension", requesterUser, {
        extensionHours: 2,
        reason: "Weld bead cooling and ultrasonic inspection required additional 2 hours",
      });
      expect(resValid.success).toBe(true);
      expect(resValid.auditAction).toBe("EXTENSION_REQUESTED");
    });

    it("only allows Safety Officer to approve an extension", () => {
      const resUnauth = evaluateTransition(activePermit, "approve_extension", areaOwnerUser);
      expect(resUnauth.success).toBe(false);
      expect(resUnauth.error).toContain("Only a Safety Officer can approve permit extensions");

      const resAuth = evaluateTransition(activePermit, "approve_extension", safetyOfficerUser, {
        extensionHours: 2,
        comment: "Atmosphere re-sampled, extension approved.",
      });
      expect(resAuth.success).toBe(true);
      expect(resAuth.auditAction).toBe("EXTENSION_APPROVED");
    });
  });
});
