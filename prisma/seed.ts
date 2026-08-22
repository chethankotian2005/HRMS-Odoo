import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Prisma client – we cannot use the app's @/lib/prisma here because tsx
// does not resolve path aliases.  Replicate the adapter-pg setup.
// ---------------------------------------------------------------------------
const connectionString =
  process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Data constants
// ---------------------------------------------------------------------------
const ORG_ID = "org-seed-001";
const ORG_NAME = "Acme India Pvt Ltd";

const DEPARTMENTS = [
  { id: "dept-eng", name: "Engineering", desc: "Software development and IT operations" },
  { id: "dept-hr", name: "Human Resources", desc: "Employee relations and recruitment" },
  { id: "dept-fin", name: "Finance", desc: "Accounting and financial planning" },
  { id: "dept-mkt", name: "Marketing", desc: "Growth and marketing" },
];

const LEAVE_TYPES = [
  { id: "lt-casual", name: "Casual Leave", desc: "Casual / earned leave", daysAllowed: 12 },
  { id: "lt-sick", name: "Sick Leave", desc: "Medical / sick leave", daysAllowed: 12 },
  { id: "lt-earned", name: "Earned Leave", desc: "Privilege / earned leave", daysAllowed: 15 },
];

const EMPLOYEES = [
  // Demo accounts — one per role
  { firstName: "Priya", lastName: "Sharma", email: "priya.sharma@acme.in", deptId: "dept-hr", role: "ADMIN" },
  { firstName: "Rajesh", lastName: "Kumar", email: "rajesh.kumar@acme.in", deptId: "dept-hr", role: "HR" },
  { firstName: "Arun", lastName: "Mehta", email: "arun.mehta@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  // Remaining 27 employees
  { firstName: "Sneha", lastName: "Patil", email: "sneha.patil@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Vikram", lastName: "Singh", email: "vikram.singh@acme.in", deptId: "dept-fin", role: "EMPLOYEE" },
  { firstName: "Ananya", lastName: "Das", email: "ananya.das@acme.in", deptId: "dept-mkt", role: "EMPLOYEE" },
  { firstName: "Kiran", lastName: "Rao", email: "kiran.rao@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Meera", lastName: "Nair", email: "meera.nair@acme.in", deptId: "dept-hr", role: "EMPLOYEE" },
  { firstName: "Suresh", lastName: "Iyer", email: "suresh.iyer@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Deepa", lastName: "Reddy", email: "deepa.reddy@acme.in", deptId: "dept-fin", role: "EMPLOYEE" },
  { firstName: "Arjun", lastName: "Pillai", email: "arjun.pillai@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Kavitha", lastName: "Menon", email: "kavitha.menon@acme.in", deptId: "dept-mkt", role: "EMPLOYEE" },
  { firstName: "Rohit", lastName: "Gupta", email: "rohit.gupta@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Nisha", lastName: "Joshi", email: "nisha.joshi@acme.in", deptId: "dept-hr", role: "EMPLOYEE" },
  { firstName: "Manoj", lastName: "Shetty", email: "manoj.shetty@acme.in", deptId: "dept-fin", role: "EMPLOYEE" },
  { firstName: "Pooja", lastName: "Desai", email: "pooja.desai@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Sanjay", lastName: "Verma", email: "sanjay.verma@acme.in", deptId: "dept-mkt", role: "EMPLOYEE" },
  { firstName: "Lavanya", lastName: "Krishnan", email: "lavanya.krishnan@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Ganesh", lastName: "Pandey", email: "ganesh.pandey@acme.in", deptId: "dept-fin", role: "EMPLOYEE" },
  { firstName: "Rekha", lastName: "Bhatt", email: "rekha.bhatt@acme.in", deptId: "dept-mkt", role: "EMPLOYEE" },
  { firstName: "Rahul", lastName: "Chauhan", email: "rahul.chauhan@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Divya", lastName: "Agarwal", email: "divya.agarwal@acme.in", deptId: "dept-fin", role: "EMPLOYEE" },
  { firstName: "Karthik", lastName: "Bose", email: "karthik.bose@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Swati", lastName: "Mishra", email: "swati.mishra@acme.in", deptId: "dept-mkt", role: "EMPLOYEE" },
  { firstName: "Vishal", lastName: "Bansal", email: "vishal.bansal@acme.in", deptId: "dept-fin", role: "EMPLOYEE" },
  { firstName: "Aarti", lastName: "Mehta", email: "aarti.mehta@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Manish", lastName: "Patel", email: "manish.patel@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Nitin", lastName: "Deshmukh", email: "nitin.deshmukh@acme.in", deptId: "dept-fin", role: "EMPLOYEE" },
  { firstName: "Shalini", lastName: "Kulkarni", email: "shalini.kulkarni@acme.in", deptId: "dept-mkt", role: "EMPLOYEE" },
  { firstName: "Deepak", lastName: "Saxena", email: "deepak.saxena@acme.in", deptId: "dept-eng", role: "EMPLOYEE" },
  { firstName: "Geeta", lastName: "Tiwari", email: "geeta.tiwari@acme.in", deptId: "dept-hr", role: "EMPLOYEE" },
];

// Employees at these indices get clustered Monday/Friday leaves
const CLUSTERED_LEAVE_INDICES = [5, 12, 22];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[getRandomInt(0, arr.length - 1)];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("🌱 Starting seed process...");

  // ---- Idempotency: clean up existing org data ----
  const existingOrg = await prisma.organization.findFirst({
    where: { id: ORG_ID },
  });

  if (existingOrg) {
    console.log(`  Organization "${ORG_NAME}" exists — cleaning up...`);
    await prisma.notification.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.auditLog.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.document.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.payrollRecord.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.leaveBalanceLedger.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.leaveBalance.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.leaveRequest.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.leaveType.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.attendanceCorrection.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.attendanceRecord.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.salaryStructure.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.employee.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.department.deleteMany({ where: { orgId: ORG_ID } });
    await prisma.user.deleteMany({ where: { orgId: ORG_ID } });
  }

  // ---- 1. Organization ----
  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { name: ORG_NAME },
    create: { id: ORG_ID, name: ORG_NAME },
  });
  console.log(`✅ Organization: ${org.name}`);

  // ---- 2. Departments ----
  const createdDepts = await Promise.all(
    DEPARTMENTS.map((d) =>
      prisma.department.upsert({
        where: { id: d.id },
        update: {},
        create: { id: d.id, orgId: ORG_ID, name: d.name, description: d.desc },
      })
    )
  );
  console.log(`✅ Departments: ${createdDepts.map((d) => d.name).join(", ")}`);

  // ---- 3. Leave Types ----
  const createdLeaveTypes = await Promise.all(
    LEAVE_TYPES.map((lt) =>
      prisma.leaveType.upsert({
        where: { id: lt.id },
        update: {},
        create: {
          id: lt.id,
          orgId: ORG_ID,
          name: lt.name,
          description: lt.desc,
          daysAllowed: lt.daysAllowed,
        },
      })
    )
  );
  console.log(`✅ Leave Types: ${createdLeaveTypes.map((l) => l.name).join(", ")}`);

  // ---- 4. Employees + Users + Salary Structures + Leave Ledger ----
  const password = await bcrypt.hash("Admin@1234", 10);
  const now = new Date();
  const currentYear = now.getFullYear();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  interface SeedEmployee {
    id: string;
    orgId: string;
    departmentId: string;
    firstName: string;
    lastName: string;
    monthlySalary: number;
    hra: number;
    allowances: number;
    isClustered: boolean;
  }

  const employees: SeedEmployee[] = [];

  for (let i = 0; i < EMPLOYEES.length; i++) {
    const ed = EMPLOYEES[i];
    const userId = `user-seed-${String(i + 1).padStart(2, "0")}`;
    const empId = `emp-seed-${String(i + 1).padStart(2, "0")}`;
    const hireDate = new Date(now.getFullYear() - getRandomInt(1, 5), i % 12, (i % 28) + 1);

    // Create user
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, orgId: ORG_ID, email: ed.email, password, role: ed.role },
    });

    // Create employee
    await prisma.employee.upsert({
      where: { id: empId },
      update: {},
      create: {
        id: empId,
        orgId: ORG_ID,
        userId,
        departmentId: ed.deptId,
        firstName: ed.firstName,
        lastName: ed.lastName,
        email: ed.email,
        phone: `+9198${getRandomInt(10000000, 99999999)}`,
        address: `${getRandomInt(10, 999)}, Phase ${getRandomInt(1, 5)}, Electronic City, Bangalore`,
        hireDate,
      },
    });

    // Salary Structure — effectiveFrom well before attendance history
    const basicSalary = 30000 + i * 2500;
    const hra = Math.round(basicSalary * 0.4);
    const allowances = 5000 + i * 500;

    await prisma.salaryStructure.upsert({
      where: { id: `ss-seed-${String(i + 1).padStart(2, "0")}` },
      update: {},
      create: {
        id: `ss-seed-${String(i + 1).padStart(2, "0")}`,
        orgId: ORG_ID,
        employeeId: empId,
        basicSalary,
        hra,
        allowances,
        effectiveFrom: new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() - 1, 1),
      },
    });

    // Leave Balance Ledger — ANNUAL_GRANT for each leave type
    for (const lt of createdLeaveTypes) {
      if (lt.daysAllowed > 0) {
        await prisma.leaveBalanceLedger.upsert({
          where: { id: `lbl-${empId}-${lt.id}-${currentYear}` },
          update: {},
          create: {
            id: `lbl-${empId}-${lt.id}-${currentYear}`,
            orgId: ORG_ID,
            employeeId: empId,
            leaveTypeId: lt.id,
            year: currentYear,
            delta: lt.daysAllowed,
            reason: "ANNUAL_GRANT",
          },
        });
      }
    }

    employees.push({
      id: empId,
      orgId: ORG_ID,
      departmentId: ed.deptId,
      firstName: ed.firstName,
      lastName: ed.lastName,
      monthlySalary: basicSalary + hra + allowances,
      hra,
      allowances,
      isClustered: CLUSTERED_LEAVE_INDICES.includes(i),
    });
  }

  // Set department managers
  for (const dept of DEPARTMENTS) {
    const deptEmps = employees.filter((e) => e.departmentId === dept.id);
    if (deptEmps.length > 0) {
      await prisma.department.update({
        where: { id: dept.id },
        data: { managerId: deptEmps[0].id },
      });
    }
  }
  console.log(`✅ 30 employees with salary structures and leave ledger entries`);

  // ---- 5. Six Months of Attendance ----
  console.log("  Generating 6 months of attendance...");
  interface AttendanceRow {
    orgId: string;
    employeeId: string;
    date: Date;
    status: string;
    checkIn: Date | null;
    checkOut: Date | null;
  }
  const attendanceData: AttendanceRow[] = [];

  for (const emp of employees) {
    const currentDate = new Date(sixMonthsAgo);

    while (currentDate <= now) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        let status = "PRESENT";
        const rand = Math.random();

        if (emp.isClustered && (dayOfWeek === 1 || dayOfWeek === 5)) {
          if (rand < 0.2) status = "ABSENT";
          else if (rand < 0.25) status = "HALF_DAY";
        } else {
          if (rand < 0.03) status = "ABSENT";
          else if (rand < 0.06) status = "HALF_DAY";
        }

        let checkIn: Date | null = null;
        let checkOut: Date | null = null;

        if (status === "PRESENT" || status === "HALF_DAY") {
          checkIn = new Date(currentDate);
          checkIn.setHours(9, getRandomInt(0, 59), 0, 0);
          checkOut = new Date(currentDate);
          if (status === "HALF_DAY") {
            checkOut.setHours(13, getRandomInt(0, 30), 0, 0);
          } else {
            checkOut.setHours(18, getRandomInt(0, 59), 0, 0);
          }
        }

        attendanceData.push({
          orgId: ORG_ID,
          employeeId: emp.id,
          date: new Date(
            Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
          ),
          status,
          checkIn,
          checkOut,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const chunkSize = 500;
  for (let i = 0; i < attendanceData.length; i += chunkSize) {
    await prisma.attendanceRecord.createMany({
      data: attendanceData.slice(i, i + chunkSize),
    });
  }
  console.log(`✅ ${attendanceData.length} attendance records`);

  // ---- 6. 80 Leave Requests ----
  console.log("  Generating 80 leave requests...");
  const statuses = ["APPROVED", "APPROVED", "APPROVED", "PENDING", "REJECTED", "CANCELLED"];

  for (let i = 0; i < 80; i++) {
    const emp = getRandomItem(employees);
    const lt = getRandomItem(createdLeaveTypes);

    const start = new Date(sixMonthsAgo);
    start.setDate(start.getDate() + getRandomInt(0, 150));
    const end = new Date(start);
    end.setDate(start.getDate() + getRandomInt(0, 3));

    const status = getRandomItem(statuses);
    const halfDay = Math.random() < 0.1;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        orgId: ORG_ID,
        employeeId: emp.id,
        leaveTypeId: lt.id,
        startDate: start,
        endDate: end,
        status,
        halfDay,
        reason: getRandomItem([
          "Personal reasons",
          "Family event",
          "Medical appointment",
          "Travel",
          "Feeling unwell",
          "Festival celebration",
        ]),
        rejectionReason: status === "REJECTED" ? "Insufficient staffing" : null,
      },
    });

    // For approved requests, write a negative-delta ledger entry
    if (status === "APPROVED" && lt.daysAllowed > 0) {
      const dayCount = halfDay ? 0.5 : Math.max(1, getRandomInt(1, 3));
      await prisma.leaveBalanceLedger.create({
        data: {
          orgId: ORG_ID,
          employeeId: emp.id,
          leaveTypeId: lt.id,
          year: start.getFullYear(),
          delta: -dayCount,
          reason: "APPROVED",
          leaveRequestId: leaveRequest.id,
        },
      });
    }
  }
  console.log(`✅ 80 leave requests with ledger debits for approved ones`);

  // ---- 7. Payroll for Last 3 Months ----
  console.log("  Generating payroll for last 3 months...");

  interface PayrollRow {
    orgId: string;
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
    basicSalary: number;
    hra: number;
    allowances: number;
    grossPay: number;
    pf: number;
    professionalTax: number;
    lopDays: number;
    workingDays: number;
    deductions: number;
    bonuses: number;
    netPay: number;
    status: string;
  }

  const payrollData: PayrollRow[] = [];

  for (let m = 1; m <= 3; m++) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0);

    for (const emp of employees) {
      const absences = attendanceData.filter(
        (a) =>
          a.employeeId === emp.id &&
          a.date >= periodStart &&
          a.date <= periodEnd &&
          a.status === "ABSENT"
      ).length;

      const halfDays = attendanceData.filter(
        (a) =>
          a.employeeId === emp.id &&
          a.date >= periodStart &&
          a.date <= periodEnd &&
          a.status === "HALF_DAY"
      ).length;

      const basicSalary = emp.monthlySalary - emp.hra - emp.allowances;
      const grossPay = emp.monthlySalary;
      const pf = Math.round(basicSalary * 0.12);
      const professionalTax = grossPay > 75000 ? 200 : grossPay > 25000 ? 150 : 0;
      const dailyRate = grossPay / 30;
      const lopDays = absences + Math.ceil(halfDays * 0.5);
      const lopDeduction = Math.round(lopDays * dailyRate);
      const deductions = pf + professionalTax + lopDeduction;
      const netPay = Math.max(0, grossPay - deductions);

      // Count total working days in the period present in attendance
      const workingDays = attendanceData.filter(
        (a) =>
          a.employeeId === emp.id &&
          a.date >= periodStart &&
          a.date <= periodEnd &&
          (a.status === "PRESENT" || a.status === "HALF_DAY")
      ).length;

      payrollData.push({
        orgId: ORG_ID,
        employeeId: emp.id,
        periodStart,
        periodEnd,
        basicSalary,
        hra: emp.hra,
        allowances: emp.allowances,
        grossPay,
        pf,
        professionalTax,
        lopDays,
        workingDays,
        deductions,
        bonuses: 0,
        netPay,
        status: "FINALIZED",
      });
    }
  }

  for (let i = 0; i < payrollData.length; i += chunkSize) {
    await prisma.payrollRecord.createMany({
      data: payrollData.slice(i, i + chunkSize),
    });
  }
  console.log(`✅ ${payrollData.length} payroll records`);

  // ---- 8. Verify leave balance ----
  const firstEmpId = "emp-seed-01";
  const firstLeaveType = createdLeaveTypes[0]; // Casual Leave, 12 days allowed
  const balanceResult = await prisma.leaveBalanceLedger.aggregate({
    where: { employeeId: firstEmpId, leaveTypeId: firstLeaveType.id, year: currentYear },
    _sum: { delta: true },
  });
  const balance = balanceResult._sum.delta ?? 0;
  console.log(
    `\n🔍 Verification — getLeaveBalance("${firstEmpId}", "${firstLeaveType.name}", ${currentYear}) = ${balance}`
  );
  if (balance <= 0) {
    console.error("❌ Balance is zero or negative — ledger entries may be missing!");
    process.exit(1);
  }
  console.log(`✅ Balance is non-zero (${balance}). Seed verified!\n`);
  console.log("🎉 Seeding complete!");
  console.log("\n📋 Demo credentials (password: Admin@1234):");
  console.log("  ADMIN  → priya.sharma@acme.in");
  console.log("  HR     → rajesh.kumar@acme.in");
  console.log("  EMPLOYEE → arun.mehta@acme.in");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });