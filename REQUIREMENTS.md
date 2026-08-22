# Dayflow HRMS — Requirements Traceability Checklist

> Odoo Hackathon, virtual round. Commit this file at the repo root and tick boxes as you go.
> **Rule: nothing in the `MUST` tables is optional.** Differentiators only start after every `MUST` is green.

**Legend**
- `M1` Foundation / auth / RBAC / profile / audit / seed
- `M2` Attendance
- `M3` Leave
- `M4` Payroll / analytics / dashboard
- **P0** = explicit in the problem statement, ungraded-if-missing is not a thing
- **P1** = listed under "Future Enhancements" in the PS
- **P2** = our differentiator, not in the PS

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done + manually verified

---

## 1. Authentication & Authorization (PS §3.1)

| ID | Requirement | Pri | Owner | Acceptance test | Status |
|---|---|---|---|---|---|
| AU-01 | Sign up with Employee ID, Email, Password, Role | P0 | M1 | Register a new HR and a new Employee; both rows appear in `User` + `Employee` | [ ] |
| AU-02 | Password must follow security rules | P0 | M1 | `pass123` rejected with a specific message; `Passw0rd!` accepted | [ ] |
| AU-03 | Passwords stored hashed, never plaintext | P0 | M1 | Query `User` table — `passwordHash` is a bcrypt string | [ ] |
| AU-04 | Email verification required | P0 | M1 | Unverified user is blocked at login with "verify your email"; token link flips `emailVerified` | [ ] |
| AU-05 | Sign in with email + password | P0 | M1 | Valid creds → redirect to role-correct dashboard | [ ] |
| AU-06 | Incorrect credentials show error messages | P0 | M1 | Wrong password shows inline error, does **not** reveal whether the email exists | [ ] |
| AU-07 | Successful login redirects to dashboard | P0 | M1 | Employee → `/dashboard`, Admin/HR → `/admin/dashboard` | [ ] |
| AU-08 | Duplicate email / employee code rejected | P0 | M1 | Re-register same email → field-level error, no 500 | [ ] |
| AU-09 | Role-based access: Admin vs Employee (PS §1.2) | P0 | M1 | Employee hitting `/admin/*` gets redirected, **and** `/api/admin/*` returns 403 JSON | [ ] |
| AU-10 | Logout clears session | P0 | M1 | After logout, back-button to dashboard does not render data | [ ] |
| AU-11 | Session persists across refresh | P0 | M1 | Reload dashboard → still authenticated | [ ] |

**Security check (do this before submitting):** log in as Employee A, copy Employee B's id, and call every `/api/**` route with it. Every single one must 403. This is the most common thing judges test and the most common thing teams fail.

---

## 2. Dashboards (PS §3.2)

| ID | Requirement | Pri | Owner | Acceptance test | Status |
|---|---|---|---|---|---|
| DB-01 | Employee dashboard: quick-access cards (Profile, Attendance, Leave, Logout) | P0 | M4 | All four cards visible and navigate correctly | [ ] |
| DB-02 | Employee dashboard shows recent activity / alerts | P0 | M4 | Last 5 events (check-ins, leave status changes) render | [ ] |
| DB-03 | Admin dashboard: employee list | P0 | M4 | Paginated list of all 30 seeded employees | [ ] |
| DB-04 | Admin dashboard: attendance records | P0 | M4 | Today's attendance summary with present/absent counts | [ ] |
| DB-05 | Admin dashboard: leave approvals | P0 | M4 | Pending-request count badge + link to queue | [ ] |
| DB-06 | Admin can switch between employees | P0 | M4 | Selecting an employee opens their full record (profile, attendance, leave, payroll) | [ ] |
| DB-07 | Dashboard loads with no console errors and no layout shift | P0 | M4 | Open devtools — clean console | [ ] |

---

## 3. Employee Profile Management (PS §3.3)

