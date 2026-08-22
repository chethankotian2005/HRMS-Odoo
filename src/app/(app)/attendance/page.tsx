import AttendanceDashboard from "@/components/attendance/AttendanceDashboard";

export const metadata = {
  title: "Attendance | HRMS",
  description: "Employee attendance dashboard",
};

export default function AttendancePage() {
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto">
      <AttendanceDashboard />
    </div>
  );
}
