'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminPayrollClient({ employees, currentYear, currentMonth }: any) {
  const router = useRouter();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  
  const [basic, setBasic] = useState('');
  const [hra, setHra] = useState('');
  const [allowances, setAllowances] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch('/api/admin/payroll/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/payroll/salary-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: editingEmployee.id,
          basicSalary: Number(basic),
          hra: Number(hra),
          allowances: Number(allowances),
          effectiveFrom,
        }),
      });
      if (res.ok) {
        setEditingEmployee(null);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (emp: any) => {
    const struct = emp.salaryStructures[0];
    setBasic(struct?.basicSalary.toString() || '0');
    setHra(struct?.hra.toString() || '0');
    setAllowances(struct?.allowances.toString() || '0');
    
    // Default effective date to start of current selected month
    const defDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    setEffectiveFrom(defDate);
    
    setEditingEmployee(emp);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = Number(e.target.value);
    setMonth(newMonth);
    router.push(`/admin/payroll?month=${newMonth}&year=${year}`);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = Number(e.target.value);
    setYear(newYear);
    router.push(`/admin/payroll?month=${month}&year=${newYear}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <div>
            <Label>Year</Label>
            <select value={year} onChange={handleYearChange} className="block w-32 border rounded-md p-2 mt-1">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <Label>Month</Label>
            <select value={month} onChange={handleMonthChange} className="block w-40 border rounded-md p-2 mt-1">
              {Array.from({length: 12}).map((_, i) => (
                <option key={i+1} value={i+1}>
                  {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <Button onClick={handleRecalculate} disabled={isRecalculating}>
          {isRecalculating ? 'Recalculating...' : 'Recalculate Month'}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Current Basic</TableHead>
              <TableHead>Gross Pay</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Net Pay</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp: any) => {
              const payroll = emp.payrollRecords[0];
              const struct = emp.salaryStructures[0];
              
              return (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                  <TableCell>${struct?.basicSalary.toLocaleString() || 'N/A'}</TableCell>
                  <TableCell>{payroll ? `$${payroll.grossPay.toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-red-500">{payroll ? `-$${payroll.deductions.toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="font-bold text-green-600">{payroll ? `$${payroll.netPay.toLocaleString()}` : '-'}</TableCell>
                  <TableCell>{payroll?.status || 'NOT RUN'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(emp)}>
                      Edit Salary
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingEmployee} onOpenChange={(o) => !o && setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Salary Structure</DialogTitle>
            <DialogDescription>
              Changes will not overwrite history. A new salary structure record will be created, effective from the date you specify.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSalary} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basic Salary</Label>
                <Input type="number" required value={basic} onChange={e => setBasic(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>HRA</Label>
                <Input type="number" required value={hra} onChange={e => setHra(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Allowances</Label>
                <Input type="number" required value={allowances} onChange={e => setAllowances(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Effective From Date</Label>
                <Input type="date" required value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
              <Button type="submit">Save Version</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
