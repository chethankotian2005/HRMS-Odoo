import { computeNetPay, SalaryStructure, AttendanceRecord, LeaveRecord, LeaveBalances } from './compute';

describe('computeNetPay', () => {
  const baseSalary: SalaryStructure = {
    basic: 10000,
    hra: 4000,
    allowances: 2000,
  }; // Gross = 16000

  const baseAttendance: AttendanceRecord = {
    workingDaysInMonth: 20,
    absentDays: 0,
  };

  const baseLeaves: LeaveRecord = {
    unpaidLeaves: 0,
    paidLeavesTaken: 0,
    sickLeavesTaken: 0,
  };

  const baseBalances: LeaveBalances = {
    paid: 5,
    sick: 5,
  };

  it('should compute full pay without any absences or leaves', () => {
    const result = computeNetPay(baseSalary, baseAttendance, baseLeaves, baseBalances);

    expect(result.grossPay).toBe(16000);
    expect(result.lop.lopDays).toBe(0);
    expect(result.lop.lopDeduction).toBe(0);
    expect(result.deductions.pf).toBe(1200); // 12% of 10000
    expect(result.deductions.professionalTax).toBe(200);
    expect(result.deductions.total).toBe(1400);
    expect(result.netPay).toBe(16000 - 0 - 1400); // 14600
  });

  it('should not deduct pay for paid/sick leaves within balance', () => {
    const leaves: LeaveRecord = { ...baseLeaves, paidLeavesTaken: 3, sickLeavesTaken: 2 };
    const result = computeNetPay(baseSalary, baseAttendance, leaves, baseBalances);

    expect(result.lop.lopDays).toBe(0);
    expect(result.netPay).toBe(14600);
  });

  it('should apply LOP for absences and unpaid leaves', () => {
    const attendance: AttendanceRecord = { ...baseAttendance, absentDays: 1 };
    const leaves: LeaveRecord = { ...baseLeaves, unpaidLeaves: 1 };
    
    const result = computeNetPay(baseSalary, attendance, leaves, baseBalances);
    
    expect(result.lop.lopDays).toBe(2);
    // 16000 / 20 = 800 per day. LOP = 1600
    expect(result.lop.lopDeduction).toBe(1600);
    expect(result.netPay).toBe(16000 - 1600 - 1400); // 13000
  });

  it('should apply LOP for leaves exceeding balance', () => {
    const leaves: LeaveRecord = { ...baseLeaves, paidLeavesTaken: 6, sickLeavesTaken: 7 };
    // Paid balance 5, sick balance 5. Excess paid = 1, excess sick = 2. Total LOP = 3
    const result = computeNetPay(baseSalary, baseAttendance, leaves, baseBalances);

    expect(result.lop.lopDays).toBe(3);
    // 16000 / 20 = 800 per day. LOP = 2400
    expect(result.lop.lopDeduction).toBe(2400);
    expect(result.netPay).toBe(16000 - 2400 - 1400); // 12200
  });

  it('should use custom professional tax if provided', () => {
    const result = computeNetPay(baseSalary, baseAttendance, baseLeaves, baseBalances, { professionalTax: 500 });

    expect(result.deductions.professionalTax).toBe(500);
    expect(result.deductions.total).toBe(1700); // 1200 + 500
    expect(result.netPay).toBe(16000 - 1700); // 14300
  });
});
