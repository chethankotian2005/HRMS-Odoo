import prisma from '../src/lib/prisma';
import crypto from 'crypto';

const FIRST_NAMES = [
  'Rahul', 'Amit', 'Priya', 'Sneha', 'Rohan', 'Neha', 'Vikram', 'Anjali', 'Karan', 'Pooja',
  'Sanjay', 'Kavita', 'Suresh', 'Sunita', 'Ramesh', 'Geeta', 'Deepak', 'Meera', 'Raj', 'Divya',
  'Arjun', 'Riya', 'Karthik', 'Swati', 'Vishal', 'Aarti', 'Manish', 'Kiran', 'Nitin', 'Shalini'
];

const LAST_NAMES = [
  'Sharma', 'Singh', 'Patel', 'Kumar', 'Gupta', 'Reddy', 'Iyer', 'Verma', 'Rao', 'Nair',
  'Das', 'Joshi', 'Mishra', 'Pandey', 'Agarwal', 'Bansal', 'Chauhan', 'Mehta', 'Desai', 'Bose'
];

const DEPARTMENTS = [
  { name: 'Engineering', desc: 'Software development and IT operations' },
  { name: 'Human Resources', desc: 'Employee relations and recruitment' },
  { name: 'Sales', desc: 'Revenue generation and client acquisition' },
  { name: 'Finance', desc: 'Accounting and financial planning' }
];

const LEAVE_TYPES = [
  { name: 'Casual Leave', daysAllowed: 12 },
  { name: 'Sick Leave', daysAllowed: 12 },
  { name: 'Earned Leave', daysAllowed: 15 }
];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[getRandomInt(0, arr.length - 1)];
}