| ID | Requirement | Pri | Owner | Acceptance test | Status |
|---|---|---|---|---|---|
| PR-01 | View personal details | P0 | M1 | Name, email, phone, address, emergency contact render | [ ] |
| PR-02 | View job details | P0 | M1 | Designation, department, date of joining, reporting manager render | [ ] |
| PR-03 | View salary structure | P0 | M1 | Basic, HRA, allowances, deductions shown | [ ] |
| PR-04 | View documents | P0 | M1 | Uploaded docs listed with download links | [ ] |
| PR-05 | Profile picture displayed | P0 | M1 | Avatar renders; fallback initials when absent | [ ] |
| PR-06 | Employee can edit **limited** fields only | P0 | M1 | Employee PATCH on `salary` or `designation` → 403 even via raw API call | [ ] |
| PR-07 | Employee can edit address, phone, profile picture | P0 | M1 | Change persists after refresh | [ ] |
| PR-08 | Admin can edit **all** employee details | P0 | M1 | Admin changes designation and salary → saved + audit entry written | [ ] |
| PR-09 | Upload validation (type + size) | P0 | M1 | `.exe` rejected; >5 MB rejected with a clear message | [ ] |

---

## 4. Attendance Management (PS §3.4)

| ID | Requirement | Pri | Owner | Acceptance test | Status |
|---|---|---|---|---|---|
| AT-01 | Check-in for employee | P0 | M2 | Button records `checkIn`; disabled afterwards for the day | [ ] |
| AT-02 | Check-out for employee | P0 | M2 | Records `checkOut`, computes `workedHours` | [ ] |
| AT-03 | One record per employee per day | P0 | M2 | Double check-in blocked by DB unique constraint, not just UI | [ ] |
| AT-04 | Status: Present | P0 | M2 | ≥8h worked → `PRESENT` | [ ] |
| AT-05 | Status: Absent | P0 | M2 | No record for a working day → `ABSENT` | [ ] |
| AT-06 | Status: Half-day | P0 | M2 | 4–8h worked → `HALF_DAY` | [ ] |
| AT-07 | Status: Leave | P0 | M2/M3 | Approved leave flips those dates to `LEAVE` automatically | [ ] |
| AT-08 | Daily attendance view | P0 | M2 | Today's card with times and elapsed timer | [ ] |
| AT-09 | Weekly attendance view | P0 | M2 | 7-day strip with colour-coded statuses | [ ] |
| AT-10 | Employee sees **only their own** attendance | P0 | M2 | API call with another employee's id → 403 | [ ] |
| AT-11 | Admin/HR sees attendance of **all** employees | P0 | M2 | Filterable table across departments and dates | [ ] |
| AT-12 | Monthly summary totals | P0 | M2 | Present days, half-days, absent days, total hours | [ ] |

---

## 5. Leave & Time-Off Management (PS §3.5)

| ID | Requirement | Pri | Owner | Acceptance test | Status |
|---|---|---|---|---|---|
| LV-01 | Leave types: Paid, Sick, Unpaid | P0 | M3 | All three seeded and selectable | [ ] |
| LV-02 | Employee selects date range | P0 | M3 | Range picker; end ≥ start enforced | [ ] |
| LV-03 | Employee adds remarks | P0 | M3 | Reason saved and visible to approver | [ ] |
| LV-04 | Status: Pending on submission | P0 | M3 | New request shows `PENDING` | [ ] |
| LV-05 | Status: Approved | P0 | M3 | Approval updates status + employee sees it immediately | [ ] |
| LV-06 | Status: Rejected | P0 | M3 | Rejection requires a comment | [ ] |
| LV-07 | Admin views all leave requests | P0 | M3 | Queue filterable by status, employee, department | [ ] |
| LV-08 | Admin approves or rejects | P0 | M3 | Both actions work and are irreversible without a new action | [ ] |
| LV-09 | Admin adds comments | P0 | M3 | Comment stored and shown to the employee | [ ] |
| LV-10 | Changes reflect **immediately** in employee records | P0 | M3 | Approve in admin tab → employee tab shows it on refresh, attendance updated | [ ] |
| LV-11 | Overlapping requests rejected | P0 | M3 | Second request on same dates → specific error | [ ] |
| LV-12 | Past-dated requests rejected | P0 | M3 | Yesterday's start date → error | [ ] |
| LV-13 | Balance shown before applying | P0 | M3 | Remaining days per type visible on the form | [ ] |
| LV-14 | Request exceeding balance blocked | P0 | M3 | 20 paid days when 6 remain → error naming the shortfall | [ ] |
| LV-15 | Weekends excluded from day count | P0 | M3 | Fri–Mon range counts 2 days, not 4 | [ ] |

