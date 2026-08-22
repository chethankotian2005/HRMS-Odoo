export interface SalaryStructure {
  basic: number;
  hra: number;
  allowances: number;
}

export interface AttendanceRecord {
  workingDaysInMonth: number;
  absentDays: number;
}

export interface LeaveRecord {
  unpaidLeaves: number;
  paidLeavesTaken: number;
  sickLeavesTaken: number;
}

export interface LeaveBalances {
  paid: number;
  sick: number;
}

export interface DeductionsConfig {
  professionalTax?: number;
}

export interface PayrollBreakdown {
  grossPay: number;
  basic: number;
  hra: number;
  allowances: number;
  lop: {
    lopDays: number;
    lopDeduction: number;
  };
  deductions: {
    pf: number;
    professionalTax: number;
    total: number;
  };
  netPay: number;
}

export function computeNetPay(
  salaryStructure: SalaryStructure,
  attendance: AttendanceRecord,
  leaves: LeaveRecord,
  leaveBalances: LeaveBalances,
  config: DeductionsConfig = {}
): PayrollBreakdown {
  // Gross Pay
  const grossPay = salaryStructure.basic + salaryStructure.hra + salaryStructure.allowances;

  // LOP Days Calculation
  const excessPaidLeaves = Math.max(0, leaves.paidLeavesTaken - leaveBalances.paid);
  const excessSickLeaves = Math.max(0, leaves.sickLeavesTaken - leaveBalances.sick);
  const lopDays = attendance.absentDays + leaves.unpaidLeaves + excessPaidLeaves + excessSickLeaves;

  // LOP Deduction
  // If workingDaysInMonth is 0 (should not happen normally), deduction is 0 to avoid Infinity
  const lopDeduction = attendance.workingDaysInMonth > 0 
    ? (grossPay / attendance.workingDaysInMonth) * lopDays
    : 0;

  // Deductions
  const pf = salaryStructure.basic * 0.12; // 12% of basic
  const professionalTax = config.professionalTax ?? 200;
  const totalDeductions = pf + professionalTax;

  // Net Pay
  const netPay = grossPay - lopDeduction - totalDeductions;

  return {
    grossPay,
    basic: salaryStructure.basic,
    hra: salaryStructure.hra,
    allowances: salaryStructure.allowances,
    lop: {
      lopDays,
      lopDeduction,
    },
    deductions: {
      pf,
      professionalTax,
      total: totalDeductions,
    },
    netPay,
  };
}
