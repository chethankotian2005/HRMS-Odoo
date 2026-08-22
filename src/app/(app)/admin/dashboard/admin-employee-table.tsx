"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export function AdminEmployeeTable({
  employees,
  departments,
  total,
  totalPages,
  currentPage,
  currentQuery,
  currentDept,
}: {
  employees: any[];
  departments: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentQuery: string;
  currentDept: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(currentQuery);
  const [dept, setDept] = useState(currentDept);

  const applyFilters = (newQ?: string, newDept?: string, page: number = 1) => {
    const searchParams = new URLSearchParams();
    if (newQ !== undefined ? newQ : q) searchParams.set("q", newQ !== undefined ? newQ : q);
    if (newDept !== undefined ? newDept : dept) searchParams.set("dept", newDept !== undefined ? newDept : dept);
    if (page > 1) searchParams.set("page", page.toString());
    
    router.push(`/admin/dashboard?${searchParams.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(q, dept, 1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees ({total})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select 
            value={dept} 
            onValueChange={(val: string | null) => {
              const newDept = val === "all" || !val ? "" : val;
              setDept(newDept);
              applyFilters(q, newDept, 1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit">Search</Button>
        </form>

        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">Name</th>
                <th className="h-10 px-4 text-left font-medium">Email</th>
                <th className="h-10 px-4 text-left font-medium">Department</th>
                <th className="h-10 px-4 text-left font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="h-24 text-center text-muted-foreground">
                    No employees found.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr 
                    key={emp.id} 
                    className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/employees/${emp.id}`)}
                  >
                    <td className="p-4 font-medium">{emp.firstName} {emp.lastName}</td>
                    <td className="p-4 text-muted-foreground">{emp.user?.email || emp.email}</td>
                    <td className="p-4">{emp.department?.name || "-"}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                        {emp.user?.role || "EMPLOYEE"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyFilters(q, dept, currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyFilters(q, dept, currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
