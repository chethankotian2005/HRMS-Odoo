import { can, UserContext, ResourceContext, getPermittedEmployeeFields } from './policy';

describe('RBAC Policy: can()', () => {
  const org1 = 'org-1';
  const org2 = 'org-2';
  const employee1Id = 'emp-1';
  const employee2Id = 'emp-2';

  describe('EMPLOYEE Role', () => {
    const employeeUser: UserContext = {
      id: 'user-1',
      role: 'EMPLOYEE',
      orgId: org1,
      employeeId: employee1Id,
    };

    it('should allow EMPLOYEE to fetch their own attendance', () => {
      const resource: ResourceContext = {
        type: 'AttendanceRecord',
        ownerId: employee1Id,
        orgId: org1,
      };
      expect(can(employeeUser, 'read', resource)).toBe(true);
    });

    it('should allow EMPLOYEE to fetch their own payroll', () => {
      const resource: ResourceContext = {
        type: 'PayrollRecord',
        ownerId: employee1Id,
        orgId: org1,
      };
      expect(can(employeeUser, 'read', resource)).toBe(true);
    });

    it('should DENY EMPLOYEE from fetching another employee\'s attendance', () => {
      const resource: ResourceContext = {
        type: 'AttendanceRecord',
        ownerId: employee2Id, // different employee
        orgId: org1,
      };
      expect(can(employeeUser, 'read', resource)).toBe(false);
    });

    it('should DENY EMPLOYEE from fetching another employee\'s payroll', () => {
      const resource: ResourceContext = {
        type: 'PayrollRecord',
        ownerId: employee2Id,
        orgId: org1,
      };
      expect(can(employeeUser, 'read', resource)).toBe(false);
    });

    it('should DENY EMPLOYEE from performing unauthorized actions (e.g., delete)', () => {
      const resource: ResourceContext = {
        type: 'AttendanceRecord',
        ownerId: employee1Id, // own record
        orgId: org1,
      };
      expect(can(employeeUser, 'delete', resource)).toBe(false);
    });

    it('should allow EMPLOYEE to update ONLY specific fields on their own profile', () => {
      const allowed = getPermittedEmployeeFields(employeeUser);
      expect(allowed).toEqual(['phone', 'address', 'emergencyContact', 'avatarUrl']);
    });
  });

  describe('ADMIN Role', () => {
    const adminUser: UserContext = {
      id: 'admin-1',
      role: 'ADMIN',
      orgId: org1,
      employeeId: 'admin-emp-1',
    };

    it('should allow ADMIN to read any employee\'s attendance in their org', () => {
      const resource: ResourceContext = {
        type: 'AttendanceRecord',
        ownerId: employee1Id,
        orgId: org1,
      };
      expect(can(adminUser, 'read', resource)).toBe(true);
    });

    it('should DENY ADMIN from reading resources in a different org', () => {
      const resource: ResourceContext = {
        type: 'AttendanceRecord',
        ownerId: employee1Id,
        orgId: org2, // different org
      };
      expect(can(adminUser, 'read', resource)).toBe(false);
    });

    it('should allow ADMIN to update ALL fields on any employee profile', () => {
      const allowed = getPermittedEmployeeFields(adminUser);
      expect(allowed).toEqual(['*']);
    });
  });

  describe('HR Role', () => {
    const hrUser: UserContext = {
      id: 'hr-1',
      role: 'HR',
      orgId: org1,
      employeeId: 'hr-emp-1',
    };

    it('should allow HR to read any employee\'s payroll in their org', () => {
      const resource: ResourceContext = {
        type: 'PayrollRecord',
        ownerId: employee1Id,
        orgId: org1,
      };
      expect(can(hrUser, 'read', resource)).toBe(true);
    });
  });
});
