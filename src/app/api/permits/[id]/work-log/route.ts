import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addPermitWorkLog } from "@/lib/permits/service";
import { UserContext } from "@/lib/state-machine";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const currentUser: UserContext = {
      id: session.userId,
      name: session.name,
      role: session.role,
      assignedAreaId: session.assignedAreaId,
    };

    const { summary, workersPresent } = await req.json();

    if (!summary || summary.trim().length === 0) {
      return NextResponse.json(
        { error: "Work summary is required." },
        { status: 400 }
      );
    }

    const log = await addPermitWorkLog(
      params.id,
      currentUser,
      summary,
      workersPresent || 1
    );

    return NextResponse.json({ success: true, log }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
