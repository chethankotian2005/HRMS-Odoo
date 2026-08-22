# Dayflow HRMS

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-2D3748?logo=prisma)](https://www.prisma.io/)
[![Neon Postgres](https://img.shields.io/badge/Neon-Serverless-00E599?logo=postgresql)](https://neon.tech/)

Dayflow is a modern, enterprise-grade Human Resource Management System (HRMS) built for the Odoo Hackathon. It unifies Attendance, Leave Management, and Payroll into a single, cohesive, financially-verifiable platform.

### 🌐 Live Production Demo
**URL:** [https://hrms-odoo-theta.vercel.app/](https://hrms-odoo-theta.vercel.app/)

## 🌟 Key Features

### 1. Unified Dashboard & Analytics
- **Admin Command Center:** Real-time analytics and reporting metrics showing daily attendance (Present/Absent counts), pending leaves, and active capacity.
- **Employee Directory:** Searchable, paginated directory of all organization members.
- **Employee Portal:** Personalized view of recent attendance history, upcoming leaves, and 6-month payroll summary.

### 2. Identity & Access Management (IAM / RBAC)
- **Self-Registration Flow:** Full signup pipeline capturing Employee ID, Email, secure Password (enforcing complexity rules), and Role selection. 
  - *Note (AU-04): Email verification is intentionally bypassed in this demo environment to allow instant testing by the judges.*
- **Roles:** `ADMIN`, `HR`, and `EMPLOYEE`.
- Strictly enforced server-side route protection using NextAuth.js (JWT).
- Secure data isolation—employees can only access their own data.
- **Profile Management (View & Edit):** Users can view their comprehensive profile (personal details, job title, salary structures, and documents).
- **Strict Field-Level Edit RBAC:** Administrators can edit *all* employee profile fields. Regular employees are heavily restricted and can *only* edit their Phone, Address, Emergency Contact, and Avatar.
- **Upload Validation (PR-09):** Document and avatar uploads are strictly validated (Max 5MB, accepted formats: PDF, JPEG, PNG) to ensure security and prevent abuse.

### 2. Geolocation-Aware Attendance
- Capture precise check-in and check-out coordinates using the browser Geolocation API.
- Live elapsed time tracking for active shifts.
- **Admin Override:** Administrators can forcefully clock employees in/out or mark them absent directly from the console.
- **Correction Workflow:** Employees who forget to clock out can submit attendance corrections which HR can review and approve/reject.

### 3. Immutable Ledger-Based Leave Engine
- Leave balances are calculated dynamically from an immutable transaction ledger (Credits for grants, Debits for usage).
- **Smart Conflict Detection:** Warns HR if approving a leave drops a department's active capacity below 50%, preventing critical understaffing.
- Accurate cross-timezone date calculations avoiding UTC-to-IST off-by-one errors.

### 4. Automated Payroll Engine
- Dynamic generation of basic pay, HRA, and allowances using custom Salary Structures.
- **Loss of Pay (LOP) Integration:** Automatically deducts pay based on absent days identified directly from the Attendance module's records.
- Generates professional, downloadable **PDF Salary Slips** entirely on the server using `@react-pdf/renderer`.
- Translates Net Pay directly into English words (e.g., "FORTY THOUSAND RUPEES ONLY") for official documentation.

### 5. Enterprise Compliance & Notifications
- **Immutable Audit Logs:** Tracks all sensitive actions (approvals, overrides, profile updates) to ensure strict enterprise accountability.
- **Real-Time Notification Alerts:** In-app bell notifications instantly alert employees and HR regarding leave status updates and approvals, replacing the need for delayed email chains.
- **Robust Database Seeding:** A comprehensive data pipeline that instantly generates 30 realistic employees, over 6 months of historical attendance (4,000+ records), 80 leave requests, and complex payroll data for immediate testing.

## 🚀 Tech Stack

- **Framework:** [Next.js (App Router)](https://nextjs.org/)
- **Database:** [Neon Serverless PostgreSQL](https://neon.tech/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **PDF Generation:** [@react-pdf/renderer](https://react-pdf.org/)

## ⚙️ Getting Started Locally

### Prerequisites
- Node.js 18+
- A PostgreSQL database (we recommend Neon)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/HRMS-Odoo.git
   cd HRMS-Odoo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   NEXTAUTH_SECRET="your-super-secret-string"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. Run Database Migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Seed the Database:
   This populates the database with 30 employees, 6 months of attendance, and historical payroll records.
   ```bash
   npm run seed
   ```

6. Start the Development Server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔐 Demo Credentials

Use the following credentials to test the various role capabilities:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `priya.sharma@acme.in` | `Admin@1234` |
| **HR** | `geeta.tiwari@acme.in` | `Admin@1234` |
| **Employee** | `arun.mehta@acme.in` | `Admin@1234` |

*Note: All 30 seeded employees use the password `Admin@1234`.*

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
