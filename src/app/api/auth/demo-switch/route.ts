import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@/lib/permit-types/types";

export async function POST(req: Request) {
  try {
    const { role } = await req.json();

    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { role: role as UserRole },
      include: { assignedArea: true },
    });

    if (!user) {
      return NextResponse.json({ error: `No demo user found for role ${role}` }, { status: 404 });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      assignedAreaId: user.assignedAreaId,
    });

    const cookieStore = cookies();
    cookieStore.set("opmaint_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        badgeNumber: user.badgeNumber,
        department: user.department,
        assignedAreaId: user.assignedAreaId,
        assignedAreaName: user.assignedArea?.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
