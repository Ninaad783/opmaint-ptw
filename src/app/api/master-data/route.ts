import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [plants, areas, equipment, users] = await Promise.all([
      prisma.plant.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.area.findMany({
        include: {
          plant: { select: { id: true, name: true, code: true } },
          owners: { select: { id: true, name: true, email: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.equipment.findMany({
        include: {
          area: {
            select: { id: true, name: true, plant: { select: { id: true, name: true } } },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          badgeNumber: true,
          department: true,
          assignedAreaId: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      plants,
      areas,
      equipment,
      users,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
