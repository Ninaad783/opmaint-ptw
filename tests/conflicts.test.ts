import { describe, it, expect } from "vitest";
import { detectPermitConflicts, ConflictPermitCandidate } from "../src/lib/safety/conflicts";

describe("Safety Conflict Detection Engine", () => {
  const existingPermits: ConflictPermitCandidate[] = [
    {
      id: "permit-cs-01",
      permitNumber: "PTW-CS-2026-0002",
      title: "Tank T-402 Sludge Cleaning",
      type: "CONFINED_SPACE",
      status: "ACTIVE",
      plantId: "plant-1",
      plantName: "Chennai Petrochemical Complex",
      areaId: "area-tank-farm",
      areaName: "Chemical Tank Farm",
      equipmentId: "eq-tank-402",
      equipmentName: "Bulk Storage Tank T-402",
      plannedStartTime: new Date(Date.now() - 3600000), // started 1h ago
      plannedEndTime: new Date(Date.now() + 18000000), // ends in 5h
    },
    {
      id: "permit-hw-02",
      permitNumber: "PTW-HW-2026-0005",
      title: "Boiler B-101 Flange Weld",
      type: "HOT_WORK",
      status: "ACTIVE",
      plantId: "plant-1",
      plantName: "Chennai Petrochemical Complex",
      areaId: "area-boiler",
      areaName: "Boiler House",
      equipmentId: "eq-boiler-101",
      equipmentName: "Steam Boiler B-101",
      plannedStartTime: new Date(Date.now() - 7200000),
      plannedEndTime: new Date(Date.now() + 7200000),
    },
  ];

  it("flags CRITICAL EXTREME HAZARD when Hot Work overlaps with Confined Space in same area", () => {
    const proposedHotWork = {
      type: "HOT_WORK" as const,
      plantId: "plant-1",
      areaId: "area-tank-farm", // SAME AREA as active Confined Space
      equipmentId: "eq-tank-402-piping",
      plannedStartTime: new Date(Date.now() + 1800000), // in 30 mins
      plannedEndTime: new Date(Date.now() + 14400000), // in 4h
    };

    const conflicts = detectPermitConflicts(proposedHotWork, existingPermits);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);

    const criticalConflict = conflicts.find((c) => c.category === "HOT_WORK_CONFINED_SPACE");
    expect(criticalConflict).toBeDefined();
    expect(criticalConflict?.severity).toBe("CRITICAL");
    expect(criticalConflict?.headline).toContain("CRITICAL EXPLOSION HAZARD");
  });

  it("flags SAME EQUIPMENT CONFLICT when multiple jobs target the exact same equipment", () => {
    const proposedMaintenance = {
      type: "ELECTRICAL_LOTO" as const,
      plantId: "plant-1",
      areaId: "area-boiler",
      equipmentId: "eq-boiler-101", // SAME EQUIPMENT as active Hot Work
      plannedStartTime: new Date(Date.now() + 1800000),
      plannedEndTime: new Date(Date.now() + 10800000),
    };

    const conflicts = detectPermitConflicts(proposedMaintenance, existingPermits);
    const equipConflict = conflicts.find((c) => c.category === "SAME_EQUIPMENT_OVERLAP");
    expect(equipConflict).toBeDefined();
    expect(equipConflict?.severity).toBe("HIGH");
  });

  it("does not flag conflict when time windows do NOT overlap", () => {
    const nonOverlappingPermit = {
      type: "HOT_WORK" as const,
      plantId: "plant-1",
      areaId: "area-tank-farm",
      equipmentId: "eq-tank-402",
      plannedStartTime: new Date(Date.now() + 86400000), // tomorrow (+24h)
      plannedEndTime: new Date(Date.now() + 100800000),
    };

    const conflicts = detectPermitConflicts(nonOverlappingPermit, existingPermits);
    expect(conflicts.length).toBe(0);
  });
});
