import { withAuth } from "@/lib/rbac/with-auth";
import { NextResponse } from "next/server";

export const POST = withAuth(
  "create",
  async () => ({ type: "Employee", ownerId: "test-owner" }),
  async (req, context, user, audit) => {
    
    // Simulate some DB operation
    const newRecord = { id: "new-emp-1", status: "active" };
    
    // Log the audit using the injected function
    await audit("Employee", newRecord.id, null, newRecord);

    return NextResponse.json({ message: "Test audit successful", record: newRecord });
  }
);