async function main() {
  console.log('Starting seed process...');

  // --- IDEMPOTENCY ---
  // We'll use a specific known org name to make it idempotent
  const ORG_NAME = 'Acme India Pvt Ltd';

  let org = await prisma.organization.findFirst({ where: { name: ORG_NAME } });

  if (org) {
    console.log(`Organization "${ORG_NAME}" already exists. Cleaning up existing seed data...`);
    // Delete in reverse order of dependencies
    await prisma.auditLog.deleteMany({ where: { orgId: org.id } });
    await prisma.document.deleteMany({ where: { orgId: org.id } });
    await prisma.payrollRecord.deleteMany({ where: { orgId: org.id } });
    await prisma.leaveBalance.deleteMany({ where: { orgId: org.id } });
    await prisma.leaveRequest.deleteMany({ where: { orgId: org.id } });
    await prisma.leaveType.deleteMany({ where: { orgId: org.id } });
    await prisma.attendanceRecord.deleteMany({ where: { orgId: org.id } });
    // Keep users but maybe delete employees
    await prisma.employee.deleteMany({ where: { orgId: org.id } });
    await prisma.department.deleteMany({ where: { orgId: org.id } });
    // Note: If you want to keep the admin user, be careful deleting all users. 
    // We will delete users that have emails ending in @acme.in (our seed users).
    await prisma.user.deleteMany({ where: { orgId: org.id, email: { endsWith: '@acme.in' } } });
  } else {
    org = await prisma.organization.create({
      data: { name: ORG_NAME }
    });
  }

  const orgId = org.id;

  // --- 1. Departments ---
  const createdDepts = [];
  for (const dept of DEPARTMENTS) {
    const created = await prisma.department.create({
      data: { orgId, name: dept.name, description: dept.desc }
    });
    createdDepts.push(created);
  }

  // --- 2. Leave Types ---
  const createdLeaveTypes = [];
  for (const lt of LEAVE_TYPES) {
    const created = await prisma.leaveType.create({
      data: { orgId, name: lt.name, daysAllowed: lt.daysAllowed }
    });
    createdLeaveTypes.push(created);
  }

  // --- 3. Employees ---
  const employees = [];
  const now = new Date();
  
  // Pick 3 employees to have clustered Monday/Friday leaves
  const clusteredLeaveIndices = [5, 12, 22]; 

  for (let i = 0; i < 30; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = getRandomItem(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@acme.in`;
    const department = getRandomItem(createdDepts);
    const hireDate = new Date(now.getFullYear() - getRandomInt(1, 5), getRandomInt(0, 11), getRandomInt(1, 28));
    
    // Realistic Indian salary: 3LPA to 25LPA => per month: 25k to 200k
    const monthlySalary = getRandomInt(25, 200) * 1000;

    const user = await prisma.user.create({
      data: {
        orgId,
        email,
        password: '$2a$10$xyz...', // fake hash, they can't login anyway unless we use a real bcrypt hash
        role: 'EMPLOYEE',
      }
    });

    const emp = await prisma.employee.create({
      data: {
        id: user.id, // Keep them linked if you want, or let UUID generate
        orgId,
        userId: user.id,
        departmentId: department.id,
        firstName,
        lastName,
        email,
        phone: `+9198${getRandomInt(10000000, 99999999)}`,
        address: `${getRandomInt(10, 999)}, Phase ${getRandomInt(1,5)}, Electronic City, Bangalore`,
        hireDate,
      }
    });

    // Store metadata on the object for our seed logic
    employees.push({ ...emp, monthlySalary, isClustered: clusteredLeaveIndices.includes(i) });

    // Initialize Leave Balances
    for (const lt of createdLeaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          orgId,
          employeeId: emp.id,
          leaveTypeId: lt.id,
          year: now.getFullYear(),
          balance: lt.daysAllowed,
        }
      });
    }
  }

  // Assign department managers
  for (const dept of createdDepts) {
    const deptEmps = employees.filter(e => e.departmentId === dept.id);
    if (deptEmps.length > 0) {
      await prisma.department.update({
        where: { id: dept.id },
        data: { managerId: deptEmps[0].id }
      });
    }
  }

  // --- 4. 6 Months of Attendance ---
  console.log('Generating 6 months of attendance...');
  const attendanceData = [];
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  for (const emp of employees) {
    let currentDate = new Date(sixMonthsAgo);
    
    while (currentDate <= now) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sun, 1 = Mon... 6 = Sat
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        
        let status = 'PRESENT';
        
        // Random chance for absence/half-day
        let rand = Math.random();
        
        if (emp.isClustered && (dayOfWeek === 1 || dayOfWeek === 5)) {
          // 20% chance to take leave on Mon/Fri for these specific employees
          if (rand < 0.20) status = 'ABSENT';
          else if (rand < 0.25) status = 'HALF_DAY';
        } else {
          if (rand < 0.03) status = 'ABSENT';
          else if (rand < 0.06) status = 'HALF_DAY';
        }

        let checkIn = null;
        let checkOut = null;
        
        if (status === 'PRESENT' || status === 'HALF_DAY') {
          // Check-in around 9:00 AM +/- 30 mins
          checkIn = new Date(currentDate);
          checkIn.setHours(9, getRandomInt(0, 59), 0, 0);
          
          // Check-out around 6:00 PM (18:00) +/- 60 mins
          checkOut = new Date(currentDate);
          if (status === 'HALF_DAY') {
            checkOut.setHours(13, getRandomInt(0, 30), 0, 0); // Leave at 1 PM
          } else {
            checkOut.setHours(18, getRandomInt(0, 59), 0, 0);
          }
        }

        attendanceData.push({
          orgId,
          employeeId: emp.id,
          date: new Date(currentDate),
          status,
          checkIn,
          checkOut,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Batch insert attendance
  const chunkSize = 1000;
  for (let i = 0; i < attendanceData.length; i += chunkSize) {
    await prisma.attendanceRecord.createMany({
      data: attendanceData.slice(i, i + chunkSize)
    });
  }

  // --- 5. 80 Leave Requests ---
  console.log('Generating 80 leave requests...');
  const leaveRequests = [];
  const statuses = ['APPROVED', 'APPROVED', 'APPROVED', 'PENDING', 'REJECTED'];
  
  for (let i = 0; i < 80; i++) {
    const emp = getRandomItem(employees);
    const lt = getRandomItem(createdLeaveTypes);
    
    // Pick a random start date in the last 6 months
    const start = new Date(sixMonthsAgo);
    start.setDate(start.getDate() + getRandomInt(0, 150));
    
    const end = new Date(start);
    end.setDate(start.getDate() + getRandomInt(0, 3)); // 1 to 4 days

    leaveRequests.push({
      orgId,
      employeeId: emp.id,
      leaveTypeId: lt.id,
      startDate: start,
      endDate: end,
      status: getRandomItem(statuses),
      reason: 'Personal reasons / Health',
    });
  }

  await prisma.leaveRequest.createMany({ data: leaveRequests });

  // --- 6. Payroll for Last 3 Months ---
  console.log('Generating payroll for last 3 months...');
  const payrollData = [];
  
  for (let i = 1; i <= 3; i++) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    for (const emp of employees) {
      // Find absences in this month
      const abs = attendanceData.filter(a => 
        a.employeeId === emp.id && 
        a.date >= periodStart && 
        a.date <= periodEnd && 
        a.status === 'ABSENT'
      ).length;

      const halfDays = attendanceData.filter(a => 
        a.employeeId === emp.id && 
        a.date >= periodStart && 
        a.date <= periodEnd && 
        a.status === 'HALF_DAY'
      ).length;

      // 1 day pay deduction per absence, 0.5 per half day
      const dailyRate = emp.monthlySalary / 30;
      const deductions = Math.round((abs + (halfDays * 0.5)) * dailyRate);
      
      const netPay = emp.monthlySalary - deductions;

      payrollData.push({
        orgId,
        employeeId: emp.id,
        periodStart,
        periodEnd,
        basicSalary: emp.monthlySalary,
        // No separate HRA/allowance components in the seed, so gross == basic.
        grossPay: emp.monthlySalary,
        deductions,
        bonuses: 0,
        netPay,
        status: 'PAID'
      });
    }
  }

  await prisma.payrollRecord.createMany({ data: payrollData });

  console.log('Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
