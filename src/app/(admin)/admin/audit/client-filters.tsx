"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ClientFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [actorId, setActorId] = useState(searchParams.get("actor") || "");
  const [entity, setEntity] = useState(searchParams.get("entity") || "ALL");

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (actorId) params.set("actor", actorId);
    if (entity && entity !== "ALL") params.set("entity", entity);
    router.push(`/admin/audit?${params.toString()}`);
  }, [actorId, entity, router]);

  const clearFilters = useCallback(() => {
    setActorId("");
    setEntity("ALL");
    router.push(`/admin/audit`);
  }, [router]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1 max-w-sm">
        <Input
          placeholder="Filter by Actor ID..."
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
        />
      </div>
      <div className="w-[200px]">
        <Select value={entity} onValueChange={(val) => setEntity(val || "")}>
          <SelectTrigger>
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Entities</SelectItem>
            <SelectItem value="User">User</SelectItem>
            <SelectItem value="Employee">Employee</SelectItem>
            <SelectItem value="AttendanceRecord">AttendanceRecord</SelectItem>
            <SelectItem value="LeaveRequest">LeaveRequest</SelectItem>
            <SelectItem value="PayrollRecord">PayrollRecord</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={applyFilters}>Apply</Button>
      <Button variant="outline" onClick={clearFilters}>Clear</Button>
    </div>
  );
}
