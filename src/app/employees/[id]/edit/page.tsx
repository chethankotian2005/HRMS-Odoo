import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { can, getPermittedEmployeeFields } from "@/lib/rbac/policy";
import { EditEmployeeForm } from "./edit-form";

export default async function EditEmployeePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect("/login");

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
  });

  if (!employee || employee.orgId !== session.user.orgId) {
    return notFound();
  }

  // Check if current user is allowed to edit this employee at all
  const hasAccess = can(session.user as any, 'update', { type: 'Employee', ownerId: employee.id, orgId: employee.orgId });
  
  if (!hasAccess && session.user.role === 'EMPLOYEE' && session.user.employeeId !== employee.id) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Forbidden</h1>
        <p>You do not have permission to edit this profile.</p>
      </div>
    );
  }

  const permittedFields = getPermittedEmployeeFields(session.user as any);

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Edit Profile</h1>
      <EditEmployeeForm employee={employee as any} permittedFields={permittedFields} />
    </div>
  );
}
