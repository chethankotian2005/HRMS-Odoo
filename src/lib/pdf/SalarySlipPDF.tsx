import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { toWords } from 'number-to-words';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 12, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: 10 },
  companyName: { fontSize: 20, fontWeight: 'bold' },
  title: { fontSize: 16, marginTop: 5 },
  section: { marginBottom: 15 },
  row: { flexDirection: 'row', borderBottom: '1px solid #eee', paddingVertical: 5 },
  cellLabel: { width: '50%', fontWeight: 'bold' },
  cellValue: { width: '50%' },
  flexRow: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { width: '48%' },
  tableHeading: { fontWeight: 'bold', backgroundColor: '#f3f4f6', padding: 5, borderBottom: '1px solid #ccc' },
  tableCell: { padding: 5, flexDirection: 'row', justifyContent: 'space-between' },
  netPaySection: { marginTop: 20, padding: 10, backgroundColor: '#f3f4f6', borderRadius: 4 },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 10, color: '#666', borderTop: '1px solid #ccc', paddingTop: 10 }
});

interface SalarySlipProps {
  employee: {
    firstName: string;
    lastName: string;
    department?: { name: string } | null;
  };
  payroll: {
    periodStart: Date;
    periodEnd: Date;
    basicSalary: number;
    hra: number;
    allowances: number;
    grossPay: number;
    pf: number;
    professionalTax: number;
    deductions: number;
    lopDays: number;
    netPay: number;
    breakdown: any;
  }
}

export const SalarySlipPDF = ({ employee, payroll }: SalarySlipProps) => {
  const period = `${new Date(payroll.periodStart).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
  const netPayWords = toWords(payroll.netPay).replace(/-/g, ' ').toUpperCase();
  const lopDeduction = payroll.breakdown?.lop?.lopDeduction || 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>ACME Corporation</Text>
          <Text style={styles.title}>Salary Slip - {period}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.flexRow}>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.cellLabel}>Employee Name:</Text>
                <Text style={styles.cellValue}>{employee.firstName} {employee.lastName}</Text>
              </View>
            </View>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.cellLabel}>Department:</Text>
                <Text style={styles.cellValue}>{employee.department?.name || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.flexRow}>
          {/* Earnings Column */}
          <View style={[styles.column, { border: '1px solid #ccc' }]}>
            <View style={styles.tableHeading}>
              <Text>Earnings</Text>
            </View>
            <View style={styles.tableCell}>
              <Text>Basic Salary</Text>
              <Text>${payroll.basicSalary.toLocaleString()}</Text>
            </View>
            <View style={styles.tableCell}>
              <Text>HRA</Text>
              <Text>${payroll.hra.toLocaleString()}</Text>
            </View>
            <View style={styles.tableCell}>
              <Text>Allowances</Text>
              <Text>${payroll.allowances.toLocaleString()}</Text>
            </View>
            <View style={[styles.tableCell, { marginTop: 20, borderTop: '1px solid #ccc', fontWeight: 'bold' }]}>
              <Text>Gross Pay</Text>
              <Text>${payroll.grossPay.toLocaleString()}</Text>
            </View>
          </View>

          {/* Deductions Column */}
          <View style={[styles.column, { border: '1px solid #ccc' }]}>
            <View style={styles.tableHeading}>
              <Text>Deductions</Text>
            </View>
            <View style={styles.tableCell}>
              <Text>Provident Fund (PF)</Text>
              <Text>${payroll.pf.toLocaleString()}</Text>
            </View>
            <View style={styles.tableCell}>
              <Text>Professional Tax</Text>
              <Text>${payroll.professionalTax.toLocaleString()}</Text>
            </View>
            {payroll.lopDays > 0 && (
              <View style={styles.tableCell}>
                <Text>LOP ({payroll.lopDays} days)</Text>
                <Text>${lopDeduction.toLocaleString()}</Text>
              </View>
            )}
            <View style={[styles.tableCell, { marginTop: payroll.lopDays > 0 ? 0 : 20, borderTop: '1px solid #ccc', fontWeight: 'bold' }]}>
              <Text>Total Deductions</Text>
              <Text>${payroll.deductions.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.netPaySection}>
          <View style={styles.flexRow}>
            <Text style={{ fontWeight: 'bold', fontSize: 14 }}>Net Pay</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>${payroll.netPay.toLocaleString()}</Text>
          </View>
          <Text style={{ marginTop: 10, fontStyle: 'italic', fontSize: 10 }}>Amount in words: {netPayWords} DOLLARS ONLY</Text>
        </View>

        <View style={styles.footer}>
          <Text>This is a system generated document and does not require a signature.</Text>
        </View>
      </Page>
    </Document>
  );
};
