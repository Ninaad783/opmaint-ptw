import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { executePermitTransition } from "@/lib/permits/service";
import { prisma } from "@/lib/db";
import { StateAction, UserContext } from "@/lib/state-machine";

export async function POST(req: Request, { params }: { params: { id: string } }) {
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
      // If unauthenticated direct API call without cookie, reject with 401
      return NextResponse.json(
        { error: "Authentication required to execute state transition on permit." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const action = body.action as StateAction;

    if (!action) {
      return NextResponse.json(
        { error: "Missing required 'action' in transition payload." },
        { status: 400 }
      );
    }

    const payload = {
      comment: body.comment,
      reason: body.reason,
      signatureDataUrl: body.signatureDataUrl,
      completionNotes: body.completionNotes,
      verificationNotes: body.verificationNotes,
      extensionHours: body.extensionHours,
    };

    const updatedPermit = await executePermitTransition(
      params.id,
      action,
      currentUser,
      payload
    );

    return NextResponse.json({
      success: true,
      action,
      newStatus: updatedPermit.status,
      permit: updatedPermit,
    });
  } catch (error: any) {
    console.error("State transition rejected:", error.message);
    // Return explicit HTTP 400/409 with safety error details
    return NextResponse.json(
      {
        error: error.message,
        rejectedServerSide: true,
      },
      { status: 400 }
    );
  }
}