---

## 6. Payroll / Salary Management (PS §3.6)

| ID | Requirement | Pri | Owner | Acceptance test | Status |
|---|---|---|---|---|---|
| PY-01 | Payroll is **read-only** for employees | P0 | M4 | Employee PATCH to payroll route → 403 | [ ] |
| PY-02 | Employee views own salary details | P0 | M4 | Current month + 6-month history | [ ] |
| PY-03 | Admin views payroll of all employees | P0 | M4 | Month selector, all employees listed with net pay | [ ] |
| PY-04 | Admin updates salary structure | P0 | M4 | Edit saves as a **new version** with `effectiveFrom`; old slips unchanged | [ ] |
| PY-05 | Payroll accuracy — earnings breakdown | P0 | M4 | Basic + HRA + allowances = gross, shown line by line | [ ] |
| PY-06 | Payroll accuracy — deductions breakdown | P0 | M4 | PF (12% of basic) + professional tax computed correctly | [ ] |
| PY-07 | Net pay = gross − LOP − deductions | P0 | M4 | Hand-verify one employee's number with a calculator | [ ] |

---

## 7. Non-Functional Requirements (PS §1.1)

| ID | Requirement | Pri | Owner | Acceptance test | Status |
|---|---|---|---|---|---|
| NF-01 | All inputs validated server-side with zod | P0 | all | Malformed JSON POST → 400 with field errors, never a 500 | [ ] |
| NF-02 | RBAC enforced at API layer, not just UI | P0 | M1 | No `role === 'ADMIN'` outside `lib/rbac/policy.ts` (grep to confirm) | [ ] |
| NF-03 | No secrets committed | P0 | M1 | `.env` gitignored, `.env.example` present | [ ] |
| NF-04 | Consistent error handling | P0 | all | Every route returns `{ error, fields? }`; no raw stack traces | [ ] |
| NF-05 | Loading + empty + error states on every page | P0 | all | Disconnect the DB — pages degrade gracefully | [ ] |
| NF-06 | Responsive down to 375px | P0 | all | Tables scroll or stack on mobile | [ ] |
| NF-07 | Indexed foreign keys + pagination on all lists | P0 | M1 | No unpaginated `findMany` in the codebase | [ ] |
| NF-08 | Multi-tenant safe: `orgId` on every table and query | P0 | M1 | No query touches data outside the session's org | [ ] |
| NF-09 | Seeded demo data | P0 | M1 | 30 employees, 4 departments, 6 months attendance, 80 leave records | [ ] |
| NF-10 | Deployed and publicly reachable | P0 | M1 | Live URL works in incognito | [ ] |

---

## 8. Future Enhancements (PS §6) — build if P0 is clear

| ID | Requirement | Pri | Owner | Acceptance test | Status |
|---|---|---|---|---|---|
| FE-01 | In-app notification alerts | P1 | M3 | Bell icon with unread count on leave submit/approve/reject | [ ] |
| FE-02 | Email alerts | P1 | M3 | Nodemailer hook fires; no-ops cleanly without SMTP env vars | [ ] |
| FE-03 | Analytics & reports dashboard | P1 | M4 | Headcount, attendance trend, leave utilisation, payroll cost charts | [ ] |
| FE-04 | Salary slip report (PDF) | P1 | M4 | Downloadable slip with header, breakdown, LOP days, net pay in words | [ ] |
| FE-05 | Attendance report export | P1 | M2 | CSV export respecting active filters | [ ] |

