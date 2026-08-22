import { withAuth } from "@/lib/rbac/with-auth";
import { getPermittedEmployeeFields } from "@/lib/rbac/policy";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const PUT = withAuth(
  "update",
  async (req, context) => ({
    type: "Employee",
    ownerId: (await context.params).id,
  }),
  async (req, context, user, audit) => {
    try {
      const { id } = await context.params;
      const body = await req.json();

      // Ensure the employee exists and belongs to the user's org
      const existingEmployee = await prisma.employee.findUnique({
        where: { id },
      });

      if (!existingEmployee || existingEmployee.orgId !== user.orgId) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      // Check field-level permissions
      const permittedFields = getPermittedEmployeeFields(user);
      
      const requestedFields = Object.keys(body);
      const isPermitted = permittedFields.includes('*') || requestedFields.every(field => permittedFields.includes(field));

      if (!isPermitted) {
        return NextResponse.json(
          { error: "Forbidden: You are attempting to update restricted fields." },
          { status: 403 }
        );
      }

      // Proceed with update
      const updatedEmployee = await prisma.employee.update({
        where: { id },
        data: body,
      });

      // Log the exact fields that changed
      await audit("Employee", id, existingEmployee, updatedEmployee);

      return NextResponse.json(updatedEmployee);
    } catch (error) {
      console.error("[Employee Update Error]", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }
);
