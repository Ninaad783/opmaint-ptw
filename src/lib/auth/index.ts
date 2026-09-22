import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "../permit-types/types";
import { prisma } from "../db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "opmaint-super-secure-jwt-secret-cmms-ptw-key-2026"
);

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  assignedAreaId?: string | null;
}

export const DEMO_USERS = [
  {
    role: "REQUESTER" as UserRole,
    name: "Rajesh Kumar",
    email: "rajesh.kumar@plant.opmaint.com",
    title: "Mechanical Maintenance Supervisor",
    department: "Plant Maintenance",
    badge: "MNT-402",
  },
  {
    role: "AREA_OWNER" as UserRole,
    name: "Suresh Patel",
    email: "suresh.patel@plant.opmaint.com",
    title: "Area Production Lead (Boiler House & Utilities)",
    department: "Operations",
    badge: "OPS-108",
  },
  {
    role: "SAFETY_OFFICER" as UserRole,
    name: "Ananya Sharma",
    email: "ananya.sharma@plant.opmaint.com",
    title: "Senior Plant EHS Safety Officer",
    department: "Health & Safety (EHS)",
    badge: "EHS-003",
  },
  {
    role: "ADMIN" as UserRole,
    name: "Tanzeel Admin",
    email: "admin@opmaint.com",
    title: "CMMS System Administrator",
    department: "Engineering & IT",
    badge: "SYS-001",
  },
];

export async function createSessionToken(session: AuthSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSession;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("opmaint_session")?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function getUserFromDb(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { assignedArea: true },
  });
}
