"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { CheckCircle2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z.object({
  leaveTypeId: z.string().min(1, "Select a leave type"),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  // No .default() here: it would make the zod input type (halfDay optional)
  // diverge from the output type (halfDay required), which breaks the
  // Resolver<TInput, any, TOutput> match against useForm<FormData>.
  // The field is always supplied via defaultValues below.
  halfDay: z.boolean(),
  reason: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

interface LeaveType { id: string; name: string; daysAllowed: number; }

export default function ApplyLeavePage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { leaveTypeId: "", startDate: "", endDate: "", halfDay: false, reason: "" },
  });

  useEffect(() => {
    fetch("/api/leave/types").then((r) => r.json()).then((d) => setLeaveTypes(d.leaveTypes ?? []));
  }, []);

  const onSubmit = async (data: FormData) => {
    setServerErrors([]);
    const res = await fetch("/api/leave/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerErrors(json.errors?.root ?? ["An error occurred. Please try again."]);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/leave"), 2000);
  };

  if (success) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-8 text-center flex flex-col items-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-3" />
            <h2 className="text-lg font-semibold text-green-800">Leave request submitted!</h2>
            <p className="text-sm text-green-600 mt-1">Redirecting to your leave dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Apply for Leave</CardTitle>
          <CardDescription>Submit a new time-off request. Weekends and public holidays are excluded.</CardDescription>
        </CardHeader>
        <CardContent>
          {serverErrors.length > 0 && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 space-y-1">
              {serverErrors.map((e, i) => <p key={i} className="text-sm text-red-600">• {e}</p>)}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="leaveTypeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <FormControl>
                    <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Select leave type...</option>
                      {leaveTypes.map((lt) => (
                        <option key={lt.id} value={lt.id}>
                          {lt.name} {lt.daysAllowed > 0 ? `(${lt.daysAllowed} days/yr)` : "(Unlimited)"}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="halfDay" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                  </FormControl>
                  <FormLabel className="!mt-0 text-sm font-normal cursor-pointer">Half day leave (0.5 days)</FormLabel>
                </FormItem>
              )} />

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason <span className="text-gray-400 font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <textarea {...field} rows={3} placeholder="Optional reason for leave..."
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Submitting..." : "Submit Leave Request"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:underline">← Back</button>
        </CardFooter>
      </Card>
    </div>
  );
}