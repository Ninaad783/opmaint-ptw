import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listPermits, createPermit } from "@/lib/permits/service";
import { prisma } from "@/lib/db";
import { UserContext } from "@/lib/state-machine";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session = await getCurrentUser();

    // Fallback user if not logged in
    let currentUser: UserContext | undefined;
    if (session) {
      currentUser = {
        id: session.userId,
        name: session.name,
        role: session.role,
        assignedAreaId: session.assignedAreaId,
      };
    } else {
      const defaultUser = await prisma.user.findFirst({ where: { role: "REQUESTER" } });
      if (defaultUser) {
        currentUser = {
          id: defaultUser.id,
          name: defaultUser.name,
          role: defaultUser.role,
          assignedAreaId: defaultUser.assignedAreaId,
        };
      }
    }

    const filters = {
      status: searchParams.get("status") || "ALL",
      type: searchParams.get("type") || "ALL",
      plantId: searchParams.get("plantId") || "ALL",
      areaId: searchParams.get("areaId") || "ALL",
      search: searchParams.get("search") || "",
      myApprovalsOnly: searchParams.get("myApprovalsOnly") === "true",
      currentUser,
    };

    const data = await listPermits(filters);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    let currentUser: UserContext;

    if (session) {
      currentUser = {
        id: session.userId,
        name: session.name,
        role: session.role,
        assignedAreaId: session.assignedAreaId,
      };
    } else {
      const defaultUser = await prisma.user.findFirst({ where: { role: "REQUESTER" } });
      if (!defaultUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      currentUser = {
        id: defaultUser.id,
        name: defaultUser.name,
        role: defaultUser.role,
        assignedAreaId: defaultUser.assignedAreaId,
      };
    }

    const body = await req.json();
    const permit = await createPermit(body, currentUser);

    return NextResponse.json({ success: true, permit }, { status: 201 });
  } catch (error: any) {
    console.error("Create permit error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
