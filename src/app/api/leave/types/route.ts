import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leaveTypes = await prisma.leaveType.findMany({
    where: { orgId: session.user.orgId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ leaveTypes });
}