import { PrismaClient, UserRole, PermitType, PermitStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Opmaint PTW database seeding...");

  // Clean up existing records in reverse dependency order
  await prisma.workLog.deleteMany();
  await prisma.permitAuditLog.deleteMany();
  await prisma.permitApproval.deleteMany();
  await prisma.permit.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.area.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Users (4 roles)
  const requester = await prisma.user.create({
    data: {
      email: "rajesh.kumar@plant.opmaint.com",
      name: "Rajesh Kumar",
      passwordHash,
      role: UserRole.REQUESTER,
      badgeNumber: "MNT-402",
      department: "Mechanical Maintenance",
    },
  });

  const areaOwner = await prisma.user.create({
    data: {
      email: "suresh.patel@plant.opmaint.com",
      name: "Suresh Patel",
      passwordHash,
      role: UserRole.AREA_OWNER,
      badgeNumber: "OPS-108",
      department: "Operations & Utilities",
    },
  });

  const safetyOfficer = await prisma.user.create({
    data: {
      email: "ananya.sharma@plant.opmaint.com",
      name: "Ananya Sharma",
      passwordHash,
      role: UserRole.SAFETY_OFFICER,
      badgeNumber: "EHS-003",
      department: "Environmental Health & Safety (EHS)",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@opmaint.com",
      name: "Tanzeel Admin",
      passwordHash,
      role: UserRole.ADMIN,
      badgeNumber: "SYS-001",
      department: "CMMS Engineering & IT",
    },
  });

  console.log("✅ Seeded 4 Users (Requester, Area Owner, Safety Officer, Admin)");

  // 2. Create Plants
  const plant1 = await prisma.plant.create({
    data: {
      name: "Chennai Petrochemical Complex (CPCL)",
      code: "CPCL-MAA",
      location: "Manali Industrial Corridor, Chennai, TN",
    },
  });

  const plant2 = await prisma.plant.create({
    data: {
      name: "Sriperumbudur Automotive Facility",
      code: "SPBD-AUTO",
      location: "SIPCOT Industrial Park, Sriperumbudur, TN",
    },
  });

  console.log("✅ Seeded 2 Plants");

  // 3. Create Areas
  const boilerArea = await prisma.area.create({
    data: {
      name: "Boiler House & Utilities",
      code: "BH-UTL",
      plantId: plant1.id,
      owners: {
        connect: { id: areaOwner.id },
      },
    },
  });

  const distArea = await prisma.area.create({
    data: {
      name: "Hydrocarbon Distillation Unit",
      code: "HCD-U1",
      plantId: plant1.id,
    },
  });

  const tankFarmArea = await prisma.area.create({
    data: {
      name: "Chemical Tank Farm & Bulk Storage",
      code: "TF-BLK",
      plantId: plant1.id,
    },
  });

  const substationArea = await prisma.area.create({
    data: {
      name: "Substation #2 (Electrical Distribution)",
      code: "SUB-02",
      plantId: plant2.id,
    },
  });

  const pressArea = await prisma.area.create({
    data: {
      name: "Heavy Stamping & Press Shop",
      code: "PRS-01",
      plantId: plant2.id,
    },
  });

  // Assign areaOwner to Boiler House
  await prisma.user.update({
    where: { id: areaOwner.id },
    data: { assignedAreaId: boilerArea.id },
  });

  console.log("✅ Seeded 5 Plant Areas");

  // 4. Create Equipment
  const boiler = await prisma.equipment.create({
    data: {
      name: "High Pressure Steam Boiler B-101",
      tagNumber: "EQ-BLR-101",
      criticality: "CRITICAL",
      areaId: boilerArea.id,
    },
  });

  const compressor = await prisma.equipment.create({
    data: {
      name: "Main Air Compressor Unit K-301",
      tagNumber: "EQ-CMP-301",
      criticality: "MEDIUM",
      areaId: boilerArea.id,
    },
  });

  const column = await prisma.equipment.create({
    data: {
      name: "Crude Distillation Column C-201",
      tagNumber: "EQ-COL-201",
      criticality: "CRITICAL",
      areaId: distArea.id,
    },
  });

  const pipeRack = await prisma.equipment.create({
    data: {
      name: "Inter-Unit Piperack Line PR-12",
      tagNumber: "EQ-PRK-012",
      criticality: "HIGH",
      areaId: distArea.id,
    },
  });

  const tank = await prisma.equipment.create({
    data: {
      name: "Bulk Storage Tank T-402 (Hydrocarbon Slop)",
      tagNumber: "EQ-TNK-402",
      criticality: "CRITICAL",
      areaId: tankFarmArea.id,
    },
  });

  const mcc = await prisma.equipment.create({
    data: {
      name: "415V Motor Control Center MCC-04",
      tagNumber: "EQ-MCC-004",
      criticality: "HIGH",
      areaId: substationArea.id,
    },
  });

  const press = await prisma.equipment.create({
    data: {
      name: "1200T Hydraulic Stamping Press P-01",
      tagNumber: "EQ-PRS-001",
      criticality: "MEDIUM",
      areaId: pressArea.id,
    },
  });

  console.log("✅ Seeded 7 Equipment items");

  // Helper timestamps
  const now = new Date();
  const past2h = new Date(now.getTime() - 2 * 3600000);
  const past4h = new Date(now.getTime() - 4 * 3600000);
  const past24h = new Date(now.getTime() - 24 * 3600000);
  const future1h = new Date(now.getTime() + 1 * 3600000);
  const future45m = new Date(now.getTime() + 45 * 60000);
  const future3h = new Date(now.getTime() + 3 * 3600000);
  const future8h = new Date(now.getTime() + 8 * 3600000);
  const future24h = new Date(now.getTime() + 24 * 3600000);

  // Digital signature mockup string for seeded approvals
  const mockSignature = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M20,40 Q60,10 100,35 T180,25' fill='none' stroke='%230f172a' stroke-width='2'/></svg>";

  // 5. Seed Permits Across All Statuses

  // Permit 1: DRAFT (Hot Work)
  const p1 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-HW-2026-0001",
      title: "Weld Support Bracket onto Piperack Line PR-12",
      description: "SMAW welding of heavy unistrut steel support bracket onto 8-inch hydrocarbon transfer header piperack.",
      type: PermitType.HOT_WORK,
      status: PermitStatus.DRAFT,
      plantId: plant1.id,
      areaId: distArea.id,
      equipmentId: pipeRack.id,
      requesterId: requester.id,
      contractorName: "Apex Industrial Mechanical Services",
      crewCount: 3,
      supervisorName: "Rajesh Kumar",
      supervisorContact: "+91 98401 23456",
      plannedStartTime: future3h,
      plannedEndTime: future8h,
      hazards: JSON.stringify(["fire_explosion", "falling_hot_slag", "toxic_fumes"]),
      ppeRequired: JSON.stringify(["welding_helmet", "leather_gloves", "leather_apron", "safety_shoes"]),
      precautionsChecklist: JSON.stringify([
        { id: "hw_p1", text: "Flammables removed within 10m radius", checked: true },
        { id: "hw_p2", text: "Floor drains covered with wet fire blanket", checked: true },
        { id: "hw_p3", text: "DCP fire extinguisher stationed on site", checked: false },
      ]),
      typeSpecificData: JSON.stringify({
        hotWorkType: "welding",
        fireWatchAssigned: "V. Selvam (FW-09)",
        fireExtinguisherType: "DCP",
        combustiblesClearedRadius: 10,
        gasTestLelPercent: 0,
        gasTestO2Percent: 20.9,
        gasTestTestedAt: past2h.toISOString(),
        gasTesterName: "S. Murugan",
      }),
    },
  });

  await prisma.permitAuditLog.create({
    data: {
      permitId: p1.id,
      userId: requester.id,
      action: "CREATED",
      fromStatus: null,
      toStatus: "DRAFT",
      comment: "Permit draft created for pipe rack bracket welding.",
    },
  });

  // Permit 2: PENDING_APPROVAL (Confined Space)
  const p2 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-CS-2026-0002",
      title: "Annual Sludge Desilting & Internal Wall Inspection in Tank T-402",
      description: "Entry through bottom Manway MW-01 for high-pressure washing, sludge removal, and ultrasonic wall thickness testing.",
      type: PermitType.CONFINED_SPACE,
      status: PermitStatus.PENDING_APPROVAL,
      plantId: plant1.id,
      areaId: tankFarmArea.id,
      equipmentId: tank.id,
      requesterId: requester.id,
      contractorName: "CleanEnviron Tank Specialists",
      crewCount: 4,
      supervisorName: "G. Ranganathan",
      supervisorContact: "+91 98402 78901",
      plannedStartTime: future3h,
      plannedEndTime: future24h,
      hazards: JSON.stringify(["asphyxiation", "toxic_atmosphere", "engulfment", "heat_stress"]),
      ppeRequired: JSON.stringify(["scba_escape", "full_harness", "4gas_monitor", "intrinsically_safe_light"]),
      precautionsChecklist: JSON.stringify([
        { id: "cs_p1", text: "Mechanical blinds installed on all feed nozzles", checked: true },
        { id: "cs_p2", text: "Continuous positive forced ventilation operating", checked: true },
        { id: "cs_p3", text: "Atmosphere tested at 3 levels (Top, Middle, Bottom)", checked: true },
        { id: "cs_p4", text: "Retrieval tripod and winch deployed at entry manway", checked: true },
        { id: "cs_p5", text: "Standby attendant briefed and stationed", checked: true },
      ]),
      typeSpecificData: JSON.stringify({
        spaceId: "Storage Tank T-402",
        entryPoint: "Manway MW-01 (South Grade)",
        atmosphericTestO2: 20.8,
        atmosphericTestLel: 0,
        atmosphericTestH2sPpm: 0,
        atmosphericTestCoPpm: 2,
        atmosphericTestTime: past2h.toISOString(),
        atmosphericTesterName: "V. Krishnan (Industrial Hygienist)",
        standbyAttendantName: "K. Balaji (Badge #HA-302)",
        rescuePlan: "Tripod with retrieval winch mounted, emergency SCBA present, plant rescue team notified on Channel 4.",
        ventilationMethod: "Continuous 2500 CFM explosion-proof forced air blower",
        entryExitLogSummary: "2 entrants planned: P. Kumar, R. Sharma",
      }),
      approvals: {
        create: [
          {
            role: "AREA_OWNER",
            status: "PENDING",
          },
          {
            role: "SAFETY_OFFICER",
            status: "PENDING",
          },
        ],
      },
    },
  });

  await prisma.permitAuditLog.create({
    data: {
      permitId: p2.id,
      userId: requester.id,
      action: "SUBMITTED",
      fromStatus: "DRAFT",
      toStatus: "PENDING_APPROVAL",
      comment: "Submitted for Area Owner and Safety Officer sign-offs.",
    },
  });

  // Permit 3: APPROVED (Electrical LOTO - Planned to start in 2 hours)
  const p3 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-EL-2026-0003",
      title: "MCC-04 415V Main Contactor Replacement & Busbar Torquing",
      description: "De-energization and isolation of Feeder Busbar 2 to replace degraded ABB vacuum contactor.",
      type: PermitType.ELECTRICAL_LOTO,
      status: PermitStatus.APPROVED,
      plantId: plant2.id,
      areaId: substationArea.id,
      equipmentId: mcc.id,
      requesterId: requester.id,
      contractorName: "Voltech Power Engineering",
      crewCount: 2,
      supervisorName: "N. Srinivasan",
      supervisorContact: "+91 97890 11223",
      plannedStartTime: future1h,
      plannedEndTime: future8h,
      hazards: JSON.stringify(["electrocution", "arc_flash", "unexpected_start"]),
      ppeRequired: JSON.stringify(["arc_flash_suit", "dielectric_gloves", "esd_boots", "arc_clothing"]),
      precautionsChecklist: JSON.stringify([
        { id: "loto_p1", text: "Primary breaker racked out with air gap visible", checked: true },
        { id: "loto_p2", text: "Lockout hasps and danger tags applied", checked: true },
        { id: "loto_p3", text: "Zero voltage verified with calibrated multimeter", checked: true },
        { id: "loto_p4", text: "Attempted restart button test confirmed dead", checked: true },
      ]),
      typeSpecificData: JSON.stringify({
        equipmentTag: "EQ-MCC-004",
        voltageLevel: "415V 3-Phase AC",
        isolationPointsList: "1. Incoming Breaker Q1 racked out\n2. Auxiliary 110V DC control fuse removed",
        lockNumbers: "LOCK-RED-114, LOCK-RED-115",
        tagNumbers: "DANGER-TAG-8821, DANGER-TAG-8822",
        earthingApplied: true,
        testedDeadByWhom: "M. Natarajan (Licensed Senior Electrician)",
      }),
      approvals: {
        create: [
          {
            role: "AREA_OWNER",
            approverId: areaOwner.id,
            status: "APPROVED",
            decisionDate: past4h,
            comment: "Isolation boundary verified with electrical single-line diagram.",
            signatureDataUrl: mockSignature,
          },
          {
            role: "SAFETY_OFFICER",
            approverId: safetyOfficer.id,
            status: "APPROVED",
            decisionDate: past2h,
            comment: "Arc flash risk assessment confirmed Cat 2 PPE sufficient.",
            signatureDataUrl: mockSignature,
          },
        ],
      },
    },
  });

  await prisma.permitAuditLog.create({
    data: {
      permitId: p3.id,
      userId: safetyOfficer.id,
      action: "APPROVED",
      fromStatus: "PENDING_APPROVAL",
      toStatus: "APPROVED",
      comment: "All required sign-offs completed. Permit authorized to activate at scheduled start time.",
    },
  });

  // Permit 4: ACTIVE (Working at Height - 14m elevation on C-201)
  const p4 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-WAH-2026-0004",
      title: "Column C-201 Thermal Cladding & Insulation Overhaul at 14m",
      description: "Replacement of mineral wool insulation blankets and stainless steel cladding on distillation column shell.",
      type: PermitType.WORKING_AT_HEIGHT,
      status: PermitStatus.ACTIVE,
      plantId: plant1.id,
      areaId: distArea.id,
      equipmentId: column.id,
      requesterId: requester.id,
      contractorName: "SkyHigh Scaffolding & Insulation Ltd",
      crewCount: 4,
      supervisorName: "B. Mohan",
      supervisorContact: "+91 94440 98765",
      plannedStartTime: past2h,
      plannedEndTime: future8h,
      actualStartTime: past2h,
      hazards: JSON.stringify(["fall_from_height", "falling_objects", "high_winds"]),
      ppeRequired: JSON.stringify(["fall_harness", "chin_strap_helmet", "tool_tethers", "anti_slip_boots"]),
      precautionsChecklist: JSON.stringify([
        { id: "wah_p1", text: "Scaffold green tag certified valid", checked: true },
        { id: "wah_p2", text: "100% tie-off dual lanyards inspected", checked: true },
        { id: "wah_p3", text: "Drop zone barricaded below with danger tape", checked: true },
      ]),
      typeSpecificData: JSON.stringify({
        heightInMetres: 14.5,
        accessMethod: "scaffold",
        fallArrestEquipment: "Miller Revolution Full Body Harness with twin shock absorbers",
        anchorPointChecked: true,
        barricadingBelow: true,
      }),
      approvals: {
        create: [
          {
            role: "AREA_OWNER",
            approverId: areaOwner.id,
            status: "APPROVED",
            decisionDate: past4h,
            comment: "Access scaffold certified safe for 4 men.",
            signatureDataUrl: mockSignature,
          },
          {
            role: "SAFETY_OFFICER",
            approverId: safetyOfficer.id,
            status: "APPROVED",
            decisionDate: past2h,
            comment: "Wind speeds verified under 25 km/h limit.",
            signatureDataUrl: mockSignature,
          },
        ],
      },
    },
  });

  await prisma.workLog.create({
    data: {
      permitId: p4.id,
      userId: requester.id,
      loggedAt: past2h,
      summary: "Crew toolbox talk completed. 4 technicians harnessed and scaffold climber tag logged.",
      workersPresent: 4,
    },
  });

  await prisma.permitAuditLog.create({
    data: {
      permitId: p4.id,
      userId: requester.id,
      action: "ACTIVATED",
      fromStatus: "APPROVED",
      toStatus: "ACTIVE",
      comment: "Permit activated. Work underway on scaffold platform level 3.",
    },
  });

  // Permit 5: ACTIVE - EXPIRING SOON! (45 mins remaining - triggers orange warning countdown)
  const p5 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-HW-2026-0005",
      title: "Steam Boiler B-101 Blowdown Valve Flange Weld Repair",
      description: "Repair cracked seal weld on 300# blowdown line flange adjacent to steam drum.",
      type: PermitType.HOT_WORK,
      status: PermitStatus.ACTIVE,
      plantId: plant1.id,
      areaId: boilerArea.id,
      equipmentId: boiler.id,
      requesterId: requester.id,
      contractorName: "Apex Industrial Mechanical Services",
      crewCount: 2,
      supervisorName: "Rajesh Kumar",
      supervisorContact: "+91 98401 23456",
      plannedStartTime: past4h,
      plannedEndTime: future45m, // EXPIRES IN 45 MINUTES!
      actualStartTime: past4h,
      hazards: JSON.stringify(["fire_explosion", "toxic_fumes", "radiation_burns"]),
      ppeRequired: JSON.stringify(["welding_helmet", "leather_gloves", "leather_apron", "safety_shoes"]),
      precautionsChecklist: JSON.stringify([
        { id: "hw_p1", text: "Area degreased and washed down", checked: true },
        { id: "hw_p2", text: "Fire watch stationed with pressurized water hose", checked: true },
        { id: "hw_p3", text: "Zero LEL confirmed", checked: true },
      ]),
      typeSpecificData: JSON.stringify({
        hotWorkType: "welding",
        fireWatchAssigned: "K. Mohan (FW-02)",
        fireExtinguisherType: "DCP",
        combustiblesClearedRadius: 12,
        gasTestLelPercent: 0,
        gasTestO2Percent: 20.9,
        gasTestTestedAt: past4h.toISOString(),
        gasTesterName: "S. Murugan",
      }),
      approvals: {
        create: [
          {
            role: "AREA_OWNER",
            approverId: areaOwner.id,
            status: "APPROVED",
            decisionDate: past4h,
            comment: "Boiler isolated and depressurized to 0 barg.",
            signatureDataUrl: mockSignature,
          },
          {
            role: "SAFETY_OFFICER",
            approverId: safetyOfficer.id,
            status: "APPROVED",
            decisionDate: past4h,
            comment: "Hot work authorized.",
            signatureDataUrl: mockSignature,
          },
        ],
      },
    },
  });

  await prisma.permitAuditLog.create({
    data: {
      permitId: p5.id,
      userId: requester.id,
      action: "ACTIVATED",
      fromStatus: "APPROVED",
      toStatus: "ACTIVE",
      comment: "Permit active. Expiring in 45 minutes.",
    },
  });

  // Permit 6: ACTIVE (Excavation - 5th type proof!)
  const p6 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-EXC-2026-0006",
      title: "Trench Excavation for 33kV Underground Feeder Duct Bank",
      description: "Mechanical backhoe trenching to 1.8m depth for high-voltage cable conduit installation.",
      type: PermitType.EXCAVATION,
      status: PermitStatus.ACTIVE,
      plantId: plant2.id,
      areaId: substationArea.id,
      equipmentId: mcc.id,
      requesterId: requester.id,
      contractorName: "L&T Civil Infrastructure",
      crewCount: 5,
      supervisorName: "D. Velu",
      supervisorContact: "+91 94441 55667",
      plannedStartTime: past2h,
      plannedEndTime: future8h,
      actualStartTime: past2h,
      hazards: JSON.stringify(["cave_in", "underground_utilities", "hazardous_atmosphere"]),
      ppeRequired: JSON.stringify(["exc_hard_hat", "hi_vis_vest", "steel_toe"]),
      precautionsChecklist: JSON.stringify([
        { id: "exc_p1", text: "Cable detector scan completed and marked with yellow paint", checked: true },
        { id: "exc_p2", text: "Trench box installed before workers enter", checked: true },
        { id: "exc_p3", text: "Egress ladders placed every 6m", checked: true },
      ]),
      typeSpecificData: JSON.stringify({
        excavationDepthMeters: 1.8,
        soilType: "Type B (Silt/Sandy Loam)",
        undergroundUtilityClearance: true,
        shoringOrBenchMethod: "Trench Box",
        safeLadderDistanceMeters: 6.0,
        spoilPileDistanceMeters: 1.5,
      }),
      approvals: {
        create: [
          {
            role: "AREA_OWNER",
            approverId: areaOwner.id,
            status: "APPROVED",
            decisionDate: past4h,
            comment: "Underground cable scan clearance verified.",
            signatureDataUrl: mockSignature,
          },
          {
            role: "SAFETY_OFFICER",
            approverId: safetyOfficer.id,
            status: "APPROVED",
            decisionDate: past2h,
            comment: "Trench box and shoring inspected.",
            signatureDataUrl: mockSignature,
          },
        ],
      },
    },
  });

  // Permit 7: SUSPENDED (Confined Space - suspended due to toxic gas pocket detected)
  const p7 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-CS-2026-0007",
      title: "Boiler B-101 Water Drum Internal Video Borescope Inspection",
      description: "Entry through mud drum manway for waterside tube sheet scale inspection.",
      type: PermitType.CONFINED_SPACE,
      status: PermitStatus.SUSPENDED,
      plantId: plant1.id,
      areaId: boilerArea.id,
      equipmentId: boiler.id,
      requesterId: requester.id,
      contractorName: "NDT Tech India Ltd",
      crewCount: 3,
      supervisorName: "P. Muthu",
      supervisorContact: "+91 98403 44556",
      plannedStartTime: past4h,
      plannedEndTime: future8h,
      actualStartTime: past4h,
      suspensionReason: "EMERGENCY SUSPENSION: Continuous 4-gas monitor alarmed at 12 ppm H2S inside mud drum. Evacuated immediately.",
      hazards: JSON.stringify(["asphyxiation", "toxic_atmosphere"]),
      ppeRequired: JSON.stringify(["scba_escape", "full_harness", "4gas_monitor"]),
      precautionsChecklist: JSON.stringify([
        { id: "cs_p1", text: "Forced ventilation fan operating", checked: true },
      ]),
      typeSpecificData: JSON.stringify({
        spaceId: "Boiler B-101 Mud Drum",
        entryPoint: "Drum Manway MW-North",
        atmosphericTestO2: 19.6,
        atmosphericTestLel: 0,
        atmosphericTestH2sPpm: 12, // HIGH!
        atmosphericTestCoPpm: 8,
        atmosphericTestTime: past4h.toISOString(),
        atmosphericTesterName: "V. Krishnan",
        standbyAttendantName: "A. Joseph",
        rescuePlan: "Tripod with hoist",
        ventilationMethod: "1800 CFM axial blower",
      }),
      approvals: {
        create: [
          { role: "AREA_OWNER", status: "APPROVED", approverId: areaOwner.id, decisionDate: past4h },
          { role: "SAFETY_OFFICER", status: "APPROVED", approverId: safetyOfficer.id, decisionDate: past4h },
        ],
      },
    },
  });

  await prisma.permitAuditLog.create({
    data: {
      permitId: p7.id,
      userId: safetyOfficer.id,
      action: "SUSPENDED",
      fromStatus: "ACTIVE",
      toStatus: "SUSPENDED",
      comment: "Safety Officer suspended permit immediately: H2S gas alarm triggered at 12 ppm. All workers evacuated.",
    },
  });

  // Permit 8: REJECTED (Hot Work rejected due to mandatory reason)
  const p8 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-HW-2026-0008",
      title: "Torch Cutting of Degraded Motor Base Frame on Compressor K-301",
      description: "Oxy-acetylene cutting of 16mm corroded mounting flange on lube oil skid.",
      type: PermitType.HOT_WORK,
      status: PermitStatus.REJECTED,
      plantId: plant1.id,
      areaId: boilerArea.id,
      equipmentId: compressor.id,
      requesterId: requester.id,
      contractorName: "FastCut Services",
      crewCount: 2,
      supervisorName: "Rajesh Kumar",
      supervisorContact: "+91 98401 23456",
      plannedStartTime: future3h,
      plannedEndTime: future8h,
      rejectionReason: "REJECTED BY SAFETY OFFICER: Compressor lube oil drip tray contains standing hydrocarbon oil residue within 2.5m of proposed cutting torch. Flammables must be drained, degreased, and reinspected before permit can be reconsidered.",
      hazards: JSON.stringify(["fire_explosion"]),
      ppeRequired: JSON.stringify(["welding_helmet", "leather_gloves"]),
      precautionsChecklist: JSON.stringify([]),
      typeSpecificData: JSON.stringify({
        hotWorkType: "cutting",
        fireWatchAssigned: "None",
        fireExtinguisherType: "DCP",
        combustiblesClearedRadius: 2.5,
        gasTestLelPercent: 4.5,
        gasTestO2Percent: 20.8,
        gasTestTestedAt: past2h.toISOString(),
        gasTesterName: "S. Murugan",
      }),
      approvals: {
        create: [
          {
            role: "SAFETY_OFFICER",
            approverId: safetyOfficer.id,
            status: "REJECTED",
            decisionDate: past2h,
            comment: "Standing flammable oil present. Severe fire danger.",
          },
        ],
      },
    },
  });

  await prisma.permitAuditLog.create({
    data: {
      permitId: p8.id,
      userId: safetyOfficer.id,
      action: "REJECTED",
      fromStatus: "PENDING_APPROVAL",
      toStatus: "REJECTED",
      comment: "Permit rejected: Combustible oil residue present in drip trays within 3m.",
    },
  });

  // Permit 9: CLOSED (Awaiting Safety Officer verification)
  const p9 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-EL-2026-0009",
      title: "1200T Hydraulic Stamping Press P-01 Emergency Stop Button Rewiring",
      description: "Dual channel Category 4 E-stop safety relay replacement and field cable pull.",
      type: PermitType.ELECTRICAL_LOTO,
      status: PermitStatus.CLOSED,
      plantId: plant2.id,
      areaId: pressArea.id,
      equipmentId: press.id,
      requesterId: requester.id,
      contractorName: "Apex Automation",
      crewCount: 2,
      supervisorName: "Rajesh Kumar",
      supervisorContact: "+91 98401 23456",
      plannedStartTime: past24h,
      plannedEndTime: past2h,
      actualStartTime: past24h,
      actualEndTime: past2h,
      completionNotes: "Work 100% complete. E-stop buttons tested and functional. All tools removed from press bed. LOTO padlocks removed and returned to supervisor board.",
      hazards: JSON.stringify(["electrocution", "unexpected_start"]),
      ppeRequired: JSON.stringify(["dielectric_gloves", "esd_boots"]),
      precautionsChecklist: JSON.stringify([]),
      typeSpecificData: JSON.stringify({
        equipmentTag: "EQ-PRS-001",
        voltageLevel: "24V DC / 415V AC",
        isolationPointsList: "Main disconnect breaker CB-01 opened and locked",
        lockNumbers: "LOCK-BLU-09",
        tagNumbers: "TAG-SAFE-101",
        earthingApplied: false,
        testedDeadByWhom: "R. Dinesh (Automation Tech)",
      }),
      approvals: {
        create: [
          { role: "AREA_OWNER", status: "APPROVED", approverId: areaOwner.id, decisionDate: past24h },
          { role: "SAFETY_OFFICER", status: "APPROVED", approverId: safetyOfficer.id, decisionDate: past24h },
        ],
      },
    },
  });

  await prisma.permitAuditLog.create({
    data: {
      permitId: p9.id,
      userId: requester.id,
      action: "CLOSED",
      fromStatus: "ACTIVE",
      toStatus: "CLOSED",
      comment: "Requester completed work, removed LOTO locks, and closed permit. Awaiting safety officer verification.",
    },
  });

  // Permit 10: CLOSED_VERIFIED (Completed lifecycle)
  const p10 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-WAH-2026-0010",
      title: "Substation #2 Corrugated Roof Sheet Replacement & Gutter Cleaning",
      description: "Replace rusted GI roof sheets and seal flashing over Transformer Yard #2 at 6.2m elevation.",
      type: PermitType.WORKING_AT_HEIGHT,
      status: PermitStatus.CLOSED_VERIFIED,
      plantId: plant2.id,
      areaId: substationArea.id,
      equipmentId: mcc.id,
      requesterId: requester.id,
      contractorName: "SkyHigh Scaffolding Ltd",
      crewCount: 3,
      supervisorName: "Rajesh Kumar",
      supervisorContact: "+91 98401 23456",
      plannedStartTime: past24h,
      plannedEndTime: past4h,
      actualStartTime: past24h,
      actualEndTime: past4h,
      completionNotes: "All 12 roof sheets fastened and water tested. Fall arrest lifelines de-rigged and stowed.",
      verificationNotes: "Safety Officer physical walk-down completed: Roof perimeter clean, no scrap sheets left on gutters, drop zone barricading removed, zero safety incidents.",
      hazards: JSON.stringify(["fall_from_height", "falling_objects"]),
      ppeRequired: JSON.stringify(["fall_harness", "chin_strap_helmet"]),
      precautionsChecklist: JSON.stringify([]),
      typeSpecificData: JSON.stringify({
        heightInMetres: 6.2,
        accessMethod: "MEWP",
        fallArrestEquipment: "Miller dual lanyard harness",
        anchorPointChecked: true,
        barricadingBelow: true,
      }),
      approvals: {
        create: [
          { role: "AREA_OWNER", status: "APPROVED", approverId: areaOwner.id, decisionDate: past24h },
          { role: "SAFETY_OFFICER", status: "APPROVED", approverId: safetyOfficer.id, decisionDate: past24h },
        ],
      },
    },
  });

  await prisma.permitAuditLog.create({
    data: {
      permitId: p10.id,
      userId: safetyOfficer.id,
      action: "CLOSED_VERIFIED",
      fromStatus: "CLOSED",
      toStatus: "CLOSED_VERIFIED",
      comment: "Safety Officer verified site clean and officially verified permit closure.",
    },
  });

  // Permit 11: EXPIRED (Elapsed validity window)
  const p11 = await prisma.permit.create({
    data: {
      permitNumber: "PTW-HW-2026-0011",
      title: "Nitrogen Line Flange Hot Torquing at Crude Distillation",
      description: "Hot bolting replacement of stud bolts on 4-inch Nitrogen line at C-201.",
      type: PermitType.HOT_WORK,
      status: PermitStatus.EXPIRED,
      plantId: plant1.id,
      areaId: distArea.id,
      equipmentId: column.id,
      requesterId: requester.id,
      contractorName: "Apex Mechanical",
      crewCount: 2,
      supervisorName: "Rajesh Kumar",
      supervisorContact: "+91 98401 23456",
      plannedStartTime: past24h,
      plannedEndTime: past4h, // Validity window expired!
      hazards: JSON.stringify(["fire_explosion"]),
      ppeRequired: JSON.stringify(["welding_helmet", "leather_gloves"]),
      precautionsChecklist: JSON.stringify([]),
      typeSpecificData: JSON.stringify({
        hotWorkType: "grinding",
        fireWatchAssigned: "V. Selvam",
        fireExtinguisherType: "DCP",
        combustiblesClearedRadius: 10,
        gasTestLelPercent: 0,
        gasTestO2Percent: 20.9,
        gasTestTestedAt: past24h.toISOString(),
        gasTesterName: "S. Murugan",
      }),
    },
  });

  await prisma.permitAuditLog.create({
    data: {
      permitId: p11.id,
      userId: null,
      action: "EXPIRED",
      fromStatus: "APPROVED",
      toStatus: "EXPIRED",
      comment: "Permit validity window passed without extension. Status automatically transitioned to EXPIRED.",
    },
  });

  console.log("✅ Seeded 11 Permits across all statuses (DRAFT, PENDING, APPROVED, ACTIVE, EXPIRING_SOON, SUSPENDED, REJECTED, CLOSED, CLOSED_VERIFIED, EXPIRED)");
  console.log("🎉 Database seeding complete! Ready for evaluation.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
