import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPermitById } from "@/lib/permits/service";
import { prisma } from "@/lib/db";
import { createAuditEntry } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const permit = await getPermitById(params.id);
    if (!permit) {
      return NextResponse.json({ error: "Permit not found" }, { status: 404 });
    }
    return NextResponse.json({ permit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permit = await prisma.permit.findUnique({
      where: { id: params.id },
    });

    if (!permit) {
      return NextResponse.json({ error: "Permit not found" }, { status: 404 });
    }

    if (["CLOSED", "CLOSED_VERIFIED", "EXPIRED", "REJECTED", "CANCELLED"].includes(permit.status)) {
      return NextResponse.json(
        { error: `Cannot edit permit in terminal or closed state '${permit.status}'.` },
        { status: 400 }
      );
    }

    const updates = await req.json();

    // Track field edits for immutable audit log
    for (const [key, newVal] of Object.entries(updates)) {
      const oldVal = (permit as any)[key];
      const oldValStr = typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal ?? "");
      const newValStr = typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal ?? "");

      if (oldValStr !== newValStr) {
        await createAuditEntry({
          permitId: permit.id,
          userId: session.userId,
          action: "FIELD_UPDATED",
          fromStatus: permit.status,
          toStatus: permit.status,
          fieldName: key,
          fromValue: oldValStr.slice(0, 500),
          toValue: newValStr.slice(0, 500),
          comment: `Field '${key}' was modified by ${session.name}.`,
        });
      }
    }

    const updated = await prisma.permit.update({
      where: { id: params.id },
      data: updates,
    });

    return NextResponse.json({ success: true, permit: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
