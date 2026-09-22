import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectPermitConflicts, ConflictPermitCandidate } from "@/lib/safety/conflicts";
import { PermitType, PermitStatus } from "@/lib/permit-types/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      type,
      plantId,
      areaId,
      equipmentId,
      plannedStartTime,
      plannedEndTime,
    } = body;

    if (!type || !plantId || !areaId || !plannedStartTime || !plannedEndTime) {
      return NextResponse.json({ conflicts: [] });
    }

    // Fetch existing active or pending permits in the same plant
    const existing = await prisma.permit.findMany({
      where: {
        plantId,
        status: {
          in: ["ACTIVE", "APPROVED", "PENDING_APPROVAL", "SUSPENDED"],
        },
      },
      include: {
        plant: true,
        area: true,
        equipment: true,
      },
    });

    const candidates: ConflictPermitCandidate[] = existing.map((p) => ({
      id: p.id,
      permitNumber: p.permitNumber,
      title: p.title,
      type: p.type as PermitType,
      status: p.status as PermitStatus,
      plantId: p.plantId,
      plantName: p.plant.name,
      areaId: p.areaId,
      areaName: p.area.name,
      equipmentId: p.equipmentId,
      equipmentName: p.equipment?.name,
      plannedStartTime: p.plannedStartTime,
      plannedEndTime: p.plannedEndTime,
    }));

    const conflicts = detectPermitConflicts(
      {
        id,
        type: type as PermitType,
        plantId,
        areaId,
        equipmentId,
        plannedStartTime,
        plannedEndTime,
      },
      candidates
    );

    return NextResponse.json({ conflicts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
