'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function DashboardClient({ headcountData, leaveData, payrollData, absenteesData, attendanceRateData, riskData }: any) {
  return (
    <div className="space-y-6">
      
      {/* Top Row: Headcount & Attendance Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Headcount by Department</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={headcountData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#8884d8" name="Employees" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Attendance Rate (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceRateData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="rate" stroke="#00C49F" strokeWidth={3} name="Attendance Rate" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row: Payroll Cost Trend & Leave Utilization */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Payroll Cost Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payrollData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Area type="monotone" dataKey="gross" stackId="1" stroke="#8884d8" fill="#8884d8" name="Gross Pay" />
                <Area type="monotone" dataKey="net" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Net Pay" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Utilization by Type</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="utilized"
                  nameKey="name"
                  label
                >
                  {leaveData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Absentees Table & Attrition Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Absentees (All Time)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead className="text-right">Total Absent Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absenteesData.map((emp: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-right text-red-500 font-bold">{emp.absences}</TableCell>
                  </TableRow>
                ))}
                {absenteesData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No absences recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-600">Attrition Risk (Heuristic Signals)</CardTitle>
            <p className="text-xs text-muted-foreground italic mt-1">
              * This is a heuristic signal for HR follow-up based on attendance patterns, not a performance judgment.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Contributing Reasons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riskData && riskData.map((risk: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{risk.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        risk.score === 'HIGH' ? 'bg-red-100 text-red-700' : 
                        risk.score === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {risk.score}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <ul className="list-disc pl-4 space-y-1">
                        {risk.reasons.map((r: string, idx: number) => (
                          <li key={idx} className="text-muted-foreground">{r}</li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
                {(!riskData || riskData.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      No elevated attrition risks detected in the latest 12-week window.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
