export type Action = 'read' | 'create' | 'update' | 'delete';

export interface UserContext {
  id: string;
  role: string;
  orgId: string;
  employeeId?: string | null;
}

export interface ResourceContext {
  type: 'AttendanceRecord' | 'PayrollRecord' | 'Employee' | 'Department' | 'LeaveRequest' | 'Document' | 'Generic';
  ownerId?: string; // e.g., the employeeId that owns this record
  orgId?: string;   // the orgId this record belongs to
}

/**
 * Core RBAC Policy function.
 * Evaluates whether a user can perform an action on a given resource.
 */
export function can(user: UserContext, action: Action, resource: ResourceContext): boolean {
  // If the resource specifies an orgId, the user MUST be in the same org
  if (resource.orgId && user.orgId !== resource.orgId) {
    return false;
  }

  // ADMIN can do anything within their org
  if (user.role === 'ADMIN') {
    return true;
  }

  // HR can do almost anything within their org (for the sake of this policy)
  if (user.role === 'HR') {
    return true;
  }

  // EMPLOYEE is highly restricted
  if (user.role === 'EMPLOYEE') {
    // They can read their own attendance, payroll, leave requests, etc.
    if (action === 'read') {
      if (!user.employeeId) return false;

      // Ensure the resource specifically belongs to this employee
      if (
        resource.type === 'AttendanceRecord' ||
        resource.type === 'PayrollRecord' ||
        resource.type === 'LeaveRequest' ||
        resource.type === 'Employee'
      ) {
        return resource.ownerId === user.employeeId;
      }
    }
    
    // They can create leave requests and attendance records for themselves
    if (action === 'create') {
      if (!user.employeeId) return false;
      if (resource.type === 'LeaveRequest' || resource.type === 'AttendanceRecord') {
        return resource.ownerId === user.employeeId;
      }
    }

    // Default deny for employees
    return false;
  }

  return false;
}

/**
 * Returns the list of fields a user is permitted to update on an Employee record.
 * '*' means all fields.
 */
export function getPermittedEmployeeFields(user: UserContext): string[] {
  if (user.role === 'ADMIN' || user.role === 'HR') {
    return ['*'];
  }
  
  if (user.role === 'EMPLOYEE') {
    return ['phone', 'address', 'emergencyContact', 'avatarUrl'];
  }

  return [];
}