The PS explicitly names "salary slips or attendance" reports under future enhancements — FE-03 and FE-04 are the highest-value items here because they're *asked for by name*.

---

## 9. Differentiators (not in the PS)

| ID | Feature | Pri | Owner | Acceptance test | Status |
|---|---|---|---|---|---|
| DF-01 | Attendance + leave → payroll auto-derivation | P2 | M4 | Mark an employee absent → their net pay drops in the same session | [ ] |
| DF-02 | Immutable audit log on all mutations | P2 | M1 | Approve a leave → `AuditLog` row with actor, before/after JSON, IP | [ ] |
| DF-03 | Geofenced check-in | P2 | M2 | Spoof coordinates 5 km away → rejected with the actual distance shown | [ ] |
| DF-04 | Proxy-punch detection | P2 | M2 | Same device hash for two employees on one day → flagged `SUSPECTED_PROXY` | [ ] |
| DF-05 | Leave conflict / capacity warning | P2 | M3 | Approver sees "Engineering drops to 40% on 12 Mar" with names listed | [ ] |
| DF-06 | Ledger-based leave balance | P2 | M3 | Balance is derived by summing `LeaveLedger`, never a mutable counter | [ ] |
| DF-07 | Attendance regularization requests | P2 | M2 | Missed-punch correction goes to admin queue, approval rewrites the record | [ ] |
| DF-08 | Attrition-risk heuristic | P2 | M4 | Employee with degraded 4-week attendance flagged with stated reasons | [ ] |
| DF-09 | Versioned salary structures | P2 | M4 | April raise does not alter March's slip | [ ] |
| DF-10 | Architecture + ERD diagrams in README | P2 | M1 | Mermaid blocks render on the GitHub repo page | [ ] |

---

## 10. Submission checklist

- [ ] All P0 rows above are `[x]` and manually verified — not assumed
- [ ] `README.md` with setup steps, tech stack, ERD, architecture diagram, feature list
- [ ] `.env.example` committed with every required key
- [ ] Seed script runs clean on a fresh database
- [ ] Live deployment URL in the README **and** in the submission form
- [ ] Demo credentials for all three roles in the README
- [ ] Demo video recorded against seeded data, following the end-to-end story
- [ ] Every member has commits spread across the full 8 hours (check `git shortlog -sn`)
- [ ] No commit larger than ~500 lines from a single author
- [ ] Repo public, `main` branch green, no leftover `console.log` or `TODO` in shipped routes

---

## 11. Demo script (rehearse this before recording)

1. Employee attempts check-in from outside the geofence → **blocked** with distance shown *(DF-03)*
2. Employee checks in from the office → status `PRESENT`, timer running *(AT-01)*
3. Employee applies for 3 days of paid leave; balance shown, overlap check runs *(LV-02, LV-13)*
4. HR opens the approval queue and sees the department capacity warning *(DF-05)*
5. HR approves → attendance for those dates flips to `LEAVE`, ledger entry posted *(AT-07, DF-06)*
6. HR marks a different day absent → that employee's payslip net pay drops immediately *(DF-01)*
7. HR downloads the salary slip PDF showing the LOP line *(FE-04)*
8. Admin opens the audit log and shows every one of those actions with actor and timestamp *(DF-02)*
9. Analytics dashboard shows the attendance trend and the attrition-risk flag *(FE-03, DF-08)*

Roughly 2 minutes. The point of the sequence is that each step *causes* the next — that's what a systems demo looks like versus a feature tour.

---

## 12. Per-member sign-off

Each member ticks their own row only after re-testing their module against a **freshly seeded** database, not their dev state.

| Member | Modules | All P0 verified | Signed off |
|---|---|---|---|
| M1 | Auth, RBAC, profile, audit, seed | [ ] | |
| M2 | Attendance | [ ] | |
| M3 | Leave | [ ] | |
| M4 | Payroll, analytics, dashboard | [ ] | |
