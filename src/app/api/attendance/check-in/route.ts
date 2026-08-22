import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { can } from "@/lib/rbac/policy";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180; // phi, lambda in radians
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.employeeId) {
    return NextResponse.json({ error: "No employee profile linked to this account." }, { status: 403 });
  }

  // RBAC: employee can create their own attendance record
  if (!can(session.user, "create", { type: "AttendanceRecord", ownerId: session.user.employeeId, orgId: session.user.orgId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { lat, lng, screen, timezone } = body;

  if (lat === undefined || lng === undefined) {
    return NextResponse.json({ error: "Location (lat, lng) is required." }, { status: 400 });
  }

  // Geofencing Check
  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { officeLat: true, officeLng: true, attendanceRadius: true },
  });

  if (org?.officeLat !== null && org?.officeLng !== null && org?.attendanceRadius !== null) {
    const distance = getDistance(lat, lng, org.officeLat, org.officeLng);
    if (distance > org.attendanceRadius) {
      return NextResponse.json(
        { error: `Check-in rejected: you are ${Math.round(distance)} meters away, but must be within ${org.attendanceRadius} meters.` },
        { status: 403 }
      );
    }
  }

  // Device Fingerprinting Check
  const userAgent = req.headers.get("user-agent") || "";
  const fingerprintRaw = `${userAgent}|${screen || ""}|${timezone || ""}`;
  const deviceFingerprint = crypto.createHash("sha256").update(fingerprintRaw).digest("hex");

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let isSuspectedProxy = false;
  // Check if same fingerprint checked in today for a DIFFERENT employee
  const otherCheckins = await prisma.attendanceRecord.findFirst({
    where: {
      deviceFingerprint,
      date: today,
      employeeId: { not: session.user.employeeId },
    },
  });

  if (otherCheckins) {
    isSuspectedProxy = true;
    // Flag the other records too
    await prisma.attendanceRecord.updateMany({
      where: {
        deviceFingerprint,
        date: today,
        employeeId: { not: session.user.employeeId },
      },
      data: { isSuspectedProxy: true },
    });
  }

  try {
    const record = await prisma.attendanceRecord.create({
      data: {
        orgId: session.user.orgId,
        employeeId: session.user.employeeId,
        date: today,
        checkIn: now,
        status: "PRESENT", // Default status, evaluated on check-out
        deviceFingerprint,
        isSuspectedProxy,
      },
    });

    return NextResponse.json({ message: "Checked in successfully", record }, { status: 201 });
  } catch (error: any) {
    // Unique constraint violation for employeeId and date
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Already checked in today." }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
