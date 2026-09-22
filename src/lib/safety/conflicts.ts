import { PermitType, PermitStatus } from "../permit-types/types";

export interface ConflictPermitCandidate {
  id: string;
  permitNumber: string;
  title: string;
  type: PermitType;
  status: PermitStatus;
  plantId: string;
  plantName: string;
  areaId: string;
  areaName: string;
  equipmentId?: string | null;
  equipmentName?: string | null;
  plannedStartTime: Date | string;
  plannedEndTime: Date | string;
}

export interface SafetyConflict {
  severity: "CRITICAL" | "HIGH" | "WARNING";
  category: "HOT_WORK_CONFINED_SPACE" | "SAME_EQUIPMENT_OVERLAP" | "SAME_AREA_MULTIPLE_HOT_WORK" | "TIME_OVERLAP";
  headline: string;
  description: string;
  mitigationRequired: string;
  conflictingPermit: ConflictPermitCandidate;
}

export function detectPermitConflicts(
  targetPermit: {
    id?: string;
    type: PermitType;
    plantId: string;
    areaId: string;
    equipmentId?: string | null;
    plannedStartTime: Date | string;
    plannedEndTime: Date | string;
  },
  existingPermits: ConflictPermitCandidate[]
): SafetyConflict[] {
  const conflicts: SafetyConflict[] = [];

  const targetStart = new Date(targetPermit.plannedStartTime).getTime();
  const targetEnd = new Date(targetPermit.plannedEndTime).getTime();

  // Active or approved permits that pose operational conflict risks
  const relevantStatuses: PermitStatus[] = ["ACTIVE", "APPROVED", "PENDING_APPROVAL", "SUSPENDED"];

  for (const existing of existingPermits) {
    // Skip comparing with itself
    if (targetPermit.id && existing.id === targetPermit.id) continue;

    // Only compare against active/pending permits
    if (!relevantStatuses.includes(existing.status)) continue;

    const existStart = new Date(existing.plannedStartTime).getTime();
    const existEnd = new Date(existing.plannedEndTime).getTime();

    // Check time overlap: (targetStart < existEnd && targetEnd > existStart)
    const timesOverlap = targetStart < existEnd && targetEnd > existStart;
    if (!timesOverlap) continue;

    // Same Area or Same Equipment
    const isSameArea = targetPermit.areaId === existing.areaId;
    const isSameEquipment = Boolean(
      targetPermit.equipmentId &&
      existing.equipmentId &&
      targetPermit.equipmentId === existing.equipmentId
    );

    if (!isSameArea && !isSameEquipment) continue;

    // 1. DANGEROUS CONFLICT: Hot Work + Confined Space Entry
    const isTargetHW = targetPermit.type === "HOT_WORK";
    const isTargetCS = targetPermit.type === "CONFINED_SPACE";
    const isExistHW = existing.type === "HOT_WORK";
    const isExistCS = existing.type === "CONFINED_SPACE";

    if ((isTargetHW && isExistCS) || (isTargetCS && isExistHW)) {
      conflicts.push({
        severity: "CRITICAL",
        category: "HOT_WORK_CONFINED_SPACE",
        headline: "CRITICAL EXPLOSION HAZARD: Hot Work & Confined Space Co-Location",
        description: `Permit ${existing.permitNumber} (${existing.title}) is a ${existing.type.replace("_", " ")} scheduled concurrently in ${existing.areaName}. Performing open flame/spark-generating work near a confined vessel creates an extreme risk of vapor cloud ignition or atmospheric poisoning.`,
        mitigationRequired: "Separate the planned execution windows by at least 4 hours, or require continuous multi-gas perimeter sweeps and Plant Safety Manager clearance before issuance.",
        conflictingPermit: existing,
      });
      continue;
    }

    // 2. SAME EQUIPMENT CONFLICT
    if (isSameEquipment) {
      conflicts.push({
        severity: "HIGH",
        category: "SAME_EQUIPMENT_OVERLAP",
        headline: "EQUIPMENT CONFLICT: Multiple simultaneous permits on same asset",
        description: `Permit ${existing.permitNumber} is currently ${existing.status} on equipment '${existing.equipmentName || "Selected Tag"}'. Multiple crews working on identical machinery risks conflicting isolation and physical interference.`,
        mitigationRequired: "Deconflict shifts or verify combined lockout/tagout (LOTO) isolation boundary.",
        conflictingPermit: existing,
      });
      continue;
    }

    // 3. MULTIPLE HOT WORKS IN SAME AREA
    if (isTargetHW && isExistHW && isSameArea) {
      conflicts.push({
        severity: "WARNING",
        category: "SAME_AREA_MULTIPLE_HOT_WORK",
        headline: "AREA HAZARD: Concurrent Hot Work operations in same zone",
        description: `Permit ${existing.permitNumber} is also an active Hot Work permit in ${existing.areaName}. Simultaneous open flames may compromise fire watch visibility and emergency egress routes.`,
        mitigationRequired: "Ensure separate designated fire watch personnel and dedicated fire extinguishers for each hot work point.",
        conflictingPermit: existing,
      });
    }
  }

  return conflicts;
}
