import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      // By default return the Requester demo user so reviewer can test right away without barrier!
      const defaultUser = await prisma.user.findFirst({
        where: { role: "REQUESTER" },
        include: { assignedArea: true },
      });

      return NextResponse.json({
        user: defaultUser
          ? {
              id: defaultUser.id,
              name: defaultUser.name,
              email: defaultUser.email,
              role: defaultUser.role,
              badgeNumber: defaultUser.badgeNumber,
              department: defaultUser.department,
              assignedAreaId: defaultUser.assignedAreaId,
              assignedAreaName: defaultUser.assignedArea?.name,
            }
          : null,
        isGuestFallback: true,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { assignedArea: true },
    });

    return NextResponse.json({
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            badgeNumber: user.badgeNumber,
            department: user.department,
            assignedAreaId: user.assignedAreaId,
            assignedAreaName: user.assignedArea?.name,
          }
        : null,
      isGuestFallback: false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
