# HRMS Application

This is a modern HRMS application built with:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma ORM
- PostgreSQL

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your `.env` file with a valid PostgreSQL `DATABASE_URL`:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/hrms?schema=public"
   ```

3. Run the Prisma migrations to create your database tables:
   ```bash
   npx prisma migrate dev --name init
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Entity Relationship Diagram (ERD)

Below is the database schema designed for this HRMS application:

```mermaid
erDiagram
    Organization {
        String id PK
        String name
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }
    User {
        String id PK
        String orgId FK
        String email
        String password
        String role
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }
    Employee {
        String id PK
        String orgId FK
        String userId FK
        String departmentId FK
        String firstName
        String lastName
        String email
        String phone
        DateTime hireDate
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }
    Department {
        String id PK
        String orgId FK
        String name
        String description
        String managerId FK
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }
    AttendanceRecord {
        String id PK
        String orgId FK
        String employeeId FK
        DateTime date
        DateTime checkIn
        DateTime checkOut
        String status
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }
    LeaveType {
        String id PK
        String orgId FK
        String name
        String description
        Int daysAllowed
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }
    LeaveRequest {
        String id PK
        String orgId FK
        String employeeId FK
        String leaveTypeId FK
        DateTime startDate
        DateTime endDate
        String status
        String reason
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }
    LeaveBalance {
        String id PK
        String orgId FK
        String employeeId FK
        String leaveTypeId FK
        Int year
        Float balance
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }
    PayrollRecord {
        String id PK
        String orgId FK
        String employeeId FK
        DateTime periodStart
        DateTime periodEnd
        Float basicSalary
        Float deductions
        Float bonuses
        Float netPay
        String status
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }
    Document {
        String id PK
        String orgId FK
        String employeeId FK
        String title
        String url
        String type
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }
    AuditLog {
        String id PK
        String orgId FK
        String userId FK
        String action
        String entity
        String entityId
        Json details
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }

    Organization ||--o{ User : "has"
    Organization ||--o{ Employee : "has"
    Organization ||--o{ Department : "has"
    Organization ||--o{ AttendanceRecord : "has"
    Organization ||--o{ LeaveType : "has"
    Organization ||--o{ LeaveRequest : "has"
    Organization ||--o{ LeaveBalance : "has"
    Organization ||--o{ PayrollRecord : "has"
    Organization ||--o{ Document : "has"
    Organization ||--o{ AuditLog : "has"

    User ||--o| Employee : "can be"
    User ||--o{ AuditLog : "creates"

    Employee ||--o{ AttendanceRecord : "has"
    Employee ||--o{ LeaveRequest : "has"
    Employee ||--o{ LeaveBalance : "has"
    Employee ||--o{ PayrollRecord : "has"
    Employee ||--o{ Document : "has"

    Department ||--o{ Employee : "has"

    LeaveType ||--o{ LeaveRequest : "has"
    LeaveType ||--o{ LeaveBalance : "has"
```
