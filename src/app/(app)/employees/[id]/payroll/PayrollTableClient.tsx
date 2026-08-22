'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

type PayrollRecord = any; // simplified for the UI

export default function PayrollTableClient({ records }: { records: PayrollRecord[] }) {
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  const getLopBreakdown = (record: any) => {
    const breakdown = typeof record.breakdown === 'string' ? JSON.parse(record.breakdown) : record.breakdown;
    return breakdown?.lop;
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Basic</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Net Pay</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow 
                key={record.id} 
                className="cursor-pointer hover:bg-muted/50" 
                onClick={() => setSelectedRecord(record)}
              >
                <TableCell>{formatDate(record.periodStart)}</TableCell>
                <TableCell>${record.basicSalary.toLocaleString()}</TableCell>
                <TableCell>${record.grossPay.toLocaleString()}</TableCell>
                <TableCell className="text-red-500">-${record.deductions.toLocaleString()}</TableCell>
                <TableCell className="font-bold text-green-600">${record.netPay.toLocaleString()}</TableCell>
                <TableCell>{record.status}</TableCell>
              </TableRow>
            ))}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No payroll records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Payroll Breakdown</SheetTitle>
            <SheetDescription>
              {selectedRecord && formatDate(selectedRecord.periodStart)}
            </SheetDescription>
          </SheetHeader>
          
          {selectedRecord && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Earnings</h3>
                <div className="flex justify-between py-1 text-sm">
                  <span>Basic Salary</span>
                  <span>${selectedRecord.basicSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>HRA</span>
                  <span>${selectedRecord.hra.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span>Allowances</span>
                  <span>${selectedRecord.allowances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 font-semibold border-t mt-1 pt-1">
                  <span>Gross Pay</span>
                  <span>${selectedRecord.grossPay.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Deductions</h3>
                <div className="flex justify-between py-1 text-sm text-red-500">
                  <span>PF (Provident Fund)</span>
                  <span>-${selectedRecord.pf.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-red-500">
                  <span>Professional Tax</span>
                  <span>-${selectedRecord.professionalTax.toLocaleString()}</span>
                </div>
                
                {getLopBreakdown(selectedRecord) && getLopBreakdown(selectedRecord).lopDays > 0 && (
                  <div className="flex justify-between py-1 text-sm text-red-500">
                    <span>Loss of Pay ({getLopBreakdown(selectedRecord).lopDays} days)</span>
                    <span>-${getLopBreakdown(selectedRecord).lopDeduction.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between py-1 font-semibold border-t mt-1 pt-1 text-red-500">
                  <span>Total Deductions</span>
                  <span>-${selectedRecord.deductions.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
                <span className="font-bold text-lg">Net Pay</span>
                <span className="font-bold text-xl text-green-600">${selectedRecord.netPay.toLocaleString()}</span>
              </div>

              <div className="mt-6 border-t pt-4 flex justify-end">
                <a 
                  href={`/api/employees/${selectedRecord.employeeId}/payroll/${new Date(selectedRecord.periodStart).toISOString()}/pdf`} 
                  target="_blank" 
                  rel="noreferrer"
                  download
                >
                  <Button>Download Salary Slip (PDF)</Button>
                </a>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
