import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Fetch notifications for the logged-in user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { orgId: session.user.orgId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = await prisma.notification.count({
    where: { orgId: session.user.orgId, userId: session.user.id, isRead: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

// PATCH: Mark notification(s) as read
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { ids, markAllRead } = body as { ids?: string[]; markAllRead?: boolean };

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { orgId: session.user.orgId, userId: session.user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ message: "All notifications marked as read." });
  }

  if (ids && ids.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: session.user.id, orgId: session.user.orgId },
      data: { isRead: true },
    });
    return NextResponse.json({ message: "Notifications marked as read." });
  }

  return NextResponse.json({ error: "Provide ids or markAllRead=true" }, { status: 400 });
}