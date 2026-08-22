/**
 * RBAC policy helper.
 * Usage: can(session.user, "approve", "leave") => true | false
 *
 * Roles:  ADMIN > HR > EMPLOYEE
 */

export type Role = "ADMIN" | "HR" | "EMPLOYEE";

export interface SessionUser {
  id: string;
  orgId: string;
  role: Role;
  employeeId?: string;
}

type Action = "read" | "write" | "approve" | "reject" | "delete" | "generate_pdf" | "recalculate";
type Resource =
  | "leave"
  | "leave_admin"
  | "payroll"
  | "payroll_admin"
  | "salary_structure"
  | "analytics"
  | "employee"
  | "notification";

const POLICY: Record<Resource, Partial<Record<Action, Role[]>>> = {
  leave: {
    read: ["EMPLOYEE", "HR", "ADMIN"],
    write: ["EMPLOYEE", "HR", "ADMIN"],
    delete: ["HR", "ADMIN"],
  },
  leave_admin: {
    read: ["HR", "ADMIN"],
    approve: ["HR", "ADMIN"],
    reject: ["HR", "ADMIN"],
  },
  payroll: {
    read: ["EMPLOYEE", "HR", "ADMIN"],
    generate_pdf: ["EMPLOYEE", "HR", "ADMIN"],
  },
  payroll_admin: {
    read: ["HR", "ADMIN"],
    write: ["HR", "ADMIN"],
    recalculate: ["HR", "ADMIN"],
    delete: ["ADMIN"],
  },
  salary_structure: {
    read: ["HR", "ADMIN"],
    write: ["HR", "ADMIN"],
  },
  analytics: {
    read: ["HR", "ADMIN"],
  },
  employee: {
    read: ["EMPLOYEE", "HR", "ADMIN"],
    write: ["HR", "ADMIN"],
    delete: ["ADMIN"],
  },
  notification: {
    read: ["EMPLOYEE", "HR", "ADMIN"],
    write: ["EMPLOYEE", "HR", "ADMIN"],
  },
};

export function can(
  user: SessionUser,
  action: Action,
  resource: Resource,
  targetEmployeeId?: string
): boolean {
  const allowedRoles = POLICY[resource]?.[action];
  if (!allowedRoles) return false;

  if (user.role === "EMPLOYEE") {
    if (!allowedRoles.includes("EMPLOYEE")) return false;
    if (targetEmployeeId && targetEmployeeId !== user.employeeId) return false;
    return true;
  }

  return allowedRoles.includes(user.role);
}

export function assertCan(
  user: SessionUser,
  action: Action,
  resource: Resource,
  targetEmployeeId?: string
): void {
  if (!can(user, action, resource, targetEmployeeId)) {
    throw new Response(
      JSON.stringify({ error: "Forbidden: insufficient permissions" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
}
