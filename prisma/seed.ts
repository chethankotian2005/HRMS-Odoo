import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding HRMS database...");

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: "org-seed-001" },
    update: {},
    create: { id: "org-seed-001", name: "Acme Corp Pvt. Ltd." },
  });
  console.log("✅ Organization:", org.name);

  // 2. Create Departments
  const departments = await Promise.all([
    prisma.department.upsert({ where: { id: "dept-eng" }, update: {}, create: { id: "dept-eng", orgId: org.id, name: "Engineering", description: "Product & Software Engineering" } }),
    prisma.department.upsert({ where: { id: "dept-hr" }, update: {}, create: { id: "dept-hr", orgId: org.id, name: "Human Resources", description: "People & Culture" } }),
    prisma.department.upsert({ where: { id: "dept-fin" }, update: {}, create: { id: "dept-fin", orgId: org.id, name: "Finance", description: "Finance & Accounts" } }),
    prisma.department.upsert({ where: { id: "dept-mkt" }, update: {}, create: { id: "dept-mkt", orgId: org.id, name: "Marketing", description: "Growth & Marketing" } }),
  ]);
  console.log("✅ Departments:", departments.map((d) => d.name).join(", "));

  // 3. Seed Leave Types
  const leaveTypes = await Promise.all([
    prisma.leaveType.upsert({ where: { id: "lt-paid" }, update: {}, create: { id: "lt-paid", orgId: org.id, name: "Paid Leave", description: "Earned/Casual leave", daysAllowed: 18 } }),
    prisma.leaveType.upsert({ where: { id: "lt-sick" }, update: {}, create: { id: "lt-sick", orgId: org.id, name: "Sick Leave", description: "Medical/sick leave", daysAllowed: 12 } }),
    prisma.leaveType.upsert({ where: { id: "lt-unpaid" }, update: {}, create: { id: "lt-unpaid", orgId: org.id, name: "Unpaid Leave", description: "Leave without pay (unlimited)", daysAllowed: 0 } }),
  ]);
  console.log("✅ Leave Types:", leaveTypes.map((l) => l.name).join(", "));

  // 4. Seed 20 employees + users
  const employees_data = [
    { firstName: "Rajesh", lastName: "Kumar", email: "rajesh.kumar@acme.com", deptId: "dept-eng", role: "HR" },
    { firstName: "Priya", lastName: "Sharma", email: "priya.sharma@acme.com", deptId: "dept-hr", role: "ADMIN" },
    { firstName: "Arun", lastName: "Mehta", email: "arun.mehta@acme.com", deptId: "dept-eng", role: "EMPLOYEE" },
    { firstName: "Sneha", lastName: "Patil", email: "sneha.patil@acme.com", deptId: "dept-eng", role: "EMPLOYEE" },
    { firstName: "Vikram", lastName: "Singh", email: "vikram.singh@acme.com", deptId: "dept-fin", role: "EMPLOYEE" },
    { firstName: "Ananya", lastName: "Das", email: "ananya.das@acme.com", deptId: "dept-mkt", role: "EMPLOYEE" },
    { firstName: "Kiran", lastName: "Rao", email: "kiran.rao@acme.com", deptId: "dept-eng", role: "EMPLOYEE" },
    { firstName: "Meera", lastName: "Nair", email: "meera.nair@acme.com", deptId: "dept-hr", role: "EMPLOYEE" },
    { firstName: "Suresh", lastName: "Iyer", email: "suresh.iyer@acme.com", deptId: "dept-eng", role: "EMPLOYEE" },
    { firstName: "Deepa", lastName: "Reddy", email: "deepa.reddy@acme.com", deptId: "dept-fin", role: "EMPLOYEE" },
    { firstName: "Arjun", lastName: "Pillai", email: "arjun.pillai@acme.com", deptId: "dept-eng", role: "EMPLOYEE" },
    { firstName: "Kavitha", lastName: "Menon", email: "kavitha.menon@acme.com", deptId: "dept-mkt", role: "EMPLOYEE" },
    { firstName: "Rohit", lastName: "Gupta", email: "rohit.gupta@acme.com", deptId: "dept-eng", role: "EMPLOYEE" },
    { firstName: "Nisha", lastName: "Joshi", email: "nisha.joshi@acme.com", deptId: "dept-hr", role: "EMPLOYEE" },
    { firstName: "Manoj", lastName: "Shetty", email: "manoj.shetty@acme.com", deptId: "dept-fin", role: "EMPLOYEE" },
    { firstName: "Pooja", lastName: "Desai", email: "pooja.desai@acme.com", deptId: "dept-eng", role: "EMPLOYEE" },
    { firstName: "Sanjay", lastName: "Verma", email: "sanjay.verma@acme.com", deptId: "dept-mkt", role: "EMPLOYEE" },
    { firstName: "Lavanya", lastName: "Krishnan", email: "lavanya.krishnan@acme.com", deptId: "dept-eng", role: "EMPLOYEE" },
    { firstName: "Ganesh", lastName: "Pandey", email: "ganesh.pandey@acme.com", deptId: "dept-fin", role: "EMPLOYEE" },
    { firstName: "Rekha", lastName: "Bhatt", email: "rekha.bhatt@acme.com", deptId: "dept-mkt", role: "EMPLOYEE" },
  ];

  const password = await bcrypt.hash("Admin@1234", 10);

  for (let i = 0; i < employees_data.length; i++) {
    const ed = employees_data[i];
    const userId = `user-seed-${i + 1}`;
    const empId = `emp-seed-${i + 1}`;

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, orgId: org.id, email: ed.email, password, role: ed.role },
    });

    await prisma.employee.upsert({
      where: { id: empId },
      update: {},
      create: {
        id: empId, orgId: org.id, userId: user.id,
        departmentId: ed.deptId,
        firstName: ed.firstName, lastName: ed.lastName, email: ed.email,
        hireDate: new Date(2022, i % 12, (i % 28) + 1),
      },
    });

    // Salary Structure
    await prisma.salaryStructure.upsert({
      where: { id: `ss-seed-${i + 1}` },
      update: {},
      create: {
        id: `ss-seed-${i + 1}`, orgId: org.id, employeeId: empId,
        basicSalary: 40000 + i * 2000,
        hra: (40000 + i * 2000) * 0.4,
        allowances: 5000 + i * 500,
        effectiveFrom: new Date(2024, 0, 1),
      },
    });

    // Grant annual leave balances (ledger-based)
    for (const lt of leaveTypes) {
      if (lt.daysAllowed > 0) {
        await prisma.leaveBalanceLedger.upsert({
          where: { id: `lbl-${empId}-${lt.id}-2026` },
          update: {},
          create: {
            id: `lbl-${empId}-${lt.id}-2026`,
            orgId: org.id, employeeId: empId, leaveTypeId: lt.id,
            year: 2026, delta: lt.daysAllowed, reason: "ANNUAL_GRANT",
          },
        });
      }
    }
  }
  console.log("✅ Seeded 20 employees with leave balances and salary structures");
  console.log("🎉 Seeding complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());