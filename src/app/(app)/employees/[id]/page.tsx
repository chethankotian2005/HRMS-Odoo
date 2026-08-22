import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { can } from "@/lib/rbac/policy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect("/login");

  const employee = await prisma.employee.findUnique({
    where: { id: id },
    include: {
      department: true,
      payrollRecords: {
        orderBy: { periodStart: "desc" },
        take: 5,
      },
      documents: true,
    }
  });

  if (!employee || employee.orgId !== session.user.orgId) {
    return notFound();
  }

  // Use central RBAC policy to check if current user can view this profile
  // An employee can view their own, HR/ADMIN can view all.
  const hasAccess = can(session.user as any, 'read', { type: 'Employee', ownerId: employee.id, orgId: employee.orgId });
  
  // Actually everyone in the org can probably *view* basic profiles, but we'll enforce the strict check
  // or allow read access generically. For now we will allow if hasAccess or if it's basic org info.
  // We'll just enforce hasAccess strictly as requested.
  if (!hasAccess && session.user.role === 'EMPLOYEE') {
    // Note: If you want all employees to see each other's basic info, the policy `can()` needs adjusting.
    // For now we will restrict strictly.
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">Forbidden</h1>
        <p>You do not have permission to view this profile.</p>
      </div>
    );
  }

  // Determine if user can edit this profile
  const canEdit = session.user.role === 'ADMIN' || session.user.role === 'HR' || session.user.employeeId === employee.id;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Employee Profile</h1>
        {canEdit && (
          <Link href={`/employees/${employee.id}/edit`}>
            <Button>Edit Profile</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Info & Avatar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="w-32 h-32 relative rounded-full overflow-hidden bg-gray-100 border">
                {employee.avatarUrl ? (
                  <Image src={employee.avatarUrl} alt="Avatar" fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-4xl text-gray-400">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{employee.firstName} {employee.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{employee.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{employee.phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{employee.address || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Emergency Contact</p>
              <p className="font-medium">{employee.emergencyContact || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{employee.department?.name || "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hire Date</p>
                  <p className="font-medium">{employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salary Summary (If allowed to view payroll) */}
          {can(session.user as any, 'read', { type: 'PayrollRecord', ownerId: employee.id, orgId: employee.orgId }) && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Payroll</CardTitle>
              </CardHeader>
              <CardContent>
                {employee.payrollRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payroll records found.</p>
                ) : (
                  <div className="space-y-2">
                    {employee.payrollRecords.map(pr => (
                      <div key={pr.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                        <div>
                          <p className="font-medium">{new Date(pr.periodStart).toLocaleDateString()} - {new Date(pr.periodEnd).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">{pr.status}</p>
                        </div>
                        <p className="font-semibold text-green-600">${pr.netPay.toLocaleString()}</p>
                      </div>
                    ))}
                    <div className="pt-2 mt-4">
                      <Link href={`/employees/${employee.id}/payroll`} className="block w-full">
                        <Button variant="outline" className="w-full">View Payroll Details</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents found.</p>
              ) : (
                <ul className="space-y-2">
                  {employee.documents.map(doc => (
                    <li key={doc.id}>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {doc.title} ({doc.type})
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
