"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type EmployeeData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  emergencyContact: string | null;
  avatarUrl: string | null;
};

export function EditEmployeeForm({ employee, permittedFields }: { employee: EmployeeData, permittedFields: string[] }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone || "",
    address: employee.address || "",
    emergencyContact: employee.emergencyContact || "",
    avatarUrl: employee.avatarUrl || "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");

  const canEdit = (field: string) => permittedFields.includes('*') || permittedFields.includes(field);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploadingAvatar(true);
    setError("");
    const file = e.target.files[0];
    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }

      const { url } = await res.json();
      setFormData(prev => ({ ...prev, avatarUrl: url }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Only send the fields the user is allowed to edit to prevent 403s
    const payload: any = {};
    if (canEdit("firstName")) payload.firstName = formData.firstName;
    if (canEdit("lastName")) payload.lastName = formData.lastName;
    if (canEdit("email")) payload.email = formData.email;
    if (canEdit("phone")) payload.phone = formData.phone;
    if (canEdit("address")) payload.address = formData.address;
    if (canEdit("emergencyContact")) payload.emergencyContact = formData.emergencyContact;
    if (canEdit("avatarUrl")) payload.avatarUrl = formData.avatarUrl;

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Update failed");
      }

      router.push(`/employees/${employee.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Employee Details</CardTitle>
        <CardDescription>Update profile information. Fields you cannot edit are disabled.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

          {canEdit('avatarUrl') && (
            <div className="space-y-2">
              <Label>Avatar Image</Label>
              <div className="flex items-center space-x-4">
                {formData.avatarUrl && (
                  <img src={formData.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border" />
                )}
                <Input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} disabled={uploadingAvatar} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input name="firstName" value={formData.firstName} onChange={handleChange} disabled={!canEdit('firstName')} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input name="lastName" value={formData.lastName} onChange={handleChange} disabled={!canEdit('lastName')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="email" type="email" value={formData.email} onChange={handleChange} disabled={!canEdit('email')} />
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <Input name="phone" value={formData.phone} onChange={handleChange} disabled={!canEdit('phone')} />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input name="address" value={formData.address} onChange={handleChange} disabled={!canEdit('address')} />
          </div>

          <div className="space-y-2">
            <Label>Emergency Contact</Label>
            <Input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} disabled={!canEdit('emergencyContact')} />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => router.push(`/employees/${employee.id}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploadingAvatar}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
