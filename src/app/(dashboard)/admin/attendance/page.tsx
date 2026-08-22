import AdminAttendanceConsole from "@/components/admin/AdminAttendanceConsole";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const metadata = {
  title: "Admin Attendance Console | HRMS",
  description: "Manage and monitor employee attendance.",
};

export default async function AdminAttendancePage() {
  const session = await getServerSession(authOptions);
  
  let departments: { id: string; name: string }[] = [];
  if (session?.user?.orgId) {
    departments = await prisma.department.findMany({
      where: { orgId: session.user.orgId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    });
  }

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto">
      <AdminAttendanceConsole departments={departments} />
    </div>
  );
}
